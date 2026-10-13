import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type AdminRole = 'Owner' | 'Admin' | 'Manager';

const ADMIN_ROLES: AdminRole[] = ['Owner', 'Admin', 'Manager'];

export interface AdminContext {
  userId: string;
  storeId: string;
  /** Every store the user holds an allowed role in (storeId is the first). */
  storeIds: string[];
  role: AdminRole;
}

type AdminCheck =
  | { ok: true; admin: AdminContext }
  | { ok: false; response: NextResponse };

/**
 * Server-side admin gate for API routes. Mirrors the role check in middleware.ts
 * (active store_users row with an Owner/Admin/Manager role), so route handlers
 * don't depend on the page-level redirect. Pass `allowed` to narrow it further.
 */
export async function requireAdmin(allowed: AdminRole[] = ADMIN_ROLES): Promise<AdminCheck> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: storeUsers, error } = await supabase
    .from('store_users')
    .select('store_id, role:store_roles!role_id (name)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('requireAdmin: store_users lookup failed', error);
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const matches = (storeUsers ?? []).filter((row) => {
    const role = row.role as unknown as { name: AdminRole } | null;
    return role && allowed.includes(role.name);
  });
  const match = matches[0];

  if (!match) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ok: true,
    admin: {
      userId: user.id,
      storeId: match.store_id,
      storeIds: matches.map((row) => row.store_id),
      role: (match.role as unknown as { name: AdminRole }).name,
    },
  };
}
