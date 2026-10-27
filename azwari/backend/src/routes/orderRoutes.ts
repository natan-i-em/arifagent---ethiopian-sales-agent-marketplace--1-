import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma, PaymentProvider, OrderStatus, CommissionStatus } from '../prisma.js';
import { requireAuth, requireRole, optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { checkIdempotency } from '../middleware/idempotency.js';
import {
  validateBody,
  CreateOrderSchema,
  PaymentEvidenceSchema,
  VerifyPaymentSchema,
  ScheduleDeliverySchema,
  DispatchOrderSchema,
  DeliverOrderSchema,
  CancelOrderSchema,
  ExtendPaymentSchema,
} from '../middleware/zodValidators.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';
import { WalletService, InsufficientBalanceError } from '../services/walletService.js';
import { etbToCents } from '../config/walletConfig.js';

export const orderRouter = Router();

// Helper mappings for OrderStatus
const prismaToUiStatus = (status: OrderStatus): string => {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'awaiting_payment',
    PAYMENT_SUBMITTED: 'payment_review',
    CONFIRMED: 'payment_verified',
    SCHEDULED: 'scheduled',
    DISPATCHED: 'out_for_delivery',
    DELIVERED: 'delivered',
    DISPUTED: 'disputed',
    CANCELLED: 'cancelled',
  };
  return map[status] || 'awaiting_payment';
};

const mapToPrismaProvider = (provider: string): PaymentProvider => {
  const norm = (provider || '').toUpperCase().replace(/\s+/g, '_');
  if (norm.includes('TELEBIRR')) return PaymentProvider.TELEBIRR;
  if (norm.includes('CBE') || norm.includes('COMMERCIAL_BANK')) return PaymentProvider.CBE;
  if (norm.includes('AWASH')) return PaymentProvider.AWASH_BANK;
  if (norm.includes('ABYSSINIA')) return PaymentProvider.BANK_OF_ABYSSINIA;
  if (norm.includes('DASHEN')) return PaymentProvider.DASHEN_BANK;
  return PaymentProvider.TELEBIRR;
};

