import { NextRequest, NextResponse } from 'next/server';
import { listJobPhotos, addJobPhoto, getJob } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireUser();
    const photos = await listJobPhotos(ctx.params.id);
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    const job = await getJob(ctx.params.id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const body = await req.json();
    if (!body.dataUrl) return NextResponse.json({ error: 'dataUrl required' }, { status: 400 });

    // Limit photo size (rough check: 1.5MB base64 ~= 1.1MB raw)
    if (body.dataUrl.length > 2_000_000) {
      return NextResponse.json({ error: 'Photo too large (max ~1.5MB)' }, { status: 400 });
    }

    const photo = await addJobPhoto({
      jobId: job.id,
      userId,
      type: body.type || 'reference',
      dataUrl: body.dataUrl,
      caption: body.caption,
    });
    return NextResponse.json({ photo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
