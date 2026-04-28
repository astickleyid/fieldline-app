import { NextRequest, NextResponse } from 'next/server';
import { listJobs, createJob } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const jobs = await listJobs(userId);
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const job = await createJob({
      userId,
      leadId: body.leadId,
      customerName: body.customerName,
      scheduledFor: Number(body.scheduledFor),
      durationMinutes: Number(body.durationMinutes) || 60,
      status: body.status || 'scheduled',
      address: body.address,
      type: body.type || 'lawn',
      notes: body.notes,
      value: Number(body.value) || 0,
    });
    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
