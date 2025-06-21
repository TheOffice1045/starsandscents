import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
    { 
      cookies: { 
        get: (name) => request.cookies.get(name)?.value, 
        set: (name, value) => { request.cookies.set(name, value); }, 
        remove: (name) => { request.cookies.delete(name); } 
      } 
    }
  );
  
  // Check if we're trying to access the admin section
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session, redirect to login
    if (!session || sessionError) {
      const redirectUrl = new URL('/signin', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Get the user ID from the session
    const userId = session.user.id;
    
    // Extract store ID from the URL or query parameters
    // For now, we'll check if the user has any admin access to any store
    // You might want to make this more specific based on your routing structure
    const { data: storeUsers, error: storeUsersError } = await supabase
      .from('store_users')
      .select(`
        store_id,
        status,
        store_roles (
          name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (storeUsersError) {
      console.error('Error checking store users:', storeUsersError);
      const redirectUrl = new URL('/signin', request.url);
      redirectUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user has any active admin role
    const hasAdminAccess = storeUsers && storeUsers.length > 0 && 
      storeUsers.some(user => {
        const role = user.store_roles as any;
        return role && (role.name === 'Owner' || role.name === 'Admin' || role.name === 'Manager');
      });

    if (!hasAdminAccess) {
      // User is authenticated but doesn't have admin access
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Continue the request for non-admin routes or authorized users
  return NextResponse.next();
}

// Configure the middleware to run only on admin routes
export const config = {
  matcher: '/admin/:path*',
};