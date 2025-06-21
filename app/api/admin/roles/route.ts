import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
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
  const supabase = createRouteHandlerClient({ cookies });
  const { store_id, name, description, permissions } = await request.json();

  if (!store_id || !name) {
    return NextResponse.json({ error: 'Store ID and role name are required' }, { status: 400 });
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
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');
    const { name, description, permissions } = await request.json();

    if (!roleId) {
        return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('store_roles')
            .update({ name, description, permissions })
            .eq('id', roleId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
        return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('store_roles')
            .delete()
            .eq('id', roleId);

        if (error) throw error;
        return NextResponse.json({ message: 'Role deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 