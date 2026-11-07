import { Router, Request, Response } from 'express';
import { TelegramBotService } from '../services/telegramBotService.js';
import { prisma } from '../prisma.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';
import { realtimeEmitter } from './realtimeRoutes.js';
import { cacheService } from '../services/cacheService.js';

export const telegramRouter = Router();

/**
 * Helper to process stock confirmation decision
 */
export async function processStockDecision(
  orderId: string,
  decision: 'confirm' | 'reject',
  confirmedBy: string = 'TELEGRAM'
): Promise<{ success: boolean; message: string; order?: any }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      business: { include: { paymentAccounts: true } },
      items: { include: { product: true } },
      salesPartner: true,
    },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.status !== 'AWAITING_MERCHANT_VERIFICATION') {
    return {
      success: true,
      message: `Order is already in state: ${order.status}`,
      order,
    };
  }

  const primaryItem = order.items[0];
  const productName = primaryItem?.product?.name || 'Product item';

  if (decision === 'confirm') {
    // 1. Confirm Stock & Move to PENDING_PAYMENT
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PENDING_PAYMENT',
        stockConfirmedAt: new Date(),
        stockConfirmedBy: confirmedBy,
        paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to pay
      },
      include: {
        business: { include: { paymentAccounts: true } },
        items: { include: { product: true } },
        salesPartner: true,
      },
    });

    // 2. NOW AND ONLY NOW: Dispatch Official Payment SMS to Customer
    const trackingUrl = `https://arifagent-ethiopian-sales-agent-mar.vercel.app/track?token=${order.publicAccessToken}`;
    const buyerSmsText = 
      `Azwari: Your order for ${productName} (#${order.orderNumber}) is confirmed & reserved by ${order.business.name}. ` +
      `Total: ETB ${Number(order.totalAmount).toLocaleString()}. Transfer via Telebirr/CBE: ${trackingUrl}`;

    SmsEthiopiaService.sendSms({
      recipientPhone: order.buyerPhone,
      messageBody: buyerSmsText,
      orderNumber: order.orderNumber,
      templateName: 'order_payment_instructions',
    }).catch((err) => console.warn('[Buyer SMS Error]', err));

    // 3. Notify Sales Agent
    if (order.salesPartner?.phone) {
      const agentSmsText = `Azwari Alert: ${order.business.name} confirmed stock for #${order.orderNumber}! Payment link sent to buyer ${order.buyerName}.`;
      SmsEthiopiaService.sendSms({
        recipientPhone: order.salesPartner.phone,
        messageBody: agentSmsText,
        orderNumber: order.orderNumber,
        templateName: 'agent_stock_confirmed',
      }).catch(() => {});
    }

    // 4. Invalidate caches & emit SSE
    await cacheService.delPattern('cache:orders:*');
    realtimeEmitter.emit('change', { type: 'ORDER_STOCK_CONFIRMED', orderId: order.id });

    return {
      success: true,
      message: `Stock confirmed for order #${order.orderNumber}. Payment link sent to ${order.buyerPhone}.`,
      order: updatedOrder,
    };
  } else {
    // 1. Reject Stock & Move to CANCELLED_OUT_OF_STOCK
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED_OUT_OF_STOCK',
        stockConfirmedAt: new Date(),
        stockConfirmedBy: confirmedBy,
        deliveryNotes: `${order.deliveryNotes || ''} | Merchant indicated sold out in physical shop`,
      },
    });

    // 2. Automatically zero product stock so no one else orders it
    if (primaryItem?.productId) {
      await prisma.product.update({
        where: { id: primaryItem.productId },
        data: { stock: 0 },
      }).catch((e) => console.warn('[Stock zero error]', e));
    }

    // 3. CUSTOMER NEVER RECEIVES AN SMS! Customer is completely shielded.

    // 4. Alert Sales Agent only so they can recommend an alternative item to the customer
    if (order.salesPartner?.phone) {
      const agentSmsText = `Azwari Notice: ${productName} ran out of physical stock at ${order.business.name}. Order #${order.orderNumber} cancelled. Buyer was NOT sent any link. Please recommend an alternative item.`;
      SmsEthiopiaService.sendSms({
        recipientPhone: order.salesPartner.phone,
        messageBody: agentSmsText,
        orderNumber: order.orderNumber,
        templateName: 'agent_stock_sold_out',
      }).catch(() => {});
    }

    // 5. Invalidate caches & emit SSE
    await cacheService.delPattern('cache:orders:*');
    await cacheService.delPattern('cache:products:*');
    realtimeEmitter.emit('change', { type: 'ORDER_STOCK_REJECTED', orderId: order.id });

    return {
      success: true,
      message: `Order #${order.orderNumber} marked out of stock. Customer was shielded from notifications.`,
      order: updatedOrder,
    };
  }
}

