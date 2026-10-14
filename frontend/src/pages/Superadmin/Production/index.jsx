import { useEffect, useState } from 'react';
import { productionApi } from '../../../features/platform/platformApi';

const COLUMNS = [
  { key: 'ACCEPTED', step: 1, title: 'Navbatda', sub: 'Bosishni kutmoqda' },
  { key: 'PRINTING', step: 2, title: 'Bosilmoqda', sub: 'Pressda' },
  { key: 'QUALITY_CHECK', step: 3, title: 'Sifat nazorati', sub: 'Tekshirish va foto' },
  { key: 'READY', step: 4, title: 'Tayyor', sub: 'Ilovada: «Bosildi va tekshirildi»' },
];

export default function SuperadminProduction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    productionApi
      .get()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const workshops = data?.workshops ?? [];
  const columns = data?.columns ?? {};

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Ishlab chiqarish</h1>
          <p>Bugungi bosma vazifalari: chapdan o'ngga 4 qadam. Kartochkani bosib bosma ma'lumotlarini oching.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : (
        <>
          <div className="sa-grid-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, workshops.length)}, 1fr) 1fr` }}>
            {workshops.length === 0 && (
              <div className="sa-table__sub">Hali faol tikuv sexi yo'q.</div>
            )}
            {workshops.map((w) => (
              <div key={w.id} className="sa-stat">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <b>{w.name}</b>
                  <span className="sa-table__sub" style={{ marginTop: 0 }}>{w.activeCount} faol vazifa</span>
                </div>
                <div className="sa-progress" style={{ marginBottom: 8 }}>
                  <div className="sa-progress__fill" style={{ width: `${w.loadPct ?? 0}%` }} />
                </div>
                <div className="sa-table__sub">
                  {w.capacity ? `Bugungi yuk: ${w.activeCount} / ${w.capacity} dona` : "Kunlik sig'im kiritilmagan"}
                </div>
              </div>
            ))}
            <div
              className="sa-stat"
              style={{ borderColor: 'rgba(229,89,107,0.4)', background: 'rgba(229,89,107,0.08)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
                  {data?.lateCount ?? 0}
                </span>
                <div>
                  <b style={{ fontSize: 13.5 }}>ta vazifa kechikmoqda</b>
                  <div className="sa-table__sub">Muddatga 3 soatdan kam qolgan. Avval shularni bosing.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="sa-kanban">
            {COLUMNS.map((col) => {
              const jobs = columns[col.key] ?? [];
              return (
                <div key={col.key} className="sa-kanban__col">
                  <div className="sa-kanban__head">
                    <span className="sa-kanban__step">{col.step}</span>
                    <span className="sa-kanban__title">
                      {col.title}
                      <small>{col.sub}</small>
                    </span>
                    <span className="sa-kanban__count">{jobs.length}</span>
                  </div>
                  {jobs.length === 0 && (
                    <div className="sa-table__sub" style={{ padding: '12px 4px' }}>Bo'sh</div>
                  )}
                  {jobs.map((j) => {
                    const late = col.key !== 'READY' && new Date(j.createdAt) < new Date(Date.now() - 21 * 60 * 60 * 1000);
                    return (
                      <div key={j.id} className="sa-kjob">
                        <div className="sa-kjob__tag">
                          <span>{j.code}</span>
                          {late && <span className="sa-badge sa-badge--red">Kechikmoqda</span>}
                        </div>
                        <div
                          className="sa-kjob__hero"
                          style={{ background: '#f3f5f9', color: '#0e1a3f' }}
                        >
                          <b>{(j.printName || j.customerName || '').toUpperCase()}</b>
                          <span>{j.printNumber ?? ''}</span>
                        </div>
                        <div className="sa-kjob__meta">
                          <div><span>Klub</span><b>{j.club?.name ?? j.kitLabel ?? "O'z dizayni"}</b></div>
                          <div><span>O'lcham</span><b>{j.size}</b></div>
                          <div><span>Turi</span><b>{j.productType === 'CLUB_KIT' ? 'Klub formasi' : "O'z dizayni"}</b></div>
                          <div><span>Soni</span><b>{j.quantity} dona</b></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
