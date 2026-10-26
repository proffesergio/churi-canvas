import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from './orders';
export const sessionCookie = 'cc_session';
export type Session = { sub: string; role: 'admin' | 'customer' };
function key() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error('Set SESSION_SECRET to at least 32 random characters.');
  return new TextEncoder().encode(value);
}
export async function signSession(session: Session) {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.sub)
    .setIssuedAt()
    .setIssuer('churicanvas')
    .setAudience('churicanvas')
    .setExpirationTime(session.role === 'admin' ? '8h' : '30d')
    .sign(key());
}
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
      issuer: 'churicanvas',
      audience: 'churicanvas',
    });
    if (!payload.sub || !['admin', 'customer'].includes(String(payload.role)))
      return null;
    return { sub: payload.sub, role: payload.role as Session['role'] };
  } catch {
    return null;
  }
}
export async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== 'admin')
    throw new HttpError(401, 'Please sign in to the admin workspace.');
  return session;
}
export async function setSession(session: Session) {
  (await cookies()).set(sessionCookie, await signSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.role === 'admin' ? 8 * 3600 : 30 * 86400,
  });
}
export function validPassword(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12)
    throw new Error('Configure an ADMIN_PASSWORD of at least 12 characters.');
  return timingSafeEqual(
    scryptSync(candidate, 'churicanvas-admin', 64),
    scryptSync(expected, 'churicanvas-admin', 64),
  );
}
