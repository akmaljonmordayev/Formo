import { useEffect, useState } from 'react';
import { campaignsApi, money } from '../../../features/platform/platformApi';

const STATUS_LABEL = {
  DRAFT: { label: 'Qoralama', color: 'blue' },
  SCHEDULED: { label: 'Rejalashtirilgan', color: 'orange' },
  ACTIVE: { label: 'Faol', color: 'green' },
  COMPLETED: { label: 'Yakunlangan', color: 'blue' },
};
const CHANNEL_LABEL = { PUSH: 'Push', SMS: 'SMS', PUSH_SMS: 'Push + SMS' };

export default function SuperadminCampaigns() {
  const [data, setData] = useState({ items: [], totals: { sent: 0, opened: 0, orders: 0, revenue: 0 } });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    campaignsApi
      .list()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const campaigns = statusFilter ? data.items.filter((c) => c.status === statusFilter) : data.items;
  const openRate = data.totals.sent ? Math.round((data.totals.opened / data.totals.sent) * 1000) / 10 : 0;
  const convRate = data.totals.sent ? Math.round((data.totals.orders / data.totals.sent) * 1000) / 10 : 0;

  const STATS = [
    { label: 'Yuborilgan xabarlar', value: data.totals.sent.toLocaleString('uz-UZ'), sub: '' },
    { label: "O'rtacha ochilish", value: `${openRate}%`, sub: 'faqat push' },
    { label: 'Kampaniyadan buyurtma', value: String(data.totals.orders), sub: `${convRate}% konversiya` },
    { label: 'Tushum', value: money(data.totals.revenue), sub: '' },
  ];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Kampaniyalar</h1>
          <p>Mijozlarga push va SMS xabarlar. Kampaniyani bosib tahrirlang yoki natijasini ko'ring.</p>
        </div>
        <button type="button" className="sa-btn">+ Kampaniya</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
            <div className="sa-stat__delta">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="sa-tabs">
        {[
          { label: 'Barchasi', value: '' },
          { label: 'Faol', value: 'ACTIVE' },
          { label: 'Rejalashtirilgan', value: 'SCHEDULED' },
          { label: 'Yakunlangan', value: 'COMPLETED' },
          { label: 'Qoralamalar', value: 'DRAFT' },
        ].map((t) => (
          <button key={t.value} type="button" className={`sa-tab${statusFilter === t.value ? ' is-active' : ''}`} onClick={() => setStatusFilter(t.value)}>
            {t.label} · {t.value ? data.items.filter((c) => c.status === t.value).length : data.items.length}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : campaigns.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">Hali kampaniya yaratilmagan. "+ Kampaniya" bilan birinchisini qo'shing.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaigns.map((c) => {
            const st = STATUS_LABEL[c.status] ?? { label: c.status, color: 'blue' };
            const hasMetrics = c.sentCount != null;
            return (
              <div key={c.id} className="sa-panel" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <b style={{ fontSize: 15 }}>{c.name}</b>
                    <span className={`sa-badge sa-badge--${st.color}`}>{st.label}</span>
                  </div>
                  <div className="sa-table__sub" style={{ marginBottom: 6 }}>
                    Kimga: <b style={{ color: 'var(--sa-ink)' }}>{c.audience}</b> · Kanal:{' '}
                    <b style={{ color: 'var(--sa-ink)' }}>{CHANNEL_LABEL[c.channel]}</b>
                    {c.scheduledAt && (
                      <>
                        {' '}· Qachon: <b style={{ color: 'var(--sa-ink)' }}>{new Date(c.scheduledAt).toLocaleString('uz-UZ')}</b>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--sa-mu)' }}>«{c.message}»</div>
                </div>
                {hasMetrics ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      ['yuborildi', `${c.sentCount} kishi`],
                      ['ochildi', c.openedCount != null ? `${c.openedCount}` : '—'],
                      ['buyurtma', c.orderCount != null ? `${c.orderCount}` : '—'],
                      ['tushum', c.revenue != null ? money(c.revenue) : '—'],
                    ].map(([k, v]) => (
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
            );
          })}
        </div>
      )}
    </>
  );
}
