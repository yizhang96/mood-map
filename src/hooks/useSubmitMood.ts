// src/hooks/useSubmitMood.ts
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
 * Deletes only this session’s previous moods, then inserts exactly one new row.
 */
export function useSubmitMood() {
  const sessionId = getSessionId();

  return useCallback(
    async (
      valence: number,
      arousal: number,
      feeling_label?: string
    ) => {
      // build your payload (with fresh timestamp)
      const now = new Date().toISOString();
      const payload: {
        session_id: string;
        valence: number;
        arousal: number;
        created_at: string;
        feeling_label?: string;
      } = { session_id: sessionId, valence, arousal, created_at: now };
      if (feeling_label) payload.feeling_label = feeling_label;

      // 🗑️ 1) delete only rows matching this session_id
      if (!sessionId) {
        console.error('Cannot delete moods: no sessionId available');
      } else {
        const { error: delErr } = await supabase
          .from('moods')
          .delete()
          .eq('session_id', sessionId); // <-- only your session
        if (delErr) console.error('Error deleting old mood for session', sessionId, delErr);
      }

      // ➕ 2) insert the new one
      const { error: insErr } = await supabase
        .from('moods')
        .insert(payload);
      if (insErr) console.error('Error inserting mood:', insErr);
    },
    [sessionId]
  );
}