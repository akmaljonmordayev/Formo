import { useState } from 'react';

// Namuna ma'lumot — backend klub katalogi API'si ulanguncha
const CLUBS = [
  {
    name: 'Real Madrid', league: 'LaLiga', season: '2026/27', sold: 212, code: 'RM', mark: '#0e1a3f',
    kits: [{ label: 'Uy', bg: '#f3f5f9', color: '#0e1a3f' }, { label: 'Mehmon', bg: '#0e1a3f', color: '#fff' }, { label: 'Uchinchi', bg: '#1b2560', color: '#fff' }],
  },
  {
    name: 'FC Barcelona', league: 'LaLiga', season: '2026/27', sold: 184, code: 'FB', mark: '#9184d9',
    kits: [{ label: 'Uy', bg: '#8a1f2b', color: '#fff' }, { label: 'Mehmon', bg: '#f2a33a', color: '#1a1200' }, { label: 'Uchinchi', bg: '#19a7a1', color: '#fff' }],
  },
  {
    name: 'Manchester United', league: 'Premier League', season: '2026/27', sold: 131, code: 'MU', mark: '#8a1f2b',
    kits: [{ label: 'Uy', bg: '#8a1f2b', color: '#fff' }, { label: 'Mehmon', bg: '#f3f5f9', color: '#0e1a3f' }, { label: 'Uchinchi', bg: '#0e1a3f', color: '#fff' }],
  },
  {
    name: 'Liverpool', league: 'Premier League', season: '2026/27', sold: 96, code: 'L', mark: '#b8323f',
    kits: [{ label: 'Uy', bg: '#b8323f', color: '#fff' }, { label: 'Mehmon', bg: '#f3f5f9', color: '#0e1a3f' }, { label: 'Uchinchi', bg: '#19a7a1', color: '#fff' }],
  },
];

const FILTERS = ['Barchasi · 6', 'LaLiga · 2', 'Premier League · 2', 'Bundesliga · 1', 'Serie A · 1'];

export default function SuperadminClubs() {
  const [filter, setFilter] = useState(FILTERS[0]);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Klublar va formalar</h1>
          <p>
            Ilovadagi «Klub formalari» katalogi. Har bir klubda uy, mehmon va uchinchi forma. O'chirilgan forma ilovada
            ko'rinmaydi.
          </p>
        </div>
        <button type="button" className="sa-btn">+ Klub qo'shish</button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`sa-tab${filter === f ? ' is-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span className="sa-table__sub" style={{ marginTop: 8 }}>
          Har bir forma: 189 000 so'm · futbolka + shortik + ism va raqam
        </span>
      </div>

      <div className="sa-grid-2">
        {CLUBS.map((c) => (
          <div key={c.name} className="sa-panel">
            <div className="sa-panel__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10,
                    background: c.mark, color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-display)',
                  }}
                >
                  {c.code}
                </span>
                <div>
                  <div className="sa-panel__title" style={{ fontSize: 14.5 }}>{c.name}</div>
                  <div className="sa-table__sub">{c.league} · {c.season} mavsumi</div>
                </div>
              </div>
              <span className="sa-table__sub" style={{ marginTop: 0 }}>{c.sold} ta sotildi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {c.kits.map((k) => (
                <div key={k.label} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      height: 56, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 6,
                      background: k.bg, color: k.color, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
                      border: '1px solid var(--sa-line)',
                    }}
                  >
                    10
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sa-mu)' }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
