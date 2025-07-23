// src/components/Circumplex.tsx
import { useRef, useEffect, useState } from 'react';
import { useSubmitMood, getSessionId } from '../hooks/useSubmitMood';
import { useDailyMoods } from '../hooks/useDailyMoods';
import type { Mood } from '../hooks/useDailyMoods';

interface Props {
  width?: number;
  height?: number;
}

export default function Circumplex({
  width = 600,     // was 300
  height = 600,    // was 300
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moods = useDailyMoods();
  const submitMood = useSubmitMood();
  const sessionId = getSessionId();
  const [tempMood, setTempMood] = useState<Mood | null>(null);

  // redraw circle, axes, previous moods and temporary blue dot
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // outer circle
    ctx.beginPath();
    ctx.arc(width/2, height/2, width/2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.stroke();

    // axes
    ctx.beginPath();
    ctx.moveTo(width/2, 0);
    ctx.lineTo(width/2, height);
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.stroke();

    // labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top: High Energy
    ctx.fillText('High Energy', width/2, 20);

    // Bottom: Low Energy
    ctx.fillText('Low Energy', width/2, height - 20);

    // Left: Negative
    ctx.textAlign = 'left';
    ctx.fillText('Negative', 20, height/2);

    // Right: Positive
    ctx.textAlign = 'right';
    ctx.fillText('Positive', width - 20, height/2);

    // plot previous moods (red dots, now radius 8)
    for (const m of moods) {
      if (tempMood && m.session_id === sessionId) continue;
      const x = (m.valence / 2 + 0.5) * width;
      const y = (-m.arousal / 2 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (tempMood) {
      const x = (tempMood.valence / 2 + 0.5) * width;
      const y = (-tempMood.arousal / 2 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [moods, tempMood, width, height, sessionId]);

  // on click: save mood and show blue dot temporarily
  const handlePointer = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // compute valence/arousal and persist
    const valence = (x / width - 0.5) * 2;
    const arousal = -((y / height - 0.5) * 2);
    setTempMood({ session_id: sessionId, valence, arousal, created_at: new Date().toISOString() });
    await submitMood(valence, arousal);
  };

  return (
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
      onPointerDown={handlePointer}
    />
  );
}
