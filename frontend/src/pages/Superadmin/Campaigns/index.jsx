import { useState } from 'react';

const STATS = [
  { label: 'Yuborilgan xabarlar', value: '6 430', sub: 'sentabr' },
  { label: "O'rtacha ochilish", value: '45,0%', sub: 'faqat push' },
  { label: 'Kampaniyadan buyurtma', value: '174', sub: '2,7% konversiya' },
  { label: 'Tushum', value: '30,7 mln', sub: "so'm" },
];

const TABS = ['Barchasi · 5', 'Faol va rejalashtirilgan · 2', 'Yakunlangan · 2', 'Qoralamalar · 1'];

const CAMPAIGNS = [
  {
    name: 'Savatni unutdingiz', status: 'Faol · avtomatik', color: 'green',
    to: 'Savatda qoldirganlar · 7 kun', channel: 'Push', when: 'Har kuni 19:00',
    text: '«Madina, formangiz savatda kutmoqda. Bugun buyurtma bersangiz ertaga yetkazamiz.»',
    metrics: { yuborildi: '388 kishi', ochildi: '201 · 51,8%', buyurtma: '37 · 9,5%', tushum: '6,5 mln' },
  },
  {
    name: 'Ota-bola forma', status: 'Rejalashtirilgan', color: 'orange',
    to: "Bolalar o'lchamini olganlar · 5 130 kishi", channel: 'Push + SMS', when: '1-okt 10:00',
    text: '«Ikki forma — bitta raqam! DUO15 bilan 15% chegirma.»',
    metrics: null,
  },
  {
    name: 'VIP mijozlarga minnatdorchilik', status: 'Yakunlangan', color: 'blue',
    to: '3+ buyurtma qilganlar · 640 kishi', channel: 'SMS', when: '15-sen 09:00',
    text: '«Rahmat! Keyingi buyurtmangizga FORMO10 kodi bilan 10% chegirma.»',
    metrics: { yuborildi: '640 kishi', ochildi: '—', buyurtma: '58 · 9,1%', tushum: '11,2 mln' },
  },
];

export default function SuperadminCampaigns() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Kampaniyalar</h1>
          <p>Mijozlarga push va SMS xabarlar. Kampaniyani bosib tahrirlang yoki natijasini ko'ring.</p>
        </div>
        <button type="button" className="sa-btn">+ Kampaniya</button>
      </div>

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{s.value}</div>
            <div className="sa-stat__delta">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`sa-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CAMPAIGNS.map((c) => (
          <div key={c.name} className="sa-panel" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <b style={{ fontSize: 15 }}>{c.name}</b>
                <span className={`sa-badge sa-badge--${c.color}`}>{c.status}</span>
              </div>
              <div className="sa-table__sub" style={{ marginBottom: 6 }}>
                Kimga: <b style={{ color: 'var(--sa-ink)' }}>{c.to}</b> · Kanal: <b style={{ color: 'var(--sa-ink)' }}>{c.channel}</b> · Qachon:{' '}
                <b style={{ color: 'var(--sa-ink)' }}>{c.when}</b>
              </div>
              <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--sa-mu)' }}>{c.text}</div>
            </div>
            {c.metrics ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {Object.entries(c.metrics).map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', minWidth: 90 }}>
                    <div className="sa-table__sub" style={{ textTransform: 'capitalize' }}>{k}</div>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', color: 'var(--sa-mu)', fontSize: 12.5 }}>
                Natija yuborilgandan keyin ko'rinadi
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
