// app-v2/src/hooks/useRoomMoods.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type MoodRow = {
  id: string;
  room_id: string;
  member_id: string | null;
  emotion_key: string;
  valence: number;
  arousal: number;
  label: string | null;
  created_at: string;
  updated_at?: string | null;
};

export function useRoomMoods(roomId?: string) {
  const [moods, setMoods] = useState<MoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('moods_v2')
        .select('*')
        .eq('room_id', roomId);
      if (!cancelled) {
        if (error) console.error(error);
        // If legacy data had multiple rows per member, keep the latest per member:
        const latestByMember = new Map<string, MoodRow>();
        for (const m of (data ?? [])) {
          if (!m.member_id) continue;
          const prev = latestByMember.get(m.member_id);
          const prevTime = prev ? (prev.updated_at ?? prev.created_at) : '';
          const curTime = m.updated_at ?? m.created_at;
          if (!prev || new Date(curTime) > new Date(prevTime)) {
            latestByMember.set(m.member_id, m);
          }
        }
        setMoods(Array.from(latestByMember.values()));
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moods_v2', filter: `room_id=eq.${roomId}` },
        payload => {
          const row = payload.new as MoodRow;
          setMoods(prev => {
            // replace existing member’s row or append
            const idx = prev.findIndex(m => m.member_id === row.member_id);
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = row;
              return next;
            }
            return [...prev, row];
          });
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'moods_v2', filter: `room_id=eq.${roomId}` },
        payload => {
          const row = payload.new as MoodRow;
          setMoods(prev => {
            const idx = prev.findIndex(m => m.member_id === row.member_id);
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = row;
              return next;
            }
            // if we missed the insert earlier, add it now
            return [...prev, row];
          });
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); cancelled = true; };
  }, [roomId]);

  return { moods, loading };
}