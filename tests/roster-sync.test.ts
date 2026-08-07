import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRosterSource,
  processSheetRows,
  deactivateMissingReps,
  syncFromCore,
  RosterConfigError,
  type RosterDb,
  type SyncResult,
  type CoreRosterEntry,
} from '../src/lib/roster-sync';

interface FakeRep {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  slug: string;
  jobTitle: string;
  phone: string;
  role: string;
  isActive: boolean;
}

function makeFakeDb(seed: Partial<FakeRep>[] = []) {
  let nextId = 1;
  const reps: FakeRep[] = seed.map((r) => ({
    id: r.id ?? `seed-${nextId++}`,
    email: r.email ?? '',
    firstName: r.firstName ?? '',
    lastName: r.lastName ?? '',
    slug: r.slug ?? '',
    jobTitle: r.jobTitle ?? '',
    phone: r.phone ?? '',
    role: r.role ?? 'rep',
    isActive: r.isActive ?? true,
  }));
  const userUpserts: { email: string; name: string }[] = [];
  const createdData: Record<string, unknown>[] = [];

  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  const db: RosterDb = {
    rep: {
      async findFirst(args: any) {
        const w = args.where;
        if (w.email) return reps.find((r) => eq(r.email, w.email.equals)) ?? null;
        return (
          reps.find(
            (r) => eq(r.firstName, w.firstName.equals) && eq(r.lastName, w.lastName.equals)
          ) ?? null
        );
      },
      async findUnique(args: any) {
        if (args.where.slug) return reps.find((r) => r.slug === args.where.slug) ?? null;
        return reps.find((r) => r.id === args.where.id) ?? null;
      },
      async findMany() {
        return reps.map((r) => ({ ...r }));
      },
      async create(args: any) {
        createdData.push(args.data);
        const rep = { id: `new-${nextId++}`, ...args.data } as FakeRep;
        reps.push(rep);
        return rep;
      },
      async update(args: any) {
        const rep = reps.find((r) => r.id === args.where.id)!;
        Object.assign(rep, args.data);
        return rep;
      },
    },
    user: {
      async upsert(args: any) {
        userUpserts.push({ email: args.where.email, name: args.create.name });
        return {};
      },
    },
  };

  return { db, reps, userUpserts, createdData };
}

function emptyResult(): SyncResult {
  return { created: 0, updated: 0, skipped: 0, deactivated: 0, errors: [] };
}

// --- source selection ---

test('unset ROSTER_SOURCE selects the sheet path', () => {
  delete process.env.ROSTER_SOURCE;
  assert.equal(resolveRosterSource(), 'sheet');
});

test('ROSTER_SOURCE=core selects the core path', () => {
  process.env.ROSTER_SOURCE = 'core';
  assert.equal(resolveRosterSource(), 'core');
  process.env.ROSTER_SOURCE = 'sheet';
  assert.equal(resolveRosterSource(), 'sheet');
  delete process.env.ROSTER_SOURCE;
});

// --- sheet path characterization (current mapping, unchanged) ---

const SHEET_HEADERS = ['First Name', 'Last Name', 'Role', 'Phone', 'Work Email', 'Personal Email'];

test('sheet row creates a rep with the established mapping', async () => {
  const { db, userUpserts, createdData } = makeFakeDb();
  const result = emptyResult();
  const rosterEmails = new Set<string>();

  await processSheetRows(
    db,
    'Sales',
    [
      SHEET_HEADERS,
      ['JOHN', 'DOE', 'Sales Rep', '614-555-1234', 'John.Doe@SpotOnRoof.com', 'jd@gmail.com'],
      ['Jane', 'Smith', '', '', '', 'jane.smith@gmail.com'],
      ['NoEmail', 'Person', 'Rep', '', '', ''],
    ],
    result,
    rosterEmails
  );

  assert.equal(result.created, 2);
  assert.equal(result.skipped, 1);
  assert.deepEqual(createdData[0], {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@spotonroof.com',
    slug: 'john-doe',
    jobTitle: 'Sales Rep',
    phone: '614-555-1234',
    role: 'rep',
    isActive: true,
  });
  // Empty Role column falls back to the tab name; personal email used when work is empty.
  assert.deepEqual(createdData[1], {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@gmail.com',
    slug: 'jane-smith',
    jobTitle: 'Sales',
    phone: '',
    role: 'rep',
    isActive: true,
  });
  assert.deepEqual(Array.from(rosterEmails), ['john.doe@spotonroof.com', 'jane.smith@gmail.com']);
  assert.equal(userUpserts.length, 2);
  assert.deepEqual(userUpserts[0], { email: 'john.doe@spotonroof.com', name: 'John Doe' });
});

