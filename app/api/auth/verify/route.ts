import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, seedDemo } from '@/lib/db';
import { getSession } from '@/lib/session';
import { AUTH_VERSION, AuthError, secret, verifyCode } from '@/lib/auth-core';
import { authStore } from '@/lib/auth-store';
import { authFailure, CHALLENGE_COOKIE, challengeCookieOptions, requireSameOrigin } from '@/lib/auth-http';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { code } = await req.json();
    const proof = await verifyCode(req.cookies.get(CHALLENGE_COOKIE)?.value, code, { store: authStore, key: secret() });
    let user = await getUserByEmail(proof.email);
    if (!user && proof.signup) {
      const result = await createUser({ email: proof.email, ...proof.signup });
      user = result.user;
      // Preserve the existing pilot onboarding only for the winning new-account creation.
      // Partial demo setup must never prevent the verified owner from accessing the account.
      if (result.created) {
        try { await seedDemo(user.id, user.trade); }
        catch { console.error('Fieldline demo onboarding incomplete'); }
      }
    }
    if (!user) throw new AuthError('Unable to sign in. Please start again.');
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.businessName = user.businessName;
    session.authVersion = AUTH_VERSION;
    await session.save();
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(CHALLENGE_COOKIE, '', { ...challengeCookieOptions, maxAge: 0 });
    response.cookies.set('fieldline_session', '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) { return authFailure(error); }
}
