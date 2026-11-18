import { useEffect, useState } from 'react';
import { analyticsApi } from '../../../features/platform/platformApi';
import { downloadCsv } from '../../../utils/csvExport';
import { useT } from '../i18n';

const RANGES = [
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
  { label: '90 kun', days: 90 },
];

/**
 * Analitika — faqat ikki savolga javob: qaysi forma va qaysi o'lcham ko'p sotilyapti.
 * Daromad tarkibi va «O'z dizayni» kabi tushunarsiz guruhlar olib tashlandi.
 */
export default function SuperadminReports() {
  const t = useT();
  const [range, setRange] = useState(RANGES[1]);
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    analyticsApi
      .kitSales({ days: range.days })
      .then((d) => active && setSales(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  // Faqat nomi bor formalar (klub formalari va 3D dizaynlar) — nomsiz "o'z dizayni" guruhi ko'rsatilmaydi
  const kits = (sales?.kits ?? []).filter((k) => k.name).map((k) => ({ name: k.name, quantity: k.quantity, sizes: k.sizes }));
  const sizes = (sales?.sizes ?? []).filter((s) => s.size);
  const soldTotal = sales?.totalQuantity ?? 0;

  const RANKS = [
    { title: "Eng ko'p sotilgan formalar", color: 'var(--sa-blue)', rows: kits.map((k) => [k.name, k.quantity]) },
    { title: "Eng ko'p sotilgan o'lchamlar", color: 'var(--sa-teal)', rows: sizes.map((s) => [s.size, s.quantity]) },
  ];

  const STATS = [
    { label: t('Sotilgan formalar (dona)'), value: String(soldTotal) },
    { label: t("Eng ko'p sotilgan forma"), value: kits[0]?.name ?? '—' },
    { label: t("Eng ko'p sotilgan o'lcham"), value: sizes[0]?.size ?? '—' },
  ];

  const exportCsv = () => {
    const sizeCols = sizes.map((s) => s.size);
    downloadCsv(
      `formalar-sotuvi-${range.days}kun-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t('Forma'), (k) => k.name],
        ...sizeCols.map((size) => [size, (k) => k.sizes[size] ?? 0]),
        [t('Jami (dona)'), (k) => k.quantity],
      ],
      kits,
    );
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Analitika')}</h1>
          <p>{t("Qaysi forma va qaysi o'lcham ko'p sotilyapti")} · {t(range.label)}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!kits.length}>{t('Excel eksport')}</button>
      </div>

      <div className="sa-tabs">
        {RANGES.map((r) => (
          <button key={r.label} type="button" className={`sa-tab${range.label === r.label ? ' is-active' : ''}`} onClick={() => setRange(r)}>
            {t(r.label)}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-stats">
        {STATS.map((s) => (
          <div key={s.label} className="sa-stat">
            <div className="sa-stat__label">{s.label}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        {RANKS.map(({ title, color, rows }) => (
          <div key={title} className="sa-panel">
            <div className="sa-panel__head">
              <div className="sa-panel__title">{t(title)}</div>
              <span className="sa-panel__sub">{t('Tanlangan davrda, dona')}</span>
            </div>
            {loading || rows.length === 0 ? (
              <div className="sa-table__sub" style={{ padding: '12px 0' }}>
                {loading ? t('Yuklanmoqda...') : t('Bu davrda forma sotilmagan')}
              </div>
            ) : (
              <div className="sa-rows">
                {rows.map(([label, n], i) => (
                  <div key={label}>
                    <div className="sa-row__top">
                      <b>{i + 1}. {label}</b>
                      <b>
                        {n}
                        {soldTotal > 0 && <span> · {Math.round((n / soldTotal) * 100)}%</span>}
                      </b>
                    </div>
                    <div className="sa-meter">
                      <div className="sa-meter__fill" style={{ width: `${(n / rows[0][1]) * 100}%`, '--meter': color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
