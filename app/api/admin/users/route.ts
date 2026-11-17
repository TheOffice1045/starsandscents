import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';

// Store team management (Settings → Roles & Permissions → Users).
// Runs server-side with the service client so it doesn't depend on store_users
// RLS, and every write is scoped to a store the caller is Owner/Admin of.
//
// Access to /indoorme is decided by role *name* (middleware.ts / lib/admin-auth.ts),
// and middleware matches store_users.user_id, so a row only grants access once it
// is linked to an auth account. Invites create/link that account up front.

const ADMIN_ROLE_NAMES = ['Owner', 'Admin', 'Manager'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Db = ReturnType<typeof createServiceClient>;

type StoreUserRow = {
  id: string;
  store_id: string;
  user_id: string | null;
  email: string;
  role_id: string | null;
  status: string;
  invited_at: string | null;
  role: { name: string } | null;
};

const ROW_SELECT = 'id, store_id, user_id, email, role_id, status, invited_at, role:store_roles!role_id (name)';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Owner/Admin gate for one store; also returns the caller's role there. */
async function authorize(storeId: string | null | undefined) {
  const auth = await requireAdmin(['Owner', 'Admin']);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!storeId || !auth.admin.storeIds.includes(storeId)) {
    return { ok: false as const, response: bad('Forbidden', 403) };
  }

  const db = createServiceClient();
  const { data: me } = await db
    .from('store_users')
    .select('role:store_roles!role_id (name)')
    .eq('store_id', storeId)
    .eq('user_id', auth.admin.userId)
    .eq('status', 'active')
    .maybeSingle();
  const callerRole = (me?.role as unknown as { name: string } | null)?.name ?? auth.admin.role;

  return { ok: true as const, db, storeId, userId: auth.admin.userId, isOwner: callerRole === 'Owner' };
}

async function listAuthUsersByEmail(db: Db) {
  const byEmail = new Map<string, User>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u);
    if (data.users.length < 1000) break;
  }
  return byEmail;
}

async function findAuthUser(db: Db, email: string) {
  return (await listAuthUsersByEmail(db)).get(email.toLowerCase()) ?? null;
}

async function getRow(db: Db, storeId: string, id: string) {
  const { data } = await db.from('store_users').select(ROW_SELECT).eq('store_id', storeId).eq('id', id).maybeSingle();
  return data as unknown as StoreUserRow | null;
}

async function getRole(db: Db, storeId: string, roleId: string) {
  const { data } = await db.from('store_roles').select('id, name').eq('store_id', storeId).eq('id', roleId).maybeSingle();
  return data as { id: string; name: string } | null;
}

/** True if some active Owner other than `excludeRowId` remains in the store. */
async function hasOtherActiveOwner(db: Db, storeId: string, excludeRowId: string) {
  const { data } = await db
    .from('store_users')
    .select('id, user_id, role:store_roles!role_id (name)')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .neq('id', excludeRowId);
  return (data ?? []).some((r) => r.user_id && (r.role as unknown as { name: string } | null)?.name === 'Owner');
}

function inviteRedirect(request: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return `${base.replace(/\/$/, '')}/update-password`;
}

