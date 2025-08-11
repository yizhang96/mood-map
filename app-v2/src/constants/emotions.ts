export type EmotionDef = {
    key: string;
    label: string;
    v: number;  // valence  -1..+1 (left..right: Negative -> Positive)
    a: number;  // arousal  -1..+1 (low..high:  Low -> High)
    color: string;
  };
  
  // Grid anchors to mirror the poster (left→right, top→bottom)
  const COLS = [-0.9, -0.45, 0.0, 0.45, 0.9];
  const ROWS = [ 0.9,  0.45, 0.0, -0.45, -0.9];
  
  export const EMOTIONS: EmotionDef[] = [
    // Row 1 (High Energy, top)
    { key: 'hangry',      label: 'hangry',      v: COLS[0], a: ROWS[0], color: '#F28B82' }, // warm red
    { key: 'annoyed',     label: 'annoyed',     v: COLS[1], a: ROWS[0], color: '#FB923C' }, // orange
    { key: 'caffeinated', label: 'caffeinated', v: COLS[2], a: ROWS[0], color: '#FDE047' }, // bright yellow
    { key: 'goofy',       label: 'goofy',       v: COLS[3], a: ROWS[0], color: '#FACC15' }, // golden
    { key: 'excited',     label: 'excited',     v: COLS[4], a: ROWS[0], color: '#F59E0B' }, // amber
  
    // Row 2 (upper‑mid)
    { key: 'overwhelmed', label: 'overwhelmed', v: COLS[0], a: ROWS[1], color: '#FDA4AF' }, // light rose
    { key: 'anxious',     label: 'anxious',     v: COLS[1], a: ROWS[1], color: '#F43F5E' }, // rose
    // center column intentionally blank on poster
    { key: 'motivated',   label: 'motivated',   v: COLS[3], a: ROWS[1], color: '#22C55E' }, // green
    { key: 'inspired',    label: 'inspired',    v: COLS[4], a: ROWS[1], color: '#10B981' }, // emerald
  
    // Row 3 (center row)
    { key: 'sad',         label: 'sad',         v: COLS[0], a: ROWS[2], color: '#A78BFA' }, // lavender
    { key: 'satisfied',   label: 'satisfied',   v: COLS[4], a: ROWS[2], color: '#84CC16' }, // lime
  
    // Row 4 (lower‑mid)
    { key: 'lonely',      label: 'lonely',      v: COLS[0], a: ROWS[3], color: '#818CF8' }, // indigo
    { key: 'bored',       label: 'bored',       v: COLS[1], a: ROWS[3], color: '#93C5FD' }, // sky
    { key: 'curious',     label: 'curious',     v: COLS[3], a: ROWS[3], color: '#8B5CF6' }, // violet
    { key: 'grateful',    label: 'grateful',    v: COLS[4], a: ROWS[3], color: '#34D399' }, // green
  
    // Row 5 (Low Energy, bottom)
    { key: 'tired',       label: 'tired',       v: COLS[0], a: ROWS[4], color: '#60A5FA' }, // blue
    { key: 'sleepy',      label: 'sleepy',      v: COLS[1], a: ROWS[4], color: '#93C5FD' }, // light sky
    { key: 'empty',       label: 'empty',       v: COLS[2], a: ROWS[4], color: '#9CA3AF' }, // gray
    { key: 'refreshed',   label: 'refreshed',   v: COLS[3], a: ROWS[4], color: '#4DB6AC' }, // teal
    { key: 'peaceful',    label: 'peaceful',    v: COLS[4], a: ROWS[4], color: '#86EFAC' }, // mint
  ];
  
  export const EMOTION_BY_KEY: Record<string, EmotionDef> =
    Object.fromEntries(EMOTIONS.map(e => [e.key, e]));