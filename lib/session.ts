import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { isVerifiedSession, secret } from './auth-core';

export interface SessionData {
  userId?: string;
  authVersion?: number;
  email?: string;
  businessName?: string;
}

function sessionOptions(): SessionOptions { return {
  password: secret(),
  cookieName: 'fieldline_session_v2',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}; }

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions());
}

export async function requireUser() {
  const session = await getSession();
  if (!isVerifiedSession(session)) {
    throw new Error('Unauthorized');
  }
  return { userId: session.userId!, email: session.email!, businessName: session.businessName! };
}
