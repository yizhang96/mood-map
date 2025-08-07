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

  //define functions for pointer actions (for touchscreen devices)
  //A double-click would place an emotion
  /** Show label on single click/tap */
  /** Show label on single click/tap (canvas-relative) */
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    // 1️⃣ Measure on-screen CSS size & position
    const rect = canvas.getBoundingClientRect();
    const cw   = rect.width;
    const ch   = rect.height;
  
    // 2️⃣ Convert the tap to canvas-local coords
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
  
    // 3️⃣ Gather only moods with labels
    const labeled: Mood[] = [
      ...moods.filter(m => !!m.feeling_label),
      ...(localMood && localMood.feeling_label ? [localMood] : []),
    ];
  
    // 4️⃣ Hit-test in that canvas space
    const hit = labeled.find(m => {
      const x0 = (m.valence  / 2 + 0.5) * cw;
      const y0 = (-m.arousal / 2 + 0.5) * ch;
      return Math.hypot(mx - x0, my - y0) < 12;
    });
  
    if (hit) {
      // 5️⃣ Compute the dot’s center *relative* to the canvas
      const relX = (hit.valence  / 2 + 0.5) * cw;
      const relY = (-hit.arousal / 2 + 0.5) * ch;
  
      setHoverLabel(hit.feeling_label!);
      setHoverPos({ x: relX, y: relY });
    } else {
      setHoverLabel(null);
    }
  };

  /** Place a new mood on double-click/tap */
  /** Place a new mood on double-click/tap */
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();      // stop Safari’s default double-tap zoom
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    // 1️⃣ measure actual on-screen size
    const rect = canvas.getBoundingClientRect();
    const cw   = rect.width;
    const ch   = rect.height;
  
    // 2️⃣ compute click/tap pos
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    // 3️⃣ derive valence/arousal from that real size
    const valence = (x / cw - 0.5) * 2;
    const arousal = -((y / ch - 0.5) * 2);
  
    // 4️⃣ set up your pending mood UI
    setTempMood({
      session_id: sessionId,
      valence,
      arousal,
      created_at: new Date().toISOString(),
    });
    setTempPos({ x, y });
    setInputValue('');
  };
  

  // redraw everything whenever moods, pending, etc. change
  // inside your Circumplex component, replace your existing useEffect(...) with this:

useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    // 1️⃣ Measure *actual* CSS size of the canvas
    const { width: cw, height: ch } = canvas.getBoundingClientRect();
  
    // 2️⃣ Hi-DPI backing store
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
  
    // 3️⃣ Clear the full area
    ctx.clearRect(0, 0, cw, ch);
  
    // ——— draw axes & labels using cw/ch instead of width/height ———
  
    // compute label insets exactly as before...
    const padding = 8;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const topDescent    = ctx.measureText('High Energy').actualBoundingBoxDescent;
    const bottomAscent  = ctx.measureText('Low Energy').actualBoundingBoxAscent;
    const topInset      = 20 + topDescent + padding;
    const bottomInset   = ch - 20 - bottomAscent - padding;
    const negW          = ctx.measureText('Negative').width;
    const posW          = ctx.measureText('Positive').width;
    const leftInset     = 20 + negW + padding;
    const rightInset    = cw - (20 + posW + padding);
  
    // draw axes
    ctx.beginPath();
    ctx.moveTo(cw/2,      topInset);
    ctx.lineTo(cw/2,      bottomInset);
    ctx.moveTo(leftInset, ch/2);
    ctx.lineTo(rightInset,ch/2);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth   = 1;
    ctx.stroke();
  
    // draw labels
    ctx.fillStyle     = '#333';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText('High Energy', cw/2,      20);
    ctx.fillText('Low Energy',  cw/2,      ch - 20);
    ctx.textAlign     = 'left';
    ctx.fillText('Negative',    20,        ch/2);
    ctx.textAlign     = 'right';
    ctx.fillText('Positive',    cw - 20,   ch/2);
  
    // ——— plot everyone’s red dots (radius 8) ———
    for (const m of moods) {
      if (m.session_id === sessionId) continue;
      const x = (m.valence  / 2 + 0.5) * cw;
      const y = (-m.arousal / 2 + 0.5) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI*2);
      ctx.fillStyle   = '#ef4444';
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  
    // ——— plot *your* saved blue dot (radius 12) ———
    const myMood = localMood ?? moods.find(m => m.session_id === sessionId);
    if (myMood) {
      const x = (myMood.valence  / 2 + 0.5) * cw;
      const y = (-myMood.arousal / 2 + 0.5) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI*2);
      ctx.fillStyle   = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  
    // ——— plot the *pending* blue dot while labeling (radius 12) ———
    if (tempMood && tempPos) {
      ctx.beginPath();
      ctx.arc(tempPos.x, tempPos.y, 12, 0, Math.PI*2);
      ctx.fillStyle   = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  
  }, [moods, localMood, tempMood, tempPos, sessionId]);

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
  // src/components/Circumplex.tsx
// …

/** track hover for tooltips, always next to the dot’s true screen center */
const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    // 1️⃣ get on‐screen CSS size
    const { width: cw, height: ch } = canvas.getBoundingClientRect();
  
    // 2️⃣ pointer in canvas coords (for hit test)
    const mx = e.clientX - canvas.getBoundingClientRect().left;
    const my = e.clientY - canvas.getBoundingClientRect().top;
  
    // 3️⃣ build a list of all labelled moods
    const labeled: Mood[] = [
      ...moods.filter(m => !!m.feeling_label),
      ...(localMood && localMood.feeling_label ? [localMood] : []),
    ];
  
    // 4️⃣ hit‐test
    const hit = labeled.find(m => {
      const x0 = (m.valence  / 2 + 0.5) * cw;
      const y0 = (-m.arousal / 2 + 0.5) * ch;
      return Math.hypot(mx - x0, my - y0) < 12;
    });
  
    if (hit) {
      // 5️⃣ compute _canvas‐relative_ coords of the center
      const relX = (hit.valence  / 2 + 0.5) * cw;
      const relY = (-hit.arousal / 2 + 0.5) * ch;
  
      setHoverLabel(hit.feeling_label!);
      setHoverPos({ x: relX, y: relY });
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
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: '1 / 1',
        margin: '1rem auto',
        }}>
      <canvas
        ref={canvasRef}
        width = {width}
        height = {height}
        style={{
          width: `100%`,
          height: `100%`,
          border: '2px solid #333',
          borderRadius: '30px',
          background: '#fff',
          display: 'block',
          margin: '1rem auto',
          touchAction: 'auto',
          userSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handlePointerMove} //desktop only
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
            position: 'absolute',
            left: hoverPos.x + 10,
            top: hoverPos.y + 10,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            pointerEvents: 'none',
            fontSize: '0.8em',
            zIndex: 20,
            whiteSpace: 'nowrap',
            transform: 'translate(0,0)',
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
            <li>Double-click anywhere on the map to place your mood.</li>
            <li>Type a word (or leave blank) and press Enter to save.</li>
            <li>Click any dot to see its mood label.</li>
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