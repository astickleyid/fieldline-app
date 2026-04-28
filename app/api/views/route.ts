import { NextRequest, NextResponse } from 'next/server';
import { listSavedViews, createSavedView } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const resource = req.nextUrl.searchParams.get('resource') || undefined;
    const views = await listSavedViews(userId, resource);
    return NextResponse.json({ views });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const view = await createSavedView({
      userId,
      name: body.name,
      resource: body.resource,
      filters: body.filters || {},
      sortBy: body.sortBy,
    });
    return NextResponse.json({ view });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
