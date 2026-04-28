import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Lead } from '@/lib/types';
import { createJob, updateLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const lead = (await redis.get(`lead:${ctx.params.id}`)) as Lead | null;
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const body = await req.json();
    const scheduledFor = Number(body.scheduledFor);
    if (!scheduledFor) return NextResponse.json({ error: 'scheduledFor required' }, { status: 400 });

    const job = await createJob({
      userId,
      leadId: lead.id,
      customerName: lead.name,
      scheduledFor,
      durationMinutes: Number(body.durationMinutes) || 60,
      status: 'scheduled',
      address: lead.address,
      type: lead.type,
      notes: lead.notes,
      value: lead.value,
    });

    await updateLead(lead.id, { status: 'booked' });

    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
