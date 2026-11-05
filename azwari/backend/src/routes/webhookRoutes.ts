import { Router, Request, Response } from 'express';
import { ChapaService } from '../services/chapaService.js';
import { WalletService } from '../services/walletService.js';
import { prisma, PaymentProvider } from '../prisma.js';
import { cacheService } from '../services/cacheService.js';
import { realtimeEmitter } from './realtimeRoutes.js';

export const webhookRouter = Router();

/**
 * POST /api/webhooks/chapa
 * Secure webhook receiver for Chapa payment & transfer events
 */
webhookRouter.post('/chapa', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBody: Buffer | string = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-chapa-signature'] || req.headers['chapa-signature']) as string | undefined;

    // 1. Verify Webhook HMAC-SHA256 Signature with constant-time comparison
    const isSignatureValid = ChapaService.verifyWebhookSignature(rawBody, signature);
    if (!isSignatureValid) {
      console.warn('[CHAPA WEBHOOK SECURITY REJECTION] Invalid or missing x-chapa-signature header');
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid webhook signature' });
      return;
    }

    const payload = req.body;
    console.log('[CHAPA WEBHOOK RECEIVED]', JSON.stringify({
      event: payload.event,
      type: payload.type,
      reference: payload.reference || payload.tx_ref,
      status: payload.status,
    }));

    // Respond 200 immediately to prevent timeouts from Chapa
    res.status(200).json({ success: true, message: 'Webhook received' });

    // 2. Process asynchronous business logic
    // Determine event classification: Transfer/Payout vs Deposit
    const isPayout =
      payload.type === 'Payout' ||
      payload.webhook_type === 'payout' ||
      payload.event === 'payout.complete' ||
      String(payload.reference || '').startsWith('POW-') ||
      String(payload.tx_ref || '').startsWith('POW-');

    if (isPayout) {
      // HANDLE PAYOUT / WITHDRAWAL
      const payoutRef = payload.reference || payload.merchant_reference || payload.tx_ref;
      if (!payoutRef) {
        console.warn('[CHAPA WEBHOOK PAYOUT] No reference found in payload');
        return;
      }

      try {
        // Verify transfer status with Chapa
        const verification = await ChapaService.verifyTransfer(payoutRef);

        if (verification.status === 'success' || payload.status === 'success') {
          await WalletService.confirmWithdrawal(payoutRef, payload.id || payload.transfer_id, payload);
          await cacheService.delPattern('cache:wallet:*');
          realtimeEmitter.emit('change', { type: 'WALLET_UPDATED' });
          console.log(`✅ [PAYOUT SUCCESS] Payout ${payoutRef} confirmed and marked SUCCESS.`);
        } else if (verification.status === 'failed' || payload.status === 'failed') {
          const reason = payload.reason || payload.message || 'Transfer failed at Chapa';
          await WalletService.refundWithdrawal(payoutRef, reason, payload);
          await cacheService.delPattern('cache:wallet:*');
          realtimeEmitter.emit('change', { type: 'WALLET_UPDATED' });
          console.log(`🔄 [PAYOUT REFUNDED] Payout ${payoutRef} failed. Held funds refunded to agent wallet.`);
        }
      } catch (payoutErr) {
        console.error(`❌ [CHAPA WEBHOOK PAYOUT PROCESSING ERROR] Payout ${payoutRef}:`, payoutErr);
      }
    } else {
      // HANDLE DEPOSIT
      const txRef = payload.tx_ref || payload.reference;
      if (!txRef) {
        console.warn('[CHAPA WEBHOOK DEPOSIT] No tx_ref found in payload');
        return;
      }

      try {
        // Verify transaction with Chapa API
        const verification = await ChapaService.verifyTransaction(txRef);

        if (verification.status !== 'success') {
          console.warn(`[CHAPA WEBHOOK DEPOSIT] Verification status is ${verification.status} for ${txRef}`);
          return;
        }

        // Fetch pending deposit from database
        const deposit = await prisma.deposit.findUnique({
          where: { txRef },
        });

        if (!deposit) {
          // Check if this txRef belongs to a customer order payment
          const matchingOrder = await prisma.order.findFirst({
            where: {
              OR: [
                { orderNumber: txRef },
                { deliveryNotes: { contains: txRef } },
              ],
            },
          });

          if (matchingOrder) {
            if (!['CONFIRMED', 'SCHEDULED', 'DISPATCHED', 'DELIVERED'].includes(matchingOrder.status)) {
              await prisma.$transaction(async (tx: any) => {
                await tx.order.update({
                  where: { id: matchingOrder.id },
                  data: {
                    status: 'CONFIRMED',
                    deliveryNotes: `${matchingOrder.deliveryNotes || ''} | Verified via Chapa Webhook: ${txRef}`,
                  },
                });

                const existingReceipt = await tx.paymentReceipt.findFirst({
                  where: { orderId: matchingOrder.id, transactionReference: txRef },
                });
                if (!existingReceipt) {
                  await tx.paymentReceipt.create({
                    data: {
                      orderId: matchingOrder.id,
                      provider: PaymentProvider.TELEBIRR,
                      transactionReference: txRef,
                      amountTransferred: matchingOrder.totalAmount,
                      buyerNotes: `Chapa Webhook Verified: ${txRef}`,
                      verifiedAt: new Date(),
                      verifiedBy: 'CHAPA_WEBHOOK',
                    },
                  });
                }
              });
              await cacheService.delPattern('cache:orders:*');
              await cacheService.delPattern('cache:commissions:*');
              realtimeEmitter.emit('change', { type: 'ORDER_PAYMENT_VERIFIED', orderId: matchingOrder.id });
              console.log(`✅ [ORDER CHAPA PAYMENT CONFIRMED] Order ${matchingOrder.orderNumber} verified via Chapa webhook.`);
            }
            return;
          }

          console.error(`[CHAPA WEBHOOK] Neither deposit nor order found for txRef: ${txRef}`);
          return;
        }

        // Verify that amount matches database expected amount (Server-side zero-trust check)
        if (BigInt(deposit.amount) !== verification.amountCents) {
          console.error(
            `[CHAPA WEBHOOK AMOUNT MISMATCH] Expected ${deposit.amount} cents, received ${verification.amountCents} cents for txRef ${txRef}`
          );
          return;
        }

        // Credit the merchant wallet idempotently
        await WalletService.creditDeposit({
          walletId: deposit.walletId,
          amountCents: deposit.amount,
          txRef,
          chapaReference: verification.reference || payload.reference,
          rawPayload: payload,
        });

        await cacheService.delPattern('cache:wallet:*');
        realtimeEmitter.emit('change', { type: 'WALLET_UPDATED' });
        console.log(`✅ [DEPOSIT SUCCESS] Merchant wallet ${deposit.walletId} credited with ${deposit.amount} cents.`);
      } catch (depositErr) {
        console.error(`❌ [CHAPA WEBHOOK DEPOSIT PROCESSING ERROR] txRef ${txRef}:`, depositErr);
      }
    }
  } catch (err: any) {
    console.error('[CHAPA WEBHOOK UNHANDLED ERROR]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || 'Webhook processing failed' });
    }
  }
});
