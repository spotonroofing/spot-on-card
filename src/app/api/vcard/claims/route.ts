import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generateVCard } from '@/lib/vcard';
import { CLAIMS_CONTACT } from '@/lib/claims-contact';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const company = await prisma.companySettings.findFirst().catch(() => null);
    const photo = await readFile(path.join(process.cwd(), CLAIMS_CONTACT.photoPath));

    const vcard = generateVCard({
      firstName: CLAIMS_CONTACT.firstName,
      lastName: CLAIMS_CONTACT.lastName,
      phone: CLAIMS_CONTACT.phone,
      email: CLAIMS_CONTACT.email,
      jobTitle: CLAIMS_CONTACT.jobTitle,
      orgName: CLAIMS_CONTACT.orgName,
      address: company?.companyAddress || '',
      website: company?.companyWebsite || '',
      photoBase64: photo.toString('base64'),
    });

    return new NextResponse(vcard, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': `attachment; filename="${CLAIMS_CONTACT.firstName}-${CLAIMS_CONTACT.lastName}.vcf"`,
      },
    });
  } catch (error) {
    console.error('Claims vCard error:', error);
    return NextResponse.json({ error: 'Failed to generate vCard' }, { status: 500 });
  }
}
