// app-v2/src/components/MoodMapCanvas.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { EMOTIONS } from '../constants/emotions';

type Dot = {
  valence: number;
  arousal: number;
  color?: string;
  member_id?: string | null;   // used to highlight current user
  label?: string;              // ← optional tooltip text
};
type SelectPayload = { 
  emotionKey: string; 
  valence: number; 
  arousal: number;
  feelingLabel?: string;
};

export default function MoodMapCanvas({
  width = 600,
  height = 600,
  dots = [],
  showEmotionLabels = true,
  onSelect,
  currentMemberId,
}: {
  width?: number;
  height?: number;
  dots: Dot[];
  showEmotionLabels?: boolean;
  onSelect?: (sel: SelectPayload) => void;
  currentMemberId?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pointerPx, setPointerPx] = useState<{ x: number; y: number } | null>(null);
  const [hoveredDot, setHoveredDot] = useState<{ x: number; y: number; r: number } | null>(null);

  //bubble for optional mood label
  // near other useState hooks in MoodMapCanvas.tsx
  const [editing, setEditing] = useState<null | {
    x: number; y: number;    // exact click position for the dot
    valence: number; arousal: number;
    emotionKey: string;
    text: string;
  }>(null);

  // tooltip for dot labels
  const [dotTip, setDotTip] = useState<{ x: number; y: number; text: string } | null>(null);

  // ---------- helpers ----------
  function uniqSorted<T>(arr: T[], cmp: (a: T, b: T) => number) {
    return Array.from(new Set(arr.slice().sort(cmp)));
  }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
  function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function rgb(r: number, g: number, b: number, a = 1) { return `rgba(${r|0},${g|0},${b|0},${a})`; }
  
  function tileColorAt(col: number, row: number, cols: number, rows: number) {
    const u = col / Math.max(1, cols - 1);
    const v = row / Math.max(1, rows - 1);
  
    const UL: [number, number, number] = [255,   0,   0];
    const UR: [number, number, number] = [255, 255,   0];
    const LL: [number, number, number] = [  0,   0, 255];
    const LR: [number, number, number] = [  0, 255,   0];
    const midYellow: [number, number, number] = [255, 255, 102];
  
    const left = lerp3(UL, LL, v);
    let right: [number, number, number];
    if (v < 0.5) {
      const t = v / 0.5;
      right = lerp3(UR, midYellow, t);
    } else {
      const t = (v - 0.5) / 0.5;
      right = lerp3(midYellow, LR, t);
    }
  
    return lerp3(left, right, u);
  }

  // ---------- GRID + tiles (uniform 5×5 derived from emotion anchors) ----------
  const { GRID, tiles } = useMemo(() => {
    const GUTTER = 10;
    const PAD = 12;

    const colsAnchors = uniqSorted(EMOTIONS.map(e => e.v), (a,b)=>a-b); // left→right
    const rowsAnchors = uniqSorted(EMOTIONS.map(e => e.a), (a,b)=>b-a); // top(high)→bottom(low)

    const COLS = colsAnchors.length; // expected 5
    const ROWS = rowsAnchors.length; // expected 5

    const gridX = PAD;
    const gridY = PAD;
    const gridW = width  - PAD*2;
    const gridH = height - PAD*2;

    const tileW = (gridW - GUTTER * (COLS - 1)) / COLS;
    const tileH = (gridH - GUTTER * (ROWS - 1)) / ROWS;

    const colIndex = (v: number) => colsAnchors.indexOf(v);
    const rowIndex = (a: number) => rowsAnchors.indexOf(a);

    const list: Tile[] = [];
    for (const e of EMOTIONS) {
      const c = colIndex(e.v);
      const r = rowIndex(e.a);
      if (c < 0 || r < 0) continue;

      const x = gridX + c * (tileW + GUTTER);
      const y = gridY + r * (tileH + GUTTER);
      const cx = x + tileW / 2;
      const cy = y + tileH / 2;

      list.push({ key: e.key, label: e.label, x, y, w: tileW, h: tileH, cx, cy, col: c, row: r });
    }

    return {
      GRID: { PAD, GUTTER, gridX, gridY, gridW, gridH, COLS, ROWS, tileW, tileH },
      tiles: list
    };
  }, [width, height]);

  // valence/arousal ↔ px (respecting GRID)
  const invV = (x: number) => {
    const u = (x - GRID.gridX) / GRID.gridW; // 0..1 across grid
    return Math.max(-1, Math.min(1, u * 2 - 1));
  };
  const invA = (y: number) => {
    const v = (y - GRID.gridY) / GRID.gridH; // 0..1 top→bottom
    return Math.max(-1, Math.min(1, (1 - v) * 2 - 1));
  };
  const v2x = (v: number) => ((v + 1) / 2) * GRID.gridW + GRID.gridX;
  const a2y = (a: number) => (1 - (a + 1) / 2) * GRID.gridH + GRID.gridY;

  // ---------- draw ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1) tiles with bilinear corner gradient (UL red, UR yellow, LL blue, LR green)
    const UL: [number, number, number] = [255,   0,   0];
    const UR: [number, number, number] = [255, 255,   0];
    const LL: [number, number, number] = [  0,   0, 255];
    const LR: [number, number, number] = [  0, 255,   0];
    const midYellow: [number, number, number] = [255, 255, 102];

    for (const tile of tiles) {
      const u = tile.col / Math.max(1, GRID.COLS - 1);
      const v = tile.row / Math.max(1, GRID.ROWS - 1);

      const left = lerp3(UL, LL, v);
      let right: [number, number, number];
      if (v < 0.5) {
        const t = v / 0.5; right = lerp3(UR, midYellow, t);
      } else {
        const t = (v - 0.5) / 0.5; right = lerp3(midYellow, LR, t);
      }
      const col = lerp3(left, right, u);

      pathRoundRect(ctx, tile.x, tile.y, tile.w, tile.h, Math.min(tile.w, tile.h) * 0.2);
      ctx.fillStyle = rgb(col[0], col[1], col[2], 0.18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2) Shortened axes + labels around grid center
    const gx = GRID.gridX, gy = GRID.gridY;
    const cx = gx + GRID.gridW / 2;
    const cy = gy + GRID.gridH / 2;
    const TILE_HALF = (tiles[0]?.w || 50) / 2;
    const LABEL_GAP = 20;
    const AXIS_INSET = TILE_HALF + LABEL_GAP;

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - AXIS_INSET);
    ctx.lineTo(cx, cy + AXIS_INSET);
    ctx.moveTo(cx - AXIS_INSET, cy);
    ctx.lineTo(cx + AXIS_INSET, cy);
    ctx.stroke();

    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('High Energy', cx, cy - AXIS_INSET - 4);
    ctx.textBaseline = 'top';
    ctx.fillText('Low Energy', cx, cy + AXIS_INSET + 4);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText('Negative', cx - AXIS_INSET - 4, cy);
    ctx.textAlign = 'left';
    ctx.fillText('Positive', cx + AXIS_INSET + 4, cy);

    // 3) hover lift for active tile
    if (hoveredKey) {
      const tile = tiles.find(t => t.key === hoveredKey);
      if (tile) {
        const r = Math.min(tile.w, tile.h) * 0.2;
        const scale = 1.04;
        ctx.save();
        ctx.translate(tile.cx, tile.cy);
        ctx.scale(scale, scale);
        ctx.translate(-tile.cx, -tile.cy);
        pathRoundRect(ctx, tile.x, tile.y, tile.w, tile.h, r);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        canvas.style.cursor = 'pointer';
      }
    } else {
      canvas.style.cursor = 'default';
    }

    // 4) emotion labels in tiles
    if (showEmotionLabels) {
      ctx.font = '600 13px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#222';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const tile of tiles) ctx.fillText(tile.label, tile.cx, tile.cy);
    }

    // 5) dots with drop shadow; self = bigger
    for (const d of dots) {
      const x = v2x(d.valence);
      const y = a2y(d.arousal);

      // color from the underlying tile (or use provided color)
      let fill = d.color ?? '#3b82f6';
      const t = tileAt(x, y);
      if (t) {
        const c = tileColorAt(t.col, t.row, GRID.COLS, GRID.ROWS); // ← your helper
        fill = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      }

      const isMine = currentMemberId && d.member_id === currentMemberId;
      const radius = isMine ? 9.5 : 7.5; // bigger for self

      // drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = isMine ? 8 : 6;
      ctx.shadowOffsetY = 1.5;

      // main fill (alpha a bit stronger for self)
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = isMine ? 0.55 : 0.40;
      ctx.fill();

      // thin soft outline
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(31,41,55,0.55)';
      ctx.stroke();
      ctx.restore();
    }

    // 5.1) hover ring around the active dot (mouse hover or tap)
    if (hoveredDot) {
      ctx.beginPath();
      ctx.arc(hoveredDot.x, hoveredDot.y, hoveredDot.r + 3, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111'; // subtle dark ring
      ctx.stroke();
    }

    // Preview dot while the inline editor is open
    if (editing) {
      const px = editing.x;
      const py = editing.y;      // ← use the true click Y
    
      let fill = '#3b82f6';
      const t = tileAt(px, py);
      if (t) {
        const c = tileColorAt(t.col, t.row, GRID.COLS, GRID.ROWS);
        fill = `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
      }
    
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.20)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 1;
    
      ctx.beginPath();
      ctx.arc(px, py, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.35;
      ctx.fill();
    
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(31,41,55,0.45)';
      ctx.stroke();
      ctx.restore();
    }

  }, [width, height, GRID, tiles, dots, hoveredKey, showEmotionLabels, pointerPx, editing, currentMemberId]);

  // ---------- hit-testing + events ----------
  function tileAt(x: number, y: number): Tile | null {
    for (const t of tiles) {
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t;
    }
    return null;
  }

  function dotAt(x: number, y: number) {
    const R = 12; // hit radius
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];
      const dx = v2x(d.valence);
      const dy = a2y(d.arousal);
      if (Math.hypot(x - dx, y - dy) <= R) {
        return { dot: d, px: { x: dx, y: dy } };
      }
    }
    return null;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPx({ x, y });
  
    // Try dot first: show tooltip + ring if it has a label
    const hit = dotAt(x, y);
    if (hit) {
      const isMine = currentMemberId && hit.dot.member_id === currentMemberId;
      const r = isMine ? 9.5 : 7.5;
      setHoveredDot({ x: hit.px.x, y: hit.px.y, r });
  
      if (hit.dot.label) {
        setDotTip(prev =>
          prev &&
          Math.abs(prev.x - hit.px.x) < 0.5 &&
          Math.abs(prev.y - hit.px.y) < 0.5 &&
          prev.text === hit.dot.label
            ? prev
            : { x: hit.px.x, y: hit.px.y - 16, text: hit.dot.label! }
        );
      } else {
        setDotTip(null);
      }
      setHoveredKey(null); // don't lift a tile when over a dot
      return;
    }
  
    // No dot → clear ring & tooltip, then do tile hover
    setHoveredDot(null);
    setDotTip(null);
  
    const t = tileAt(x, y);
    setHoveredKey(t?.key ?? null);
  }

  function handlePointerLeave() {
    setPointerPx(null);
    setHoveredKey(null);
    setDotTip(null);
    setHoveredDot(null);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    // Tapping a dot: show label + ring
    const hit = dotAt(x, y);
    if (hit) {
      const isMine = currentMemberId && hit.dot.member_id === currentMemberId;
      const r = isMine ? 9.5 : 7.5;
      setHoveredDot({ x: hit.px.x, y: hit.px.y, r });
  
      if (hit.dot.label) {
        setDotTip({ x: hit.px.x, y: hit.px.y - 16, text: hit.dot.label });
      }
      return;
    }
  
    // Otherwise open the label editor (your existing logic)
    const t = tileAt(x, y);
    if (!t || !onSelect) return;
  
    setDotTip(null);
    setHoveredKey(null);
    setHoveredDot(null);
  
    setEditing({
      x,
      y: y,
      valence: invV(x),
      arousal: invA(y),
      emotionKey: t.key,
      text: '',
    });
  }

  function submitEdit() {
    if (!editing || !onSelect) return;
    const label = editing.text.trim() || undefined;
    onSelect({
      emotionKey: editing.emotionKey,
      valence: editing.valence,
      arousal: editing.arousal,
      feelingLabel: label,
    });
    setEditing(null);
  }
  
  function cancelEdit() {
    setEditing(null);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, display: 'block', borderRadius: 24, background: '#fff' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />


      {editing && (
        <div
          style={{
            position: 'absolute',
            left: editing.x,
            top: editing.y - 16,
            transform: 'translate(-50%, -100%)',
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.92)',
            padding: '4px 6px',
            borderRadius: 9999,
            border: '1px solid #333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 50,
          }}
        >
          <input
            autoFocus
            value={editing.text}
            onChange={e => setEditing(ed => ed ? { ...ed, text: e.target.value } : ed)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            placeholder="Say more (optional)"
            style={{
              fontSize: '0.9em',
              padding: '4px 6px',
              width: 140,       // tweak width here
              height: 28,
              border: '1px solid #ccc',
              borderRadius: 9999,
              outline: 'none',
            }}
          />
          <button
            onClick={submitEdit}
            aria-label="Save"
            style={{
              fontSize: '0.9em',
              padding: '4px 8px',
              height: 28,
              cursor: 'pointer',
              borderRadius: 9999,
              border: '1px solid #ccc',
              background: '#fff',
            }}
          >
            ✓
          </button>
          <button
            onClick={cancelEdit}
            aria-label="Cancel"
            style={{
              fontSize: '0.9em',
              padding: '4px 8px',
              height: 28,
              cursor: 'pointer',
              borderRadius: 9999,
              border: '1px solid #ccc',
              background: '#fff',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {dotTip && (
        <div
          style={{
            position: 'absolute',
            left: dotTip.x,
            top: dotTip.y,
            transform: 'translate(-50%,-100%)',
            background: '#fff',
            border: '1px solid #333',
            borderRadius: 9999,
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: 'Helvetica, Arial, sans-serif',
            boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {dotTip.text}
        </div>
      )}
    </div>
  );
}

// ---------- types + helpers ----------
type Tile = {
  key: string; label: string;
  x: number; y: number; w: number; h: number; cx: number; cy: number;
  col: number; row: number;
};

function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}