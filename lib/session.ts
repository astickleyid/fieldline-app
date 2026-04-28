import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
  email?: string;
  businessName?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || 'fieldline-dev-secret-key-change-in-production-32chars',
  cookieName: 'fieldline_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error('Unauthorized');
  }
  return { userId: session.userId, email: session.email!, businessName: session.businessName! };
}
