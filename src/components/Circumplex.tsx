// src/components/Circumplex.tsx
import React from 'react';
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

  // holding the submitted mood for immediately rendering
  const [localMood, setLocalMood] = useState<Mood | null>(null);

  // tutorial toggle
  const [showTutorial, setShowTutorial] = useState(false);

  // redraw everything whenever moods, pending, etc. change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // ——— HiDPI setup ———
    const dpr = window.devicePixelRatio || 1;
    // make the internal backing store bigger
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    // but keep it the same CSS size
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
    // scale all drawing operations back to CSS pixels
    ctx.scale(dpr, dpr);
    // ——————————————

    // — draw axes & labels —
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

    // — plot blue dot, preferring localMood if it exists —
    const myMood = localMood ?? moods.find(m => m.session_id === sessionId);
    if (myMood) {
        const x = (myMood.valence / 2 + 0.5) * width;
        const y = (-myMood.arousal / 2 + 0.5) * height;
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
  }, [moods, tempMood, tempPos, localMood, width, height, sessionId]);

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
      //capture the new mood locally (so that the map is immediately updated)
      const newMood: Mood = {
        ...tempMood,
        feeling_label: inputValue.trim() || undefined,
        created_at: new Date().toISOString(),
      };
      setLocalMood(newMood);

      await submitMood(
        tempMood.valence,
        tempMood.arousal,
        inputValue.trim() || undefined
      );
      setTempMood(null);
      setTempPos(null);
    }
  };

  // add clickable submit button: do exactly what Enter does
  const handleSubmitClick = async () => {
    if (!tempMood || !tempPos) return;
    const newMood: Mood = {
      ...tempMood,
      feeling_label: inputValue.trim() || undefined,
      created_at: new Date().toISOString(),
    };
    // show immediately
    setLocalMood(newMood);
    // persist
    await submitMood(
      newMood.valence,
      newMood.arousal,
      newMood.feeling_label
    );
    // clear the “pending” UI
    setTempMood(null);
    setTempPos(null);
    setInputValue('');
  };

  // add cancel button: drop the pending mood
  const handleCancelClick = () => {
    setTempMood(null);
    setTempPos(null);
    setInputValue('');
  };

  // track hover for tooltips
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // check local mood first; if exists, show the hover-label before refreshing
    if (localMood && localMood.feeling_label) {
             const lx = (localMood.valence / 2 + 0.5) * width;
             const ly = (-localMood.arousal / 2 + 0.5) * height;
             if (Math.hypot(mx - lx, my - ly) < 12) {
               setHoverLabel(localMood.feeling_label);
               setHoverPos({ x: e.clientX, y: e.clientY });
               return;
             }
           }

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
    <div style={{ 
        position: 'relative', 
        display: 'block',
        maxWidth: `${width}px`,
        margin: 'auto',
        }}>
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: '2px solid #333',
          borderRadius: '30px',
          background: '#fff',
          display: 'block',
          margin: '1rem auto',
          touchAction: 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />

      {/* Text entry + action buttons */}
    {tempMood && tempPos && (
        <div
        style={{
            position: 'absolute',
            left: tempPos.x,
            top:  tempPos.y,
            transform: 'translate(-50%, -120%)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.9)',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
        >
        <input
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Add mood label (optional)"
            style={{
                fontSize: '1em',
                minWidth: '80px',
                minHeight: '44px',
                padding: '8px'
            }}
        />
        <button
            onClick={handleSubmitClick}
            style={{
            fontSize: '1em',
            padding: '8px 12px',
            minHeight: '44px',
            touchAction: 'manipulation',
            cursor: 'pointer',
            }}
        >
            Save
        </button>
        <button
            onClick={handleCancelClick}
            style={{
            fontSize: '1em',
            padding: '8px 12px',
            minHeight: '44px',
            touchAction: 'manipulation',
            cursor: 'pointer',
            }}
        >
            ✕
        </button>
        </div>
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

      {/* Tutorial toggle */}
        <button
        onClick={() => setShowTutorial(prev => !prev)}
        style={{
          position: 'absolute',
          top: 25,
          left: 8,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #333',
          borderRadius: '30px',
          padding: '4px 8px',
          cursor: 'pointer',
          zIndex: 20,
          fontSize: '1.2em'
        }}
        >
        💡Tutorial
      </button>

      {/* Unfolded tutorial panel */}
      {showTutorial && (
        <div
          style={{
            position: 'absolute',
            top: 65,
            left: 8,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #333',
            borderRadius: '15px',
            padding: '8px',
            maxWidth: '240px',
            fontSize: '0.9em',
            zIndex: 20,
            lineHeight: 1.4
          }}
        >
        <strong>What is the Mood Map?</strong>
            <ul style={{ paddingLeft: '1em', margin: '0.5em 0' }}>
            <li>Science shows emotions can be mapped in 2D: valence (good–bad) and arousal (high–low energy).</li>
            <li>This map helps track how you and others feel, using that 2D space.</li>
            </ul>

        <strong>How to use the Mood Map:</strong>
            <ul style={{ paddingLeft: '1em', margin: '0.5em 0' }}>
            <li>Click anywhere on the map to place your mood.</li>
            <li>Type a word (or leave blank) and press Enter to save.</li>
            <li>Hover over any dot to see its label.</li>
            </ul>

        <strong>What the colors mean:</strong>
            <ul style={{ paddingLeft: '1em', margin: '0.5em 0' }}>
            <li>Your moods = <span style={{ color: 'lightblue' }}>blue dots</span>.</li>
            <li>Others' moods = <span style={{ color: 'pink' }}>pink dots</span>.</li>
            </ul>

        </div>
      )}
    </div>
  );
}