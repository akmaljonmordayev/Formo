import { useState } from 'react';

const GROUPS = [
  { title: 'Yetkazish', items: ['Slotlar va sig\'im', 'Ish vaqti', 'Zonalar va narx'] },
  { title: 'Buyurtma', items: ['Buyurtma qoidalari', "Taqiqlangan so'zlar"] },
  { title: 'Xabarlar', items: ['Bildirishnoma shablonlari'] },
  { title: 'Texnik', items: ['Integratsiyalar'] },
];

const SLOTS = [
  { start: '10:00', end: '14:00', cap: 50, on: true },
  { start: '14:00', end: '18:00', cap: 50, on: true },
  { start: '18:00', end: '22:00', cap: 30, on: true },
];

export default function SuperadminSettings() {
  const [active, setActive] = useState("Slotlar va sig'im");

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
          <p className="sa-table__sub" style={{ marginBottom: 18 }}>
            Mijoz buyurtma berishda tanlaydigan vaqt oraliqlari. Slot to'lsa, mijozga keyingi bo'sh slot taklif qilinadi.
          </p>

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
                {SLOTS.map((s, i) => (
                  <tr key={i}>
                    <td><input className="sa-input" defaultValue={s.start} style={{ width: 90 }} /></td>
                    <td><input className="sa-input" defaultValue={s.end} style={{ width: 90 }} /></td>
                    <td><input className="sa-input" defaultValue={s.cap} style={{ width: 70 }} /></td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block', width: 36, height: 20, borderRadius: 999,
                          background: s.on ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', marginRight: 8, verticalAlign: 'middle',
                        }}
                      >
                        <span style={{ position: 'absolute', top: 2, left: s.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                      </span>
                      Yoqilgan
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="sa-btn sa-btn--ghost" style={{ marginTop: 14 }}>+ Yangi slot</button>
        </div>
      </div>
    </>
  );
}
