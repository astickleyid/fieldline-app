import { NextRequest, NextResponse } from 'next/server';
import { listLeads, createLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const leads = await listLeads(userId);
    return NextResponse.json({ leads });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const lead = await createLead({
      userId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: body.status || 'new',
      type: body.type || 'lawn',
      value: Number(body.value) || 0,
      notes: body.notes,
      source: body.source,
    });
    return NextResponse.json({ lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
