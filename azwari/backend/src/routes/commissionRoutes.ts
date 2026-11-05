import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, SettleCommissionsSchema } from '../middleware/zodValidators.js';
import { realtimeEmitter } from './realtimeRoutes.js';
import { cacheService } from '../services/cacheService.js';

export const commissionRouter = Router();

const prismaToUiCommStatus = (s: string) => {
  const map: Record<string, string> = {
    PENDING_ESCROW: 'pending',
    ELIGIBLE: 'eligible',
    PAID: 'paid',
    FORFEITED: 'reversed',
  };
  return map[s] || 'pending';
};

/**
 * GET /api/commissions
 * Role-scoped retrieval of commission ledger entries
 */
commissionRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const cacheKey = `cache:commissions:${user.role}:${user.salesPartnerId || user.businessId || 'all'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    let whereClause: any = {};

    if (user.role === 'admin') {
      whereClause = {};
    } else if (user.role === 'salesperson') {
      if (!user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'No sales partner profile found' });
        return;
      }
      whereClause = { salesPartnerId: user.salesPartnerId };
    } else if (user.role === 'supplier') {
      if (!user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile found' });
        return;
      }
      whereClause = { order: { businessId: user.businessId } };
    }

    const escrows = await prisma.commissionEscrow.findMany({
      where: whereClause,
      include: {
        order: { include: { business: true } },
        salesPartner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = escrows.map((e: any) => ({
      id: e.id,
      orderId: e.orderId,
      orderNumber: e.order?.orderNumber || 'ORD-N/A',
      salespersonId: e.salesPartnerId,
      salespersonName: e.salesPartner?.fullName || 'Sales Agent',
      supplierId: e.order?.businessId || '',
      supplierName: e.order?.business?.name || 'Merchant Supplier',
      amount: Number(e.amount),
      calculationNote: `Sales commission on order #${e.order?.orderNumber || 'N/A'}`,
      status: prismaToUiCommStatus(e.status),
      eligibleAt: e.eligibleAt ? e.eligibleAt.toISOString() : undefined,
      paidAt: e.settledAt ? e.settledAt.toISOString() : undefined,
      settlementBatchId: e.settlementBatchId || undefined,
      createdAt: e.createdAt.toISOString(),
    }));

    const responsePayload = { success: true, count: formatted.length, commissions: formatted };
    await cacheService.set(cacheKey, responsePayload, 60);
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[Get Commissions Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch commissions' });
  }
});

/**
 * GET /api/commissions/batches
 * Returns settlement payout batches
 */
