import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, optionalAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, CreateDisputeSchema, ResolveDisputeSchema } from '../middleware/zodValidators.js';

export const disputeRouter = Router();

const prismaToUiDisputeStatus = (s: string) => {
  const map: Record<string, string> = {
    OPEN: 'open',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
  };
  return map[s] || 'open';
};

/**
 * GET /api/disputes
 * Role-scoped retrieval of disputes
 */
disputeRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let whereClause: any = {};

    if (user.role === 'admin') {
      whereClause = {};
    } else if (user.role === 'supplier') {
      if (!user.businessId) {
        res.status(403).json({ success: false, error: 'No business profile linked to user' });
        return;
      }
      whereClause = { order: { businessId: user.businessId } };
    } else if (user.role === 'salesperson') {
      if (!user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'No sales agent profile linked to user' });
        return;
      }
      whereClause = { order: { salesPartnerId: user.salesPartnerId } };
    }

    const disputes = await prisma.dispute.findMany({
      where: whereClause,
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = disputes.map((d: any) => ({
      id: d.id,
      disputeNumber: d.disputeNumber,
      orderId: d.orderId,
      orderNumber: d.order?.orderNumber || 'ORD-N/A',
      raisedByRole: d.raisedByRole as any,
      raisedByName: d.raisedByName,
      category: d.category as any,
      reason: d.reason,
      status: prismaToUiDisputeStatus(d.status),
      resolutionDecision: d.resolution || undefined,
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : undefined,
      resolvedByAdmin: d.resolvedBy || undefined,
      createdAt: d.createdAt.toISOString(),
    }));

    res.status(200).json({ success: true, count: formatted.length, disputes: formatted });
  } catch (error: any) {
    console.error('[Get Disputes Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch disputes' });
  }
});

/**
 * POST /api/disputes
 * Opens a formal dispute on an order
 */
disputeRouter.post(
  '/',
  requireAuth,
  validateBody(CreateDisputeSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { orderId, category, reason } = req.body;

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      // Check ownership
      if (user.role === 'supplier' && order.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this order' });
        return;
      }
      if (user.role === 'salesperson' && order.salesPartnerId !== user.salesPartnerId) {
        res.status(403).json({ success: false, error: 'Forbidden: You are not assigned to this order' });
        return;
      }

      const disputeNumber = `DISP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const dispute = await prisma.$transaction(async (tx: any) => {
        const createdDispute = await tx.dispute.create({
          data: {
            disputeNumber,
            orderId,
            raisedByRole: user.role,
            raisedByName: user.fullName || 'Azwari Member',
            category,
            reason,
            status: 'OPEN',
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: { status: 'DISPUTED' },
        });

        await tx.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'User',
            action: 'OPEN_DISPUTE',
            entityType: 'Dispute',
            entityId: createdDispute.id,
            businessId: order.businessId,
            description: `Dispute #${createdDispute.disputeNumber} opened on order #${order.orderNumber} by ${user.role} ${user.fullName}. Category: ${category}.`,
          },
        });

        return createdDispute;
      });

      res.status(201).json({
        success: true,
        dispute: {
          id: dispute.id,
          disputeNumber: dispute.disputeNumber,
          orderId: dispute.orderId,
          orderNumber: order.orderNumber,
          raisedByRole: dispute.raisedByRole,
          raisedByName: dispute.raisedByName,
          category: dispute.category,
          reason: dispute.reason,
          status: 'open',
          createdAt: dispute.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[Create Dispute Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create dispute' });
    }
  }
);

/**
 * PATCH /api/disputes/:id/resolve
 * Admin resolves dispute with formal decision
 */
disputeRouter.patch(
  '/:id/resolve',
  requireAuth,
  requireRole('admin'),
  validateBody(ResolveDisputeSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { resolutionDecision, resolutionNote } = req.body;

      const dispute = await prisma.dispute.findUnique({
        where: { id },
        include: { order: { include: { commissionEscrow: true, items: true } } },
      });

      if (!dispute) {
        res.status(404).json({ success: false, error: 'Dispute not found' });
        return;
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        const updatedDispute = await tx.dispute.update({
          where: { id },
          data: {
            status: 'RESOLVED',
            resolution: `${resolutionDecision}: ${resolutionNote}`,
            resolvedAt: new Date(),
            resolvedBy: user.fullName || 'Compliance Admin',
          },
          include: { order: true },
        });

        // Effectuate decision on order
        if (resolutionDecision === 'refund_customer') {
          // Restore stock and cancel order
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { status: 'CANCELLED' },
          });

          for (const item of dispute.order.items) {
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

          if (dispute.order.commissionEscrow && dispute.order.commissionEscrow.status !== 'PAID') {
            await tx.commissionEscrow.update({
              where: { id: dispute.order.commissionEscrow.id },
              data: { status: 'FORFEITED' },
            });
          }

          await tx.platformFeeLedger.updateMany({
            where: { orderId: dispute.orderId },
            data: { status: 'reversed' },
          });
        } else {
          // release_to_supplier or dismissed
          await tx.order.update({
            where: { id: dispute.orderId },
            data: { status: 'DELIVERED' },
          });

          if (dispute.order.commissionEscrow && dispute.order.commissionEscrow.status === 'PENDING_ESCROW') {
            await tx.commissionEscrow.update({
              where: { id: dispute.order.commissionEscrow.id },
              data: { status: 'ELIGIBLE', eligibleAt: new Date() },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            actorRole: 'admin',
            actorName: user.fullName || 'Admin',
            action: 'RESOLVE_DISPUTE',
            entityType: 'Dispute',
            entityId: id,
            businessId: dispute.order.businessId,
            description: `Dispute #${dispute.disputeNumber} resolved by admin. Decision: ${resolutionDecision}. Note: ${resolutionNote}`,
          },
        });

        return updatedDispute;
      });

      res.status(200).json({
        success: true,
        dispute: {
          id: updated.id,
          disputeNumber: updated.disputeNumber,
          orderId: updated.orderId,
          orderNumber: updated.order?.orderNumber || 'ORD-N/A',
          status: 'resolved',
          resolutionDecision: updated.resolution,
          resolvedAt: updated.resolvedAt?.toISOString(),
          resolvedByAdmin: updated.resolvedBy,
        },
      });
    } catch (error: any) {
      console.error('[Resolve Dispute Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to resolve dispute' });
    }
  }
);
