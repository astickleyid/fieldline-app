import { NextRequest, NextResponse } from 'next/server';
import { listLeadActivity, logActivity } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const activity = await listLeadActivity(ctx.params.id);
    return NextResponse.json({ activity });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    await logActivity(userId, body.type || 'note-added', body.message, { leadId: ctx.params.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
