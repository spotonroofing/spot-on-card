import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.repId) return null;
  const rep = await prisma.rep.findUnique({ where: { id: session.user.repId } });
  if (!rep || rep.role !== 'admin') return null;
  return rep;
}

// GET all reps with analytics counts
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const reps = await prisma.rep.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            analyticsEvents: true,
          },
        },
      },
    });

    // Get per-rep analytics breakdown
    const repsWithStats = await Promise.all(
      reps.map(async (rep) => {
        const [cardViews, contactTaps] = await Promise.all([
          prisma.analyticsEvent.count({ where: { repId: rep.id, eventType: 'card_view' } }),
          prisma.analyticsEvent.count({ where: { repId: rep.id, eventType: 'contact_tap' } }),
        ]);
        return { ...rep, cardViews, contactTaps };
      })
    );

    return NextResponse.json(repsWithStats);
  } catch (error) {
    console.error('Admin reps error:', error);
    return NextResponse.json({ error: 'Failed to fetch reps' }, { status: 500 });
  }
}

// POST create new rep (admin can fill all fields)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await req.json();
    const { firstName, lastName, email } = data;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Check duplicate email
    const existing = await prisma.rep.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A rep with this email already exists' }, { status: 400 });
    }

    const slug = await generateSlug(firstName, lastName);

    const rep = await prisma.rep.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        slug,
        jobTitle: data.jobTitle || '',
        phone: data.phone || '',
        bio: data.bio ? data.bio.substring(0, 200) : null,
        profilePhoto: data.profilePhoto || null,
        personalInstagram: data.personalInstagram || null,
        personalLinkedIn: data.personalLinkedIn || null,
        personalFacebook: data.personalFacebook || null,
        personalTikTok: data.personalTikTok || null,
        personalWebsite: data.personalWebsite || null,
        role: data.role || 'rep',
      },
    });

    // Create NextAuth User record so magic link works if they ever log in
    await prisma.user.upsert({
      where: { email: email.trim() },
      update: {},
      create: {
        email: email.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
      },
    });

    return NextResponse.json(rep, { status: 201 });
  } catch (error) {
    console.error('Admin create rep error:', error);
    return NextResponse.json({ error: 'Failed to create rep' }, { status: 500 });
  }
}
