import { EMOTIONS } from '../constants/emotions';

export default function EmotionPicker({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
      <h3 style={{ fontFamily: 'Helvetica, Arial, sans-serif', marginTop: 0 }}>Pick an emotion</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {EMOTIONS.map(e => (
          <button
            key={e.key}
            onClick={() => onSelect(e.key)}
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'Helvetica, Arial, sans-serif'
            }}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}