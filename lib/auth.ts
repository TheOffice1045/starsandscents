import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

// Secret key for JWT signing and verification
// In production, use a proper secret management system
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters'
);

export interface UserJwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

/**
 * Sign a JWT token for a user
 */
export async function signToken(payload: UserJwtPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
  
  return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<UserJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserJwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export function setAuthCookie(token: string): void {
  cookies().set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: 'lax',
  });
}

/**
 * Get authentication cookie
 */
export function getAuthCookie(): string | undefined {
  return cookies().get('auth-token')?.value;
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(): void {
  cookies().delete('auth-token');
}

/**
 * Middleware to check if user is authenticated
 */
export async function isAuthenticated(
  req: NextRequest
): Promise<UserJwtPayload | null> {
  const token = req.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifyToken(token);
}

/**
 * Middleware to check if user is an admin
 */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  const user = await isAuthenticated(req);
  return user?.role === 'admin';
}

/**
 * Helper to create an unauthorized response
 */
export function unauthorized(): NextResponse {
  return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Helper function to escape special characters in text for JSX
 * This can be used to fix the unescaped entities errors
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;');
}