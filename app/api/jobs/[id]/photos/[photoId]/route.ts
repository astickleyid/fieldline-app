import { NextRequest, NextResponse } from 'next/server';
import { deleteJobPhoto } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function DELETE(_req: NextRequest, ctx: { params: { id: string; photoId: string } }) {
  try {
    await requireUser();
    await deleteJobPhoto(ctx.params.photoId, ctx.params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
