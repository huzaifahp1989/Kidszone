"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function VisitorCounter() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function updateCount() {
      if (!pathname) return;
      
      try {
        setLoading(true);
        // Call the RPC function to increment and get the new count
        const { data, error } = await supabase.rpc('increment_page_view', { 
          page_path: pathname 
        });

        if (error) {
          if (error.code === 'PGRST202') {
            console.warn('VisitorCounter: Database function "increment_page_view" not found. Please run the SUPABASE_HIT_COUNTER.sql script.');
          } else {
            console.error('Error updating visitor count:', error);
          }
          // Fail silently in UI
        } else if (mounted && data !== null) {
          setCount(data as number);
        }
      } catch (err) {
        console.error('Visitor counter error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    updateCount();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (loading || count === null) {
    return (
      <span className="inline-flex items-center text-xs text-gray-500 opacity-50">
        <span className="animate-pulse mr-1">●</span> Loading stats...
      </span>
    );
  }

  return (
    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-medium text-gray-600 shadow-sm mt-2">
      <span className="mr-1.5 text-blue-500">👁️</span>
      <span>{count.toLocaleString()} Views</span>
    </div>
  );
}
