// app-v2/src/hooks/useEnsureMember.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAnonId } from '../lib/anon';

export function useEnsureMember(roomId?: string) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const anon = getAnonId();

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    (async () => {
      // make sure you have this index once in SQL:
      // create unique index if not exists uniq_room_member on room_members_v2 (room_id, anon_id);

      // upsert (id may not be returned on conflict)
      await supabase
        .from('room_members_v2')
        .upsert(
          { room_id: roomId, anon_id: anon },
          { onConflict: 'room_id,anon_id', ignoreDuplicates: true }
        );

      // always fetch the id
      const { data, error } = await supabase
        .from('room_members_v2')
        .select('id')
        .eq('room_id', roomId)
        .eq('anon_id', anon)
        .single();

      if (!cancelled) {
        if (error) console.error(error);
        setMemberId(data?.id ?? null);
      }
    })();

    return () => { cancelled = true; };
  }, [roomId, anon]);

  return memberId;
}