'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { placeWordsOnGrid, WordSearchConfig, Difficulty } from '@/data/games';

export default function DebugPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);

  const testWordSearch = () => {
    addLog('Testing Word Search Logic...');
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    
    // Mock config
    const config: WordSearchConfig = {
      wordPool: ['ALLAH', 'MUHAMMAD', 'ISLAM', 'QURAN', 'SALAH', 'ZAKAH', 'SAWM', 'IMAN', 'IHSAN', 'TAQWA', 'SABR', 'SHUKR', 'HALAL', 'HARAM', 'SUNNAH', 'HADITH', 'KAABA', 'MECCA', 'MEDINA'],
      count: 10,
      minSize: 8,
      maxSize: 12
    };

    difficulties.forEach(diff => {
      let successCount = 0;
      const runs = 20;
      let totalTargets = 0;
      
      for(let i=0; i<runs; i++) {
        try {
          const result = placeWordsOnGrid(config, diff);
          if (result.targets.length > 0) {
            successCount++;
            totalTargets += result.targets.length;
          }
        } catch (e: any) {
            addLog(`❌ Error in ${diff}: ${e.message}`);
        }
      }
      
      addLog(`Difficulty: ${diff.toUpperCase()}`);
      addLog(`  Runs: ${runs}`);
      addLog(`  Success Rate: ${(successCount/runs)*100}%`);
      addLog(`  Avg Targets: ${(totalTargets/runs).toFixed(1)}`);
    });
  };

  const runDiagnostics = async () => {
    setLogs([]);
    addLog('Starting diagnostics...');

    if (!user) {
      addLog('❌ No user logged in');
      return;
    }
    addLog(`User ID: ${user.id}`);

    // 1. Check 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', user.id)
      .maybeSingle();

    if (userError) addLog(`❌ 'users' fetch error: ${userError.message}`);
    else addLog(`✅ 'users' data: ${JSON.stringify(userData)}`);

    // 2. Check 'users_points' table
    const { data: pointsData, error: pointsError } = await supabase
      .from('users_points')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pointsError) addLog(`❌ 'users_points' fetch error: ${pointsError.message}`);
    else addLog(`✅ 'users_points' data: ${JSON.stringify(pointsData)}`);

    // 3. Test RPC
    addLog('Testing award_points RPC (adding 0 points)...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('award_points', { p_points: 0 });
    
    if (rpcError) addLog(`❌ RPC error: ${rpcError.message}`);
    else addLog(`✅ RPC result: ${JSON.stringify(rpcData)}`);

    setDbStatus({
      users: userData,
      points: pointsData,
      rpc: rpcData
    });
  };

  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">Debug Console</h1>
      <button 
        onClick={runDiagnostics}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700 mr-2"
      >
        Run Diagnostics
      </button>
      <button 
        onClick={testWordSearch}
        className="bg-green-600 text-white px-4 py-2 rounded mb-4 hover:bg-green-700"
      >
        Test Word Search
      </button>
      
      <div className="bg-gray-100 p-4 rounded border border-gray-300 min-h-[300px]">
        {logs.map((log, i) => (
          <div key={i} className="mb-1 border-b border-gray-200 pb-1">{log}</div>
        ))}
      </div>

      <pre className="mt-4 bg-black text-green-400 p-4 rounded overflow-auto">
        {JSON.stringify(dbStatus, null, 2)}
      </pre>
    </div>
  );
}
