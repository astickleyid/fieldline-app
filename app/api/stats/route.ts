import { NextResponse } from 'next/server';
import { computeStats, listAILog } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const [stats, aiLog] = await Promise.all([computeStats(userId), listAILog(userId)]);
    return NextResponse.json({ stats, aiLog });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