// Map Prisma order object to complete frontend Order interface
export const formatOrderForFrontend = (o: any) => {
  const latestReceipt = o.paymentReceipts?.[0];
  const primaryBank = o.business?.paymentAccounts?.[0] || {
    id: 'acc_default',
    provider: 'TELEBIRR',
    accountNumber: o.business?.phone || '0911000000',
    accountHolderName: o.business?.name || 'Azwari Merchant',
    isPrimary: true,
    verified: true,
  };

  const providerDisplayMap: Record<string, string> = {
    TELEBIRR: 'Telebirr',
    CBE: 'Commercial Bank of Ethiopia (CBE)',
    AWASH_BANK: 'Awash Bank',
    BANK_OF_ABYSSINIA: 'Bank of Abyssinia',
    DASHEN_BANK: 'Dashen Bank',
  };

  const subtotal = Number(o.subtotalAmount || 0);
  const deliveryFee = Number(o.deliveryFee || 0);
  const totalAmount = Number(o.totalAmount || 0);
  const agreedCommissionAmount = Number(o.commissionAmount || 0);
  const platformFeeAmount = Number(o.platformFee || Math.round(subtotal * 0.02));
  const supplierNetPayout = Number(o.supplierNetPayout || totalAmount - agreedCommissionAmount - platformFeeAmount);

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    publicAccessToken: o.publicAccessToken,
    supplierId: o.businessId,
    supplierName: o.business?.name || 'Merchant Supplier',
    salespersonId: o.salesPartnerId,
    salespersonName: o.salesPartner?.fullName || 'Sales Agent',
    salespersonPhone: o.salesPartner?.phone || '',
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    items: (o.items || []).map((it: any) => ({
      productId: it.productId,
      productName: it.product?.name || 'Product Item',
      variantId: it.variantId || undefined,
      variantName: it.variant?.name || undefined,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      lineSubtotal: Number(it.subtotal),
      commissionAmount: Number(it.commissionAmount || 0),
    })),
    subtotal,
    deliveryFee,
    discount: 0,
    totalAmount,
    agreedCommissionAmount,
    platformFeeAmount,
    supplierNetPayout,
    commissionTermsSnapshot: {
      type: 'percentage' as const,
      rateOrAmount: 12,
      calculationBasis: 'subtotal_excluding_delivery',
      version: 1,
    },
    orderStatus: prismaToUiStatus(o.status),
    paymentStatus:
      o.status === 'PAYMENT_SUBMITTED'
        ? 'submitted'
        : o.status === 'CONFIRMED' || o.status === 'SCHEDULED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED'
          ? 'verified'
          : o.status === 'CANCELLED'
            ? 'cancelled'
            : 'pending',
    paymentExpiresAt: o.paymentExpiresAt?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    selectedPaymentAccount: {
      id: primaryBank.id,
      provider: providerDisplayMap[primaryBank.provider] || 'Telebirr',
      accountNumber: primaryBank.accountNumber,
      accountHolderName: primaryBank.accountHolderName,
      isPrimary: primaryBank.isPrimary,
      verified: primaryBank.verified,
      instructions: primaryBank.instructions || 'Pay with your mobile banking app and upload screenshot receipt.',
    },
    delivery: {
      recipientName: o.buyerName,
      recipientPhone: o.buyerPhone,
      subcity: o.deliverySubcity,
      specificAddress: o.specificAddress,
      preferredDate: o.preferredDate || new Date().toISOString().split('T')[0],
      preferredTimeSlot: o.preferredTimeSlot || '09:00 - 13:00',
      specialInstructions: o.specialInstructions || undefined,
      assignedDriverName: o.assignedDriverName || undefined,
      assignedDriverPhone: o.assignedDriverPhone || undefined,
      scheduledAt: o.scheduledAt ? o.scheduledAt.toISOString() : undefined,
      dispatchedAt: o.dispatchedAt ? o.dispatchedAt.toISOString() : undefined,
      deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : undefined,
      deliveryNotes: o.deliveryNotes || undefined,
    },
    consent: {
      obtained: true,
      method: 'phone_call' as const,
      timestamp: o.createdAt.toISOString(),
      recordedBySalespersonId: o.salesPartnerId,
    },
    evidence: latestReceipt
      ? {
        id: latestReceipt.id,
        orderId: latestReceipt.orderId,
        attemptId: 'att_' + latestReceipt.id,
        provider: providerDisplayMap[latestReceipt.provider] || 'Telebirr',
        transactionReference: latestReceipt.transactionReference,
        amountShown: Number(latestReceipt.amountTransferred),
        submittedAt: latestReceipt.createdAt.toISOString(),
        receiptNote: latestReceipt.buyerNotes || undefined,
        receiptMockImage: latestReceipt.receiptImageUrl || undefined,
        verifierStatus: latestReceipt.verifiedAt
          ? ('verified' as const)
          : latestReceipt.rejectionReason
            ? ('rejected' as const)
            : ('pending' as const),
        verifiedAt: latestReceipt.verifiedAt ? latestReceipt.verifiedAt.toISOString() : undefined,
        verifiedBy: latestReceipt.verifiedBy || undefined,
        rejectionReason: latestReceipt.rejectionReason || undefined,
      }
      : undefined,
    idempotencyKey: 'idemp_' + o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
};

/**
 * GET /api/orders
 * Role-scoped list of orders
 */
orderRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let whereClause: any = {};

    if (user.role === 'admin') {
      // Admin sees all
      whereClause = {};
    } else if (user.role === 'supplier') {
      if (!user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile attached to supplier account' });
        return;
      }
      whereClause = { businessId: user.businessId };
    } else if (user.role === 'salesperson') {
      if (!user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'No sales partner profile attached to salesperson account' });
        return;
      }
      whereClause = { salesPartnerId: user.salesPartnerId };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: { include: { product: true, variant: true } },
        paymentReceipts: { orderBy: { createdAt: 'desc' } },
        commissionEscrow: true,
        business: { include: { paymentAccounts: true } },
        salesPartner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map(formatOrderForFrontend);
    res.status(200).json({ success: true, count: formatted.length, orders: formatted });
  } catch (error: any) {
    console.error('[Get Orders Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/public/:token
 * Public customer tracking endpoint
 */
orderRouter.get('/public/:token', async (req: any, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const order = await prisma.order.findUnique({
      where: { publicAccessToken: token },
      include: {
        items: { include: { product: true, variant: true } },
        paymentReceipts: { orderBy: { createdAt: 'desc' } },
        business: { include: { paymentAccounts: true } },
        salesPartner: true,
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found or tracking link invalid' });
      return;
    }

    res.status(200).json({ success: true, order: formatOrderForFrontend(order) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orders/:id
 * Single order with strict ownership verification
 */
orderRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, variant: true } },
        paymentReceipts: { orderBy: { createdAt: 'desc' } },
        commissionEscrow: true,
        business: { include: { paymentAccounts: true } },
        salesPartner: true,
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Ownership check
    if (user.role === 'supplier' && order.businessId !== user.businessId) {
      res.status(403).json({ success: false, error: 'Access denied: You do not own this order' });
      return;
    }
    if (user.role === 'salesperson' && order.salesPartnerId !== user.salesPartnerId) {
      res.status(403).json({ success: false, error: 'Access denied: You are not the assigned sales agent for this order' });
      return;
    }

    res.status(200).json({ success: true, order: formatOrderForFrontend(order) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orders
 * Zero-trust order creation with database sequence, atomic inventory reservation, and escrow ledger
 */
orderRouter.post(
  '/',
  requireAuth,
  requireRole('salesperson', 'admin'),
  orderLimiter,
  checkIdempotency('create_order'),
  validateBody(CreateOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const body = req.body;

      // Identify the salesperson profile
      let salesPartnerId = user.salesPartnerId;
      if (!salesPartnerId) {
        // Fallback for admin or linked agent
        const sp = await prisma.salesPartner.findFirst({
          where: {
            OR: [
              ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
              { email: user.email },
            ],
          },
        });
        salesPartnerId = sp?.id;
      }
      if (!salesPartnerId) {
        res.status(403).json({ success: false, error: 'No active sales agent profile found for this user account' });
        return;
      }

      const salesPartner = await prisma.salesPartner.findUnique({ where: { id: salesPartnerId } });
      if (!salesPartner) {
        res.status(404).json({ success: false, error: 'Sales agent profile not found' });
        return;
      }

      // Query product and verify existence, active status, and stock (lean select to avoid heavy image payloads)
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        select: {
          id: true,
          name: true,
          businessId: true,
          unitPrice: true,
          costPrice: true,
          stock: true,
          standardDeliveryFee: true,
          isActive: true,
          variants: true,
          business: { include: { paymentAccounts: true } },
        },
      });

      if (!product || !product.isActive) {
        res.status(404).json({ success: false, error: 'The requested product is unavailable or inactive' });
        return;
      }

      let selectedVariant: any = null;
      if (body.variantId) {
        selectedVariant = product.variants.find((v: any) => v.id === body.variantId);
        if (!selectedVariant) {
          res.status(400).json({ success: false, error: 'Invalid product variant selected' });
          return;
        }
      }

      // Check stock before entering transaction
      const requestedQty = body.quantity;
      if (product.stock < requestedQty) {
        res.status(400).json({
          success: false,
          error: `Insufficient product stock. Available: ${product.stock}, requested: ${requestedQty}`,
        });
        return;
      }
      if (selectedVariant && selectedVariant.stock < requestedQty) {
        res.status(400).json({
          success: false,
          error: `Insufficient variant stock. Available: ${selectedVariant.stock}, requested: ${requestedQty}`,
        });
        return;
      }

      // SERVER-SIDE ZERO-TRUST FINANCIAL MATH
      const basePrice = Number(product.unitPrice);
      const variantAdditional = selectedVariant ? Number(selectedVariant.additionalPrice) : 0;
      const effectiveUnitPrice = basePrice + variantAdditional;
      const subtotal = Math.round(effectiveUnitPrice * requestedQty);
      const deliveryFee = Number(product.standardDeliveryFee || 120);
      const totalAmount = subtotal + deliveryFee;

      // Default 12% commission or custom product commission
      const commissionRate = 0.12;
      const commissionAmount = Math.round(subtotal * commissionRate);
      const platformFee = Math.round(subtotal * 0.02); // 2% platform fee
      const supplierNetPayout = totalAmount - commissionAmount - platformFee;

      // Fetch PostgreSQL Sequence for order number
      const seqRes: Array<{ nextval: bigint }> = await prisma.$queryRaw`SELECT nextval('order_number_seq');`;
      const nextSeq = seqRes[0]?.nextval ? Number(seqRes[0].nextval) : Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-AA-${new Date().getFullYear()}-${nextSeq.toString().padStart(4, '0')}`;

      // Secure public tracking access token
      const publicAccessToken = 'tok_' + crypto.randomBytes(16).toString('hex');

      // 15-minute payment expiration window
      const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // ATOMIC TRANSACTION: Inventory reservation + Order creation + Escrow record + Platform Fee Ledger
      const newOrder = await prisma.$transaction(async (tx: any) => {
        // Atomic stock decrement with concurrency safety
        const productUpdate = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: requestedQty } },
          data: { stock: { decrement: requestedQty } },
        });

        if (productUpdate.count === 0) {
          throw new Error(`Insufficient inventory: Product ${product.name} ran out of stock.`);
        }

        if (selectedVariant) {
          const variantUpdate = await tx.productVariant.updateMany({
            where: { id: selectedVariant.id, stock: { gte: requestedQty } },
            data: { stock: { decrement: requestedQty } },
          });

          if (variantUpdate.count === 0) {
            throw new Error(`Insufficient inventory: Variant ${selectedVariant.name} ran out of stock.`);
          }
        }

        // Create Order
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            publicAccessToken,
            businessId: product.businessId,
            salesPartnerId: salesPartner.id,
            buyerName: body.buyerName,
            buyerPhone: body.buyerPhone,
            deliverySubcity: body.deliverySubcity,
            specificAddress: body.specificAddress,
            preferredDate: body.preferredDate || new Date().toISOString().split('T')[0],
            preferredTimeSlot: body.preferredTimeSlot || '09:00 - 13:00',
            specialInstructions: body.specialInstructions || null,
            subtotalAmount: subtotal,
            deliveryFee,
            totalAmount,
            commissionAmount,
            platformFee,
            supplierNetPayout,
            status: 'PENDING_PAYMENT',
            paymentExpiresAt,
            items: {
              create: [
                {
                  productId: product.id,
                  variantId: selectedVariant?.id || null,
                  quantity: requestedQty,
                  unitPrice: effectiveUnitPrice,
                  subtotal,
                  commissionAmount,
                },
              ],
            },
            commissionEscrow: {
              create: {
                salesPartnerId: salesPartner.id,
                amount: commissionAmount,
                status: 'PENDING_ESCROW',
              },
            },
            platformFeeLedger: {
              create: {
                orderNumber,
                businessId: product.businessId,
                amount: platformFee,
                rate: 0.02,
                status: 'accrued',
              },
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, unitPrice: true },
                },
                variant: true,
              },
            },
            commissionEscrow: true,
            business: { include: { paymentAccounts: true } },
            salesPartner: true,
          },
        });

        // Update sales partner pending commissions
        await tx.salesPartner.update({
          where: { id: salesPartner.id },
          data: {
            pendingCommissions: { increment: commissionAmount },
          },
        });

        // Rule 2 & Ledger: Move commission from merchant available balance to locked balance
        await WalletService.lockCommission(
          createdOrder.id,
          product.businessId,
          etbToCents(commissionAmount),
          tx
        );

        return createdOrder;
      }, {
        maxWait: 10000,
        timeout: 20000,
      });

      // Post-commit side effects: Audit Log (failsafe)
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || salesPartner.fullName,
            action: 'CREATE_ORDER',
            entityType: 'Order',
            entityId: newOrder.id,
            businessId: product.businessId,
            description: `Order ${newOrder.orderNumber} placed for buyer ${body.buyerName} (${body.buyerPhone}). Subtotal: ETB ${subtotal}, Total: ETB ${totalAmount}. Commission reserved in escrow: ETB ${commissionAmount}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      // Post-commit side effects: SMS Dispatch (failsafe, will not roll back financial transaction)
      const primaryAccount = product.business?.paymentAccounts?.[0];
      const payProviderName = primaryAccount?.provider ? primaryAccount.provider.replace('_', ' ') : 'Telebirr';
      const payAccNum = primaryAccount?.accountNumber || product.business.phone;
      const payHolder = primaryAccount?.accountHolderName || product.business.name;
      const trackingUrl = `https://azwari.et/order/${newOrder.orderNumber}?token=${newOrder.publicAccessToken}`;

      const smsText = `Azwari: ${salesPartner.fullName} created order #${newOrder.orderNumber}. Total: ETB ${totalAmount.toLocaleString()}. Pay via ${payProviderName}: ${payAccNum} (${payHolder}). Submit receipt within 15 min: ${trackingUrl}`;

      SmsEthiopiaService.sendSms({
        recipientPhone: body.buyerPhone,
        messageBody: smsText,
        orderNumber: newOrder.orderNumber,
        templateName: 'order_payment_instructions',
      }).catch((err) => console.warn('[SMS Dispatch Notice]', err));

      res.status(201).json({ success: true, order: formatOrderForFrontend(newOrder) });
    } catch (error: any) {
      console.error('[Create Order Error]', error);
      if (error instanceof InsufficientBalanceError || error.code === 'INSUFFICIENT_BALANCE') {
        res.status(402).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error.message || 'Failed to create order' });
    }
  }
);

/**
 * POST /api/orders/:id/evidence
 * Submits payment evidence. Allowed by authenticated agent or public customer with valid token.
 */
orderRouter.post(
  '/:id/evidence',
  optionalAuth,
  validateBody(PaymentEvidenceSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body;
      const token = (req.query.token as string) || (req.headers['x-tracking-token'] as string);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true, variant: true } },
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // Authorization verification: Either user is authenticated (salesperson/supplier/admin) OR token matches
      const isAuthorizedUser =
        req.user &&
        (req.user.role === 'admin' ||
          (req.user.role === 'salesperson' && req.user.salesPartnerId === order.salesPartnerId) ||
          (req.user.role === 'supplier' && req.user.businessId === order.businessId));

      const isAuthorizedToken = token && token === order.publicAccessToken;

      if (!isAuthorizedUser && !isAuthorizedToken) {
        res.status(403).json({ success: false, error: 'Unauthorized: Valid credentials or public tracking token required.' });
        return;
      }

      // State machine guard: Only allow evidence submission if awaiting payment or re-submitting after review
      if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_SUBMITTED') {
        res.status(409).json({
          success: false,
          error: `Cannot submit payment evidence for an order in status '${order.status}'`,
        });
        return;
      }

      // Check payment expiration window
      if (new Date() > order.paymentExpiresAt) {
        res.status(400).json({
          success: false,
          error: 'Payment window for this order has expired. Please contact support or request a window extension.',
        });
        return;
      }

      const receiptImage = body.receiptImageUrl || body.receiptMockImage || null;

      // In transaction: Create receipt record and update status
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        await tx.paymentReceipt.create({
          data: {
            orderId: order.id,
            provider: mapToPrismaProvider(body.provider),
            transactionReference: body.transactionReference,
            amountTransferred: body.amountShown,
            receiptImageUrl: receiptImage,
            buyerNotes: body.receiptNote || null,
          },
        });

        return await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAYMENT_SUBMITTED',
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

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: req.user?.role || 'customer',
            actorName: req.user?.fullName || order.buyerName,
            action: 'SUBMIT_PAYMENT_EVIDENCE',
            entityType: 'Order',
            entityId: order.id,
            businessId: order.businessId,
            description: `Payment evidence submitted for order #${order.orderNumber}. Ref: ${body.transactionReference}, Amount: ETB ${body.amountShown}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      res.status(200).json({ success: true, order: formatOrderForFrontend(updatedOrder) });
    } catch (error: any) {
      console.error('[Submit Evidence Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to submit payment evidence' });
    }
  }
);

/**
 * POST /api/orders/:id/verify-payment
 * Supplier verifies or rejects the payment receipt
 */
orderRouter.post(
  '/:id/verify-payment',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(VerifyPaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { approved, rejectionReason } = req.body;
      const user = req.user!;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          business: true,
        },
      });

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // Ownership check
      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }

      // State machine guard: Must be in PAYMENT_SUBMITTED or PENDING_PAYMENT
      if (order.status !== 'PAYMENT_SUBMITTED' && order.status !== 'PENDING_PAYMENT') {
        res.status(409).json({
          success: false,
          error: `Cannot verify payment for order currently in '${order.status}' status`,
        });
        return;
      }

      const latestReceipt = order.paymentReceipts[0];

      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        if (approved) {
          if (latestReceipt) {
            await tx.paymentReceipt.update({
              where: { id: latestReceipt.id },
              data: {
                verifiedAt: new Date(),
                verifiedBy: user.fullName || 'Merchant Supplier',
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
        } else {
          if (latestReceipt) {
            await tx.paymentReceipt.update({
              where: { id: latestReceipt.id },
              data: {
                rejectionReason: rejectionReason || 'Payment could not be verified with the bank.',
              },
            });
          }

          // Revert to awaiting payment and extend expiration by 15 minutes to allow re-upload
          return await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'PENDING_PAYMENT',
              paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
            include: {
              items: { include: { product: true, variant: true } },
              paymentReceipts: { orderBy: { createdAt: 'desc' } },
              commissionEscrow: true,
              business: { include: { paymentAccounts: true } },
              salesPartner: true,
            },
          });
        }
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Merchant Supplier',
            action: approved ? 'VERIFY_PAYMENT' : 'REJECT_PAYMENT',
            entityType: 'Order',
            entityId: order.id,
            businessId: order.businessId,
            description: approved
              ? `Supplier verified payment receipt for order #${order.orderNumber}. Order marked CONFIRMED.`
              : `Supplier rejected payment receipt for order #${order.orderNumber}. Reason: ${rejectionReason}`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      // Notification SMS
      if (approved) {
        SmsEthiopiaService.sendSms({
          recipientPhone: order.buyerPhone,
          messageBody: `Azwari: Payment for order #${order.orderNumber} is verified! Your order is being packed for delivery.`,
          orderNumber: order.orderNumber,
          templateName: 'order_payment_verified',
        }).catch(() => { });
      } else {
        SmsEthiopiaService.sendSms({
          recipientPhone: order.buyerPhone,
          messageBody: `Azwari: Payment receipt for order #${order.orderNumber} could not be verified: ${rejectionReason || 'Please resubmit valid proof'}. Link: https://azwari.et/order/${order.orderNumber}?token=${order.publicAccessToken}`,
          orderNumber: order.orderNumber,
          templateName: 'order_payment_rejected',
        }).catch(() => { });
      }

      res.status(200).json({ success: true, order: formatOrderForFrontend(updatedOrder) });
    } catch (error: any) {
      console.error('[Verify Payment Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to verify payment' });
    }
  }
);

