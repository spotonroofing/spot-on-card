import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.repId) return null;
  const rep = await prisma.rep.findUnique({ where: { id: session.user.repId } });
  if (!rep || rep.role !== 'admin') return null;
  return rep;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30'; // days

    let dateFilter = {};
    if (range !== 'all') {
      const days = parseInt(range, 10);
      dateFilter = {
        timestamp: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      };
    }

    const [totalViews, totalTaps] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { eventType: 'card_view', ...dateFilter },
      }),
      prisma.analyticsEvent.count({
        where: { eventType: 'contact_tap', ...dateFilter },
      }),
    ]);

    // Per-rep breakdown
    const reps = await prisma.rep.findMany({
      select: { id: true, firstName: true, lastName: true, slug: true },
      orderBy: { firstName: 'asc' },
    });

    const perRep = await Promise.all(
      reps.map(async (rep) => {
        const [views, taps] = await Promise.all([
          prisma.analyticsEvent.count({
            where: { repId: rep.id, eventType: 'card_view', ...dateFilter },
          }),
          prisma.analyticsEvent.count({
            where: { repId: rep.id, eventType: 'contact_tap', ...dateFilter },
          }),
        ]);
        return { ...rep, views, taps };
      })
    );

    return NextResponse.json({
      totalViews,
      totalTaps,
      perRep: perRep.filter(r => r.views > 0 || r.taps > 0),
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
