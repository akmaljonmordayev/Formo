import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../features/platform/platformApi';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZES = [...KID_SIZES, ...ADULT_SIZES];

export default function SuperadminInventory() {
  const [tab, setTab] = useState('TSHIRT');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    inventoryApi
      .list({ productType: tab })
      .then((d) => active && setItems(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tab]);

  const colors = Array.from(new Set(items.map((i) => i.color)));
  const qtyOf = (color, size) => items.find((i) => i.color === color && i.size === size)?.qty ?? null;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Zaxira</h1>
          <p>Rang va o'lcham bo'yicha bo'sh futbolkalar. 0 bo'lsa, bu variant mijozga ko'rinmaydi.</p>
        </div>
        <button type="button" className="sa-btn">Qoldiqni saqlash</button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ key: 'TSHIRT', label: 'Futbolka' }, { key: 'SHORTS', label: 'Shortik' }].map((t) => (
            <button key={t.key} type="button" className={`sa-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="sa-table__sub" style={{ marginTop: 0, display: 'flex', gap: 14 }}>
          <span><span style={{ color: 'var(--sa-accent)' }}>●</span> kam qoldi (5 dan kam)</span>
          <span><span style={{ color: 'var(--sa-red)' }}>●</span> tugagan — mijozga ko'rinmaydi</span>
        </span>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : colors.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            Hali bu mahsulot turi uchun zaxira kiritilmagan. "Qoldiqni saqlash" bilan birinchi yozuvlarni qo'shing.
          </div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Rang</th>
                {SIZES.map((s) => (
                  <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => {
                let total = 0;
                return (
                  <tr key={color}>
                    <td><b>{color}</b></td>
                    {SIZES.map((s) => {
                      const v = qtyOf(color, s);
                      total += v ?? 0;
                      const low = v !== null && v > 0 && v < 5;
                      const out = v === 0;
                      return (
                        <td key={s} style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block', minWidth: 26, padding: '3px 6px', borderRadius: 7,
                              border: low ? '1px solid var(--sa-accent)' : out ? '1px solid var(--sa-red)' : '1px solid transparent',
                              color: out ? '#ff8b9a' : low ? 'var(--sa-accent)' : v === null ? 'var(--sa-mu)' : 'var(--sa-ink)',
                            }}
                          >
                            {v === null ? '—' : v}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right' }}><b>{total}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
