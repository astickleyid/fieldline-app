import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function PATCH(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await markNotificationRead(userId, ctx.params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