/**
 * POST /api/orders/:id/schedule
 * Supplier schedules delivery and assigns courier details
 */
orderRouter.post(
  '/:id/schedule',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(ScheduleDeliverySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body;
      const user = req.user!;

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }

      if (order.status !== 'CONFIRMED' && order.status !== 'SCHEDULED') {
        res.status(409).json({
          success: false,
          error: `Order must be verified/confirmed before scheduling. Current status: ${order.status}`,
        });
        return;
      }

      const scheduledDate = new Date(body.scheduledDate);

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: 'SCHEDULED',
          assignedDriverName: body.assignedDriverName,
          assignedDriverPhone: body.assignedDriverPhone,
          scheduledAt: isNaN(scheduledDate.getTime()) ? new Date() : scheduledDate,
          preferredDate: body.scheduledDate,
          preferredTimeSlot: body.scheduledTimeSlot,
          deliveryNotes: body.notes || order.deliveryNotes,
        },
        include: {
          items: { include: { product: true, variant: true } },
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          commissionEscrow: true,
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Merchant Supplier',
            action: 'SCHEDULE_ORDER',
            entityType: 'Order',
            entityId: updated.id,
            businessId: updated.businessId,
            description: `Scheduled delivery for order #${updated.orderNumber}. Driver: ${body.assignedDriverName} (${body.assignedDriverPhone}), Slot: ${body.scheduledTimeSlot}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      // Notify customer
      SmsEthiopiaService.sendSms({
        recipientPhone: updated.buyerPhone,
        messageBody: `Azwari: Order #${updated.orderNumber} scheduled for delivery on ${body.scheduledDate} (${body.scheduledTimeSlot}). Driver: ${body.assignedDriverName} (${body.assignedDriverPhone}).`,
        orderNumber: updated.orderNumber,
        templateName: 'order_scheduled',
      }).catch(() => { });

      res.status(200).json({ success: true, order: formatOrderForFrontend(updated) });
    } catch (error: any) {
      console.error('[Schedule Order Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to schedule delivery' });
    }
  }
);

