// app-v2/src/hooks/usePostEmotion.ts
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EMOTION_BY_KEY } from '../constants/emotions';

export function usePostEmotion(roomId?: string, memberId?: string | null) {
  return useCallback(
    async (emotionKey: string, overrides?: { v?: number; a?: number; label?: string }) => {
      if (!roomId) throw new Error('Missing roomId');
      if (!memberId) throw new Error('Missing memberId');
      const emo = EMOTION_BY_KEY[emotionKey];
      if (!emo) throw new Error('Invalid emotion key');

      const payload = {
        room_id: roomId,
        member_id: memberId,
        emotion_key: emotionKey,
        valence: overrides?.v ?? emo.v,
        arousal: overrides?.a ?? emo.a,
        ...(overrides?.label ? { label: overrides.label } : {}),
        // let DB set updated_at via trigger; keeping created_at as first insert timestamp
      };

      const { error } = await supabase
        .from('moods_v2')
        .upsert(payload, {
          onConflict: 'room_id,member_id',
          ignoreDuplicates: false, // update existing row
        })
        .select('id'); // ensure PostgREST returns something

      if (error) throw error;
    },
    [roomId, memberId]
  );
}