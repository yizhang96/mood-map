// app-v2/src/hooks/usePopularEmotions.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type PopularRow = { emotion_key: string; n: number };

export function usePopularEmotions(roomId?: string) {
  const [rows, setRows] = useState<PopularRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!roomId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_room_emotion_counts', { r: roomId });
    if (error) console.error(error);
    setRows((data as PopularRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [roomId]);

  return { rows, loading, refresh };
}