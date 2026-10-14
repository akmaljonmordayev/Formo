import { useEffect, useState } from 'react';
import { promocodesApi } from '../../../features/platform/platformApi';

const TYPE_LABEL = { PERCENT: 'Foiz', FIXED: "Qat'iy", FREE_SHIPPING: 'Bepul yetkazish' };

const formatPeriod = (p) => {
  if (!p.startsAt && !p.endsAt) return 'doimiy';
  const fmt = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  if (p.endsAt && new Date(p.endsAt) < new Date()) return 'tugagan';
  return `${p.startsAt ? fmt(p.startsAt) : '—'} – ${p.endsAt ? fmt(p.endsAt) : '—'}`;
};

export default function SuperadminPromocodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    promocodesApi
      .list()
      .then(setCodes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (c) => {
    setBusyId(c.id);
    try {
      await promocodesApi.update(c.id, { isActive: !c.isActive });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Promokodlar</h1>
          <p>Chegirma kodlari. O'chirilgan kod to'lovda qabul qilinmaydi.</p>
        </div>
        <button type="button" className="sa-btn">+ Promokod</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : codes.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">Hali promokod yaratilmagan. "+ Promokod" bilan birinchisini qo'shing.</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Turi</th>
                <th>Qiymat</th>
                <th>Min. summa</th>
                <th>Ishlatildi</th>
                <th>Amal qilish</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.code}</b></td>
                  <td>{TYPE_LABEL[c.type] ?? c.type}</td>
                  <td>{c.type === 'FREE_SHIPPING' ? '—' : c.type === 'PERCENT' ? `${c.value}%` : c.value.toLocaleString('uz-UZ')}</td>
                  <td>{c.minSum ? c.minSum.toLocaleString('uz-UZ') : '—'}</td>
                  <td style={{ minWidth: 150 }}>
                    <div style={{ fontSize: 12.5, marginBottom: 4 }}>{c.usedCount} / {c.usageCap ?? '∞'}</div>
                    {c.usageCap && (
                      <div className="sa-progress">
                        <div className="sa-progress__fill" style={{ width: `${Math.min(100, (c.usedCount / c.usageCap) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  <td>{formatPeriod(c)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => toggle(c)}
                      style={{
                        display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: c.isActive ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', padding: 0,
                      }}
                      aria-label={c.isActive ? "O'chirish" : 'Yoqish'}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2, left: c.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        }}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
