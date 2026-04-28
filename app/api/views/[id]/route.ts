import { NextRequest, NextResponse } from 'next/server';
import { deleteSavedView } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await deleteSavedView(ctx.params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
