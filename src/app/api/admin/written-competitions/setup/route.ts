import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isMissingTableError,
  WRITTEN_COMPETITIONS_TABLE,
} from '@/lib/written-competition-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function loadSetupSql() {
  try {
    return readFileSync(path.join(process.cwd(), 'SETUP_WRITTEN_COMPETITIONS.sql'), 'utf8');
  } catch {
    return '-- Could not load SETUP_WRITTEN_COMPETITIONS.sql from the project root.';
  }
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseAdmin.from(WRITTEN_COMPETITIONS_TABLE).select('id').limit(1);
  if (isMissingTableError(error)) return NextResponse.json({ exists: false, sql: loadSetupSql() });
  return NextResponse.json({ exists: !error });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const setupSql = loadSetupSql();
  const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql: setupSql });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const { error: checkError } = await supabaseAdmin.from(WRITTEN_COMPETITIONS_TABLE).select('id').limit(1);
  if (isMissingTableError(checkError)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Automatic setup is not available on this database. Run SETUP_WRITTEN_COMPETITIONS.sql in the Supabase SQL editor, then reopen this page.',
        sql: setupSql,
        rpcError: rpcError?.message || null,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Written competition tables are ready.',
  });
}
