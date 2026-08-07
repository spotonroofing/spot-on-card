import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import {
  resolveRosterSource,
  syncFromSheet,
  syncFromCore,
  RosterConfigError,
} from '@/lib/roster-sync';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.repId) return null;
  const rep = await prisma.rep.findUnique({ where: { id: session.user.repId } });
  if (!rep || rep.role !== 'admin') return null;
  return rep;
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const source = resolveRosterSource();
    const result = source === 'core' ? await syncFromCore(prisma) : await syncFromSheet(prisma);

    return NextResponse.json({
      source,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      deactivated: result.deactivated,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    if (error instanceof RosterConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Sync roster error:', error);
    return NextResponse.json(
      { error: 'Failed to sync roster', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
