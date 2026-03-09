import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSlug } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, inviteCode } = await req.json();

    if (!firstName || !lastName || !email || !inviteCode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate invite code
    const settings = await prisma.companySettings.findFirst();
    if (!settings || settings.inviteCode !== inviteCode) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await prisma.rep.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Generate slug
    const slug = await generateSlug(firstName, lastName);

    // Create rep
    const rep = await prisma.rep.create({
      data: {
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        slug,
        jobTitle: '',
        phone: '',
      },
    });

    // Create NextAuth User so magic link works
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `${firstName.trim()} ${lastName.trim()}`,
      },
    });

    return NextResponse.json({ success: true, slug: rep.slug });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
