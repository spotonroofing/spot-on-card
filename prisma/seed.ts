import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create company settings
  const company = await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'SpotOnRoof',
      companyAddress: '130 E Wilson Bridge Rd Suite 300, Worthington, OH 43085',
      companyPhone: '(614) 832-0273',
      companyWebsite: 'https://spotonroof.com',
      companyInstagram: 'https://instagram.com/spotonroof',
      companyFacebook: 'https://facebook.com/spotonroof',
      companyLinkedIn: 'https://linkedin.com/company/spotonroof',
      companyTikTok: 'https://tiktok.com/@spotonroof',
      companyYouTube: 'https://youtube.com/@spotonroof',
      inviteCode: 'SPOTON2024',
      brandPrimaryColor: '#00AEEF',
      brandSecondaryColor: '#0A7E8C',
    },
  });

  console.log('Created company settings:', company.companyName);

  // Create admin user
  const admin = await prisma.rep.upsert({
    where: { email: 'admin@spotonroof.com' },
    update: {},
    create: {
      email: 'admin@spotonroof.com',
      firstName: 'Brack',
      lastName: 'Dillon',
      slug: 'brack-dillon',
      jobTitle: 'Exterior Specialist',
      phone: '(614) 832-0273',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Created admin:', admin.firstName, admin.lastName);

  // Create NextAuth User record for admin
  await prisma.user.upsert({
    where: { email: 'admin@spotonroof.com' },
    update: {},
    create: {
      email: 'admin@spotonroof.com',
      name: 'Brack Dillon',
    },
  });

  // Create sample rep
  const rep = await prisma.rep.upsert({
    where: { email: 'jane@spotonroof.com' },
    update: {},
    create: {
      email: 'jane@spotonroof.com',
      firstName: 'Jane',
      lastName: 'Smith',
      slug: 'jane-smith',
      jobTitle: 'Sales Representative',
      phone: '(614) 555-0199',
      bio: 'Helping homeowners protect their most valuable asset with quality roofing solutions.',
      role: 'rep',
      isActive: true,
    },
  });

  console.log('Created rep:', rep.firstName, rep.lastName);

  // Create NextAuth User record for rep
  await prisma.user.upsert({
    where: { email: 'jane@spotonroof.com' },
    update: {},
    create: {
      email: 'jane@spotonroof.com',
      name: 'Jane Smith',
    },
  });

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
