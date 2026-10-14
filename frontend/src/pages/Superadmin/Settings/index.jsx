import { useEffect, useState } from 'react';
import { settingsApi } from '../../../features/platform/platformApi';

const GROUPS = [
  { title: 'Yetkazish', items: ["Slotlar va sig'im"] },
  { title: 'Buyurtma', items: ['Buyurtma qoidalari', "Taqiqlangan so'zlar"] },
  { title: 'Xabarlar', items: ['Bildirishnoma shablonlari'] },
  { title: 'Texnik', items: ['Integratsiyalar'] },
];

export default function SuperadminSettings() {
  const [active, setActive] = useState("Slotlar va sig'im");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsApi
      .all()
      .then((s) => setSlots(s['delivery.slots'] ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateSlot = (i, patch) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSlot = () => setSlots((prev) => [...prev, { start: '09:00', end: '13:00', cap: 20, on: true }]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await settingsApi.update('delivery.slots', slots);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Sozlamalar</h1>
          <p>Tizim qanday ishlashini belgilaydigan parametrlar. Chapdan bo'limni tanlang. Har bir saqlash audit jurnaliga yoziladi.</p>
        </div>
      </div>

      <div className="sa-grid-2" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="sa-group__title" style={{ padding: '0 4px 6px' }}>{g.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.items.map((it) => (
                  <button
                    key={it}
                    type="button"
                    className={`sa-link${active === it ? ' is-active' : ''}`}
                    style={{ width: '100%', border: 'none', textAlign: 'left' }}
                    onClick={() => setActive(it)}
                  >
                    <span className="sa-link__label">{it}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__title" style={{ marginBottom: 4 }}>{active}</div>

          {error && <div className="form-error">{error}</div>}

          {active === "Slotlar va sig'im" ? (
            <>
              <p className="sa-table__sub" style={{ marginBottom: 18 }}>
                Mijoz buyurtma berishda tanlaydigan vaqt oraliqlari. Slot to'lsa, mijozga keyingi bo'sh slot taklif qilinadi.
              </p>

              {loading ? (
                <div className="sa-table__sub">Yuklanmoqda...</div>
              ) : (
                <>
                  <div className="sa-table-wrap" style={{ border: 'none', background: 'transparent' }}>
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>Boshlanish</th>
                          <th>Tugash</th>
                          <th>Nechta buyurtma sig'adi</th>
                          <th>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((s, i) => (
                          <tr key={i}>
                            <td><input className="sa-input" value={s.start} onChange={(e) => updateSlot(i, { start: e.target.value })} style={{ width: 90 }} /></td>
                            <td><input className="sa-input" value={s.end} onChange={(e) => updateSlot(i, { end: e.target.value })} style={{ width: 90 }} /></td>
                            <td>
                              <input
                                className="sa-input"
                                type="number"
                                min={0}
                                value={s.cap}
                                onChange={(e) => updateSlot(i, { cap: Number(e.target.value) })}
                                style={{ width: 70 }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => updateSlot(i, { on: !s.on })}
                                style={{
                                  display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                                  background: s.on ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', marginRight: 8, verticalAlign: 'middle', padding: 0,
                                }}
                              >
                                <span style={{ position: 'absolute', top: 2, left: s.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                              </button>
                              {s.on ? 'Yoqilgan' : "O'chirilgan"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button type="button" className="sa-btn sa-btn--ghost" onClick={addSlot}>+ Yangi slot</button>
                    <button type="button" className="sa-btn" disabled={saving} onClick={save}>
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="sa-table__sub">Bu bo'lim hali ulanmagan.</p>
          )}
        </div>
      </div>
    </>
  );
}