/**
 * POST /api/orders/:id/dispatch
 * Supplier marks order as dispatched / out for delivery
 */
orderRouter.post(
  '/:id/dispatch',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(DispatchOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const body = req.body;

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }

      if (order.status !== 'CONFIRMED' && order.status !== 'SCHEDULED') {
        res.status(409).json({
          success: false,
          error: `Order must be CONFIRMED or SCHEDULED to dispatch. Current status: ${order.status}`,
        });
        return;
      }

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
          deliveryNotes: body.notes ? `${order.deliveryNotes || ''} | ${body.notes}` : order.deliveryNotes,
        },
        include: {
          items: { include: { product: true, variant: true } },
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          commissionEscrow: true,
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Merchant Supplier',
            action: 'DISPATCH_ORDER',
            entityType: 'Order',
            entityId: updated.id,
            businessId: updated.businessId,
            description: `Order #${updated.orderNumber} dispatched out for delivery.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      // Notify customer
      SmsEthiopiaService.sendSms({
        recipientPhone: updated.buyerPhone,
        messageBody: `Azwari: Order #${updated.orderNumber} is now out for delivery to ${updated.deliverySubcity}. Driver will contact you shortly.`,
        orderNumber: updated.orderNumber,
        templateName: 'order_dispatched',
      }).catch(() => { });

      res.status(200).json({ success: true, order: formatOrderForFrontend(updated) });
    } catch (error: any) {
      console.error('[Dispatch Order Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to dispatch order' });
    }
  }
);

