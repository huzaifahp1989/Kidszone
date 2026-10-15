import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MIGRATION_RELPATH = 'supabase/migrations/20260829_create_global_notices.sql';

function loadSetupSql(): string {
  try {
    return readFileSync(join(process.cwd(), MIGRATION_RELPATH), 'utf8');
  } catch {
    return `-- Could not load ${MIGRATION_RELPATH} from the project root.`;
  }
}

async function exists(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('global_notices')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (!error) return true;
    const msg = String(error.message || '');
    if (msg.includes('does not exist') || msg.includes('not found in the schema cache')) return false;
    // Other errors (e.g. RLS) may still mean the table exists.
    return true;
  } catch {
    return false;
  }
}

function isAdminRequest(request: Request) {
  return request.headers.get('x-admin-auth') === 'true';
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existsNow = await exists();
  return NextResponse.json({
    exists: existsNow,
    sql: existsNow ? undefined : loadSetupSql(),
  });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const setupSql = loadSetupSql();
  const { error: rpcError } = await (supabaseAdmin.rpc as any)('exec_sql', { sql: setupSql });
  if (!rpcError) {
    const now = await exists();
    return NextResponse.json({ applied: true, exists: now });
  }
  const msg = String(rpcError?.message || rpcError || '');
  if (/exec_sql|function.*does not exist|permission denied/.test(msg)) {
    return NextResponse.json(
      {
        error:
          'Automatic setup is not available on this database (the exec_sql helper is missing). Please run ' +
          MIGRATION_RELPATH +
          ' in the Supabase SQL editor, then refresh.',
        setupRequired: true,
        sql: setupSql,
      },
      { status: 501 }
    );
  }
  return NextResponse.json({ error: msg, sql: setupSql }, { status: 500 });
}
