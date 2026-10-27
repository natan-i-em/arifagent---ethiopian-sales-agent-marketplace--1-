import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, SettleCommissionsSchema } from '../middleware/zodValidators.js';

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

    res.status(200).json({ success: true, count: formatted.length, commissions: formatted });
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
      res.status(200).json({ success: true, count: 0, batches: [] });
      return;
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

    res.status(200).json({ success: true, count: formatted.length, batches: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/commissions/settle
 * Admin-only idempotent execution of commission payouts in an atomic transaction
 */
commissionRouter.post(
  '/settle',
  requireAuth,
  requireRole('admin'),
  validateBody(SettleCommissionsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { salespersonId, payoutMethod, transactionReference, entryIds } = req.body;

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
      if (entryIds && entryIds.length > 0) {
        escrowWhere.id = { in: entryIds };
      }

      const eligibleEscrows = await prisma.commissionEscrow.findMany({
        where: escrowWhere,
      });

      if (eligibleEscrows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No eligible commissions available for settlement for this sales agent',
        });
        return;
      }

      const totalAmount = eligibleEscrows.reduce((sum: any, e: any) => sum + Number(e.amount), 0);
      const batchNumber = `SETTLE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // ATOMIC TRANSACTION: Create batch, update escrows to PAID, decrement eligible balance, increment paid balance
      const batch = await prisma.$transaction(async (tx: any) => {
        const createdBatch = await tx.settlementBatch.create({
          data: {
            batchNumber,
            salesPartnerId: partner.id,
            totalAmount,
            payoutMethod,
            destinationAccount: partner.payoutAccountNumber,
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
            eligibleCommissions: { decrement: totalAmount },
            paidCommissions: { increment: totalAmount },
          },
        });

        await tx.auditLog.create({
          data: {
            actorRole: 'admin',
            actorName: user.fullName || 'Admin Finance',
            action: 'SETTLE_COMMISSIONS',
            entityType: 'SettlementBatch',
            entityId: createdBatch.id,
            description: `Settled batch #${createdBatch.batchNumber} of ETB ${totalAmount.toLocaleString()} to ${partner.fullName} via ${payoutMethod} (${partner.payoutAccountNumber}). Ref: ${transactionReference}.`,
          },
        });

        return createdBatch;
      });

      res.status(200).json({
        success: true,
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          recipientName: partner.fullName,
          totalAmount,
          payoutMethod,
          destinationAccount: partner.payoutAccountNumber,
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
