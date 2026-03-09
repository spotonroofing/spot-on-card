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

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await req.json();
    const settings = await prisma.companySettings.findFirst();

    if (!settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 404 });
    }

    const updated = await prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        companyName: data.companyName ?? settings.companyName,
        companyAddress: data.companyAddress ?? settings.companyAddress,
        companyPhone: data.companyPhone !== undefined ? data.companyPhone : settings.companyPhone,
        companyWebsite: data.companyWebsite ?? settings.companyWebsite,
        companyLogo: data.companyLogo !== undefined ? data.companyLogo : settings.companyLogo,
        companyInstagram: data.companyInstagram !== undefined ? data.companyInstagram : settings.companyInstagram,
        companyFacebook: data.companyFacebook !== undefined ? data.companyFacebook : settings.companyFacebook,
        companyLinkedIn: data.companyLinkedIn !== undefined ? data.companyLinkedIn : settings.companyLinkedIn,
        companyTikTok: data.companyTikTok !== undefined ? data.companyTikTok : settings.companyTikTok,
        companyYouTube: data.companyYouTube !== undefined ? data.companyYouTube : settings.companyYouTube,
        inviteCode: data.inviteCode ?? settings.inviteCode,
        brandPrimaryColor: data.brandPrimaryColor ?? settings.brandPrimaryColor,
        brandSecondaryColor: data.brandSecondaryColor ?? settings.brandSecondaryColor,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
