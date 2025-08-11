import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import EmotionPicker from '../components/EmotionPicker';
import SidebarPopular from '../components/SidebarPopular';
import MoodMapCanvas from '../components/MoodMapCanvas';
import { EMOTION_BY_KEY } from '../constants/emotions';
import { useEnsureMember } from '../hooks/useEnsureMember';
import { useRoomMoods } from '../hooks/useRoomMoods';
import { usePostEmotion } from '../hooks/usePostEmotion';
//import { usePopularEmotions } from '../hooks/usePopularEmotions';

type Room = { id: string; title: string; passcode: string | null };

export default function RoomPage() {
  const { roomId } = useParams(); // may be slug or id
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false); // copy successfully feedback
  const [showScience, setShowScience] = useState(false);
  const [sciencePos, setSciencePos] = useState<{ top: number; left: number } | null>(null);
  const scienceBtnRef = useRef<HTMLButtonElement>(null);

function toggleScience() {
  if (!showScience && scienceBtnRef.current) {
    const rect = scienceBtnRef.current.getBoundingClientRect();
    // prevent overflow on the right (assume ~320px card width)
    const left = Math.min(rect.left, window.innerWidth - 320 - 12);
    setSciencePos({ top: rect.bottom + 8, left });
  }
  setShowScience(s => !s);
}

  // 1) Resolve room by slug or id + (simple) passcode check
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      // try slug first
      let { data, error } = await supabase
        .from('rooms_v2')
        .select('*')
        .eq('slug', roomId)
        .single();

      if (error) {
        // fallback to id
        const r = await supabase.from('rooms_v2').select('*').eq('id', roomId).single();
        data = r.data as any; error = r.error as any;
      }
      if (error || !data) {
        setNotFound(true);
        return;
      }

      // (client-side) passcode prompt
      if (data.passcode) {
        const entered = prompt('This room is passcode protected. Enter passcode:') || '';
        if (entered !== data.passcode) {
          setNotFound(true);
          return;
        }
      }

      setRoom({ id: data.id, title: data.title, passcode: data.passcode });
    })();
  }, [roomId]);

  // 2) Ensure a member row exists for this browser (room_id + anon_id unique)
  const memberId = useEnsureMember(room?.id);

  // 3) Live moods for this room (initial load + realtime INSERT)
  const { moods } = useRoomMoods(room?.id);

  // 4) RPC-backed popularity list (24h)
  //const { rows: top } = usePopularEmotions(room?.id);

  // Top 5 emotions, recalculated on every realtime mood update
  const top = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moods) {
      counts.set(m.emotion_key, (counts.get(m.emotion_key) ?? 0) + 1);
    }
    return Array.from(counts, ([emotion_key, n]) => ({ emotion_key, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [moods]);

  // 5) Post a discrete emotion (uses roomId + memberId)
  const postEmotion = usePostEmotion(room?.id, memberId);

  async function handleSelectEmotion(key: string) {
    try {
      await postEmotion(key);
      // realtime subscription will append it; no need for manual optimistic UI
    } catch (err: any) {
      alert(err.message ?? 'Failed to post emotion');
    }
  }

  const dots = useMemo(
    () =>
      moods.map(m => ({
        valence: m.valence,
        arousal: m.arousal,
        color: EMOTION_BY_KEY[m.emotion_key]?.color ?? '#3b82f6',
        member_id: m.member_id,
      })),
    [moods]
  );

  if (notFound) return <main style={{ padding: 24 }}>Room not found or access denied.</main>;
  if (!room) return <main style={{ padding: 24 }}>Loading room…</main>;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '20px auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 16,
      }}
    >
      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <h2 style={{ fontFamily: 'Helvetica, Arial, sans-serif', margin: 0 }}>{room.title}</h2>

        <h2 style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 20, fontWeight: 300 }}>💬 How are you feeling? Click on the map to label your mood.</h2>

        <MoodMapCanvas
        width={560}
        height={560}
        dots={dots}
        currentMemberId={memberId ?? undefined}
        onSelect={({ emotionKey, valence, arousal }) =>
            postEmotion(emotionKey, { v: valence, a: arousal })
            .catch(err => alert(err.message ?? 'Failed to post emotion'))
        }
        />
      </section>

      <aside>
      <SidebarPopular rows={top.slice(0, 5)} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      {/* Copy link */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(window.location.href)
            .then(() => { alert('Link copied to clipboard!'); })
            .catch(() => { alert('Failed to copy link'); });
        }}
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        Copy share link
      </button>

      {/* The science? */}
      <button
        ref={scienceBtnRef}
        onClick={toggleScience}
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
        aria-expanded={showScience}
        aria-controls="science-card"
      >
        The science?
      </button>
    </div>

    {showScience && sciencePos && (
      <div
        id="science-card"
        role="dialog"
        aria-label="About the Circumplex Model"
        style={{
          position: 'absolute',
          top: sciencePos.top,
          left: sciencePos.left,
          zIndex: 1000,
          maxWidth: 320,
          border: '1px solid #333',
          borderRadius: 16,
          padding: 16,
          background: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          fontFamily: 'Helvetica, Arial, sans-serif',
          lineHeight: 1.45,
        }}
      >
        <button
          onClick={() => setShowScience(false)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <strong>What is the Mood Map?</strong>
        <ul style={{ paddingLeft: '1em', margin: '6px 0 10px' }}>
          <li>Inspired by the <em>Circumplex Model of Affect</em>, which maps emotions along two dimensions.</li>
          <li><b>Valence</b> (unpleasant → pleasant) and <b>Arousal</b> (low → high energy) combine to place any mood on the map.</li>
        </ul>

        <strong>Why it matters</strong>
        <ul style={{ paddingLeft: '1em', margin: '6px 0' }}>
          <li>Labeling emotions can make them easier to understand and manage.</li>
          <li>Sharing how you feel can build empathy and social connections.</li>
        </ul>
      </div>
    )}
    </aside>
    </main>
  );
}