/**
 * POST /api/orders/:id/deliver
 * Confirms customer receipt, moves commission escrow to ELIGIBLE, updates agent balance
 */
orderRouter.post(
  '/:id/deliver',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(DeliverOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const body = req.body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          commissionEscrow: true,
          salesPartner: true,
        },
      });

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }

      if (order.status !== 'DISPATCHED') {
        res.status(409).json({
          success: false,
          error: `Order must be in DISPATCHED status to confirm delivery. Current status: ${order.status}`,
        });
        return;
      }

      // ATOMIC TRANSACTION: Order -> DELIVERED, Escrow -> ELIGIBLE, SalesPartner -> balances, PlatformFeeLedger -> secured
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        // 1. Order status
        const ord = await tx.order.update({
          where: { id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            deliveryNotes: body.proofNotes ? `${order.deliveryNotes || ''} | Proof: ${body.proofNotes}` : order.deliveryNotes,
          },
          include: {
            items: { include: { product: true, variant: true } },
            paymentReceipts: { orderBy: { createdAt: 'desc' } },
            commissionEscrow: true,
            business: { include: { paymentAccounts: true } },
            salesPartner: true,
          },
        });

        // 2. Commission Escrow unlock
        if (order.commissionEscrow) {
          await tx.commissionEscrow.update({
            where: { id: order.commissionEscrow.id },
            data: {
              status: 'ELIGIBLE',
              eligibleAt: new Date(),
            },
          });

          // 3. Update agent balances
          const commAmount = Number(order.commissionEscrow.amount);
          await tx.salesPartner.update({
            where: { id: order.salesPartnerId },
            data: {
              totalAttributedSales: { increment: order.subtotalAmount },
              eligibleCommissions: { increment: commAmount },
              pendingCommissions: { decrement: commAmount },
            },
          });
        }

        // 4. Secure platform fee ledger
        await tx.platformFeeLedger.updateMany({
          where: { orderId: order.id },
          data: { status: 'secured' },
        });

        // 5. Wallet Ledger: Move commission from merchant locked balance to salesperson available balance
        await WalletService.settleCommission(order.id, tx);

        return ord;
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Merchant Supplier',
            action: 'CONFIRM_DELIVERY',
            entityType: 'Order',
            entityId: order.id,
            businessId: order.businessId,
            description: `Order #${order.orderNumber} successfully delivered. Commission ETB ${order.commissionAmount} unlocked to ELIGIBLE for agent ${order.salesPartner.fullName}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      // Customer Thank-You SMS
      SmsEthiopiaService.sendSms({
        recipientPhone: order.buyerPhone,
        messageBody: `Azwari: Order #${order.orderNumber} has been delivered successfully! Thank you for purchasing from verified Ethiopian businesses.`,
        orderNumber: order.orderNumber,
        templateName: 'order_delivered',
      }).catch(() => { });

      res.status(200).json({ success: true, order: formatOrderForFrontend(updatedOrder) });
    } catch (error: any) {
      console.error('[Deliver Order Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to confirm delivery' });
    }
  }
);

