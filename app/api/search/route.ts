import { NextRequest, NextResponse } from 'next/server';
import { globalSearch } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const q = req.nextUrl.searchParams.get('q') || '';
    const results = await globalSearch(userId, q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
