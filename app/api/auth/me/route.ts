import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/db';
import { getSession, requireUser } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const user = await getUserById(userId);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const patch = await req.json();
    // Don't allow id/email changes via this route
    delete patch.id;
    delete patch.email;
    delete patch.createdAt;
    const user = await updateUser(userId, patch);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update session if business name changed
    if (patch.businessName) {
      const session = await getSession();
      session.businessName = patch.businessName;
      await session.save();
    }

    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
