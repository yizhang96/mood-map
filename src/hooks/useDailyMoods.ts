import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Define key variables */
export interface Mood {
  session_id: string; //unique identifier for user
  valence: number; 
  arousal: number;
  feeling_label?: string; //allows users to enter their own emotion labels
  created_at: string;
}

/**
 * Fetches all moods from today once, on mount.
 * Returns an array of { valence, arousal }.
 */
export function useDailyMoods(): Mood[] {
  const [data, setData] = useState<Record<string, Mood>>({});

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const fetchInitial = async () => {
      const { data: rows, error } = await supabase
        .from('moods')
        .select('session_id,valence,arousal,feeling_label,created_at')
        .gte('created_at', start.toISOString());
      if (error) {
        console.error('Error fetching daily moods:', error);
        return;
      }
      const latest: Record<string, Mood> = {};
      for (const row of rows || []) {
        const existing = latest[row.session_id];
        if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
          latest[row.session_id] = row;
        }
      }
      setData(latest);
    };

    fetchInitial();

    
  }, []);

  return Object.values(data);
}
