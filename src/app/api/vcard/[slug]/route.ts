import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVCard } from '@/lib/vcard';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const rep = await prisma.rep.findUnique({ where: { slug } });
    if (!rep || !rep.isActive) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const company = await prisma.companySettings.findFirst();

    // Try to get photo as base64
    let photoBase64: string | undefined;
    if (rep.profilePhoto) {
      try {
        const photoPath = path.join(process.cwd(), 'public', rep.profilePhoto);
        const photoBuffer = await readFile(photoPath);
        photoBase64 = photoBuffer.toString('base64');
      } catch {
        // Photo not found, skip it
      }
    }

    const vcard = generateVCard({
      firstName: rep.firstName,
      lastName: rep.lastName,
      phone: rep.phone,
      email: rep.email,
      jobTitle: rep.jobTitle,
      orgName: company?.companyName || 'SpotOnRoof',
      address: company?.companyAddress || '',
      website: company?.companyWebsite || '',
      photoBase64,
    });

    return new NextResponse(vcard, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': `attachment; filename="${rep.firstName}-${rep.lastName}.vcf"`,
      },
    });
  } catch (error) {
    console.error('vCard error:', error);
    return NextResponse.json({ error: 'Failed to generate vCard' }, { status: 500 });
  }
}