test('sheet row for an ADMIN_EMAILS address gets the admin role', async () => {
  const { db, createdData } = makeFakeDb();
  const result = emptyResult();
  await processSheetRows(
    db,
    'Office',
    [SHEET_HEADERS, ['Jarrod', 'Admin', 'Ops', '', 'jarrod@spotonroof.com', '']],
    result,
    new Set()
  );
  assert.equal(createdData[0].role, 'admin');
});

test('sheet row updates an existing rep matched by email and reactivates them', async () => {
  const { db, reps } = makeFakeDb([
    { id: 'r1', email: 'john.doe@spotonroof.com', firstName: 'Johnny', lastName: 'Doe', slug: 'johnny-doe', isActive: false },
  ]);
  const result = emptyResult();
  await processSheetRows(
    db,
    'Sales',
    [SHEET_HEADERS, ['John', 'Doe', 'Closer', '614-1111', 'John.Doe@SpotOnRoof.com', '']],
    result,
    new Set()
  );
  assert.equal(result.updated, 1);
  assert.equal(result.created, 0);
  const rep = reps.find((r) => r.id === 'r1')!;
  assert.equal(rep.firstName, 'John');
  assert.equal(rep.jobTitle, 'Closer');
  assert.equal(rep.phone, '614-1111');
  assert.equal(rep.isActive, true);
});

test('sheet deactivation: absent reps deactivated, admins and inactive reps untouched', async () => {
  const { db, reps } = makeFakeDb([
    { id: 'gone', email: 'gone@spotonroof.com', isActive: true },
    { id: 'admin', email: 'jarrod@spotonroof.com', isActive: true },
    { id: 'already', email: 'already@spotonroof.com', isActive: false },
    { id: 'stays', email: 'stays@spotonroof.com', isActive: true },
  ]);
  const result = emptyResult();
  await deactivateMissingReps(db, new Set(['stays@spotonroof.com']), result);
  assert.equal(result.deactivated, 1);
  assert.equal(reps.find((r) => r.id === 'gone')!.isActive, false);
  assert.equal(reps.find((r) => r.id === 'admin')!.isActive, true);
  assert.equal(reps.find((r) => r.id === 'stays')!.isActive, true);
});

// --- core path ---

function coreEntry(overrides: Partial<CoreRosterEntry>): CoreRosterEntry {
  return {
    email: null,
    name: null,
    active: true,
    phone: null,
    firstName: null,
    lastName: null,
    roleLabel: null,
    workEmail: null,
    personalEmail: null,
    status: 'active',
    ...overrides,
  };
}

const realFetch = global.fetch;
let fetchCalls: { url: string; headers: Record<string, string> }[] = [];

function stubCoreApi(entries: CoreRosterEntry[]) {
  fetchCalls = [];
  global.fetch = (async (url: any, init: any) => {
    fetchCalls.push({ url: String(url), headers: init?.headers ?? {} });
    return {
      ok: true,
      status: 200,
      json: async () => ({ entries, total: entries.length, page: 1, perPage: 200 }),
      text: async () => '',
    };
  }) as typeof fetch;
}

beforeEach(() => {
  process.env.SPOTON_ROSTER_URL = 'https://core.example/api/roster';
  process.env.SPOTON_ROSTER_KEY = 'test-key';
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.SPOTON_ROSTER_URL;
  delete process.env.SPOTON_ROSTER_KEY;
});

test('core path throws RosterConfigError when env vars are missing', async () => {
  delete process.env.SPOTON_ROSTER_URL;
  const { db } = makeFakeDb();
  await assert.rejects(() => syncFromCore(db), RosterConfigError);
});

