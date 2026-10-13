import { useState } from 'react';

const RANGES = ['Bugun', '7 kun', '30 kun', '1-30-sentabr'];

const STATS = [
  { label: 'Tushum', value: "198,4 mln so'm", delta: '+22% oldingi davrga', up: true },
  { label: 'Sof foyda', value: "114,2 mln so'm", delta: 'marja 58%' },
  { label: 'Qaytarishlar', value: "1,9 mln so'm", delta: "1,0% tushumdan" },
];

const FLOW = [
  { label: 'Tushum', value: '198 400 000', pct: 100, color: 'var(--sa-blue)' },
  { label: '- Qaytarilgan pul', value: '-1 900 000', pct: 6, color: 'var(--sa-red)' },
  { label: "- To'lov tizimi komissiyasi (2%)", value: '-3 334 000', pct: 10, color: 'var(--sa-red)' },
];

const METHODS = [
  { name: 'Click', meta: '518 ta to\'lov · komissiya 2%', sum: "91,3 mln so'm", share: 46, color: '#5b7cfa' },
  { name: 'Payme', meta: "427 ta to'lov · komissiya 2%", sum: "75,4 mln so'm", share: 38, color: '#19a7a1' },
  { name: 'Naqd kuryerda', meta: "212 ta to'lov", sum: "31,7 mln so'm", share: 16, color: '#f2a33a' },
];

export default function SuperadminFinance() {
  const [range, setRange] = useState('30 kun');

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Moliya</h1>
          <p>Tushum, to'lov usullari, qaytarishlar va kuryerlardagi naqd.</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost">Excel eksport</button>
      </div>

      <div className="sa-tabs">
        {RANGES.map((r) => (
          <button key={r} type="button" className={`sa-tab${range === r ? ' is-active' : ''}`} onClick={() => setRange(r)}>
            {r}
          </button>
        ))}
      </div>

      <div className="sa-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{s.value}</div>
            <div className={`sa-stat__delta${s.up ? ' is-up' : ''}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Pul qayerdan keldi va qayerga ketdi</div>
            <span className="sa-panel__sub">so'm</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FLOW.map((f) => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                  <span>{f.label}</span>
                  <b>{f.value}</b>
                </div>
                <div className="sa-progress">
                  <div className="sa-progress__fill" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">To'lov usullari</div>
            <span className="sa-panel__sub">ulushi</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {METHODS.map((m) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)' }}>
                <span style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: m.color }} />
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5 }}>{m.name}</b>
                  <div className="sa-table__sub">{m.meta}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{m.sum}</b>
                  <div className="sa-table__sub">{m.share}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
