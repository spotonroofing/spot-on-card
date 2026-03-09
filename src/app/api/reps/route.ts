import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rep = await prisma.rep.findUnique({
      where: { email: session.user.email },
    });

    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
    }

    return NextResponse.json(rep);
  } catch (error) {
    console.error('Error fetching rep:', error);
    return NextResponse.json({ error: 'Failed to fetch rep' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const rep = await prisma.rep.findUnique({
      where: { email: session.user.email },
    });

    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
    }

    // Reps can only edit their own editable fields
    const updated = await prisma.rep.update({
      where: { id: rep.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        phone: data.phone,
        email: data.email,
        bio: data.bio ? data.bio.substring(0, 200) : null,
        profilePhoto: data.profilePhoto,
        personalInstagram: data.personalInstagram || null,
        personalLinkedIn: data.personalLinkedIn || null,
        personalFacebook: data.personalFacebook || null,
        personalTikTok: data.personalTikTok || null,
        personalWebsite: data.personalWebsite || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating rep:', error);
    return NextResponse.json({ error: 'Failed to update rep' }, { status: 500 });
  }
}
