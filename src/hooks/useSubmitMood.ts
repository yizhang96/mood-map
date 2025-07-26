import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const SESSION_KEY = 'mood-map-session-id';

export function getSessionId(): string {
  const cached = localStorage.getItem(SESSION_KEY);
  if (cached) return cached;
  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
}

/**
 * Inserts a new mood record with the current session_id.
 * Does not attempt to upsert—each click creates a new row.
 * Accepts an optional `feeling_label` string to store alongside valence/arousal.
 */
export function useSubmitMood() {
  const sessionId = getSessionId();
  return useCallback(async (valence: number, arousal: number,
    feeling_label?:string
  ) => {
    const payload: {
        session_id: string;
        valence: number;
        arousal: number;
        feeling_label?: string;
    } = { session_id: sessionId, valence, arousal };
    if (feeling_label) {
        payload.feeling_label = feeling_label;
    }
    const { error } = await supabase
      .from('moods')
      .insert(payload);
    if (error) {
      console.error('Failed to insert mood:', error);
    }
  }, [sessionId]);
}
