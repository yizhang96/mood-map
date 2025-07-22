import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Simple mood shape */
export interface Mood {
  valence: number;
  arousal: number;
}

/**
 * Fetches all moods from today once, on mount.
 * Returns an array of { valence, arousal }.
 */
export function useDailyMoods(): Mood[] {
  const [data, setData] = useState<Mood[]>([]);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    supabase
      .from('moods')
      .select('valence,arousal')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .then(({ data: rows, error }) => {
        if (error) {
          console.error('Error fetching daily moods:', error);
        } else {
          setData(rows || []);
        }
      });
  }, []);

  return data;
}
