import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'No account found for that email' }, { status: 404 });

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