/**
 * POST /api/orders/:id/extend-payment
 * Extends the payment window by 15 minutes
 */
orderRouter.post(
  '/:id/extend-payment',
  optionalAuth,
  validateBody(ExtendPaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { additionalMinutes = 15 } = req.body;
      const token = (req.query.token as string) || (req.headers['x-tracking-token'] as string);

      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // Authorization check
      const isAuthorizedUser =
        req.user &&
        (req.user.role === 'admin' ||
          (req.user.role === 'salesperson' && req.user.salesPartnerId === order.salesPartnerId) ||
          (req.user.role === 'supplier' && req.user.businessId === order.businessId));

      const isAuthorizedToken = token && token === order.publicAccessToken;

      if (!isAuthorizedUser && !isAuthorizedToken) {
        res.status(403).json({ success: false, error: 'Unauthorized to extend payment window' });
        return;
      }

      if (order.status !== 'PENDING_PAYMENT') {
        res.status(409).json({
          success: false,
          error: `Can only extend payment window for orders in PENDING_PAYMENT status. Current: ${order.status}`,
        });
        return;
      }

      const currentExpiry = new Date(order.paymentExpiresAt).getTime();
      const baseTime = Math.max(Date.now(), currentExpiry);
      const newExpiry = new Date(baseTime + additionalMinutes * 60 * 1000);

      const updated = await prisma.order.update({
        where: { id },
        data: { paymentExpiresAt: newExpiry },
        include: {
          items: { include: { product: true, variant: true } },
          paymentReceipts: { orderBy: { createdAt: 'desc' } },
          commissionEscrow: true,
          business: { include: { paymentAccounts: true } },
          salesPartner: true,
        },
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: req.user?.role || 'customer',
            actorName: req.user?.fullName || order.buyerName,
            action: 'EXTEND_PAYMENT_WINDOW',
            entityType: 'Order',
            entityId: order.id,
            businessId: order.businessId,
            description: `Payment window for order #${order.orderNumber} extended by ${additionalMinutes} minutes until ${newExpiry.toISOString()}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      res.status(200).json({ success: true, order: formatOrderForFrontend(updated) });
    } catch (error: any) {
      console.error('[Extend Payment Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to extend payment window' });
    }
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancels order, restores inventory, forfeits escrow, reverses platform fee
 */
orderRouter.post(
  '/:id/cancel',
  requireAuth,
  validateBody(CancelOrderSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          commissionEscrow: true,
        },
      });

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // Ownership check
      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }
      if (user.role === 'salesperson' && order.salesPartnerId !== user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'Forbidden: You are not the assigned agent for this order' });
        return;
      }

      // State machine guard: Cannot cancel already DELIVERED orders
      if (order.status === 'DELIVERED') {
        res.status(409).json({
          success: false,
          error: 'Delivered orders cannot be cancelled directly. Please open a dispute.',
        });
        return;
      }
      if (order.status === 'CANCELLED') {
        res.status(409).json({ success: false, error: 'Order is already cancelled' });
        return;
      }

      // ATOMIC TRANSACTION: Restore stock, cancel order, forfeit escrow, reverse platform fee
      const updatedOrder = await prisma.$transaction(async (tx: any) => {
        // 1. Cancel order
        const cancelled = await tx.order.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            deliveryNotes: `${order.deliveryNotes || ''} | Cancelled: ${reason}`,
          },
          include: {
            items: { include: { product: true, variant: true } },
            paymentReceipts: { orderBy: { createdAt: 'desc' } },
            commissionEscrow: true,
            business: { include: { paymentAccounts: true } },
            salesPartner: true,
          },
        });

        // 2. Restore stock for each item
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        // 3. Forfeit escrow commission and update agent pending balance
        if (order.commissionEscrow && order.commissionEscrow.status === 'PENDING_ESCROW') {
          await tx.commissionEscrow.update({
            where: { id: order.commissionEscrow.id },
            data: { status: 'FORFEITED' },
          });

          await tx.salesPartner.update({
            where: { id: order.salesPartnerId },
            data: {
              pendingCommissions: { decrement: Number(order.commissionEscrow.amount) },
            },
          });
        }

        // 4. Reverse platform fee ledger
        await tx.platformFeeLedger.updateMany({
          where: { orderId: order.id },
          data: { status: 'reversed' },
        });

        // 5. Wallet Ledger: Release locked commission back to merchant available balance
        await WalletService.releaseCommission(order.id, tx);

        return cancelled;
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'User',
            action: 'CANCEL_ORDER',
            entityType: 'Order',
            entityId: order.id,
            businessId: order.businessId,
            description: `Order #${order.orderNumber} cancelled by ${user.role} ${user.fullName}. Reason: ${reason}. Stock restored.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      res.status(200).json({ success: true, order: formatOrderForFrontend(updatedOrder) });
    } catch (error: any) {
      console.error('[Cancel Order Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to cancel order' });
    }
  }
);
