import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://edyyvfqcduwfpfnmbuuh.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeXl2ZnFjZHV3ZnBmbm1idXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTgyOTUsImV4cCI6MjEwODA5NDI5NX0.R-SpCzGI8gnLbx83-r7LkHvFWt9EAOSjHpdSiUDPfqo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Resilient memory cache / fallback store in server runtime
interface ServerNotification {
  id: string;
  recipientRole: string;
  recipientId?: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  link?: string | null;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// Global server memory store so notifications persist in serverless/Node instance
declare global {
  // eslint-disable-next-line no-var
  var __azwari_server_notifications: ServerNotification[] | undefined;
}

function getServerStore(): ServerNotification[] {
  if (!global.__azwari_server_notifications) {
    global.__azwari_server_notifications = [
      {
        id: 'notif_init_1',
        recipientRole: 'supplier',
        recipientId: null,
        type: 'wallet',
        title: 'Low Reserve Warning',
        message: 'Your commission reserve balance is below ETB 5,000 (currently ETB 4,200). Deposit reserve funds to prevent automatic order lock.',
        severity: 'warning',
        link: '/portal/supplier?tab=wallet',
        metadata: { amount: 4200 },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'notif_init_2',
        recipientRole: 'supplier',
        recipientId: null,
        type: 'stock',
        title: 'Low Stock Alert',
        message: 'Ethiopian Full-Grain Leather Briefcase has only 3 units remaining in fulfillment center. Restock soon!',
        severity: 'warning',
        link: '/portal/supplier?tab=products',
        metadata: { stockRemaining: 3, productName: 'Leather Briefcase' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'notif_init_3',
        recipientRole: 'supplier',
        recipientId: null,
        type: 'dispute',
        title: 'Dispute Filed on Order #ORD-8285',
        message: 'Buyer raised a delivery dispute. Central Escrow Arbitration is reviewing payment lock.',
        severity: 'error',
        link: '/portal/supplier?tab=orders',
        metadata: { orderNumber: 'ORD-8285', disputeId: 'disp_001' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: 'notif_init_4',
        recipientRole: 'salesperson',
        recipientId: null,
        type: 'wallet',
        title: 'Commissions Ready for Payout',
        message: 'ETB 2,450 in commission escrow cleared following confirmed delivery of Order #ORD-8274. Ready for instant Telebirr/CBE payout.',
        severity: 'success',
        link: '/portal/salesperson?tab=payouts',
        metadata: { amount: 2450 },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      },
      {
        id: 'notif_init_5',
        recipientRole: 'salesperson',
        recipientId: null,
        type: 'order',
        title: 'Payment Verified for Your Lead',
        message: 'Merchant approved payment for Order #ORD-8291. Driver dispatched to Bole Medhanialem for delivery.',
        severity: 'info',
        link: '/portal/salesperson?tab=orders',
        metadata: { orderNumber: 'ORD-8291' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: 'notif_init_6',
        recipientRole: 'salesperson',
        recipientId: null,
        type: 'stock',
        title: 'High-Demand Product Low Stock',
        message: 'Yirgacheffe Single-Origin Roast (Grade 1) is down to 4 units. Close your leads before sellout!',
        severity: 'warning',
        link: '/portal/salesperson?tab=offers',
        metadata: { stockRemaining: 4, productName: 'Yirgacheffe Coffee' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: 'notif_init_7',
        recipientRole: 'salesperson',
        recipientId: null,
        type: 'dispute',
        title: 'Dispute Status Notice',
        message: 'Arbitration opened for customer order #ORD-8285. Commission held temporarily.',
        severity: 'error',
        link: '/portal/salesperson?tab=disputes',
        metadata: { orderNumber: 'ORD-8285' },
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
      },
      {
        id: 'notif_init_8',
        recipientRole: 'admin',
        recipientId: null,
        type: 'dispute',
        title: 'Central Arbitration Required',
        message: 'Dispute #DISP-001 opened for Order #ORD-8285 requires clearinghouse review and escrow disposition.',
        severity: 'error',
        link: '/portal/admin?tab=disputes',
        metadata: { disputeId: 'disp_001' },
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];
  }
  return global.__azwari_server_notifications;
}

/**
 * GET /api/notifications
 * Retrieves notifications from database with role and recipientId filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const recipientId = searchParams.get('recipientId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 200);

    // Try Supabase PostgreSQL table first
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
      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, count: data.length, notifications: data });
      }
    } catch {
      // Fall through to memory store if Supabase table is not provisioned or offline
    }

    // Fallback store
    const store = getServerStore();
    let filtered = store.filter((n) => {
      if (role && role !== 'all' && n.recipientRole !== role && n.recipientRole !== 'all') {
        return false;
      }
      if (recipientId && n.recipientId && n.recipientId !== recipientId) {
        return false;
      }
      if (unreadOnly && n.isRead) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    filtered = filtered.slice(0, limit);

    return NextResponse.json({
      success: true,
      count: filtered.length,
      notifications: filtered,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Stores a new incoming notification in the database and broadcasts to recipients
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientRole, recipientId, type, title, message, severity, link, metadata } = body;

    if (!recipientRole || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'recipientRole, title, and message are required' },
        { status: 400 }
      );
    }

    const newNotification: ServerNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recipientRole,
      recipientId: recipientId || null,
      type: type || 'system',
      title,
      message,
      severity: severity || 'info',
      link: link || null,
      metadata: metadata || null,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Try Supabase PostgreSQL table
    try {
      const { data, error } = await supabase
        .from('Notification')
        .insert([newNotification])
        .select()
        .single();

      if (!error && data) {
        // Also sync to server store
        const store = getServerStore();
        store.unshift(data);
        return NextResponse.json({ success: true, notification: data });
      }
    } catch {
      // Continue to server store
    }

    const store = getServerStore();
    store.unshift(newNotification);

    return NextResponse.json({
      success: true,
      notification: newNotification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for a given role or recipient
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, recipientId, markAllRead } = body;

    if (markAllRead) {
      // Update in Supabase
      try {
        let query = supabase.from('Notification').update({ isRead: true });
        if (role && role !== 'all') {
          query = query.eq('recipientRole', role);
        }
        if (recipientId) {
          query = query.eq('recipientId', recipientId);
        }
        await query;
      } catch {}

      // Update in server store
      const store = getServerStore();
      store.forEach((n) => {
        if (!role || role === 'all' || n.recipientRole === role || n.recipientRole === 'all') {
          if (!recipientId || !n.recipientId || n.recipientId === recipientId) {
            n.isRead = true;
            n.updatedAt = new Date().toISOString();
          }
        }
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Clears notifications for a given role or recipient
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const recipientId = searchParams.get('recipientId');

    // Delete in Supabase
    try {
      let query = supabase.from('Notification').delete();
      if (role && role !== 'all') {
        query = query.eq('recipientRole', role);
      }
      if (recipientId) {
        query = query.eq('recipientId', recipientId);
      }
      await query;
    } catch {}

    // Delete in server store
    const store = getServerStore();
    global.__azwari_server_notifications = store.filter((n) => {
      if (role && role !== 'all' && (n.recipientRole === role || n.recipientRole === 'all')) {
        if (!recipientId || !n.recipientId || n.recipientId === recipientId) {
          return false;
        }
      }
      return true;
    });

    return NextResponse.json({ success: true, message: 'Notifications cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
