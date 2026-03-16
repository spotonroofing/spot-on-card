import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const ADMIN_EMAILS = [
  'brack@spotonroof.com',
  'jarrod@spotonroof.com',
  'admin@spotonroof.com',
];

const SPECIALIST_TABS = ['Senior Reps', 'Junior Reps'];
const EXCLUDED_TABS = ['Cold Callers'];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.repId) return null;
  const rep = await prisma.rep.findUnique({ where: { id: session.user.repId } });
  if (!rep || rep.role !== 'admin') return null;
  return rep;
}

function findColumnIndex(headers: string[], ...candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(
      (h) => h.trim().toLowerCase() === candidate.toLowerCase()
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function generateSlugFromName(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceEmail || !privateKey || !sheetId) {
      return NextResponse.json(
        { error: 'Missing Google Sheets environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)' },
        { status: 500 }
      );
    }

    const jwtAuth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth: jwtAuth });

    // Get all sheet/tab names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const allTabs = spreadsheet.data.sheets || [];
    const tabNames = allTabs
      .map((s) => s.properties?.title || '')
      .filter((name) => name && !EXCLUDED_TABS.includes(name));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const tabName of tabNames) {
      const range = `'${tabName}'`;
      let rows: string[][];

      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range,
        });
        rows = (res.data.values as string[][]) || [];
      } catch (err) {
        errors.push(`Failed to read tab "${tabName}": ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      if (rows.length < 2) continue; // need header + at least one data row

      const headers = rows[0].map((h) => (h || '').trim());
      const firstNameIdx = findColumnIndex(headers, 'First Name');
      const lastNameIdx = findColumnIndex(headers, 'Last Name');
      const roleIdx = findColumnIndex(headers, 'Role');
      const phoneIdx = findColumnIndex(headers, 'Phone');
      const workEmailIdx = findColumnIndex(headers, 'Work Email');
      const personalEmailIdx = findColumnIndex(headers, 'Personal Email');

      if (firstNameIdx === -1 || lastNameIdx === -1) {
        errors.push(`Tab "${tabName}": missing First Name or Last Name column`);
        continue;
      }

      if (workEmailIdx === -1 && personalEmailIdx === -1) {
        errors.push(`Tab "${tabName}": missing both Work Email and Personal Email columns`);
        continue;
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const firstName = (row[firstNameIdx] || '').trim();
        const lastName = (row[lastNameIdx] || '').trim();

        if (!firstName || !lastName) continue;

        const workEmail = workEmailIdx !== -1 ? (row[workEmailIdx] || '').trim() : '';
        const personalEmail = personalEmailIdx !== -1 ? (row[personalEmailIdx] || '').trim() : '';
        const email = workEmail || personalEmail;

        if (!email) {
          skipped++;
          continue;
        }

        const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '';
        const roleValue = roleIdx !== -1 ? (row[roleIdx] || '').trim() : '';

        // Job title: "Exterior Specialist" for Senior/Junior Reps tabs, otherwise use Role column
        const jobTitle = SPECIALIST_TABS.includes(tabName)
          ? 'Exterior Specialist'
          : roleValue;

        // Role: admin for specific emails, rep for everyone else
        const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'rep';

        const slug = generateSlugFromName(firstName, lastName);

        try {
          const existing = await prisma.rep.findUnique({ where: { email } });

          if (existing) {
            await prisma.rep.update({
              where: { email },
              data: {
                firstName,
                lastName,
                jobTitle,
                phone,
                role,
              },
            });
            updated++;
          } else {
            // Check if slug is taken and append suffix if needed
            let finalSlug = slug;
            let counter = 1;
            while (await prisma.rep.findUnique({ where: { slug: finalSlug } })) {
              counter++;
              finalSlug = `${slug}-${counter}`;
            }

            await prisma.rep.create({
              data: {
                firstName,
                lastName,
                email,
                slug: finalSlug,
                jobTitle,
                phone,
                role,
              },
            });
            created++;
          }

          // Upsert NextAuth User so magic link login works
          await prisma.user.upsert({
            where: { email },
            update: { name: `${firstName} ${lastName}` },
            create: { email, name: `${firstName} ${lastName}` },
          });
        } catch (err) {
          errors.push(`Row ${i + 1} in "${tabName}" (${email}): ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return NextResponse.json({
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Sync roster error:', error);
    return NextResponse.json(
      { error: 'Failed to sync roster', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
