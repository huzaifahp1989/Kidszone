import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { CHAT_SETUP_SQL, chatTablesExist, getErrorMessage } from '@/lib/chat-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exists = await chatTablesExist();
  return NextResponse.json({ exists, sql: exists ? undefined : CHAT_SETUP_SQL });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (await chatTablesExist()) {
      return NextResponse.json({ success: true, message: 'Chat tables already exist.' });
    }

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: CHAT_SETUP_SQL }).single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not auto-create chat tables. Copy the SQL below into Supabase → SQL Editor and run it.',
          sql: CHAT_SETUP_SQL,
          rpcError: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, message: 'Chat tables created successfully.' });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
        sql: CHAT_SETUP_SQL,
      },
      { status: 500 }
    );
  }
}