commissionRouter.get('/batches', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const cacheKey = `cache:commissions:batches:${user.role}:${user.salesPartnerId || user.businessId || 'all'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    let whereClause: any = {};

    if (user.role === 'admin') {
      whereClause = {};
    } else if (user.role === 'salesperson') {
      if (!user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'No sales partner profile found' });
        return;
      }
      whereClause = { salesPartnerId: user.salesPartnerId };
    } else if (user.role === 'supplier') {
      if (!user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile found' });
        return;
      }
      whereClause = {
        commissions: {
          some: {
            order: {
              businessId: user.businessId,
            },
          },
        },
      };
    } else {
      res.status(403).json({ success: false, error: 'Unauthorized role' });
      return;
    }

    const batches = await prisma.settlementBatch.findMany({
      where: whereClause,
      include: { salesPartner: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = batches.map((b: any) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      recipientName: b.salesPartner?.fullName || 'Sales Agent',
      salespersonId: b.salesPartnerId,
      totalAmount: Number(b.totalAmount),
      payoutMethod: b.payoutMethod,
      destinationAccount: b.destinationAccount,
      transactionReference: b.transactionReference,
      status: b.status,
      settledAt: b.settledAt ? b.settledAt.toISOString() : b.createdAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
    }));

    const responsePayload = { success: true, count: formatted.length, batches: formatted };
    await cacheService.set(cacheKey, responsePayload, 60);
    res.status(200).json(responsePayload);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commissions/settle
 * Supplier or Admin execution of commission payouts in an atomic transaction
 * Calculates 80% net payout to the sales agent and 20% platform marketplace fee
 */
commissionRouter.post(
  '/settle',
  requireAuth,
  requireRole('admin', 'supplier'),
  validateBody(SettleCommissionsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { salespersonId, payoutMethod, transactionReference, entryIds, receiptImageUrl } = req.body;

      if (user.role === 'supplier' && !user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile found' });
        return;
      }

      // Idempotency check on transactionReference
      if (transactionReference) {
        const existingBatch = await prisma.settlementBatch.findFirst({
          where: { transactionReference },
          include: { salesPartner: true },
        });

        if (existingBatch) {
          res.status(200).json({
            success: true,
            message: 'Settlement already processed for this transaction reference (idempotent)',
            batch: {
              id: existingBatch.id,
              batchNumber: existingBatch.batchNumber,
              recipientName: existingBatch.salesPartner.fullName,
              totalAmount: Number(existingBatch.totalAmount),
              payoutMethod: existingBatch.payoutMethod,
              destinationAccount: existingBatch.destinationAccount,
              transactionReference: existingBatch.transactionReference,
              status: existingBatch.status,
              settledAt: existingBatch.settledAt?.toISOString(),
            },
          });
          return;
        }
      }

      const partner = await prisma.salesPartner.findUnique({
        where: { id: salespersonId },
      });

      if (!partner) {
        res.status(404).json({ success: false, error: 'Sales agent partner not found' });
        return;
      }

      // Query eligible escrows to settle
      const escrowWhere: any = {
        salesPartnerId: partner.id,
        status: 'ELIGIBLE',
      };
      if (user.role === 'supplier') {
        escrowWhere.order = { businessId: user.businessId };
      }
      if (entryIds && entryIds.length > 0) {
        escrowWhere.id = { in: entryIds };
      }

      const eligibleEscrows = await prisma.commissionEscrow.findMany({
        where: escrowWhere,
        include: { order: true },
      });

      if (eligibleEscrows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No eligible commissions available for settlement for this sales agent',
        });
        return;
      }

      const totalGross = eligibleEscrows.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      // Net payout to sales agent (80%), Platform marketplace cut (20%)
      const netPayout = Math.round(totalGross * 0.8 * 100) / 100;
      const platformFee = Math.round((totalGross - netPayout) * 100) / 100;
      const batchNumber = `SETTLE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const destinationAccount = partner.payoutAccountNumber || partner.phone || 'N/A';

      // ATOMIC TRANSACTION: Create batch, update escrows to PAID, decrement eligible balance, increment paid balance
      const batch = await prisma.$transaction(async (tx: any) => {
        const createdBatch = await tx.settlementBatch.create({
          data: {
            batchNumber,
            salesPartnerId: partner.id,
            totalAmount: netPayout,
            payoutMethod,
            destinationAccount,
            transactionReference,
            status: 'settled',
            settledAt: new Date(),
          },
        });

        const escrowIds = eligibleEscrows.map((e: any) => e.id);
        await tx.commissionEscrow.updateMany({
          where: { id: { in: escrowIds } },
          data: {
            status: 'PAID',
            settledAt: new Date(),
            settlementBatchId: createdBatch.id,
          },
        });

        await tx.salesPartner.update({
          where: { id: partner.id },
          data: {
            eligibleCommissions: { decrement: totalGross },
            paidCommissions: { increment: netPayout },
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || (user.role === 'supplier' ? 'Merchant Supplier' : 'Admin Finance'),
            action: 'SETTLE_COMMISSIONS',
            entityType: 'SettlementBatch',
            entityId: createdBatch.id,
            businessId: user.businessId || undefined,
            description: `Settled batch #${createdBatch.batchNumber}: Gross ETB ${totalGross.toLocaleString()}, Net Payout (80%) ETB ${netPayout.toLocaleString()} to ${partner.fullName} via ${payoutMethod} (${destinationAccount}), Platform share (20%) ETB ${platformFee.toLocaleString()}. Slip ref: ${transactionReference}.`,
          },
        });

        // SMS notification to the sales agent
        try {
          await tx.smsLog.create({
            data: {
              orderId: eligibleEscrows[0]?.orderId,
              recipientPhone: partner.phone,
              messageBody: `Azwari: Commission batch #${batchNumber} (Net ETB ${netPayout.toLocaleString()}) has been settled to your ${payoutMethod} account (${destinationAccount}). Ref: ${transactionReference}. Thank you!`,
              templateName: 'commission_settled',
              deliveryStatus: 'QUEUED',
            },
          });
        } catch {}

        return createdBatch;
      });

      await cacheService.delPattern('cache:commissions:*');
      await cacheService.delPattern('cache:orders:*');
      await cacheService.delPattern('cache:salesPartners:*');
      realtimeEmitter.emit('change', { type: 'COMMISSION_SETTLED', batchId: batch.id });

      res.status(200).json({
        success: true,
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          recipientName: partner.fullName,
          grossAmount: totalGross,
          totalAmount: netPayout,
          platformFee,
          payoutMethod,
          destinationAccount,
          transactionReference: batch.transactionReference,
          status: 'settled',
          settledAt: batch.settledAt?.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[Settle Commissions Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to execute settlement' });
    }
  }
);

/**
 * POST /api/commissions/settle-platform-fee
 * Allows merchant/supplier to settle accrued 20% platform marketplace fee with reference slip and screenshot
 */
commissionRouter.post(
  '/settle-platform-fee',
  requireAuth,
  requireRole('admin', 'supplier'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { payoutMethod, transactionReference, receiptImageUrl, amount } = req.body;

      if (user.role === 'supplier' && !user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile found' });
        return;
      }

      if (!transactionReference || transactionReference.trim().length < 3) {
        res.status(400).json({ success: false, error: 'Transaction reference is required' });
        return;
      }

      const businessId = user.businessId;
      const finalReference = receiptImageUrl
        ? `${transactionReference.trim()} | ${receiptImageUrl.trim()}`
        : transactionReference.trim();

      // Find accrued platform fee ledgers for this business
      const accruedFees = await prisma.platformFeeLedger.findMany({
        where: {
          businessId,
          status: 'accrued',
        },
      });

      const totalAccrued = accruedFees.reduce((sum: number, f: any) => sum + Number(f.amount), 0);
      const feeAmount = amount || totalAccrued;

      await prisma.$transaction(async (tx: any) => {
        if (accruedFees.length > 0) {
          await tx.platformFeeLedger.updateMany({
            where: { id: { in: accruedFees.map((f: any) => f.id) } },
            data: { status: 'PAID' },
          });
        }

        await tx.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Merchant Supplier',
            action: 'SETTLE_PLATFORM_FEE',
            entityType: 'PlatformFeeLedger',
            entityId: businessId || 'platform_fee',
            businessId,
            description: `Supplier settled 20% platform marketplace fee of ETB ${feeAmount.toLocaleString()} via ${payoutMethod}. Slip ref: ${finalReference}.`,
          },
        });
      });

      await cacheService.delPattern('cache:commissions:*');
      await cacheService.delPattern('cache:orders:*');
      realtimeEmitter.emit('change', { type: 'PLATFORM_FEE_SETTLED' });
      res.status(200).json({
        success: true,
        message: 'Platform fee settlement submitted and audited successfully.',
        settledAmount: feeAmount,
        transactionReference: finalReference,
      });
    } catch (err: any) {
      console.error('[Settle Platform Fee Error]', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to settle platform fee' });
    }
  }
);
