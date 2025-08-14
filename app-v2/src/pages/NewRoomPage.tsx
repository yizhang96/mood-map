// app-v2/src/pages/NewRoomPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getAnonId } from '../lib/anon';
import previewImg from './mood-map-v2-preview.png';

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const palette = {
  line: '#e5e7eb',        // gray-200
  accent: '#4b5563',      // charcoal
};

export default function NewRoomPage() {
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;

    setBusy(true);
    try {
      const slug = slugify(title) || crypto.randomUUID().slice(0, 8);

      const { data, error } = await supabase
        .from('rooms_v2')
        .insert({
          title: title.trim(),
          slug,
          passcode: passcode.trim() || null,
          created_by: getAnonId(),
        })
        .select('id, slug')
        .single();

      if (error) {
        // Friendly message for duplicate slug
        if (error.code === '23505' || String(error.message).includes('rooms_v2_slug_key')) {
          alert('Room name already exists. Try a different one.');
          return;
        }
        throw error;
      }

      navigate(`/r/${data!.slug || data!.id}`);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to create room');
    } finally {
      setBusy(false);
    }
  }

  // simple helper for numbered pills
  function Step({ n, title }: { n: number; title: string }) {
    return (
      <li style={{
        display: 'flex', gap: 12, alignItems: 'center',
        background: '#f3f4f6', border: '1px solid #e5e7eb',
        borderRadius: 14, padding: '12px 14px'
      }}>
        <span style={{
          display: 'grid', placeItems: 'center',
          width: 28, height: 28, borderRadius: '50%',
          background: '#111827', color: '#fff',
          fontWeight: 700, fontSize: 13, flexShrink: 0
        }}>
          {n}
        </span>
        <div style={{ fontWeight: 600 }}>{title}</div>
      </li>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: '32px auto 56px', padding: '0 16px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* Top: title + intro + preview */}
      <section style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', minWidth: 280 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Welcome to Mood Map!</h1>
          <p style={{ margin: '10px 0 0', fontSize: 18, color: '#4b5563', lineHeight: 1.45 }}>
            Mood Map helps your group check in by sharing how you feel on a simple 2D map.
            Create your board, invite others, and see everyone’s moods in real time.
          </p>

          {/* How it works */}
        <div>
          <h2 style={{ fontSize: 24, margin: '12px 0 12px' }}>How it works</h2>
          <ol style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'grid', gap: 12, gridTemplateColumns: '1fr'
          }}>
            <Step n={1} title="Create a board" />
            <Step n={2} title="Share the link with your teammates" />
            <Step n={3} title="Log your mood and share with others!" />
          </ol>
        </div>
        </div>

        {/* Small preview card (replace src with your screenshot/GIF) */}
        <div style={{
          flex: '1 1 300px', minWidth: 260,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: 16, padding: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)'
        }}>
          <img
            src={previewImg}
            alt="Preview of a Mood Map with dots placed across the grid"
            style={{ width: '100%', borderRadius: 12, display: 'block' }}
          />
        </div>
      </section>

      {/* Form */}
      <section style={{
        marginTop: 24, background: 'white', border: '1px solid #e5e7eb',
        borderRadius: 18, padding: 20,
        boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)'
      }}>
        <form onSubmit={createRoom} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label htmlFor="room" style={{ display: 'block', fontWeight: 600 }}>Room Name</label>
            <input
              id="room"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Team Check‑in"
              style={{
                width: '100%', padding: '12px 14px', marginTop: 6,
                borderRadius: 12, border: '1px solid #d1d5db', outline: 'none',
                fontSize: 16,
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,.25)')}
              onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              required
            />
          </div>

          <div>
            <label htmlFor="passcode" style={{ display: 'block', fontWeight: 600 }}>
              Passcode <span style={{ color: '#6b7280', fontWeight: 500 }}>(optional)</span>
            </label>
            <input
              id="passcode"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="e.g., sunflower"
              style={{
                width: '100%', padding: '12px 14px', marginTop: 6,
                borderRadius: 12, border: '1px solid #d1d5db', outline: 'none',
                fontSize: 16,
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,.25)')}
              onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                border: 'none',
                background: busy ? '#c7d2fe' : '#4f46e5',
                color: 'white',
                fontWeight: 700,
                cursor: busy ? 'default' : 'pointer',
                boxShadow: '0 2px 6px rgba(79,70,229,.25)'
              }}
            >
              {busy ? 'Creating…' : 'Create My Mood Map'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Only people with your link (and passcode, if set) can view and join your board.
          </div>
        </form>
      </section>
    </main>
  );
}