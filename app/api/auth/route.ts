import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
  
  const { event, session } = await request.json();
  
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Set cookies for SSR
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }
  
  if (event === 'SIGNED_OUT') {
    // Clear cookies
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
  }
  
  return NextResponse.json({ success: true });
}