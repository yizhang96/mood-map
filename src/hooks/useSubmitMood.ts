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
 */
export function useSubmitMood() {
  const sessionId = getSessionId();
  return useCallback(async (valence: number, arousal: number) => {
    const { error } = await supabase
      .from('moods')
      .insert({ session_id: sessionId, valence, arousal });
    if (error) {
      console.error('Failed to insert mood:', error);
    }
  }, [sessionId]);
}
