// app-v2/src/components/MoodMapCanvas.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { EMOTIONS } from '../constants/emotions';

type Dot = { 
  valence: number; 
  arousal: number; 
  color?: string;
  member_id?: string | null; // optional member ID for future use
};
type SelectPayload = { emotionKey: string; valence: number; arousal: number };

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
  currentMemberId?: string; // optional, for future use
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pointerPx, setPointerPx] = useState<{ x: number; y: number } | null>(null); // kept for future tooltip/cursor

  // ---------- helpers ----------
  function uniqSorted<T>(arr: T[], cmp: (a: T, b: T) => number) {
    return Array.from(new Set(arr.slice().sort(cmp)));
  }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
  function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function rgb(r: number, g: number, b: number, a = 1) { return `rgba(${r|0},${g|0},${b|0},${a})`; }

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

  // inverse mapping that respects the padded GRID
  const invV = (x: number) => {
    const u = (x - GRID.gridX) / GRID.gridW; // 0..1 across grid
    return Math.max(-1, Math.min(1, u * 2 - 1));
  };
  const invA = (y: number) => {
    const v = (y - GRID.gridY) / GRID.gridH; // 0..1 top→bottom
    return Math.max(-1, Math.min(1, (1 - v) * 2 - 1));
  };

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
    const UL: [number, number, number] = [255,   0,   0]; // red (upper-left)
    const UR: [number, number, number] = [255, 255,   0]; // yellow (upper-right)
    const LL: [number, number, number] = [  0,   0, 255]; // blue (lower-left)
    const LR: [number, number, number] = [  0, 255,   0]; // green (lower-right)

    // keep top-right more yellow before blending to green
    const midYellow: [number, number, number] = [255, 255, 102]; // #ffff66

    for (const tile of tiles) {
      const u = tile.col / Math.max(1, GRID.COLS - 1); // 0..1 left→right
      const v = tile.row / Math.max(1, GRID.ROWS - 1); // 0..1 top→bottom

      // left edge (unchanged)
      const left = lerp3(UL, LL, v);

      // right edge with mid control point
      let right: [number, number, number];
      if (v < 0.5) {
        const t = v / 0.5;             // top half
        right = lerp3(UR, midYellow, t);
      } else {
        const t = (v - 0.5) / 0.5;     // bottom half
        right = lerp3(midYellow, LR, t);
      }

      // blend across the tile from left→right
      const col = lerp3(left, right, u);

      pathRoundRect(ctx, tile.x, tile.y, tile.w, tile.h, Math.min(tile.w, tile.h) * 0.2);
      ctx.fillStyle = rgb(col[0], col[1], col[2], 0.18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2) Axes through the center but shortened so they don't overlap emotion tiles or labels
    const gx = GRID.gridX, gy = GRID.gridY;

    // center point
    const cx = gx + GRID.gridW / 2;
    const cy = gy + GRID.gridH / 2;

    // inset from tile edge so we avoid both tiles and labels
    const TILE_HALF = (tiles[0]?.w || 50) / 2;
    const LABEL_GAP = 20; // extra gap for label space
    const AXIS_INSET = TILE_HALF + LABEL_GAP;

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;

    // vertical axis
    ctx.beginPath();
    ctx.moveTo(cx, cy - AXIS_INSET);
    ctx.lineTo(cx, cy + AXIS_INSET);
    ctx.stroke();

    // horizontal axis
    ctx.beginPath();
    ctx.moveTo(cx - AXIS_INSET, cy);
    ctx.lineTo(cx + AXIS_INSET, cy);
    ctx.stroke();

    // 3) Axis labels — placed closer to center, away from axes
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';

    // top & bottom
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('High Energy', cx, cy - AXIS_INSET - 4);
    ctx.textBaseline = 'top';
    ctx.fillText('Low Energy', cx, cy + AXIS_INSET + 4);

    // left & right
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText('Negative', cx - AXIS_INSET - 4, cy);
    ctx.textAlign = 'left';
    ctx.fillText('Positive', cx + AXIS_INSET + 4, cy);

    // 4) hover “lift” on the active tile
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
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; // subtle lift
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // soft gloss
        const grad = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + tile.h);
        grad.addColorStop(0, 'rgba(255,255,255,0.25)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.10)');
        grad.addColorStop(1, 'rgba(255,255,255,0.00)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();

        canvas.style.cursor = 'pointer';
      }
    } else {
      canvas.style.cursor = 'default';
    }

    // 5) emotion labels (centered in each tile)
    if (showEmotionLabels) {
      ctx.font = '600 13px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#222';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const tile of tiles) {
        ctx.fillText(tile.label, tile.cx, tile.cy);
      }
    }

    // 6) dots on top (drop shadow; personal dot halo/accent)
    for (const d of dots) {
      const x = ((d.valence + 1) / 2) * GRID.gridW + GRID.gridX;
      const y = (1 - (d.arousal + 1) / 2) * GRID.gridH + GRID.gridY;

      // find the tile under this point for color
      const t = tileAt(x, y);
      let fill = '#3b82f6'; // fallback
      if (t) {
        const u = t.col / Math.max(1, GRID.COLS - 1);
        const v = t.row / Math.max(1, GRID.ROWS - 1);
        const UL: [number, number, number] = [255, 0, 0];
        const UR: [number, number, number] = [255, 255, 0];
        const LL: [number, number, number] = [0, 0, 255];
        const LR: [number, number, number] = [0, 255, 0];

        const left  = lerp3(UL, LL, v);
        const right = lerp3(UR, LR, v);
        const c = lerp3(left, right, u);
        fill = rgb(c[0], c[1], c[2]);
      }

      const isMine = currentMemberId && d.member_id === currentMemberId;
      const radius = isMine ? 9 : 6;

      // Personal halo (draw first, under the dot)
      if (isMine) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; // soft white halo
        ctx.fill();
        ctx.restore();
      }

      // Drop shadow (instead of thick rim)
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Main filled dot
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = isMine ? 0.7 : 0.4; // personal dot a touch stronger
      ctx.fill();

      // Optional thin, soft outline for crispness (no harsh black)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // soft white hairline
      ctx.stroke();
      ctx.restore();
    }

    // (optional) tiny cursor ring if we want to use pointerPx
    if (pointerPx) {
      ctx.beginPath();
      ctx.arc(pointerPx.x, pointerPx.y, 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [width, height, GRID, tiles, dots, hoveredKey, showEmotionLabels, pointerPx]);

  // ---------- hit-testing + events ----------
  function tileAt(x: number, y: number): Tile | null {
    for (const t of tiles) {
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t;
    }
    return null;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPx({ x, y });
    const t = tileAt(x, y);
    setHoveredKey(t?.key ?? null);
  }

  function handlePointerLeave() {
    setPointerPx(null);
    setHoveredKey(null);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSelect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = tileAt(x, y);
    if (!t) return;
    onSelect({
      emotionKey: t.key,
      valence: invV(x),
      arousal: invA(y),
    });
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', borderRadius: 24, background: '#fff' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    />
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