/**
 * Helper to process customer payment receipt decision (approval / rejection)
 * Works interchangeably from Telegram Bot OR Platform Web Portal
 */
export async function processPaymentDecision(
  orderId: string,
  approved: boolean,
  verifiedBy: string = 'TELEGRAM_BOT',
  rejectionReason?: string
): Promise<{ success: boolean; message: string; order?: any }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      business: { include: { paymentAccounts: true } },
      items: { include: { product: true, variant: true } },
      paymentReceipts: { orderBy: { createdAt: 'desc' } },
      salesPartner: true,
      commissionEscrow: true,
    },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  // Idempotency: if already confirmed/scheduled/delivered
  if (approved && ['CONFIRMED', 'SCHEDULED', 'DISPATCHED', 'DELIVERED'].includes(order.status)) {
    return {
      success: true,
      message: `Order #${order.orderNumber} payment is already verified.`,
      order,
    };
  }

  const latestReceipt = order.paymentReceipts[0];

  if (approved) {
    // 1. Mark Receipt & Order CONFIRMED
    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      if (latestReceipt) {
        await tx.paymentReceipt.update({
          where: { id: latestReceipt.id },
          data: {
            verifiedAt: new Date(),
            verifiedBy,
            rejectionReason: null,
          },
        });
      }

      return await tx.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
        include: {
          items: { include: { product: true, variant: true } },
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          commissionEscrow: true,
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });
    });

    // 2. Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: verifiedBy.includes('TELEGRAM') ? 'merchant_telegram' : 'supplier',
          actorName: verifiedBy,
          action: 'VERIFY_PAYMENT',
          entityType: 'Order',
          entityId: order.id,
          businessId: order.businessId,
          description: `Payment receipt verified for order #${order.orderNumber} via ${verifiedBy}. Order marked CONFIRMED.`,
        },
      });
    } catch (auditErr) {
      console.warn('[Audit Log Notice]', auditErr);
    }

    // 3. Buyer SMS Notification
    SmsEthiopiaService.sendSms({
      recipientPhone: order.buyerPhone,
      messageBody: `Azwari: Payment for order #${order.orderNumber} is verified! Your order is being packed for delivery.`,
      orderNumber: order.orderNumber,
      templateName: 'order_payment_verified',
    }).catch((err) => console.warn('[Buyer Verified SMS Warning]', err));

    // 4. Sales Agent SMS Alert
    if (order.salesPartner?.phone) {
      SmsEthiopiaService.sendSms({
        recipientPhone: order.salesPartner.phone,
        messageBody: `Azwari Alert: Payment verified for order #${order.orderNumber}! Commission of ETB ${order.commissionAmount} secured in escrow.`,
        orderNumber: order.orderNumber,
        templateName: 'agent_payment_verified',
      }).catch(() => {});
    }

    // 5. If verified from Web Portal and merchant has Telegram, notify Telegram chat
    if (!verifiedBy.includes('TELEGRAM') && (order.business as any)?.telegramChatId) {
      TelegramBotService.sendMessage(
        (order.business as any).telegramChatId,
        `✅ <b>Payment Verified via Platform Web Portal</b>\n\nOrder #${order.orderNumber} (${order.buyerName}) has been approved and moved to fulfillment.`
      ).catch(() => {});
    }

    // 6. Invalidate caches & emit SSE
    await cacheService.delPattern('cache:orders:*');
    await cacheService.delPattern('cache:commissions:*');
    realtimeEmitter.emit('change', { type: 'ORDER_PAYMENT_VERIFIED', orderId: order.id });

    return {
      success: true,
      message: `Payment verified for order #${order.orderNumber}. Order marked CONFIRMED.`,
      order: updatedOrder,
    };
  } else {
    // REJECT PAYMENT
    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      if (latestReceipt) {
        await tx.paymentReceipt.update({
          where: { id: latestReceipt.id },
          data: {
            rejectionReason: rejectionReason || 'Payment could not be verified in merchant bank statement.',
          },
        });
      }

      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PENDING_PAYMENT',
          paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // extend 15 mins for re-upload
        },
        include: {
          items: { include: { product: true, variant: true } },
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          commissionEscrow: true,
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: verifiedBy.includes('TELEGRAM') ? 'merchant_telegram' : 'supplier',
          actorName: verifiedBy,
          action: 'REJECT_PAYMENT',
          entityType: 'Order',
          entityId: order.id,
          businessId: order.businessId,
          description: `Payment receipt rejected for order #${order.orderNumber} via ${verifiedBy}. Reason: ${rejectionReason}`,
        },
      });
    } catch (auditErr) {
      console.warn('[Audit Log Notice]', auditErr);
    }

    // Buyer SMS Notification to re-upload
    const trackingUrl = `https://arifagent-ethiopian-sales-agent-mar.vercel.app/track?token=${order.publicAccessToken}`;
    SmsEthiopiaService.sendSms({
      recipientPhone: order.buyerPhone,
      messageBody: `Azwari Notice: We could not verify payment for order #${order.orderNumber}. Please check your transaction ID and re-upload screenshot: ${trackingUrl}`,
      orderNumber: order.orderNumber,
      templateName: 'order_payment_rejected',
    }).catch(() => {});

    // Sales Agent SMS Alert
    if (order.salesPartner?.phone) {
      SmsEthiopiaService.sendSms({
        recipientPhone: order.salesPartner.phone,
        messageBody: `Azwari Alert: Payment slip for order #${order.orderNumber} was rejected by ${order.business.name}. Buyer asked to re-upload.`,
        orderNumber: order.orderNumber,
        templateName: 'agent_payment_rejected',
      }).catch(() => {});
    }

    // If rejected from Web Portal and merchant has Telegram, notify Telegram chat
    if (!verifiedBy.includes('TELEGRAM') && (order.business as any)?.telegramChatId) {
      TelegramBotService.sendMessage(
        (order.business as any).telegramChatId,
        `❌ <b>Payment Receipt Rejected via Platform Web Portal</b>\n\nOrder #${order.orderNumber} reverted to pending payment. Customer was asked to re-upload.`
      ).catch(() => {});
    }

    // Invalidate caches & emit SSE
    await cacheService.delPattern('cache:orders:*');
    realtimeEmitter.emit('change', { type: 'ORDER_PAYMENT_REJECTED', orderId: order.id });

    return {
      success: true,
      message: `Payment rejected for order #${order.orderNumber}. Buyer notified to re-upload.`,
      order: updatedOrder,
    };
  }
}

