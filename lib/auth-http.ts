import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUserByEmail } from './db';
import { authStore } from './auth-store';
import { AuthError, CHALLENGE_SECONDS, GENERIC_MESSAGE, normalizeEmail, parseSignup, requestCode, secret } from './auth-core';

export const CHALLENGE_COOKIE = 'fieldline_auth_request';
export const challengeCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/auth', maxAge: CHALLENGE_SECONDS };
export function requireSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  // Browser writes must originate from this app. Never accept forwarded-host overrides.
  if (!origin || origin !== new URL(req.url).origin) throw new AuthError('Please sign in from the Fieldline website.', 403);
}
export function authFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof AuthError ? error.message : 'Sign-in is temporarily unavailable. Please try again later.' },
    { status: error instanceof AuthError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function beginAuth(req: NextRequest, signup: boolean) {
  try {
    requireSameOrigin(req);
    const key = secret();
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM;
    if (!apiKey || !from) throw new AuthError('Sign-in email is not configured. Please contact the site owner.', 503);
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const data = signup ? parseSignup(body) : undefined;
    const id = await requestCode({ email, signup: data, ip: req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.ip || 'unknown' }, {
      store: authStore, key, userExists: async email => !!await getUserByEmail(email),
      send: async (email, code) => {
        const result = await new Resend(apiKey).emails.send({ from, to: email,
          subject: 'Your Fieldline sign-in code',
          text: `Your Fieldline verification code is ${code}.\n\nIt expires in 10 minutes and can only be used once. Do not share this code. If you did not request it, ignore this email.` });
        if (result.error) throw new Error('Email delivery failed');
      },
    });
    const response = NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(CHALLENGE_COOKIE, id, challengeCookieOptions);
    return response;
  } catch (error) { return authFailure(error); }
}
