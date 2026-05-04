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

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceAccountKey || !sheetId) {
      return NextResponse.json(
        { error: 'Missing Google Sheets environment variables (GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID)' },
        { status: 500 }
      );
    }

    const { client_email, private_key } = JSON.parse(serviceAccountKey);

    const jwtAuth = new google.auth.JWT({
      email: client_email,
      key: private_key,
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

    console.log(`[sync-roster] Starting sync across ${tabNames.length} tabs: ${tabNames.join(', ')}`);

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

        const workEmail = workEmailIdx !== -1 ? (row[workEmailIdx] || '').trim().toLowerCase() : '';
        const personalEmail = personalEmailIdx !== -1 ? (row[personalEmailIdx] || '').trim().toLowerCase() : '';
        const email = workEmail || personalEmail;

        if (!email) {
          console.log(`[sync-roster] SKIP row ${i + 1} in "${tabName}": ${firstName} ${lastName} (no email)`);
          skipped++;
          continue;
        }

        const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '';
        const roleValue = roleIdx !== -1 ? (row[roleIdx] || '').trim() : '';

        const jobTitle = SPECIALIST_TABS.includes(tabName)
          ? 'Exterior Specialist'
          : roleValue;

        const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'rep';

        const slug = generateSlugFromName(firstName, lastName);

        try {
          let existing = await prisma.rep.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          });
          let matchedBy: 'email' | 'name' | null = existing ? 'email' : null;

          if (!existing) {
            existing = await prisma.rep.findFirst({
              where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
              },
            });
            if (existing) matchedBy = 'name';
          }

          if (existing) {
            await prisma.rep.update({
              where: { id: existing.id },
              data: {
                firstName,
                lastName,
                email,
                jobTitle,
                phone,
                role,
              },
            });
            console.log(
              `[sync-roster] UPDATE ${firstName} ${lastName} <${email}> in "${tabName}" (matched by ${matchedBy}, existing id=${existing.id}, existing email=${existing.email})`
            );
            updated++;
          } else {
            const slugOwner = await prisma.rep.findUnique({ where: { slug } });
            if (slugOwner) {
              const warning = `Slug "${slug}" already belongs to ${slugOwner.firstName} ${slugOwner.lastName} <${slugOwner.email}> (id=${slugOwner.id}). Skipping ${firstName} ${lastName} <${email}> in "${tabName}".`;
              console.warn(`[sync-roster] SKIP ${warning}`);
              errors.push(warning);
              skipped++;
              continue;
            }

            const createdRep = await prisma.rep.create({
              data: {
                firstName,
                lastName,
                email,
                slug,
                jobTitle,
                phone,
                role,
              },
            });
            console.log(
              `[sync-roster] CREATE ${firstName} ${lastName} <${email}> in "${tabName}" (id=${createdRep.id}, slug=${slug})`
            );
            created++;
          }

          await prisma.user.upsert({
            where: { email },
            update: { name: `${firstName} ${lastName}` },
            create: { email, name: `${firstName} ${lastName}` },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[sync-roster] ERROR row ${i + 1} in "${tabName}" (${email}): ${message}`);
          errors.push(`Row ${i + 1} in "${tabName}" (${email}): ${message}`);
        }
      }
    }

    console.log(
      `[sync-roster] Done. created=${created}, updated=${updated}, skipped=${skipped}, errors=${errors.length}`
    );

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