/**
 * POST /api/telegram/webhook
 * Public webhook endpoint called by Telegram Bot API
 */
telegramRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const update = req.body;
    const handledResult = await TelegramBotService.handleWebhookUpdate(update);

    if (handledResult.handled && handledResult.orderId && handledResult.action) {
      if (handledResult.action === 'confirm_stock' || handledResult.action === 'reject_stock') {
        const decision = handledResult.action === 'confirm_stock' ? 'confirm' : 'reject';
        await processStockDecision(handledResult.orderId, decision, 'TELEGRAM_BOT');
      } else if (handledResult.action === 'approve_payment' || handledResult.action === 'reject_payment') {
        const approved = handledResult.action === 'approve_payment';
        await processPaymentDecision(
          handledResult.orderId,
          approved,
          'TELEGRAM_BOT',
          approved ? undefined : 'Receipt rejected on Telegram Bot'
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err);
    res.status(200).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/telegram/status
 * Returns Telegram bot configuration status and optional merchant connection status
 */
telegramRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  const businessId = req.query.businessId as string | undefined;
  let isConnected = false;
  let telegramUsername: string | undefined = undefined;
  let connectUrl = '';

  if (businessId) {
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { telegramChatId: true, telegramUsername: true },
    });
    isConnected = Boolean(biz?.telegramChatId);
    telegramUsername = biz?.telegramUsername || undefined;
    connectUrl = TelegramBotService.getConnectUrl(businessId);
  }

  res.status(200).json({
    success: true,
    configured: TelegramBotService.isConfigured(),
    botUsername: TelegramBotService.botUsername,
    isConnected,
    telegramUsername,
    connectUrl: connectUrl || (businessId ? TelegramBotService.getConnectUrl(businessId) : ''),
  });
});

/**
 * POST /api/telegram/simulate
 * Simulates Telegram merchant button click for dev and testing
 */
telegramRouter.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, decision } = req.body;
    if (!orderId || !decision) {
      res.status(400).json({ success: false, error: 'orderId and decision (confirm|reject) required' });
      return;
    }

    const result = await processStockDecision(orderId, decision, 'TELEGRAM_SIMULATOR');
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
