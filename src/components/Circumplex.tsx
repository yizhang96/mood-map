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

    // axes
    // Automatically adjust axis length based on label size ---
    const padding = 8;

    // Measure top label
    const topLabel = 'High Energy';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px sans-serif';
    const topMetrics = ctx.measureText(topLabel);
    const topDescent = topMetrics.actualBoundingBoxDescent;

    // Measure bottom label
    const bottomLabel = 'Low Energy';
    const bottomMetrics = ctx.measureText(bottomLabel);
    const bottomAscent = bottomMetrics.actualBoundingBoxAscent;

    // Re-draw the labels so metrics apply to same font settings
    ctx.fillText(topLabel, width / 2, 20);
    ctx.fillText(bottomLabel, width / 2, height - 20);

    // Vertical insets: start just below top label, and end just above bottom label
    const topInset = 20 + topDescent + padding;
    const bottomInset = height - 20 - bottomAscent - padding;

    // Measure and inset for left/right labels unchanged
    const negW = ctx.measureText('Negative').width;
    const posW = ctx.measureText('Positive').width;
    const leftInset = 20 + negW + padding;
    const rightInset = width - (20 + posW + padding);

    // --- Draw the shortened axes ---
    ctx.beginPath();
    // vertical axis
    ctx.moveTo(width / 2, topInset);
    ctx.lineTo(width / 2, bottomInset);
    // horizontal axis
    ctx.moveTo(leftInset, height / 2);
    ctx.lineTo(rightInset, height / 2);

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
