import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ── roster data ──────────────────────────────────────────────────────
// Add new reps here. slug is auto-generated as firstname-lastname.
// Role defaults to 'rep'; only emails listed in ADMIN_EMAILS get 'admin'.

interface RosterEntry {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
}

const ADMIN_EMAILS = new Set([
  'brack@spotonroof.com',
  'jarrod@spotonroof.com',
]);

const roster: RosterEntry[] = [
  // ─── leadership ───
  { firstName: 'Jarrod',   lastName: 'Payne',      jobTitle: 'President / Co-Founder', phone: '+16145723968', email: 'jarrod@spotonroof.com' },
  { firstName: 'Brack',    lastName: 'Dillon',      jobTitle: 'Co-Owner / Partner',     phone: '+16148320273', email: 'brack@spotonroof.com' },

  // ─── operations ───
  { firstName: 'Willem',   lastName: 'Lawrence',    jobTitle: 'Office Manager',         phone: '+16144779557', email: 'admin@spotonroof.com' },
  { firstName: 'Jared',    lastName: 'Luna',        jobTitle: 'Recruiter',              phone: '+15135000314', email: 'jared@spotonroof.com' },
  { firstName: 'Nick',     lastName: 'Newton',      jobTitle: 'Training Manager',       phone: '+16145374610', email: 'nick@spotonroof.com' },
  { firstName: 'Cameron',  lastName: 'Rittenour',   jobTitle: 'Finance Manager',        phone: '+13307056978', email: 'cameron@spotonroof.com' },
  { firstName: 'Brooks',   lastName: 'Dennehy',     jobTitle: 'Production Manager',     phone: '+15672897488', email: 'brooks@spotonroof.com' },

  // ─── team leads ───
  { firstName: 'Evan',     lastName: 'Spangler',    jobTitle: 'Team Lead',              phone: '+14199614328', email: 'evan@spotonroof.com' },
  { firstName: 'Hayden',   lastName: 'Laucher',     jobTitle: 'Team Lead',              phone: '+16149803334', email: 'hayden@spotonroof.com' },

  // ─── exterior specialists ───
  { firstName: 'Giovanni', lastName: 'Glover',     jobTitle: 'Exterior Specialist',    phone: '+17403242011', email: 'giovanni@spotonroof.com' },
  { firstName: 'Keyon',    lastName: 'Mayle',       jobTitle: 'Exterior Specialist',    phone: '+17407041111', email: 'kmiller042014@gmail.com' },
  { firstName: 'Andrew',   lastName: 'Meyers',      jobTitle: 'Exterior Specialist',    phone: '+16146743951', email: 'andrew@meyersteamcbus.com' },
  { firstName: 'Dillon',   lastName: 'Elswick',     jobTitle: 'Exterior Specialist',    phone: '+17407716332', email: 'dillonelswick169@gmail.com' },
  { firstName: 'Jordan',   lastName: 'Watson',      jobTitle: 'Exterior Specialist',    phone: '+17406418729', email: 'watsonjordan58@yahoo.com' },
  { firstName: 'Kyle',     lastName: 'Leppert',     jobTitle: 'Exterior Specialist',    phone: '+16146491218', email: 'leppertkjl@gmail.com' },
  { firstName: 'Michael',  lastName: 'Didier',      jobTitle: 'Exterior Specialist',    phone: '+19378238571', email: 'mdidier1011@gmail.com' },
  { firstName: 'Tristan',  lastName: 'Lovin',       jobTitle: 'Exterior Specialist',    phone: '+15134654001', email: 'mclovintri1@gmail.com' },
  { firstName: 'Bradley',  lastName: 'Webb',        jobTitle: 'Exterior Specialist',    phone: '+12166339192', email: 'bradwebb7@gmail.com' },
];

// ── helpers ───────────────────────────────────────────────────────────

function toSlug(first: string, last: string): string {
  return `${first}-${last}`.toLowerCase();
}

function roleFor(email: string): Role {
  return ADMIN_EMAILS.has(email) ? 'admin' : 'rep';
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${roster.length} rep+user pairs…\n`);

  for (const entry of roster) {
    const slug = toSlug(entry.firstName, entry.lastName);
    const role = roleFor(entry.email);
    const fullName = `${entry.firstName} ${entry.lastName}`;

    // Upsert Rep (card record)
    const rep = await prisma.rep.upsert({
      where: { email: entry.email },
      update: {
        firstName: entry.firstName,
        lastName:  entry.lastName,
        slug,
        jobTitle:  entry.jobTitle,
        phone:     entry.phone,
        role,
      },
      create: {
        email:     entry.email,
        firstName: entry.firstName,
        lastName:  entry.lastName,
        slug,
        jobTitle:  entry.jobTitle,
        phone:     entry.phone,
        role,
        isActive:  true,
      },
    });

    // Upsert matching NextAuth User (login record)
    await prisma.user.upsert({
      where: { email: entry.email },
      update: { name: fullName },
      create: { email: entry.email, name: fullName },
    });

    console.log(`  ✔ ${fullName.padEnd(22)} ${entry.email.padEnd(28)} role=${role}  slug=${rep.slug}`);
  }

  console.log(`\nDone – ${roster.length} pairs upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
