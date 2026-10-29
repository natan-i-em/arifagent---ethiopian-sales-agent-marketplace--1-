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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isRead } = body;

    // Update in Supabase
    try {
      await supabase
        .from('Notification')
        .update({ isRead: isRead ?? true, updatedAt: new Date().toISOString() })
        .eq('id', id);
    } catch {}

    // Update in server memory store
    if (global.__azwari_server_notifications) {
      const found = global.__azwari_server_notifications.find((n) => n.id === id);
      if (found) {
        found.isRead = isRead !== undefined ? isRead : true;
        found.updatedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({ success: true, message: 'Notification updated' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete in Supabase
    try {
      await supabase.from('Notification').delete().eq('id', id);
    } catch {}

    // Delete in server memory store
    if (global.__azwari_server_notifications) {
      global.__azwari_server_notifications = global.__azwari_server_notifications.filter(
        (n) => n.id !== id
      );
    }

    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
