import { useEffect, useState } from 'react';
import { clubsApi } from '../../../features/platform/platformApi';

export default function SuperadminClubs() {
  const [leagueFilter, setLeagueFilter] = useState('');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    clubsApi
      .list({ league: leagueFilter || undefined })
      .then((d) => active && setClubs(d.items))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [leagueFilter]);

  const leagues = Array.from(new Set(clubs.map((c) => c.league)));

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
          <button type="button" className={`sa-tab${!leagueFilter ? ' is-active' : ''}`} onClick={() => setLeagueFilter('')}>
            Barchasi · {clubs.length}
          </button>
          {leagues.map((l) => (
            <button key={l} type="button" className={`sa-tab${leagueFilter === l ? ' is-active' : ''}`} onClick={() => setLeagueFilter(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : clubs.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            Hali klub qo'shilmagan. "+ Klub qo'shish" tugmasi bilan birinchi klubni yarating.
          </div>
        </div>
      ) : (
        <div className="sa-grid-2">
          {clubs.map((c) => (
            <div key={c.id} className="sa-panel">
              <div className="sa-panel__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10,
                      background: c.markColor, color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-display)',
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
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.kits.length || 1}, 1fr)`, gap: 10 }}>
                {c.kits.map((k) => (
                  <div key={k.id} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        height: 56, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 6,
                        background: k.bgColor, color: k.textColor, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
                        border: '1px solid var(--sa-line)',
                      }}
                    >
                      {c.code}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sa-mu)' }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
