import { NextRequest, NextResponse } from 'next/server';
import { generateRecurringJobs } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const jobs = await generateRecurringJobs(ctx.params.id);
    return NextResponse.json({ jobs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
