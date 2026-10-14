import { useState } from 'react';

const RANGES = ['7 kun', '30 kun', '90 kun'];

const STATS = [
  { label: 'Tushum', value: "198,4 mln so'm", delta: '+22%', up: true },
  { label: 'Buyurtmalar', value: '1 184', delta: '+18%', up: true },
  { label: "O'rtacha chek", value: "167 600 so'm", delta: '+3%', up: true },
  { label: 'Qayta xarid qilganlar', value: '18,4%', delta: '-1,2 p.p.', up: false },
];

const FUNNEL = [
  { label: 'Ilovaga kirdi', value: 6420, pct: 100 },
  { label: 'Katalogni ko\'rdi', value: 4180, pct: 65 },
  { label: "Savatga qo'shdi", value: 3310, pct: 79 },
  { label: "To'lovga o'tdi", value: 2240, pct: 68 },
];

const REVENUE = [
  { label: 'Klub formalari', pct: 61, sum: '121,0 mln', color: 'var(--sa-blue)' },
  { label: "O'z dizayni", pct: 29, sum: '57,5 mln', color: 'var(--sa-teal)' },
  { label: 'Qo\'shimcha (shortik, bosma)', pct: 10, sum: '19,9 mln', color: 'var(--sa-accent)' },
];

export default function SuperadminReports() {
  const [range, setRange] = useState('30 kun');

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Hisobotlar</h1>
          <p>Konversiya va mashhur tanlovlar · so'nggi 30 kun.</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost">Excel eksport</button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map((r) => (
            <button key={r} type="button" className={`sa-tab${range === r ? ' is-active' : ''}`} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <span className="sa-table__sub" style={{ marginTop: 8 }}>1-30-sen · oldingi davrga nisbatan</span>
      </div>

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{s.value}</div>
            <div className={`sa-stat__delta${s.up ? ' is-up' : ' is-down'}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Mijoz yo'li</div>
            <span className="sa-panel__sub">ilovaga kirgandan to'lovgacha</span>
          </div>
          <div className="sa-bars" style={{ alignItems: 'flex-end', gap: 24, height: 150 }}>
            {FUNNEL.map((f, i) => (
              <div
                key={f.label}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <div
                  className="sa-bars__col"
                  style={{ height: `${f.pct}%`, width: '70%', background: i === 0 ? 'var(--sa-blue)' : 'var(--sa-teal)' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {FUNNEL.map((f) => (
              <div key={f.label} style={{ flex: 1, textAlign: 'center' }}>
                <b>{f.value.toLocaleString('uz-UZ')}</b>
                <div className="sa-table__sub">{f.label}{f.pct < 100 ? ` · ${f.pct}% qoldi` : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Tushum tarkibi</div>
            <span className="sa-panel__sub">so'm</span>
          </div>
          <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            {REVENUE.map((r) => (
              <span key={r.label} style={{ width: `${r.pct}%`, background: r.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REVENUE.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color }} />
                <span style={{ flex: 1 }}>{r.label}</span>
                <span style={{ color: 'var(--sa-mu)' }}>{r.pct}%</span>
                <b style={{ minWidth: 70, textAlign: 'right' }}>{r.sum}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
