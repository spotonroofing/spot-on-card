import { google } from 'googleapis';

export const ADMIN_EMAILS = [
  'brack@spotonroof.com',
  'jarrod@spotonroof.com',
  'admin@spotonroof.com',
];

const EXCLUDED_TABS = ['Appointment Setters'];

export type RosterSource = 'sheet' | 'core';

export function resolveRosterSource(): RosterSource {
  return process.env.ROSTER_SOURCE === 'core' ? 'core' : 'sheet';
}

/** Missing/invalid sync configuration — the route returns its message as a 500. */
export class RosterConfigError extends Error {}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  deactivated: number;
  errors: string[];
}

interface RepRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

/** The subset of the Prisma client both sync paths write through (injected for tests). */
export interface RosterDb {
  rep: {
    findFirst(args: unknown): Promise<RepRow | null>;
    findUnique(args: unknown): Promise<RepRow | null>;
    findMany(args: unknown): Promise<RepRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<RepRow>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<RepRow>;
  };
  user: {
    upsert(args: unknown): Promise<unknown>;
  };
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

export function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (!isAllCaps) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '-') return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

interface RosterPerson {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
}

/**
 * The one Rep upsert both sources go through: match by email then by name, update or
 * create (skipping slug collisions), and mirror into the User table for magic-link login.
 * `logContext` tags console lines (e.g. `in "Sales"`); `errorLabel` prefixes pushed errors.
 */
async function syncPerson(
  db: RosterDb,
  person: RosterPerson,
  logContext: string,
  errorLabel: string,
  result: SyncResult
): Promise<void> {
  const { firstName, lastName, email, phone, jobTitle } = person;
  const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'rep';
  const slug = generateSlugFromName(firstName, lastName);

  try {
    let existing = await db.rep.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    let matchedBy: 'email' | 'name' | null = existing ? 'email' : null;

    if (!existing) {
      existing = await db.rep.findFirst({
        where: {
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      });
      if (existing) matchedBy = 'name';
    }

    if (existing) {
      await db.rep.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          email,
          jobTitle,
          phone,
          role,
          isActive: true,
        },
      });
      console.log(
        `[sync-roster] UPDATE ${firstName} ${lastName} <${email}> ${logContext} (matched by ${matchedBy}, existing id=${existing.id}, existing email=${existing.email})`
      );
      result.updated++;
    } else {
      const slugOwner = await db.rep.findUnique({ where: { slug } });
      if (slugOwner) {
        const warning = `Slug "${slug}" already belongs to ${slugOwner.firstName} ${slugOwner.lastName} <${slugOwner.email}> (id=${slugOwner.id}). Skipping ${firstName} ${lastName} <${email}> ${logContext}.`;
        console.warn(`[sync-roster] SKIP ${warning}`);
        result.errors.push(warning);
        result.skipped++;
        return;
      }

      const createdRep = await db.rep.create({
        data: {
          firstName,
          lastName,
          email,
          slug,
          jobTitle,
          phone,
          role,
          isActive: true,
        },
      });
      console.log(
        `[sync-roster] CREATE ${firstName} ${lastName} <${email}> ${logContext} (id=${createdRep.id}, slug=${slug})`
      );
      result.created++;
    }

    await db.user.upsert({
      where: { email },
      update: { name: `${firstName} ${lastName}` },
      create: { email, name: `${firstName} ${lastName}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sync-roster] ERROR ${errorLabel} (${email}): ${message}`);
    result.errors.push(`${errorLabel} (${email}): ${message}`);
  }
}

/** Process one sheet tab's raw rows (header row first) — the sheet path's row mapping. */
export async function processSheetRows(
  db: RosterDb,
  tabName: string,
  rows: string[][],
  result: SyncResult,
  rosterEmails: Set<string>
): Promise<void> {
  if (rows.length < 2) return;

  const headers = rows[0].map((h) => (h || '').trim());
  const firstNameIdx = findColumnIndex(headers, 'First Name');
  const lastNameIdx = findColumnIndex(headers, 'Last Name');
  const roleIdx = findColumnIndex(headers, 'Role');
  const phoneIdx = findColumnIndex(headers, 'Phone');
  const workEmailIdx = findColumnIndex(headers, 'Work Email');
  const personalEmailIdx = findColumnIndex(headers, 'Personal Email');

  if (firstNameIdx === -1 || lastNameIdx === -1) {
    result.errors.push(`Tab "${tabName}": missing First Name or Last Name column`);
    return;
  }

  if (workEmailIdx === -1 && personalEmailIdx === -1) {
    result.errors.push(`Tab "${tabName}": missing both Work Email and Personal Email columns`);
    return;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const firstName = normalizeName(row[firstNameIdx] || '');
    const lastName = normalizeName(row[lastNameIdx] || '');

    if (!firstName || !lastName) continue;

    const workEmail = workEmailIdx !== -1 ? (row[workEmailIdx] || '').trim().toLowerCase() : '';
    const personalEmail = personalEmailIdx !== -1 ? (row[personalEmailIdx] || '').trim().toLowerCase() : '';
    const email = workEmail || personalEmail;

    if (!email) {
      console.log(`[sync-roster] SKIP row ${i + 1} in "${tabName}": ${firstName} ${lastName} (no email)`);
      result.skipped++;
      continue;
    }

    rosterEmails.add(email);

    const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '';
    const roleValue = roleIdx !== -1 ? (row[roleIdx] || '').trim() : '';
    const jobTitle = roleValue || tabName;

    await syncPerson(
      db,
      { firstName, lastName, email, phone, jobTitle },
      `in "${tabName}"`,
      `Row ${i + 1} in "${tabName}"`,
      result
    );
  }
}

