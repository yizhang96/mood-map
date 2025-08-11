// app-v2/src/pages/NewRoomPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getAnonId } from '../lib/anon';

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export default function NewRoomPage() {
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

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

      if (error) throw error;

      // go to the new room (HashRouter safe)
      navigate(`/r/${data!.slug || data!.id}`);
    } catch (err: any) {
      alert(err.message ?? 'Failed to create room');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontFamily: 'Helvetica, Arial, sans-serif', marginTop: 0 }}>Create a Mood Map</h1>
      <form onSubmit={createRoom}>
        <label style={{ fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', fontWeight: 600 }}>Room Name</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter a name for your room"
          style={{ width: '100%', padding: 10, margin: '8px 0 16px', borderRadius: 8, border: '1px solid #ccc' }}
          required
        />

        <label style={{ fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', fontWeight: 600 }}>Passcode (optional)</label>
        <input
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          placeholder="e.g. sunflower"
          style={{ width: '100%', padding: 10, margin: '8px 0 16px', borderRadius: 8, border: '1px solid #ccc' }}
        />

        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #ccc',
            background: busy ? '#f3f4f6' : '#fff',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create'}
        </button>
      </form>
    </main>
  );
}