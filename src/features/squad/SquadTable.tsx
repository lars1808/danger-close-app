import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import * as T from './types';

// --- Local key ---
const STORAGE_KEY = 'danger-close-squad';

// --- Default data ---
const defaultTroopers: T.Trooper[] = [
  { id: 1, name: 'Aelius', status: 'OK', grit: 3, ammo: 3, notes: '' },
  { id: 2, name: 'Brennus', status: 'OK', grit: 3, ammo: 3, notes: '' },
  { id: 3, name: 'Cassander', status: 'OK', grit: 3, ammo: 3, notes: '' },
  { id: 4, name: 'Decimus', status: 'OK', grit: 3, ammo: 3, notes: '' },
  { id: 5, name: 'Ector', status: 'OK', grit: 3, ammo: 3, notes: '' },
];

// --- Styles ---
const th: CSSProperties = { textAlign: 'left', borderBottom: '1px solid #444', padding: 8 };
const td: CSSProperties = { borderBottom: '1px solid #333', padding: 8, verticalAlign: 'middle' };
const inputStyle: CSSProperties = {
  padding: 6,
  border: '1px solid #555',
  background: '#111',
  color: '#fff',
  borderRadius: 4,
};
const btn: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #555',
  background: '#1a1a1a',
  color: '#fff',
  borderRadius: 4,
  cursor: 'pointer',
};
const group: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnSmall: CSSProperties = { ...btn, padding: '4px 8px' };
const valueBox: CSSProperties = { minWidth: 24, textAlign: 'center', display: 'inline-block' };

export default function SquadTable() {
  // --- State init ---
  const [troopers, setTroopers] = useState<T.Trooper[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as T.Trooper[]) : defaultTroopers;
  });

  // --- Persist on change ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(troopers));
  }, [troopers]);

  // --- Update helpers ---
  function update<K extends keyof T.Trooper>(id: number, key: K, value: T.Trooper[K]) {
    setTroopers((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  }

  function clamp03(n: number) {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(3, Math.round(n)));
  }

  function bump(id: number, key: 'grit' | 'ammo', delta: 1 | -1) {
    setTroopers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [key]: clamp03((t[key] as number) + delta) } : t))
    );
  }

  function resetSquad() {
    if (confirm('Reset squad to defaults?')) {
      setTroopers(defaultTroopers);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // --- Render ---
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={resetSquad} style={btn}>
          Reset Squad
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Status</th>
            <th style={th}>Grit</th>
            <th style={th}>Ammo</th>
            <th style={th}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {troopers.map((t) => (
            <tr key={t.id}>
              <td style={td}>
                <input
                  value={t.name}
                  onChange={(e) => update(t.id, 'name', e.target.value)}
                  style={inputStyle}
                />
              </td>

              <td style={td}>
                <button
                  onClick={() => update(t.id, 'status', T.nextStatus(t.status))}
                  style={btn}
                  aria-label={`Status ${t.status}. Click to cycle.`}
                  title="Click to cycle status"
                >
                  {t.status}
                </button>
              </td>

              <td style={td}>
                <div style={group}>
                  <button onClick={() => bump(t.id, 'grit', -1)} style={btnSmall}>
                    -
                  </button>
                  <span style={valueBox}>{t.grit}</span>
                  <button onClick={() => bump(t.id, 'grit', +1)} style={btnSmall}>
                    +
                  </button>
                </div>
              </td>

              <td style={td}>
                <div style={group}>
                  <button onClick={() => bump(t.id, 'ammo', -1)} style={btnSmall}>
                    -
                  </button>
                  <span style={valueBox}>{t.ammo}</span>
                  <button onClick={() => bump(t.id, 'ammo', +1)} style={btnSmall}>
                    +
                  </button>
                </div>
              </td>

              <td style={td}>
                <input
                  value={t.notes ?? ''}
                  onChange={(e) => update(t.id, 'notes', e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="notes"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
