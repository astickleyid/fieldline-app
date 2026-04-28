import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, deleteJob } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const job = await getJob(ctx.params.id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const patch = await req.json();
    const updated = await updateJob(ctx.params.id, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ job: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await deleteJob(ctx.params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
