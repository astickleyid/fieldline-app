import { NextResponse } from 'next/server';
import { listActivity } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const activity = await listActivity(userId, 100);
    return NextResponse.json({ activity });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
