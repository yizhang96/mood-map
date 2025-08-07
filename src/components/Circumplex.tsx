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
  // dynamically changing entry box position
  const [inputPos, setInputPos] = useState<{ x: number; y: number } | null>(null);

  // hover tooltip state
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [hoverPos, setHoverPos]     = useState<{ x: number; y: number } | null>(null);

  // holding the submitted mood for immediately rendering
  const [localMood, setLocalMood] = useState<Mood | null>(null);
  const [hoveredMood, setHoveredMood] = useState<Mood | null>(null)

  // tutorial toggle
  const [showTutorial, setShowTutorial] = useState(false);

  // your desired box size:
  const BOX_W = 120;  // a bit smaller than before
  const BOX_H = 40;

  //define function for mapping valence-arousal to colors
  /** 
 * Quadrant color‐blend: 
 *   (v,a)∈[−1..+1]² → color between UL=red, UR=yellow, LL=blue, LR=green 
 */
function moodToQuadColor(v: number, a: number): string {
    // normalize to [0..1]
    const u = (Math.max(-1, Math.min(1, v)) + 1) / 2; // 0 at left, 1 at right
    const w = (Math.max(-1, Math.min(1, a)) + 1) / 2; // 0 at bottom, 1 at top
  
    // corner RGBs:
    const UL = [255,   0,   0]; // red
    const UR = [255, 255,   0]; // yellow
    const LL = [  0,   0, 255]; // blue
    const LR = [  0, 255,   0]; // green
  
    // bilinear interp:
    const blend = (C1: number[], C2: number[], t: number) => [
      C1[0] + (C2[0] - C1[0]) * t,
      C1[1] + (C2[1] - C1[1]) * t,
      C1[2] + (C2[2] - C1[2]) * t,
    ];
  
    // first interpolate horizontally on bottom and top edges:
    const bottom = blend(LL, LR, u);  // at a = -1
    const top    = blend(UL, UR, u);  // at a = +1
  
    // then interpolate vertically between those:
    const rgb = blend(bottom, top, w);
  
    // turn into CSS hex:
    const toHex = (c: number) => {
      const h = Math.round(c).toString(16).padStart(2, '0');
      return h;
    };
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  }
  
  //define functions for pointer actions (for touchscreen devices)
  //A double-click would place an emotion
  /** Show label on single click/tap */
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    const rect = canvas.getBoundingClientRect();
    const cw   = rect.width;
    const ch   = rect.height;
  
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
  
    const allMoods: Mood[] = [
      ...moods,
      ...(localMood ? [localMood] : []),
    ];
  
    const hit = allMoods.find(m => {
      const x0 = (m.valence  / 2 + 0.5) * cw;
      const y0 = (-m.arousal / 2 + 0.5) * ch;
      return Math.hypot(mx - x0, my - y0) < 12;
    });
  
    if (hit) {
      setHoveredMood(hit);
  
      if (hit.feeling_label) {
        const relX = (hit.valence  / 2 + 0.5) * cw;
        const relY = (-hit.arousal / 2 + 0.5) * ch;
        setHoverLabel(hit.feeling_label);
        setHoverPos({ x: relX, y: relY });
      } else {
        setHoverLabel(null);
      }
    } else {
      setHoveredMood(null);
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
    // after you compute raw x,y from the event…
    setTempMood({ session_id:sessionId, valence, arousal, created_at: new Date().toISOString() });
    setTempPos({ x, y });

    // initial “above” position:
    let bx = x;
    let by = y -  (BOX_H/2 + 16);  // 16px gap above tap

    // clamp horizontally:
    bx = Math.max(BOX_W/2 + 8, Math.min(cw - BOX_W/2 - 8, bx));

    // clamp vertically so it never runs off top or bottom
    by = Math.max(8 + BOX_H/2, Math.min(ch - BOX_H/2 - 8, by));

    // save it
    setInputPos({ x: bx, y: by });
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
  
    // ——— plot everyone else’s dots (radius 8) ———
    for (const m of moods) {
        if (m.session_id === sessionId) continue;
    
        const x = (m.valence / 2 + 0.5) * cw;
        const y = (-m.arousal / 2 + 0.5) * ch;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
    
        // compute color from valence/arousal:
        ctx.fillStyle = moodToQuadColor(m.valence, m.arousal);
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

    // ——— highlight hoveredMood with a yellow ring ———
    if (hoveredMood) {
        // use the *canvas‐relative* coords as before:
        const x = (hoveredMood.valence  / 2 + 0.5) * cw;
        const y = (-hoveredMood.arousal / 2 + 0.5) * ch;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#4B5563'; //color of outer circle
        ctx.lineWidth   = 3;
        ctx.stroke();
      }
  
    }, [moods, localMood, tempMood, tempPos, inputPos, hoveredMood, sessionId]);


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
  
    const rect = canvas.getBoundingClientRect();
    const cw   = rect.width;
    const ch   = rect.height;
  
    // pointer in canvas coords
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
  
    // consider *all* moods (including your local one) for hovering
    const allMoods: Mood[] = [
      ...moods,
      ...(localMood ? [localMood] : []),
    ];
  
    // hit‐test any mood
    const hit = allMoods.find(m => {
      const x0 = (m.valence  / 2 + 0.5) * cw;
      const y0 = (-m.arousal / 2 + 0.5) * ch;
      return Math.hypot(mx - x0, my - y0) < 12;
    });
  
    if (hit) {
      // always highlight the circle
      setHoveredMood(hit);
  
      // only show a label if it exists
      if (hit.feeling_label) {
        const relX = (hit.valence  / 2 + 0.5) * cw;
        const relY = (-hit.arousal / 2 + 0.5) * ch;
        setHoverLabel(hit.feeling_label);
        setHoverPos({ x: relX, y: relY });
      } else {
        setHoverLabel(null);
      }
    } else {
      setHoveredMood(null);
      setHoverLabel(null);
    }
  };
  
  const handlePointerLeave = () => {
    setHoverLabel(null);
    setHoveredMood(null);
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
      {tempMood && inputPos && (
  <div
    style={{
      position:     'absolute',
      left:         inputPos.x,
      top:          inputPos.y,
      transform:    'translate(-50%, -50%)',
      display:      'flex',
      gap:          '4px',
      background:   'rgba(255,255,255,0.9)',
      padding:      '4px 6px',
      borderRadius: '4px',
      boxShadow:    '0 1px 4px rgba(0,0,0,0.15)',
      zIndex:       10,
    }}
  >
    <input
      autoFocus
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      onKeyDown={handleInputKeyDown}
      placeholder="Label (opt.)"
      style={{
        fontSize: '0.9em',
        padding:  '4px 6px',
        width:    `${BOX_W - 40}px`,  // leave room for two small buttons
        height:   '32px',
      }}
    />
    <button
      onClick={handleSubmitClick}
      style={{
        fontSize: '0.9em',
        padding:  '4px 8px',
        height:   '32px',
        cursor:   'pointer',
      }}
    >
      ✓
    </button>
    <button
      onClick={handleCancelClick}
      style={{
        fontSize: '0.9em',
        padding:  '4px 8px',
        height:   '32px',
        cursor:   'pointer',
      }}
    >
      ✕
    </button>
  </div>
)}

      {/* Hover tooltip */}
      {hoverLabel && hoverPos && (() => {
        // measure the canvas’s display width
        const cw = canvasRef.current
            ? canvasRef.current.getBoundingClientRect().width
            : width;
        const isLeftSide = hoverPos.x < cw / 2;

        return (
            <div
            style={{
                position:       'absolute',
                left:           hoverPos.x,
                top:            hoverPos.y,
                transform:      isLeftSide
                ? 'translate(12px, -50%)'
                : 'translate(calc(-100% - 12px), -50%)',
                display:        'flex',
                alignItems:     'center',
                gap:            '6px',
                background:     'white',
                color:          '#333',
                padding:        '6px 10px',
                borderRadius:   '9999px',              // pill-shaped
                border:         '1px solid #333',
                boxShadow:     '0 4px 12px rgba(0, 0, 0, 0.15)',
                pointerEvents:  'none',
                fontSize:       '0.9em',
                fontFamily:     'Helvetica, Arial, sans-serif',
                whiteSpace:     'nowrap',
                zIndex:         20,
            }}
            >
            <span style={{ fontSize: '1.1em', lineHeight: 1 }}></span>
            <span>{hoverLabel}</span>
            </div>
        );
        })()}

      {/* Floating legend toggle */}
      <button
      onClick={() => setShowTutorial(prev => !prev)}
      style={{
        position:       'fixed',       // stuck to viewport
        bottom:         24,            // 24px up from bottom
        left:           16,            // 16px in from left
        background:     'rgba(255,255,255,0.9)',
        border:         '1px solid #333',
        borderRadius:   '30px',
        padding:        '6px 12px',
        cursor:         'pointer',
        zIndex:         1000,          // above everything
        fontSize:       '1em',
        fontFamily:     'Helvetica, Arial, sans-serif',
        display:        'flex',
        alignItems:     'center',
        gap:            '4px',
      }}
      >
      💡 How to use
      </button>

      {showTutorial && (
        <div
            style={{
            position:       'fixed',
            bottom:         70,                   
            left:           16,
            background:     'rgba(255, 255, 255, 0.85)',
            border:         '1px solid #333',
            borderRadius:   '30px',
            padding:        '30px',
            maxWidth:       '280px',
            fontSize:       '0.9em',
            fontFamily:     'Helvetica, Arial, sans-serif',
            lineHeight:     1.4,
            zIndex:         1000,
            boxShadow:      '0 2px 8px rgba(0,0,0,0.15)',
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
            <li>Single-click/tap on any dot to see its label.</li>
            </ul>

            <strong>What do the dots represent:</strong>
            <ul style={{ paddingLeft: '1em', margin: '0.5em 0' }}>
            <li><span style={{ }}>Large dot</span> = your mood.</li>
            <li><span style={{ }}>Small dots</span> = others’ moods.</li>
            <li><span style={{ }}>Click any dot to see the mood label.</span></li>
            </ul>
        </div>
      )}
    </div>
  );
}