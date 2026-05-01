'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SetupClient({ initialSql }: { initialSql: string }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/check-db');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checklistSql = `-- Run this in Supabase SQL Editor
create table if not exists daily_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date default current_date not null,
  completed_items jsonb default '[]'::jsonb,
  good_deed text,
  daily_points int default 0,
  mission_bonus_claimed_at timestamp with time zone,
  mission_bonus_points int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);
alter table daily_progress add column if not exists mission_bonus_claimed_at timestamp with time zone;
alter table daily_progress add column if not exists mission_bonus_points int default 0;
alter table daily_progress enable row level security;
drop policy if exists "Users can view their own daily progress" on daily_progress;
create policy "Users can view their own daily progress" on daily_progress for select using ( auth.uid() = user_id );
drop policy if exists "Users can insert their own daily progress" on daily_progress;
create policy "Users can insert their own daily progress" on daily_progress for insert with check ( auth.uid() = user_id );
drop policy if exists "Users can update their own daily progress" on daily_progress;
create policy "Users can update their own daily progress" on daily_progress for update using ( auth.uid() = user_id );
grant all on daily_progress to service_role;
grant all on daily_progress to authenticated;
`;

  const pointsRpcSql = `-- Run this in Supabase SQL Editor to enable Daily Points
create or replace function increment_points(row_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
declare
  v_today_points int;
  v_last_earned date;
begin
  -- Check if record exists
  if not exists (select 1 from users_points where user_id = row_id) then
    insert into users_points (user_id, total_points, weekly_points, monthly_points, today_points, last_earned_date)
    values (row_id, amount, amount, amount, amount, current_date);
  else
    select today_points, last_earned_date into v_today_points, v_last_earned 
    from users_points 
    where user_id = row_id;
    
    -- Reset daily points if needed (new day)
    if v_last_earned is null or v_last_earned < current_date then
      v_today_points := 0;
    end if;

    update users_points
    set
      total_points = coalesce(total_points, 0) + amount,
      weekly_points = coalesce(weekly_points, 0) + amount,
      monthly_points = coalesce(monthly_points, 0) + amount,
      today_points = v_today_points + amount,
      last_earned_date = current_date
    where user_id = row_id;
  end if;
end;
$$;
`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🛠️ Database Setup & Diagnostics</h1>

      {/* New Section for Points RPC Setup */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-green-100">
        <h2 className="text-xl font-bold text-green-700 mb-2">Required: Points System Setup</h2>
        <p className="text-sm text-gray-600 mb-4">Run this SQL to allow the Daily Tracker to update user points.</p>
        <div className="relative bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <button 
            onClick={() => copyToClipboard(pointsRpcSql)}
            className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
            {pointsRpcSql}
          </pre>
        </div>
      </div>

      {/* New Section for Checklist Setup */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-blue-100">
        <h2 className="text-xl font-bold text-blue-700 mb-2">New Feature: Daily Tracker Setup</h2>
        <p className="text-sm text-gray-600 mb-4">Run this SQL to enable the Daily Tick Chart feature.</p>
        <div className="relative bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <button 
            onClick={() => copyToClipboard(checklistSql)}
            className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap">
            {checklistSql}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-700">Current Status</h2>
          <button 
            onClick={checkStatus} 
            disabled={loading}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          <StatusItem 
            label="Database Connection" 
            success={status?.connection} 
            loading={loading} 
          />
          <StatusItem 
            label="Stories Table Exists" 
            success={status?.storiesTable} 
            loading={loading} 
          />
          <StatusItem 
            label="Daily Tracker Table" 
            success={status?.dailyProgressTable} 
            loading={loading} 
            warning={!status?.dailyProgressTable}
          />
          <StatusItem 
            label="Content Column Exists" 
            success={status?.contentColumn} 
            loading={loading}
            warning={status?.storiesTable && !status?.contentColumn} 
          />
          
          {status?.storiesTable && !status?.contentColumn && (
             <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
               <strong>⚠️ Missing Column Detected:</strong> The 'content' column is missing from your stories table.
               <br/>
               Please run the SQL script below to fix this.
             </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <span className="text-gray-600">Stories Count:</span>
             <span className="font-mono font-bold">{status?.storiesCount ?? '-'}</span>
          </div>

          {status?.error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
              <strong>Error:</strong> {status.error}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Setup Script (SQL)</h2>
        <p className="text-gray-600 mb-4">
          If any checks above failed, run this SQL script in your Supabase SQL Editor.
        </p>

        <div className="relative">
          <button
            onClick={() => copyToClipboard(initialSql)}
            className="absolute top-2 right-2 bg-gray-800 text-white px-3 py-1 rounded-md text-sm flex items-center gap-2 hover:bg-gray-700 transition"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy SQL'}
          </button>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm h-96">
            {initialSql}
          </pre>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg">
            <h3 className="font-bold mb-2">How to fix:</h3>
            <ol className="list-decimal ml-5 space-y-1">
                <li>Copy the SQL code above.</li>
                <li>Go to your <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" className="underline hover:text-blue-600">Supabase SQL Editor</a>.</li>
                <li>Paste the code and click <strong>RUN</strong>.</li>
                <li>Come back here and click <strong>Refresh</strong> to verify.</li>
            </ol>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, success, loading, warning }: any) {
  if (loading && success === undefined) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-50">
        <span>{label}</span>
        <span className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      warning ? 'bg-yellow-50 text-yellow-800' :
      success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
    }`}>
      <span className="font-medium">{label}</span>
      {warning ? (
        <span className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle size={18} /> Missing
        </span>
      ) : success ? (
        <span className="flex items-center gap-2 text-sm font-bold">
          <CheckCircle size={18} /> OK
        </span>
      ) : (
        <span className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle size={18} /> Failed
        </span>
      )}
    </div>
  );
}
