import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Simple mood shape */
export interface Mood {
  session_id: string;
  valence: number;
  arousal: number;
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
        .select('session_id,valence,arousal,created_at')
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

    const channel = supabase
      .channel('mood_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moods' }, (payload: { new: Mood }) => {
        const row = payload.new;
        const created = new Date(row.created_at);
        if (created >= start) {
          setData(prev => {
            const existing = prev[row.session_id];
            if (!existing || new Date(existing.created_at) <= created) {
              return { ...prev, [row.session_id]: row };
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return Object.values(data);
}