/** Sheet-path deactivation: anyone in the DB but absent from the sheet, admins excepted. */
export async function deactivateMissingReps(
  db: RosterDb,
  rosterEmails: Set<string>,
  result: SyncResult
): Promise<void> {
  const allReps = await db.rep.findMany({ select: { id: true, email: true, firstName: true, lastName: true, isActive: true } });
  for (const rep of allReps) {
    const repEmail = rep.email.toLowerCase();
    if (ADMIN_EMAILS.includes(repEmail)) continue;
    if (rosterEmails.has(repEmail)) continue;
    if (!rep.isActive) continue;
    try {
      await db.rep.update({ where: { id: rep.id }, data: { isActive: false } });
      console.log(`[sync-roster] DEACTIVATE ${rep.firstName} ${rep.lastName} <${rep.email}> (id=${rep.id})`);
      result.deactivated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sync-roster] ERROR deactivating ${rep.email}: ${message}`);
      result.errors.push(`Deactivate ${rep.email}: ${message}`);
    }
  }
}

/** The original Google Sheets sync, unchanged in behavior. Default source. */
export async function syncFromSheet(db: RosterDb): Promise<SyncResult> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountKey || !sheetId) {
    throw new RosterConfigError(
      'Missing Google Sheets environment variables (GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID)'
    );
  }

  const { client_email, private_key } = JSON.parse(serviceAccountKey);

  const jwtAuth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth: jwtAuth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const allTabs = spreadsheet.data.sheets || [];
  const tabNames = allTabs
    .map((s) => s.properties?.title || '')
    .filter((name) => name && !EXCLUDED_TABS.includes(name));

  const result: SyncResult = { created: 0, updated: 0, skipped: 0, deactivated: 0, errors: [] };
  const rosterEmails = new Set<string>();

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
      result.errors.push(`Failed to read tab "${tabName}": ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    await processSheetRows(db, tabName, rows, result, rosterEmails);
  }

  await deactivateMissingReps(db, rosterEmails, result);

  console.log(
    `[sync-roster] Done. created=${result.created}, updated=${result.updated}, skipped=${result.skipped}, deactivated=${result.deactivated}, errors=${result.errors.length}`
  );

  return result;
}

/** One roster row as SpotOn Core's keyed API serves it (dates arrive as JSON strings). */
export interface CoreRosterEntry {
  email: string | null;
  name: string | null;
  active: boolean;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  roleLabel: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  status: string;
}

/**
 * The SpotOn Core sync: fetch the full roster from Core's keyed API and mirror it into
 * Rep with the same upsert shape as the sheet path. Deactivation is driven ONLY by each
 * row's `active` flag — never by absence from the response — and admins are never
 * deactivated.
 */
export async function syncFromCore(db: RosterDb): Promise<SyncResult> {
  const baseUrl = process.env.SPOTON_ROSTER_URL;
  const apiKey = process.env.SPOTON_ROSTER_KEY;

  if (!baseUrl || !apiKey) {
    throw new RosterConfigError(
      'Missing SpotOn Core environment variables (SPOTON_ROSTER_URL, SPOTON_ROSTER_KEY)'
    );
  }

  const entries: CoreRosterEntry[] = [];
  const perPage = 200;
  for (let page = 1; ; page++) {
    const res = await fetch(`${baseUrl}?page=${page}&perPage=${perPage}`, {
      headers: { 'x-spoton-key': apiKey },
    });
    if (!res.ok) {
      throw new Error(`Core roster API responded ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as { entries: CoreRosterEntry[]; total: number };
    entries.push(...body.entries);
    if (entries.length >= body.total || body.entries.length === 0) break;
  }

  const result: SyncResult = { created: 0, updated: 0, skipped: 0, deactivated: 0, errors: [] };

  console.log(`[sync-roster] Starting Core sync: ${entries.length} roster entries`);

  for (const entry of entries) {
    let firstName = normalizeName(entry.firstName || '');
    let lastName = normalizeName(entry.lastName || '');
    if ((!firstName || !lastName) && entry.name) {
      const parts = entry.name.trim().split(/\s+/);
      firstName = firstName || normalizeName(parts[0] || '');
      lastName = lastName || normalizeName(parts.slice(1).join(' '));
    }
    if (!firstName || !lastName) continue;

    const email = (entry.workEmail || entry.personalEmail || entry.email || '').trim().toLowerCase();
    if (!email) {
      console.log(`[sync-roster] SKIP Core entry: ${firstName} ${lastName} (no email)`);
      result.skipped++;
      continue;
    }

    if (!entry.active) {
      const existing =
        (await db.rep.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })) ||
        (await db.rep.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
          },
        }));
      if (!existing) continue;
      if (ADMIN_EMAILS.includes(existing.email.toLowerCase())) continue;
      if (!existing.isActive) continue;
      try {
        await db.rep.update({ where: { id: existing.id }, data: { isActive: false } });
        console.log(`[sync-roster] DEACTIVATE ${existing.firstName} ${existing.lastName} <${existing.email}> (id=${existing.id}, Core active=false)`);
        result.deactivated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[sync-roster] ERROR deactivating ${existing.email}: ${message}`);
        result.errors.push(`Deactivate ${existing.email}: ${message}`);
      }
      continue;
    }

    await syncPerson(
      db,
      {
        firstName,
        lastName,
        email,
        phone: (entry.phone || '').trim(),
        jobTitle: (entry.roleLabel || '').trim(),
      },
      'from Core',
      'Core entry',
      result
    );
  }

  console.log(
    `[sync-roster] Done. created=${result.created}, updated=${result.updated}, skipped=${result.skipped}, deactivated=${result.deactivated}, errors=${result.errors.length}`
  );

  return result;
}
