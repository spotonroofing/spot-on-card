import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBot } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { repId, eventType } = await req.json();

    if (!repId || !eventType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!['card_view', 'contact_tap'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent');

    // Skip bot traffic for card_view events
    if (eventType === 'card_view' && isBot(userAgent)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await prisma.analyticsEvent.create({
      data: {
        repId,
        eventType,
        userAgent,
        referrer: req.headers.get('referer'),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