test('core path upserts active entries with the same Rep shape as the sheet path', async () => {
  stubCoreApi([
    coreEntry({
      firstName: 'Alex',
      lastName: 'Warbritton',
      roleLabel: 'Exterior Specialist',
      phone: '6143273833',
      workEmail: 'alex@spotonroof.com',
      personalEmail: 'alex.personal@gmail.com',
      email: 'alex@spotonroof.com',
    }),
  ]);
  const { db, createdData, userUpserts } = makeFakeDb();
  const result = await syncFromCore(db);

  assert.equal(result.created, 1);
  assert.deepEqual(createdData[0], {
    firstName: 'Alex',
    lastName: 'Warbritton',
    email: 'alex@spotonroof.com',
    slug: 'alex-warbritton',
    jobTitle: 'Exterior Specialist',
    phone: '6143273833',
    role: 'rep',
    isActive: true,
  });
  assert.deepEqual(userUpserts[0], { email: 'alex@spotonroof.com', name: 'Alex Warbritton' });
  assert.equal(fetchCalls[0].headers['x-spoton-key'], 'test-key');
  assert.ok(fetchCalls[0].url.startsWith('https://core.example/api/roster?page=1'));
});

test('core path splits a combined name when first/last are missing', async () => {
  stubCoreApi([
    coreEntry({ name: 'Mary Jo Kopechne', workEmail: 'maryjo@spotonroof.com' }),
  ]);
  const { db, createdData } = makeFakeDb();
  await syncFromCore(db);
  assert.equal(createdData[0].firstName, 'Mary');
  assert.equal(createdData[0].lastName, 'Jo Kopechne');
});

test('core path deactivates only on active=false, never on absence', async () => {
  const { db, reps } = makeFakeDb([
    { id: 'quit', email: 'quit@spotonroof.com', firstName: 'Quit', lastName: 'Guy', slug: 'quit-guy', isActive: true },
    { id: 'absent', email: 'absent@spotonroof.com', firstName: 'Absent', lastName: 'Gal', slug: 'absent-gal', isActive: true },
  ]);
  stubCoreApi([
    coreEntry({
      firstName: 'Quit',
      lastName: 'Guy',
      workEmail: 'quit@spotonroof.com',
      active: false,
      status: 'inactive',
    }),
  ]);
  const result = await syncFromCore(db);
  assert.equal(result.deactivated, 1);
  assert.equal(reps.find((r) => r.id === 'quit')!.isActive, false);
  // Absent from the Core response entirely — must remain active.
  assert.equal(reps.find((r) => r.id === 'absent')!.isActive, true);
});

test('core path never deactivates ADMIN_EMAILS reps even if Core says inactive', async () => {
  const { db, reps } = makeFakeDb([
    { id: 'adm', email: 'jarrod@spotonroof.com', firstName: 'Jarrod', lastName: 'Admin', slug: 'jarrod-admin', isActive: true },
  ]);
  stubCoreApi([
    coreEntry({
      firstName: 'Jarrod',
      lastName: 'Admin',
      workEmail: 'jarrod@spotonroof.com',
      active: false,
      status: 'inactive',
    }),
  ]);
  const result = await syncFromCore(db);
  assert.equal(result.deactivated, 0);
  assert.equal(reps.find((r) => r.id === 'adm')!.isActive, true);
});

test('core path updates an existing rep and reactivates when Core says active', async () => {
  const { db, reps } = makeFakeDb([
    { id: 'r1', email: 'alex@spotonroof.com', firstName: 'Alex', lastName: 'Warbritton', slug: 'alex-warbritton', jobTitle: 'Old Title', isActive: false },
  ]);
  stubCoreApi([
    coreEntry({
      firstName: 'Alex',
      lastName: 'Warbritton',
      roleLabel: 'Exterior Specialist',
      phone: '6143273833',
      workEmail: 'alex@spotonroof.com',
    }),
  ]);
  const result = await syncFromCore(db);
  assert.equal(result.updated, 1);
  const rep = reps.find((r) => r.id === 'r1')!;
  assert.equal(rep.jobTitle, 'Exterior Specialist');
  assert.equal(rep.phone, '6143273833');
  assert.equal(rep.isActive, true);
});
