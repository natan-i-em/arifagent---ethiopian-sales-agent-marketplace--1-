import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const auditRouter = Router();

/**
 * GET /api/audit-logs
 * Returns audit logs stored in PostgreSQL database with role filtering
 */
auditRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    let whereClause: any = {};
    if (user.role === 'admin') {
      whereClause = {};
    } else if (user.role === 'supplier' && user.businessId) {
      whereClause = { businessId: user.businessId };
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      actorRole: l.actorRole as any,
      actorName: l.actorName,
      action: l.action,
      entityType: l.entityType as any,
      entityId: l.entityId,
      description: l.description,
      businessId: l.businessId || undefined,
    }));

    res.status(200).json({ success: true, count: formatted.length, auditLogs: formatted });
  } catch (error: any) {
    console.error('[Get Audit Logs Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch audit logs' });
  }
});

/**
 * POST /api/audit-logs
 * Appends a new audit record to PostgreSQL
 */
auditRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { action, entityType, entityId, description, businessId } = req.body;

    if (!action || !description) {
      res.status(400).json({ success: false, error: 'action and description are required' });
      return;
    }

    const log = await prisma.auditLog.create({
      data: {
        actorRole: user.role,
        actorName: user.fullName || 'User',
        action,
        entityType: entityType || 'System',
        entityId: entityId || 'sys',
        description,
        businessId: businessId || user.businessId || null,
        timestamp: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      auditLog: {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        actorRole: log.actorRole,
        actorName: log.actorName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
      },
    });
  } catch (error: any) {
    console.error('[Record Audit Log Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
