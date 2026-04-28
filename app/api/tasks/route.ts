import { NextRequest, NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const tasks = await listTasks(userId);
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const task = await createTask({
      userId,
      title: body.title,
      notes: body.notes,
      priority: body.priority || 'normal',
      dueAt: body.dueAt ? Number(body.dueAt) : undefined,
      leadId: body.leadId,
      customerId: body.customerId,
      jobId: body.jobId,
    });
    return NextResponse.json({ task });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
