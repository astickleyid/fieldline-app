import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, seedDemo } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, businessName, trade, phone } = await req.json();
    if (!email || !businessName || !trade) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const user = await createUser({ email, businessName, trade, phone });
    await seedDemo(user.id);

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.businessName = user.businessName;
    await session.save();

    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
