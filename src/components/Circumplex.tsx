// src/components/Circumplex.tsx
import { useRef, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSubmitMood, getSessionId } from '../hooks/useSubmitMood';
import { useDailyMoods } from '../hooks/useDailyMoods';
import type { Mood } from '../hooks/useDailyMoods';

interface Props {
  width?: number;
  height?: number;
}

export default function Circumplex({
  width = 600,
  height = 600,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moods = useDailyMoods();
  const submitMood = useSubmitMood();
  const sessionId = getSessionId();

  // your old tempMood state (waiting to save)
  const [tempMood, setTempMood] = useState<Mood | null>(null);
  // position of that pending click
  const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(null);
  // input value for the label
  const [inputValue, setInputValue] = useState('');

  // hover tooltip state
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [hoverPos, setHoverPos]     = useState<{ x: number; y: number } | null>(null);

  // redraw everything whenever moods, pending, etc. change
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // — draw axes & labels (your existing code) —
    const padding = 8;
    const topLabel = 'High Energy';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px sans-serif';
    const topDescent = ctx.measureText(topLabel).actualBoundingBoxDescent;
    const bottomLabel = 'Low Energy';
    const bottomAscent = ctx.measureText(bottomLabel).actualBoundingBoxAscent;
    ctx.fillText(topLabel, width/2, 20);
    ctx.fillText(bottomLabel, width/2, height - 20);
    const topInset    = 20 + topDescent + padding;
    const bottomInset = height - 20 - bottomAscent - padding;
    const negW  = ctx.measureText('Negative').width;
    const posW  = ctx.measureText('Positive').width;
    const leftInset  = 20 + negW + padding;
    const rightInset = width - (20 + posW + padding);
    ctx.beginPath();
    ctx.moveTo(width/2, topInset);
    ctx.lineTo(width/2, bottomInset);
    ctx.moveTo(leftInset, height/2);
    ctx.lineTo(rightInset, height/2);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.fillStyle   = '#333';
    ctx.font        = 'bold 16px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillText('High Energy', width/2, 20);
    ctx.fillText('Low Energy', width/2, height - 20);
    ctx.textAlign = 'left';
    ctx.fillText('Negative', 20, height/2);
    ctx.textAlign = 'right';
    ctx.fillText('Positive', width - 20, height/2);

    // — plot others’ red dots —
    for (const m of moods) {
      if (m.session_id === sessionId) continue;
      const x = (m.valence / 2 + 0.5) * width;
      const y = (-m.arousal / 2 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // — plot your saved blue dot —
    const self = moods.find(m => m.session_id === sessionId);
    if (self) {
      const x = (self.valence / 2 + 0.5) * width;
      const y = (-self.arousal / 2 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // — plot pending blue dot while labeling —
    if (tempMood && tempPos) {
      ctx.beginPath();
      ctx.arc(tempPos.x, tempPos.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [moods, tempMood, tempPos, width, height, sessionId]);

  // on canvas click: set up pending mood & show input
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const valence = (x / width - 0.5) * 2;
    const arousal = -((y / height - 0.5) * 2);

    setTempMood({ session_id: sessionId, valence, arousal, created_at: new Date().toISOString() });
    setTempPos({ x, y });
    setInputValue('');
  };

  // on Enter: submit mood + optional label
  const handleInputKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempMood) {
      await submitMood(
        tempMood.valence,
        tempMood.arousal,
        inputValue.trim() || undefined
      );
      setTempMood(null);
      setTempPos(null);
    }
  };

  // track hover for tooltips
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // find a mood whose dot radius (12px) contains the mouse
    const hit = moods.find(m => {
      const dx = mx - ((m.valence / 2 + 0.5) * width);
      const dy = my - (-(m.arousal / 2 - 0.5) * height);
      return Math.hypot(dx, dy) < 12 && m.feeling_label;
    });

    if (hit) {
      setHoverLabel(hit.feeling_label!);
      setHoverPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoverLabel(null);
    }
  };

  const handlePointerLeave = () => {
    setHoverLabel(null);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '2px solid #333',
          background: '#fff',
          display: 'block',
          margin: '1rem auto',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />

      {/* Text entry box */}
      {tempMood && tempPos && (
        <input
          autoFocus
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          style={{
            position: 'absolute',
            left: tempPos.x,
            top: tempPos.y,
            transform: 'translate(-50%, -120%)',
            padding: '4px 8px',
            fontSize: '0.9em',
          }}
        />
      )}

      {/* Hover tooltip */}
      {hoverLabel && hoverPos && (
        <div
          style={{
            position: 'fixed',
            left: hoverPos.x + 10,
            top: hoverPos.y + 10,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            pointerEvents: 'none',
            fontSize: '0.8em',
            zIndex: 10,
          }}
        >
          {hoverLabel}
        </div>
      )}
    </div>
  );
}