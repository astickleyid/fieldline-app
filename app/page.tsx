import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { isVerifiedSession } from '@/lib/auth-core';

export default async function Home() {
  const session = await getSession();
  if (isVerifiedSession(session)) redirect('/dashboard');
  redirect('/login');
}
