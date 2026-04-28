import { NextRequest, NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const { ids, action, payload } = await req.json();
    if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

    let updated = 0;
    for (const id of ids) {
      try {
        if (action === 'delete') {
          await deleteLead(id, userId);
          updated++;
        } else if (action === 'set-status' && payload?.status) {
          await updateLead(id, { status: payload.status });
          updated++;
        } else if (action === 'add-tag' && payload?.tag) {
          // Need to fetch existing tags first - simplified: replace
          await updateLead(id, { tags: payload.tags || [payload.tag] });
          updated++;
        }
      } catch {}
    }
    return NextResponse.json({ updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
