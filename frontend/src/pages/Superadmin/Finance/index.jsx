import { useEffect, useState } from 'react';
import { financeApi, PAYMENT_METHOD } from '../../../features/platform/platformApi';
import { downloadCsv } from '../../../utils/csvExport';
import { useT, useMoney } from '../i18n';

const RANGES = [
  { label: 'Bugun', days: 1 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
];

const METHOD_COLOR = { CLICK: '#5b7cfa', PAYME: '#19a7a1', CASH: '#f2a33a' };

export default function SuperadminFinance() {
  const money = useMoney();
  const t = useT();
  const [range, setRange] = useState(RANGES[2]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    financeApi
      .get(range.days)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const byMethod = data?.byMethod ?? {};
  const methods = Object.entries(byMethod);
  const totalByMethod = methods.reduce((s, [, m]) => s + m.sum, 0);

  const exportCsv = () => {
    downloadCsv(
      `moliya-${range.days}kun-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t("To'lov usuli"), ([method]) => t(PAYMENT_METHOD[method] ?? method)],
        [t('Soni'), ([, m]) => m.count],
        [t("Summa (so'm)"), ([, m]) => m.sum],
        [t('Ulushi (%)'), ([, m]) => (totalByMethod ? Math.round((m.sum / totalByMethod) * 100) : 0)],
      ],
      methods,
    );
  };

  const STATS = data
    ? [
        { label: t('Tushum'), value: money(data.revenue), delta: t('{pct}% oldingi davrga', { pct: `${data.revenueDeltaPct > 0 ? '+' : ''}${data.revenueDeltaPct}` }) },
        { label: t('Qaytarishlar'), value: money(data.refunded), delta: data.revenue ? t('{pct}% tushumdan', { pct: Math.round((data.refunded / (data.revenue || 1)) * 1000) / 10 }) : '—' },
      ]
    : [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Moliya")}</h1>
          <p>{t("Tushum, to'lov usullari va qaytarishlar.")}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!methods.length}>{t("Excel eksport")}</button>
      </div>

      <div className="sa-tabs">
        {RANGES.map((r) => (
          <button key={r.label} type="button" className={`sa-tab${range.label === r.label ? ' is-active' : ''}`} onClick={() => setRange(r)}>
            {t(r.label)}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {(loading ? Array.from({ length: 2 }) : STATS).map((s, i) => (
          <div key={s?.label ?? i} className="sa-stat">
            <div className="sa-stat__label">{s?.label ?? '···'}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
            {!loading && <div className="sa-stat__delta">{s.delta}</div>}
          </div>
        ))}
      </div>

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div className="sa-panel__title">{t("To'lov usullari")}</div>
          <span className="sa-panel__sub">{t("ulushi")}</span>
        </div>
        {methods.length === 0 ? (
          <div className="sa-table__sub" style={{ padding: '12px 0' }}>
            {loading ? t('Yuklanmoqda...') : t("Bu davrda to'lov yo'q")}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {methods.map(([method, m]) => (
              <div key={method} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)' }}>
                <span style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: METHOD_COLOR[method] ?? '#888' }} />
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5 }}>{t(PAYMENT_METHOD[method] ?? method)}</b>
                  <div className="sa-table__sub">{t("{n} ta to'lov", { n: m.count })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{money(m.sum)}</b>
                  <div className="sa-table__sub">{totalByMethod ? Math.round((m.sum / totalByMethod) * 100) : 0}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
