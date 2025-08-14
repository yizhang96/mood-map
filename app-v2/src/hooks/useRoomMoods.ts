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
  feeling_label: string | null;   // ← use feeling_label
  created_at: string;
  updated_at?: string | null;
};

// Normalize row coming from DB / realtime (support legacy `label`)
function normalizeRow(r: any): MoodRow {
  return {
    id: r.id,
    room_id: r.room_id,
    member_id: r.member_id ?? null,
    emotion_key: r.emotion_key,
    valence: r.valence,
    arousal: r.arousal,
    feeling_label: r.feeling_label ?? r.label ?? null, // ← fallback to legacy `label`
    created_at: r.created_at,
    updated_at: r.updated_at ?? null,
  };
}

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
        .select(
          // select both feeling_label and legacy label so we can normalize
          'id, room_id, member_id, emotion_key, valence, arousal, feeling_label, created_at, updated_at'
        )
        .eq('room_id', roomId);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // Keep only the latest row per member (handles any legacy duplicates)
      const latestByMember = new Map<string, MoodRow>();
      for (const raw of data ?? []) {
        const m = normalizeRow(raw);
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
    })();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moods_v2', filter: `room_id=eq.${roomId}` },
        payload => {
          const row = normalizeRow(payload.new);
          setMoods(prev => {
            const idx = row.member_id ? prev.findIndex(m => m.member_id === row.member_id) : -1;
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = row;
              return next;
            }
            return [...prev, row];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'moods_v2', filter: `room_id=eq.${roomId}` },
        payload => {
          const row = normalizeRow(payload.new);
          setMoods(prev => {
            const idx = row.member_id ? prev.findIndex(m => m.member_id === row.member_id) : -1;
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = row;
              return next;
            }
            // if we missed the insert earlier, add it now
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cancelled = true;
    };
  }, [roomId]);

  return { moods, loading };
}