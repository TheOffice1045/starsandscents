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
  
  const { pathname } = request.nextUrl;

  // Site visibility: when the store is in "coming-soon" mode, send storefront
  // visitors (including admins) to /coming-soon. /indoorme stays reachable.
  if (!pathname.startsWith('/indoorme')) {
    const isComingSoonPage = pathname === '/coming-soon';
    const isExempt = isComingSoonPage || EXEMPT_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));

    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('site_visibility')
      .limit(1)
      .maybeSingle();
    const isComingSoon = storeSettings?.site_visibility === 'coming-soon';

    if (isComingSoon && !isExempt) {
      return NextResponse.redirect(new URL('/coming-soon', request.url));
    }

    // Don't leave visitors stuck on the placeholder once the site is live
    if (!isComingSoon && isComingSoonPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  // Check if we're trying to access the admin section
  if (pathname.startsWith('/indoorme')) {
    // Get the user's session
    // getUser() verifies the token with Supabase; getSession() would trust the cookie as-is.
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // If not signed in, redirect to login
    if (!user || userError) {
      const redirectUrl = new URL('/signin', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const userId = user.id;
    
    // Extract store ID from the URL or query parameters
    // For now, we'll check if the user has any admin access to any store
    // You might want to make this more specific based on your routing structure
    const { data: storeUsers, error: storeUsersError } = await supabase
      .from('store_users')
      .select(`
        store_id,
        status,
        role:store_roles!role_id (
          name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    // Fail closed: if the role lookup errors for any reason, nobody gets in.
    if (storeUsersError) {
      console.error('Error checking store users:', storeUsersError);
      const redirectUrl = new URL('/signin', request.url);
      redirectUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    }

    const roleNames = (storeUsers ?? [])
      .map(user => (user.role as any)?.name as string | undefined)
      .filter(Boolean) as string[];

    if (!roleNames.some(name => ADMIN_ROLES.includes(name))) {
      // User is authenticated but doesn't have admin access
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }

    // Managers run day-to-day operations; settings, roles and finance are Owner/Admin only.
    const isOwnerOrAdmin = roleNames.some(name => name === 'Owner' || name === 'Admin');
    if (!isOwnerOrAdmin && OWNER_ADMIN_PATHS.some(prefix => pathname.startsWith(prefix))) {
      const redirectUrl = new URL('/indoorme', request.url);
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }

    // 2FA: anyone who has enrolled an authenticator must verify it this session.
    if (pathname !== MFA_PATH) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const redirectUrl = new URL(MFA_PATH, request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }
  
  // Continue the request for non-admin routes or authorized users
  return NextResponse.next();
}

const ADMIN_ROLES = ['Owner', 'Admin', 'Manager'];
const OWNER_ADMIN_PATHS = ['/indoorme/settings', '/indoorme/finance'];
const MFA_PATH = '/indoorme/mfa';

// Paths that stay reachable while the site is in "coming-soon" mode
// (auth flows so admins can sign in, and API routes like webhooks)
const EXEMPT_PATH_PREFIXES = ['/api', '/signin', '/signup', '/auth', '/reset-password', '/update-password'];

// Run on every page except Next.js internals and static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)'],
};