export async function GET(request: Request) {
  const ctx = await authorize(new URL(request.url).searchParams.get('store_id'));
  if (!ctx.ok) return ctx.response;
  const { db, storeId } = ctx;

  const { data, error } = await db.from('store_users').select(ROW_SELECT).eq('store_id', storeId).order('created_at');
  if (error) return bad(error.message, 500);
  const rows = (data ?? []) as unknown as StoreUserRow[];

  let authUsers: Map<string, User>;
  try {
    authUsers = await listAuthUsersByEmail(db);
  } catch (e: any) {
    return bad(e.message ?? 'Failed to load accounts', 500);
  }
  const authById = new Map(Array.from(authUsers.values()).map((u) => [u.id, u]));

  // Repair rows added before invites linked accounts: attach them to the
  // account with the same email so the person's access actually works.
  for (const row of rows) {
    if (row.user_id) continue;
    const match = authUsers.get(row.email.toLowerCase());
    if (!match) continue;
    const { error: linkError } = await db.from('store_users').update({ user_id: match.id }).eq('id', row.id).is('user_id', null);
    if (linkError) console.error('store users: failed to link', row.email, linkError);
    else row.user_id = match.id;
  }

  const users = rows.map((row) => {
    const account = row.user_id ? authById.get(row.user_id) : undefined;
    const roleName = row.role?.name ?? null;
    return {
      id: row.id,
      user_id: row.user_id,
      email: row.email,
      role_id: row.role_id,
      role_name: roleName,
      active: row.status === 'active',
      // Linked but never signed in (or no account yet): the invite is still open.
      pending: !account || !account.last_sign_in_at,
      has_admin_access: row.status === 'active' && !!row.user_id && !!roleName && ADMIN_ROLE_NAMES.includes(roleName),
      is_self: row.user_id === ctx.userId,
    };
  });

  return NextResponse.json({ users, me: { user_id: ctx.userId, is_owner: ctx.isOwner } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await authorize(body.store_id);
  if (!ctx.ok) return ctx.response;
  const { db, storeId } = ctx;

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return bad('Enter a valid email address');

  const role = body.role_id ? await getRole(db, storeId, body.role_id) : null;
  if (!role) return bad('Choose a role');
  if (role.name === 'Owner' && !ctx.isOwner) return bad('Only an Owner can add another Owner', 403);

  const { data: existing } = await db.from('store_users').select('id').eq('store_id', storeId).ilike('email', email.replace(/[\\%_]/g, '\\$&')).maybeSingle();
  if (existing) return bad('That person is already on this store');

  let account: User | null;
  try {
    account = await findAuthUser(db, email);
  } catch (e: any) {
    return bad(e.message ?? 'Failed to look up account', 500);
  }

  let emailed = false;
  if (!account) {
    // New person: Supabase creates the account and emails a link to set a password.
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: inviteRedirect(request) });
    if (error) return bad(`Could not send the invite email: ${error.message}`, 502);
    account = data.user;
    emailed = true;
  }

  const { error } = await db.from('store_users').insert({
    store_id: storeId,
    email,
    user_id: account.id,
    role_id: role.id,
    status: 'active',
    invited_at: new Date().toISOString(),
  });
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true, emailed });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await authorize(body.store_id);
  if (!ctx.ok) return ctx.response;
  const { db, storeId } = ctx;

  const target = body.id ? await getRow(db, storeId, body.id) : null;
  if (!target) return bad('User not found', 404);

  const targetIsOwner = target.role?.name === 'Owner';
  if (targetIsOwner && !ctx.isOwner) return bad('Only an Owner can change another Owner', 403);

  // Resend: a password-reset link doubles as "set your password" for someone
  // who never finished the invite (and is harmless for anyone else).
  if (body.resend) {
    const { error } = await db.auth.resetPasswordForEmail(target.email, { redirectTo: inviteRedirect(request) });
    if (error) return bad(`Could not send the email: ${error.message}`, 502);
    return NextResponse.json({ ok: true });
  }

  if (target.user_id === ctx.userId) return bad("You can't change your own role or status");

  const update: Record<string, string> = {};

  if (body.role_id !== undefined) {
    const role = await getRole(db, storeId, body.role_id);
    if (!role) return bad('Role not found');
    if (role.name === 'Owner' && !ctx.isOwner) return bad('Only an Owner can make someone an Owner', 403);
    update.role_id = role.id;
  }

  if (body.status !== undefined) {
    if (body.status !== 'active' && body.status !== 'inactive') return bad('Invalid status');
    update.status = body.status;
  }

  if (Object.keys(update).length === 0) return bad('Nothing to update');

  const losesOwner = targetIsOwner && target.status === 'active' &&
    (update.status === 'inactive' || (update.role_id && update.role_id !== target.role_id));
  if (losesOwner && !(await hasOtherActiveOwner(db, storeId, target.id))) {
    return bad('The store needs at least one active Owner. Make someone else an Owner first.');
  }

  const { error } = await db.from('store_users').update({ ...update, updated_at: new Date().toISOString() }).eq('id', target.id);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const ctx = await authorize(searchParams.get('store_id'));
  if (!ctx.ok) return ctx.response;
  const { db, storeId } = ctx;

  const target = await getRow(db, storeId, searchParams.get('id') ?? '');
  if (!target) return bad('User not found', 404);
  if (target.user_id === ctx.userId) return bad("You can't remove yourself");

  if (target.role?.name === 'Owner') {
    if (!ctx.isOwner) return bad('Only an Owner can remove another Owner', 403);
    if (target.status === 'active' && !(await hasOtherActiveOwner(db, storeId, target.id))) {
      return bad('The store needs at least one active Owner.');
    }
  }

  // Removes store access only; their login (and any customer orders) stay.
  const { error } = await db.from('store_users').delete().eq('id', target.id);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true });
}
