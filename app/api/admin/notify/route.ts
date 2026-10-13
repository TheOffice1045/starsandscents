import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';
import { notifyAdmins, type AdminNotificationTitle } from '@/lib/notifications-server';

// For events that happen in the admin browser (e.g. an order created by hand):
// the browser can't insert notifications itself, so it asks the server to.
const ALLOWED_TITLES: AdminNotificationTitle[] = ['New Order', 'Coupon Used'];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { title, message } = await request.json();

  if (!ALLOWED_TITLES.includes(title) || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
  }

  await notifyAdmins(createServiceClient(), title, message.slice(0, 500));
  return NextResponse.json({ success: true });
}
