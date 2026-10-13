import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/admin';

// Reading roles is open to any store admin; changing them is Owner/Admin only
// and always scoped to the caller's own store.
const ROLE_WRITERS = ['Owner', 'Admin'] as const;

// Admin access is granted by these role names (middleware.ts), so renaming or
// deleting them would silently lock people out.
const ACCESS_ROLES = ['Owner', 'Admin', 'Manager'];

async function nameTaken(storeId: string, name: string, exceptId?: string) {
  const db = createServiceClient();
  let query = db.from('store_roles').select('id').eq('store_id', storeId).ilike('name', name.replace(/[\\%_]/g, '\\$&'));
  if (exceptId) query = query.neq('id', exceptId);
  const { data } = await query;
  return (data ?? []).length > 0;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
  }

  if (!auth.admin.storeIds.includes(storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from('store_roles')
      .select('*')
      .eq('store_id', storeId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin([...ROLE_WRITERS]);
  if (!auth.ok) return auth.response;

  const supabase = createRouteHandlerClient({ cookies });
  const { store_id, name, description, permissions } = await request.json();

  if (!store_id || !name) {
    return NextResponse.json({ error: 'Store ID and role name are required' }, { status: 400 });
  }

  if (!auth.admin.storeIds.includes(store_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (await nameTaken(store_id, String(name).trim())) {
    return NextResponse.json({ error: 'A role with that name already exists' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('store_roles')
      .insert({ store_id, name, description, permissions: permissions || [] })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin([...ROLE_WRITERS]);
  if (!auth.ok) return auth.response;

  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('id');
  const { name, description, permissions } = await request.json();

  if (!roleId) {
    return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: current } = await db
    .from('store_roles')
    .select('id, name, store_id')
    .eq('id', roleId)
    .in('store_id', auth.admin.storeIds)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }
  if (name !== undefined && name !== current.name) {
    if (ACCESS_ROLES.includes(current.name)) {
      return NextResponse.json({ error: `The ${current.name} role can't be renamed` }, { status: 400 });
    }
    if (await nameTaken(current.store_id, String(name).trim(), roleId)) {
      return NextResponse.json({ error: 'A role with that name already exists' }, { status: 400 });
    }
  }

  try {
    const { data, error } = await supabase
      .from('store_roles')
      .update({ name, description, permissions })
      .eq('id', roleId)
      .in('store_id', auth.admin.storeIds)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin([...ROLE_WRITERS]);
  if (!auth.ok) return auth.response;

  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('id');

  if (!roleId) {
    return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: role } = await db
    .from('store_roles')
    .select('id, name')
    .eq('id', roleId)
    .in('store_id', auth.admin.storeIds)
    .maybeSingle();
  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }
  if (ACCESS_ROLES.includes(role.name)) {
    return NextResponse.json({ error: `The ${role.name} role can't be deleted` }, { status: 400 });
  }
  // store_users.role_id is ON DELETE SET NULL, so deleting an assigned role would
  // quietly strip those people of their role.
  const { count } = await db
    .from('store_users')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId);
  if (count) {
    return NextResponse.json(
      { error: `${count} user${count === 1 ? ' has' : 's have'} this role. Move them to another role first.` },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('store_roles')
      .delete()
      .eq('id', roleId)
      .in('store_id', auth.admin.storeIds);

    if (error) throw error;
    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
