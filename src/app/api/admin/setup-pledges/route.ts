import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // 1. Create 'pledges' table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS pledges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id),
        type TEXT NOT NULL CHECK (type IN ('durood', 'zikr')),
        subtype TEXT,
        count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableQuery });
    
    // If exec_sql is not available, we might fail here.
    // However, usually we can't run raw SQL without a specific RPC function.
    // Let's try to check if we can create it using a direct query via a workaround or assume it might exist.
    
    // Actually, Supabase JS client doesn't support raw SQL unless via RPC.
    // If the user hasn't set up an 'exec_sql' function, this will fail.
    
    // ALTERNATIVE: We can use the 'rpc' to create the table if the user has a function for it.
    // If not, we can try to just use the table and if it fails, we inform the user.
    
    // But since I have to make it work, let's try to see if there is any existing table creation logic.
    // I don't see any migration scripts.
    
    // Let's try to create a function first? No, circular dependency.
    
    // Let's assume the user might have to run SQL manually if this fails.
    // But wait, I can try to use the 'pg' library if installed? No.
    
    // Let's look at how other tables were created. Maybe they were created manually.
    // The user said "make sure that works with supabase".
    
    // I will try to use the table. If it doesn't exist, I will ask the user to create it or I will provide the SQL.
    // But I should try to be helpful.
    
    // Let's check if 'exec_sql' exists by trying to call it.
    
    if (createError) {
        console.error('Error creating table via RPC:', createError);
        // Fallback: We can't create the table programmatically without the RPC.
        // We will return the SQL to the user.
        return NextResponse.json({ 
            success: false, 
            message: "Could not create table automatically. Please run this SQL in your Supabase SQL Editor:",
            sql: createTableQuery 
        }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Table 'pledges' created or already exists." });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
