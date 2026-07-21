import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if tables already exist
    const { data: checkData } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('id')
      .limit(1);

    if (checkData !== null) {
      return NextResponse.json({ success: true, message: 'Tables already exist.' });
    }
  } catch {
    // table doesn't exist, proceed with creation
  }

  const sql = `
create table if not exists public.seerah_quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  email text,
  chapter_number int not null check (chapter_number between 1 and 5),
  answers jsonb not null,
  auto_marks int[] not null default '{}',
  manual_marks int[],
  auto_score int not null default 0,
  final_score int not null default 0,
  status text not null default 'needs_improvement' check (status in ('passed', 'needs_improvement')),
  admin_notes text,
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  unique (user_id, chapter_number)
);

create table if not exists public.seerah_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  user_name text,
  email text,
  issued_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.seerah_quiz_submissions enable row level security;
alter table public.seerah_certificates enable row level security;

drop policy if exists "Users can read own seerah submissions" on public.seerah_quiz_submissions;
create policy "Users can read own seerah submissions"
  on public.seerah_quiz_submissions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own seerah submissions" on public.seerah_quiz_submissions;
create policy "Users can insert own seerah submissions"
  on public.seerah_quiz_submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own seerah certificates" on public.seerah_certificates;
create policy "Users can read own seerah certificates"
  on public.seerah_certificates for select
  to authenticated
  using (auth.uid() = user_id);

grant select, insert on public.seerah_quiz_submissions to authenticated;
grant select on public.seerah_certificates to authenticated;
grant all on public.seerah_quiz_submissions to service_role;
grant all on public.seerah_certificates to service_role;
  `.trim();

  const { error } = await supabaseAdmin.rpc('exec_sql', { sql }).single();

  if (error) {
    // rpc exec_sql may not exist; fall back to direct insert test
    // Instead, return the SQL for the user to run manually, plus a test insert
    return NextResponse.json({
      success: false,
      message: 'Could not auto-create tables via RPC. Please run the SQL manually in Supabase.',
      sql,
      rpcError: error.message,
    }, { status: 503 });
  }

  return NextResponse.json({ success: true, message: 'Seerah tables created successfully.' });
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('id')
      .limit(1);

    if (error?.code === '42P01') {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ exists: true });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
