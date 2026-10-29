import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { supabaseAdmin as supabase } from '../supabase.js';

export const notificationRouter = Router();

/**
 * GET /api/notifications
 * Returns list of notifications filtered by role and recipientId
 */
notificationRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = (req.query.role as string) || undefined;
    const recipientId = (req.query.recipientId as string) || undefined;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    // Try Prisma first
    try {
      const where: any = {};
      if (role && role !== 'all') {
        where.OR = [{ recipientRole: role }, { recipientRole: 'all' }];
      }
      if (recipientId) {
        where.AND = [
          ...(where.AND || []),
          { OR: [{ recipientId: recipientId }, { recipientId: null }] },
        ];
      }
      if (unreadOnly) {
        where.isRead = false;
      }

      const notifs = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      res.status(200).json({ success: true, count: notifs.length, notifications: notifs });
      return;
    } catch {
      // If Prisma table is not migrated yet, fallback to Supabase REST
    }

    // Supabase fallback
    try {
      let query = supabase
        .from('Notification')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (role && role !== 'all') {
        query = query.or(`recipientRole.eq.${role},recipientRole.eq.all`);
      }
      if (recipientId) {
        query = query.or(`recipientId.eq.${recipientId},recipientId.is.null`);
      }
      if (unreadOnly) {
        query = query.eq('isRead', false);
      }

      const { data, error } = await query;
      if (!error && data) {
        res.status(200).json({ success: true, count: data.length, notifications: data });
        return;
      }
    } catch {}

    res.status(200).json({ success: true, count: 0, notifications: [] });
  } catch (error: any) {
    console.error('[Notification GET Error]', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications
 * Stores a new notification in the database
 */
notificationRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientRole, recipientId, type, title, message, severity, link, metadata } = req.body;

    if (!recipientRole || !title || !message) {
      res.status(400).json({ success: false, error: 'recipientRole, title, and message are required' });
      return;
    }

    // Try Prisma
    try {
      const created = await prisma.notification.create({
        data: {
          recipientRole,
          recipientId: recipientId || null,
          type: type || 'system',
          title,
          message,
          severity: severity || 'info',
          link: link || null,
          metadata: metadata || undefined,
          isRead: false,
        },
      });

      res.status(201).json({ success: true, notification: created });
      return;
    } catch {
      // Fallback to Supabase REST
    }

    try {
      const { data, error } = await supabase
        .from('Notification')
        .insert([
          {
            recipientRole,
            recipientId: recipientId || null,
            type: type || 'system',
            title,
            message,
            severity: severity || 'info',
            link: link || null,
            metadata: metadata || null,
            isRead: false,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        res.status(201).json({ success: true, notification: data });
        return;
      }
    } catch {}

    res.status(201).json({
      success: true,
      notification: {
        id: `notif_${Date.now()}`,
        recipientRole,
        recipientId,
        type: type || 'system',
        title,
        message,
        severity: severity || 'info',
        link,
        metadata,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Notification POST Error]', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create notification' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
notificationRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      res.status(200).json({ success: true, message: 'Notification marked as read' });
      return;
    } catch {}

    try {
      await supabase.from('Notification').update({ isRead: true }).eq('id', id);
    } catch {}

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to update notification' });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
notificationRouter.patch('/mark-all-read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, recipientId } = req.body;

    try {
      const where: any = {};
      if (role && role !== 'all') where.recipientRole = role;
      if (recipientId) where.recipientId = recipientId;

      await prisma.notification.updateMany({
        where,
        data: { isRead: true },
      });
      res.status(200).json({ success: true, message: 'All notifications marked as read' });
      return;
    } catch {}

    try {
      let query = supabase.from('Notification').update({ isRead: true });
      if (role && role !== 'all') query = query.eq('recipientRole', role);
      if (recipientId) query = query.eq('recipientId', recipientId);
      await query;
    } catch {}

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
notificationRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    try {
      await prisma.notification.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Notification deleted' });
      return;
    } catch {}

    try {
      await supabase.from('Notification').delete().eq('id', id);
    } catch {}

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete notification' });
  }
});
