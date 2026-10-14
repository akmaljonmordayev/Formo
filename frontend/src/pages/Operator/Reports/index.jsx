import { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { workshopsApi } from '../../../features/accounts/accountsApi';
import { useT } from '../i18n';

const SAMPLE = 100; // API bitta sahifada ko'pi bilan 100 ta qaytaradi

// Oxirgi 6 oy: har oyga qo'shilgan sexlar soni
function byMonth(items, locale) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(locale, { month: 'short' }), n: 0 };
  });
  items.forEach((w) => {
    const d = new Date(w.createdAt);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.n += 1;
  });
  return months;
}

// Hisobotlar: hozircha faqat sexlar bo'yicha haqiqiy ma'lumot, buyurtma/to'lov hisobotlari modul ulanganda
export default function OperatorReports() {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      workshopsApi.list({ page: 1, limit: SAMPLE }),
      workshopsApi.list({ isActive: 'true', page: 1, limit: 1 }),
    ])
      .then(([all, active]) => !cancelled && setData({ items: all.items, total: all.total, active: active.total }))
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData({ items: [], total: 0, active: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const months = data ? byMonth(data.items, t.locale) : [];
  const max = Math.max(1, ...months.map((m) => m.n));
  const rate = data?.total ? Math.round((data.active / data.total) * 100) : null;
  const kpi = (v) => (data ? v : <span className="op-sk" style={{ width: 48, height: 32 }} />);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.reports')}</h1>
          <p>{t('rep.subtitle')}</p>
        </div>
      </div>

      {error && <div className="op-msg">{error}</div>}

      <div className="op-pay">
        <div className="op-pay-k is-c2">
          <span>{t('dash.totalPartners')}</span>
          <b>{kpi(data?.total)}</b>
        </div>
        <div className="op-pay-k is-c3">
          <span>{t('rep.thisMonth')}</span>
          <b>{kpi(months[5]?.n)}</b>
        </div>
        <div className="op-pay-k is-c4">
          <span>{t('rep.activeRate')}</span>
          <b>{kpi(rate === null ? '—' : `${rate}%`)}</b>
        </div>
      </div>

      <div className="op-g2">
        <section className="op-cd op-pd" aria-labelledby="rep-chart">
          <div className="op-cd-tt">
            <div>
              <h2 id="rep-chart">{t('rep.newByMonth')}</h2>
              <p className="op-sub">
                {t('rep.last6')}
                {data && data.total > SAMPLE && ` · ${t('rep.sample', { n: SAMPLE })}`}
              </p>
            </div>
          </div>
          <div className="op-bars">
            {(data ? months : Array.from({ length: 6 }, (_, i) => ({ key: i, label: '', n: 0 }))).map((m, i) => (
              <div key={m.key} className="op-bar" title={data ? `${m.label}: ${t('rep.count', { n: m.n })}` : undefined}>
                <b>{data ? m.n : ''}</b>
                <span className={i === 5 ? 'is-now' : undefined} style={{ height: `${(m.n / max) * 100}%` }} />
                <small>{m.label}</small>
              </div>
            ))}
          </div>
          {data && (
            <table className="op-vh">
              <caption>{t('rep.newByMonth')}</caption>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key}>
                    <th scope="row">{m.label}</th>
                    <td>{m.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="op-cd op-pd op-lav" aria-labelledby="rep-orders">
          <span className="op-eyebrow">{t('dash.notConnected')}</span>
          <h2 id="rep-orders">{t('rep.ordersRep')}</h2>
          <p>{t('rep.ordersRepHint')}</p>
          <FileBarChart size={40} strokeWidth={1.5} aria-hidden="true" style={{ color: 'var(--op-lav)' }} />
        </section>
      </div>
    </>
  );
}
