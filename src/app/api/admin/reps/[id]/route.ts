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

// PUT update a rep (admin has full access)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const rep = await prisma.rep.findUnique({ where: { id } });
    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
    }

    const updated = await prisma.rep.update({
      where: { id },
      data: {
        firstName: data.firstName ?? rep.firstName,
        lastName: data.lastName ?? rep.lastName,
        jobTitle: data.jobTitle ?? rep.jobTitle,
        phone: data.phone ?? rep.phone,
        email: data.email ?? rep.email,
        bio: data.bio !== undefined ? (data.bio ? data.bio.substring(0, 200) : null) : rep.bio,
        profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : rep.profilePhoto,
        personalInstagram: data.personalInstagram !== undefined ? (data.personalInstagram || null) : rep.personalInstagram,
        personalLinkedIn: data.personalLinkedIn !== undefined ? (data.personalLinkedIn || null) : rep.personalLinkedIn,
        personalFacebook: data.personalFacebook !== undefined ? (data.personalFacebook || null) : rep.personalFacebook,
        personalTikTok: data.personalTikTok !== undefined ? (data.personalTikTok || null) : rep.personalTikTok,
        personalWebsite: data.personalWebsite !== undefined ? (data.personalWebsite || null) : rep.personalWebsite,
        isActive: data.isActive !== undefined ? data.isActive : rep.isActive,
        role: data.role !== undefined ? data.role : rep.role,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin update rep error:', error);
    return NextResponse.json({ error: 'Failed to update rep' }, { status: 500 });
  }
}

// DELETE a rep
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === admin.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const rep = await prisma.rep.findUnique({ where: { id } });
    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
    }

    // Delete the rep (analytics cascade via onDelete)
    await prisma.rep.delete({ where: { id } });

    // Also clean up the NextAuth user
    await prisma.user.deleteMany({ where: { email: rep.email } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin delete rep error:', error);
    return NextResponse.json({ error: 'Failed to delete rep' }, { status: 500 });
  }
}
