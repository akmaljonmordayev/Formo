import { useEffect, useState } from 'react';
import { reportsApi } from '../../../features/platform/platformApi';
import { downloadCsv } from '../../../utils/csvExport';
import { useT, useMoney } from '../i18n';

const RANGES = [
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
  { label: '90 kun', days: 90 },
];

const PRODUCT_LABEL = { CLUB_KIT: 'Klub formalari', CUSTOM_DESIGN: "O'z dizayni", KIT_DESIGN: '3D dizayn' };
const PRODUCT_COLOR = { CLUB_KIT: 'var(--sa-blue)', CUSTOM_DESIGN: 'var(--sa-teal)', KIT_DESIGN: 'var(--sa-violet)' };

export default function SuperadminReports() {
  const money = useMoney();
  const t = useT();
  const [range, setRange] = useState(RANGES[1]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    reportsApi
      .get(range.days)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const byProductType = data?.byProductType ?? {};
  const total = Object.values(byProductType).reduce((s, v) => s + v, 0);
  const breakdown = Object.entries(byProductType).map(([type, sum]) => ({
    label: PRODUCT_LABEL[type] ? t(PRODUCT_LABEL[type]) : type,
    color: PRODUCT_COLOR[type] ?? 'var(--sa-accent)',
    pct: total ? Math.round((sum / total) * 100) : 0,
    sum,
  }));

  const exportCsv = () => {
    downloadCsv(
      `hisobot-${range.days}kun-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t('Mahsulot turi'), (r) => r.label],
        [t("Summa (so'm)"), (r) => r.sum],
        [t('Ulushi (%)'), (r) => r.pct],
      ],
      breakdown,
    );
  };

  const STATS = data
    ? [
        { label: t('Tushum'), value: money(data.revenue), delta: `${data.revenueDeltaPct > 0 ? '+' : ''}${data.revenueDeltaPct}%`, up: data.revenueDeltaPct > 0 },
        { label: t('Buyurtmalar'), value: String(data.ordersCount), delta: `${data.ordersDeltaPct > 0 ? '+' : ''}${data.ordersDeltaPct}%`, up: data.ordersDeltaPct > 0 },
        { label: t("O'rtacha chek"), value: money(data.avgCheck), delta: '' },
      ]
    : [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Hisobotlar")}</h1>
          <p>{t("Tushum va mahsulot turlari bo'yicha taqsimot")} · {t(range.label)}.</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!breakdown.length}>{t("Excel eksport")}</button>
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
        {(loading ? Array.from({ length: 3 }) : STATS).map((s, i) => (
          <div key={s?.label ?? i} className="sa-stat">
            <div className="sa-stat__label">{s?.label ?? '···'}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
            {!loading && s.delta && (
              <div className={`sa-stat__delta${s.up ? ' is-up' : ''}`}>{s.delta}</div>
            )}
          </div>
        ))}
      </div>

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div className="sa-panel__title">{t("Tushum tarkibi")}</div>
          <span className="sa-panel__sub">{t("so'm")}</span>
        </div>
        {breakdown.length === 0 ? (
          <div className="sa-table__sub" style={{ padding: '12px 0' }}>
            {loading ? t('Yuklanmoqda...') : t("Bu davrda tushum yo'q")}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
              {breakdown.map((r) => (
                <span key={r.label} style={{ width: `${r.pct}%`, background: r.color }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breakdown.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color }} />
                  <span style={{ flex: 1 }}>{r.label}</span>
                  <span style={{ color: 'var(--sa-mu)' }}>{r.pct}%</span>
                  <b style={{ minWidth: 70, textAlign: 'right' }}>{money(r.sum)}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div className="sa-panel__title">{t("Mijoz yo'li")}</div>
          <span className="sa-panel__sub">{t("ilovaga kirgandan to'lovgacha")}</span>
        </div>
        <div className="sa-table__sub" style={{ padding: '8px 0' }}>
          {t("Konversiya voronkasi uchun ilovada foydalanuvchi hodisalarini yozib borish kerak — bu analitika tizimi hali ulanmagan.")}
        </div>
      </div>
    </>
  );
}
