import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;

    const groupedPermissions = data.reduce((acc, permission) => {
      const { category } = permission;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    return NextResponse.json(groupedPermissions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 