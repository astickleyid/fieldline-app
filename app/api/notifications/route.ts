import { NextRequest, NextResponse } from 'next/server';
import { listNotifications, refreshNotifications, markAllNotificationsRead } from '@/lib/db';
import { requireUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    if (req.nextUrl.searchParams.get('refresh') === '1') {
      await refreshNotifications(userId);
    }
    const notifications = await listNotifications(userId);
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    if (body.action === 'mark-all-read') {
      await markAllNotificationsRead(userId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
