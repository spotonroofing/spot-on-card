import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [cardViews, contactTaps] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { repId: session.user.repId, eventType: 'card_view' },
      }),
      prisma.analyticsEvent.count({
        where: { repId: session.user.repId, eventType: 'contact_tap' },
      }),
    ]);

    return NextResponse.json({ cardViews, contactTaps });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
