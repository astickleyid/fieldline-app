import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

export const AUTH_VERSION = 2;
export const CHALLENGE_SECONDS = 600;
export const MAX_ATTEMPTS = 5;
export const GENERIC_MESSAGE = 'If this email can sign in, a verification code has been sent. Check your inbox.';
export type Signup = { businessName: string; trade: 'lawn' | 'hvac' | 'plumb' | 'other'; phone?: string };
export type Challenge = { email: string; digest: string; expiresAt: number; attempts: number; signup?: Signup };
export type AuthStore = {
  put(id: string, challenge: Challenge): Promise<void>;
  consume(id: string, digest: string, now: number): Promise<Challenge | null>;
  remove(id: string): Promise<void>;
  limit(key: string, maximum: number, seconds: number): Promise<boolean>;
};
export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new AuthError('Enter a valid email address.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('Enter a valid email address.');
  return email;
}
export function parseSignup(body: Record<string, unknown>): Signup {
  if (typeof body.businessName !== 'string' || !body.businessName.trim() || body.businessName.length > 120 ||
      !['lawn', 'hvac', 'plumb', 'other'].includes(String(body.trade)) ||
      (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.length > 40))) {
    throw new AuthError('Check your business name, trade and phone number.');
  }
  return { businessName: body.businessName.trim(), trade: body.trade as Signup['trade'], phone: body.phone as string | undefined };
}
export function secret(): string {
  const value = process.env.SESSION_PASSWORD;
  if (!value || value.length < 32 || value === 'fieldline-dev-secret-key-change-in-production-32chars') {
    throw new Error('Secure session configuration is required');
  }
  return value;
}
export function digestCode(key: string, id: string, code: string): string {
  return createHmac('sha256', key).update(`fieldline-login-v2:${id}:${code}`).digest('hex');
}
export function rateKey(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function isVerifiedSession(session: { userId?: string; authVersion?: number }): boolean {
  return typeof session.userId === 'string' && session.userId.length > 0 && session.authVersion === AUTH_VERSION;
}
export async function requestCode(input: { email: string; ip: string; signup?: Signup }, deps: {
  store: AuthStore; key: string; userExists(email: string): Promise<boolean>;
  send(email: string, code: string): Promise<void>; now?: () => number;
}): Promise<string> {
  const ipAllowed = await deps.store.limit(`request:ip:${rateKey(input.ip)}`, 20, 900);
  const emailAllowed = await deps.store.limit(`request:email:${rateKey(input.email)}`, 5, 900);
  if (!ipAllowed || !emailAllowed) throw new AuthError('Too many requests. Try again in 15 minutes.', 429);
  const id = randomBytes(32).toString('hex');
  // An indistinguishable response for unknown login addresses prevents enumeration.
  const exists = await deps.userExists(input.email);
  if (!exists && !input.signup) return id;
  const code = String(randomInt(0, 100000000)).padStart(8, '0');
  const challenge: Challenge = { email: input.email, digest: digestCode(deps.key, id, code),
    expiresAt: (deps.now?.() ?? Date.now()) + CHALLENGE_SECONDS * 1000, attempts: 0,
    ...(!exists && input.signup ? { signup: input.signup } : {}) };
  await deps.store.put(id, challenge);
  try { await deps.send(input.email, code); }
  catch {
    await deps.store.remove(id);
    // Do not turn recipient-specific delivery errors into an account-existence oracle.
    console.error('Fieldline sign-in email delivery failed');
  }
  return id;
}
export async function verifyCode(id: unknown, code: unknown, deps: { store: AuthStore; key: string; now?: () => number }): Promise<Challenge> {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id) || typeof code !== 'string' || !/^\d{8}$/.test(code)) {
    throw new AuthError('Enter the 8-digit code from your email.');
  }
  const value = await deps.store.consume(id, digestCode(deps.key, id, code), deps.now?.() ?? Date.now());
  if (!value) throw new AuthError('Invalid or expired code. Request a new code.');
  return value;
}
