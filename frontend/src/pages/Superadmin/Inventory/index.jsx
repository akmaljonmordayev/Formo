import { useState } from 'react';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const COLORS = ['Oq', 'Qora', "To'q ko'k", 'Lojuvard', 'Firuza', 'Sariq', 'Qizil'];

// Namuna zaxira matritsasi — backend omborga ulanguncha tasodifiy, barqaror qiymatlar
function seeded(seed) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * 23);
}

export default function SuperadminInventory() {
  const [tab, setTab] = useState('Futbolka');
  const sizes = [...KID_SIZES, ...ADULT_SIZES];

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
          {['Futbolka', 'Shortik'].map((t) => (
            <button key={t} type="button" className={`sa-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <span className="sa-table__sub" style={{ marginTop: 0, display: 'flex', gap: 14 }}>
          <span><span style={{ color: 'var(--sa-accent)' }}>●</span> kam qoldi (5 dan kam)</span>
          <span><span style={{ color: 'var(--sa-red)' }}>●</span> tugagan — mijozga ko'rinmaydi</span>
        </span>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Rang</th>
              {sizes.map((s) => (
                <th key={s} style={{ textAlign: 'center' }}>{s}</th>
              ))}
              <th style={{ textAlign: 'right' }}>Jami</th>
            </tr>
          </thead>
          <tbody>
            {COLORS.map((color, ci) => {
              let total = 0;
              return (
                <tr key={color}>
                  <td><b>{color}</b></td>
                  {sizes.map((s, si) => {
                    const v = seeded(ci * 97 + si * 13 + 1);
                    total += v;
                    const low = v > 0 && v < 5;
                    const out = v === 0;
                    return (
                      <td key={s} style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block', minWidth: 26, padding: '3px 6px', borderRadius: 7,
                            border: low ? '1px solid var(--sa-accent)' : out ? '1px solid var(--sa-red)' : '1px solid transparent',
                            color: out ? '#ff8b9a' : low ? 'var(--sa-accent)' : 'var(--sa-ink)',
                          }}
                        >
                          {v}
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
    </>
  );
}
