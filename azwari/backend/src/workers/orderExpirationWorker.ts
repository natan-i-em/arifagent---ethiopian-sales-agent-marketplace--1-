import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { WalletService } from '../services/walletService.js';

export function startOrderExpirationWorker() {
  console.log('⏱️  [ORDER EXPIRATION WORKER] Initialized - running every minute');

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find orders awaiting payment whose window has expired
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING_PAYMENT',
          paymentExpiresAt: {
            lte: now,
          },
        },
        include: {
          items: true,
        },
      });

      if (expiredOrders.length === 0) return;

      console.log(`⏱️  [ORDER EXPIRATION WORKER] Found ${expiredOrders.length} expired orders to auto-cancel.`);

      for (const order of expiredOrders) {
        try {
          await prisma.$transaction(async (tx) => {
            // Check status again inside transaction to prevent race conditions
            const fresh = await tx.order.findUnique({
              where: { id: order.id },
              select: { status: true },
            });
            if (fresh?.status !== 'PENDING_PAYMENT') return;

            // 1. Cancel the order
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                deliveryNotes: order.deliveryNotes
                  ? `${order.deliveryNotes} | Auto-cancelled: Payment window expired`
                  : 'Auto-cancelled: Payment window expired',
              },
            });

            // 2. Restore stock
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { increment: item.quantity },
                },
              });

              if (item.variantId) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: {
                    stock: { increment: item.quantity },
                  },
                });
              }
            }

            // 3. Forfeit escrow commission if pending
            await tx.commissionEscrow.updateMany({
              where: {
                orderId: order.id,
                status: 'PENDING_ESCROW',
              },
              data: {
                status: 'FORFEITED',
              },
            });

            // 4. Reverse platform fee ledger
            await tx.platformFeeLedger.updateMany({
              where: {
                orderId: order.id,
                status: 'accrued',
              },
              data: {
                status: 'reversed',
              },
            });

            // 5. Release locked commission back to merchant available balance
            await WalletService.releaseCommission(order.id, tx);

            // 6. Audit log
            await tx.auditLog.create({
              data: {
                actorRole: 'system',
                actorName: 'Order Expiration Worker',
                action: 'ORDER_AUTO_CANCELLED',
                entityType: 'Order',
                entityId: order.id,
                businessId: order.businessId,
                description: `Order ${order.orderNumber} automatically cancelled because payment window expired. Stock restored.`,
              },
            });
          });

          console.log(`⏱️  [ORDER EXPIRATION WORKER] Auto-cancelled order ${order.orderNumber} and restored stock.`);
        } catch (itemErr) {
          console.error(`❌ [ORDER EXPIRATION WORKER] Failed to process order ${order.orderNumber}:`, itemErr);
        }
      }
    } catch (err) {
      console.error('❌ [ORDER EXPIRATION WORKER ERROR]', err);
    }
  });
}
