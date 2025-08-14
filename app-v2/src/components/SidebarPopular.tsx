// app-v2/src/components/SidebarPopular.tsx
import { useMemo } from 'react';
import { EMOTIONS } from '../constants/emotions';

type Row = { emotion_key: string; n: number };

export default function SidebarPopular({ rows = [] }: { rows: Row[] }) {
  const { labelByKey, barByKey, maxN } = useMemo(() => {
    // anchors to match canvas grid
    const colsAnchors = Array.from(new Set(EMOTIONS.map(e => e.v))).sort((a, b) => a - b); // left→right
    const rowsAnchors = Array.from(new Set(EMOTIONS.map(e => e.a))).sort((a, b) => b - a); // top→bottom
    const COLS = colsAnchors.length || 1;
    const ROWS = rowsAnchors.length || 1;

    // gradient (same as canvas, with more‑yellow upper-right tweak)
    const UL: [number, number, number] = [255, 0, 0];
    const UR: [number, number, number] = [255, 255, 0];
    const LL: [number, number, number] = [0, 0, 255];
    const LR: [number, number, number] = [0, 255, 0];
    const midYellow: [number, number, number] = [255, 255, 102];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerp3 = (a: [number, number, number], b: [number, number, number], t: number) =>
      [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];

    const labelByKey: Record<string, string> = {};
    const solidByKey: Record<string, string> = {};
    const barByKey: Record<string, string> = {};

    for (const e of EMOTIONS) {
      const col = colsAnchors.indexOf(e.v);
      const row = rowsAnchors.indexOf(e.a);
      if (col < 0 || row < 0) continue;

      const u = col / Math.max(1, COLS - 1);
      const v = row / Math.max(1, ROWS - 1);

      const left = lerp3(UL, LL, v);
      const right = v < 0.5
        ? lerp3(UR, midYellow, v / 0.5)
        : lerp3(midYellow, LR, (v - 0.5) / 0.5);

      const c = lerp3(left, right, u); // [r,g,b]

      labelByKey[e.key] = e.label;
      solidByKey[e.key] = `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
      barByKey[e.key]   = `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, 0.32)`; // <= translucent bar
    }

    const maxN = rows.reduce((m, r) => Math.max(m, r.n), 1);
    return { labelByKey, solidByKey, barByKey, maxN };
  }, [rows]);

  return (
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        background: '#fff',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Most popular moods</div>

      <h1 ></h1>

      {rows.slice(0, 5).map((r) => {
        const label = labelByKey[r.emotion_key] ?? r.emotion_key;
        const barColor = barByKey[r.emotion_key] ?? 'rgba(59,130,246,0.28)';
        const pct = Math.max(4, Math.round((r.n / maxN) * 100)); // min width so tiny values still show

        return (
          <div key={r.emotion_key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{r.n}</span>
            </div>

            <div
              style={{
                height: 8,
                borderRadius: 9999,
                background: '#f3f4f6',
                marginTop: 6,
                overflow: 'hidden',
              }}
              aria-hidden
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: barColor,
                }}
              />
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div style={{ color: '#6b7280', fontSize: 13 }}>
          No data yet. Click the map to add a mood!
        </div>
      )}
    </div>
  );
}