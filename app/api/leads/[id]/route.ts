import { NextRequest, NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const patch = await req.json();
    const updated = await updateLead(ctx.params.id, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ lead: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await deleteLead(ctx.params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
