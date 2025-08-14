// app-v2/src/hooks/usePostEmotion.ts
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EMOTION_BY_KEY } from '../constants/emotions';

type Coords = { v: number; a: number } | undefined;

export function usePostEmotion(roomId?: string, memberId?: string | null) {
  return useCallback(
    async (emotionKey: string, coords?: Coords, feelingLabel?: string) => {
      if (!roomId) throw new Error('Missing roomId');
      const emo = EMOTION_BY_KEY[emotionKey];
      if (!emo) throw new Error('Invalid emotion key');

      const v = coords?.v ?? emo.v;
      const a = coords?.a ?? emo.a;

      // If you created a unique index on (room_id, member_id) with NULLS NOT DISTINCT,
      // this upsert will keep one row per member per room.
      const { error } = await supabase
        .from('moods_v2')
        .upsert(
          {
            room_id: roomId,
            member_id: memberId ?? null,
            emotion_key: emotionKey,
            valence: v,
            arousal: a,
            feeling_label: feelingLabel ?? null,
          },
          { onConflict: 'room_id,member_id' }
        );

      if (error) throw error;
    },
    [roomId, memberId]
  );
}