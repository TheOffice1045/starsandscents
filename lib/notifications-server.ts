import type { SupabaseClient } from '@supabase/supabase-js';

// Titles double as icon keys on the admin Notifications page (iconMap there).
export type AdminNotificationTitle = 'New Order' | 'New Customer' | 'Coupon Used' | 'Order Refunded' | 'Order Cancelled' | 'New Message';

/**
 * Write one notification per active store admin. Needs a service-role client:
 * the notifications table has no INSERT policy, and each admin only ever reads
 * their own rows. Never throws, so callers (e.g. the Stripe webhook) can fire
 * and forget without risking a retry of the surrounding request.
 */
export async function notifyAdmins(
  supabase: SupabaseClient,
  title: AdminNotificationTitle,
  message: string
): Promise<void> {
  try {
    const { data: admins, error: adminsError } = await supabase
      .from('store_users')
      .select('user_id, role:store_roles!role_id (name)')
      .eq('status', 'active')
      .not('user_id', 'is', null);

    if (adminsError) throw adminsError;

    const userIds = Array.from(new Set(
      (admins ?? [])
        .filter((row) => {
          const role = row.role as unknown as { name: string } | null;
          return role && ['Owner', 'Admin', 'Manager'].includes(role.name);
        })
        .map((row) => row.user_id as string)
    ));

    if (userIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .insert(userIds.map((user_id) => ({ user_id, title, message })));

    if (error) throw error;
  } catch (error) {
    console.error(`Failed to create "${title}" notification:`, error);
  }
}
