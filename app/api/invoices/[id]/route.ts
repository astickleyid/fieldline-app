import { NextRequest, NextResponse } from 'next/server';
import { getInvoice, updateInvoice } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const invoice = await getInvoice(ctx.params.id);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const patch = await req.json();
    const updated = await updateInvoice(ctx.params.id, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ invoice: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
