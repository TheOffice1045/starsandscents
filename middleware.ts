import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

interface StoreRole {
  name: string;
}

interface StoreUser {
  role_id: string;
  store_roles: StoreRole[];
}

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (name) => request.cookies.get(name)?.value, set: (name, value) => { request.cookies.set(name, value); }, remove: (name) => { request.cookies.delete(name); } } });
  
  // Check if we're trying to access the admin section
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, redirect to login
    if (!session) {
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Get the user's store and role
    const { data: storeUser, error } = await supabase
      .from('store_users')
      .select('role_id, store_roles(name)')
      .eq('user_id', session.user.id)
      .single();
    
    // If there's an error or the user doesn't have a role, redirect to home
    if (error || !storeUser) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Check if the user has admin or owner role
    const roleName = (storeUser as StoreUser).store_roles[0]?.name.toLowerCase();
    if (!roleName || (roleName !== 'admin' && roleName !== 'owner')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  // Continue the request for non-admin routes or authorized admin users
  return NextResponse.next();
}

// Configure the middleware to run only on admin routes
export const config = {
  matcher: '/admin/:path*',
};