import { useEffect, useState } from 'react';
import { analyticsApi, reportsApi } from '../../../features/platform/platformApi';
import { downloadCsv } from '../../../utils/csvExport';
import { useT, useMoney } from '../i18n';

const RANGES = [
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
  { label: '90 kun', days: 90 },
];

const PRODUCT_LABEL = { CLUB_KIT: 'Klub formalari', CUSTOM_DESIGN: "O'z dizayni", KIT_DESIGN: '3D dizayn' };
const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const PRODUCT_COLOR = { CLUB_KIT: 'var(--sa-blue)', CUSTOM_DESIGN: 'var(--sa-teal)', KIT_DESIGN: 'var(--sa-violet)' };

export default function SuperadminReports() {
  const money = useMoney();
  const t = useT();
  const [range, setRange] = useState(RANGES[1]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sales, setSales] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    analyticsApi
      .kitSales({ days: range.days })
      .then((d) => active && setSales(d))
      .catch((e) => active && setError(e.message));
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

  // Formalar bo'yicha sotuv; ro'yxatda yo'q o'lchamlar (bolalar va h.k.) "Boshqa" ustuniga yig'iladi
  const kitSales = (sales?.kits ?? []).map((k) => ({
    ...k,
    name: k.name || t(PRODUCT_LABEL[k.type] ?? "O'z dizayni"),
    other: Object.entries(k.sizes).reduce((s, [size, n]) => (SIZES.includes(size) ? s : s + n), 0),
  }));
  const hasOther = kitSales.some((k) => k.other > 0);
  const sizeTotal = (size) => kitSales.reduce((s, k) => s + (k.sizes[size] ?? 0), 0);
  const soldTotal = sales?.totalQuantity ?? 0;
  const topSize = SIZES.reduce((top, size) => (sizeTotal(size) > sizeTotal(top) ? size : top), SIZES[0]);

  // Tikuvchi statistikasidagi kabi ikki reyting: eng ko'p sotilgan formalar va o'lchamlar
  const RANKS = [
    { title: "Eng ko'p sotilgan formalar", color: 'var(--sa-blue)', rows: kitSales.slice(0, 8).map((k) => [k.name, k.quantity]) },
    { title: "O'lchamlar bo'yicha", color: 'var(--sa-teal)', rows: (sales?.sizes ?? []).map((s) => [s.size, s.quantity]) },
  ];

  const exportKits = () => {
    downloadCsv(
      `formalar-sotuvi-${range.days}kun-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t('Forma'), (k) => k.name],
        ...SIZES.map((size) => [size, (k) => k.sizes[size] ?? 0]),
        [t('Boshqa'), (k) => k.other],
        [t('Jami (dona)'), (k) => k.quantity],
        [t("Summa (so'm)"), (k) => k.revenue],
      ],
      kitSales,
    );
  };

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
        { label: t('Daromad'), value: money(data.revenue), delta: `${data.revenueDeltaPct > 0 ? '+' : ''}${data.revenueDeltaPct}%`, up: data.revenueDeltaPct > 0 },
        { label: t('Buyurtmalar'), value: String(data.ordersCount), delta: `${data.ordersDeltaPct > 0 ? '+' : ''}${data.ordersDeltaPct}%`, up: data.ordersDeltaPct > 0 },
      ]
    : [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Analitika")}</h1>
          <p>{t("Qaysi forma va qaysi o'lcham ko'p sotilyapti")} · {t(range.label)}.</p>
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
          <div className="sa-panel__title">{t("Daromad tarkibi")}</div>
          <span className="sa-panel__sub">{t("so'm")}</span>
        </div>
        {breakdown.length === 0 ? (
          <div className="sa-table__sub" style={{ padding: '12px 0' }}>
            {loading ? t('Yuklanmoqda...') : t("Bu davrda daromad yo'q")}
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

      <div className="sa-grid-2">
        {RANKS.map(({ title, color, rows }) => (
          <div key={title} className="sa-panel">
            <div className="sa-panel__head">
              <div className="sa-panel__title">{t(title)}</div>
              <span className="sa-panel__sub">{t('Tanlangan davrda, dona')}</span>
            </div>
            {rows.length === 0 ? (
              <div className="sa-table__sub" style={{ padding: '12px 0' }}>
                {loading ? t('Yuklanmoqda...') : t("Bu davrda forma sotilmagan")}
              </div>
            ) : (
              <div className="sa-rows">
                {rows.map(([label, n]) => (
                  <div key={label}>
                    <div className="sa-row__top">
                      <b>{label}</b>
                      <b>
                        {n}
                        <span> · {Math.round((n / soldTotal) * 100)}%</span>
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

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div>
            <div className="sa-panel__title">{t('Formalar sotuvi')}</div>
            <div className="sa-panel__sub">
              {soldTotal > 0
                ? t("Jami {n} dona sotildi. Eng ko'p ketgan o'lcham: {size}", { n: soldTotal, size: topSize })
                : t("Qaysi forma nechta va qaysi o'lchamda sotilgani")}
            </div>
          </div>
          <button type="button" className="sa-btn sa-btn--ghost" onClick={exportKits} disabled={!kitSales.length}>CSV</button>
        </div>
        {kitSales.length === 0 ? (
          <div className="sa-table__sub" style={{ padding: '12px 0' }}>
            {loading ? t('Yuklanmoqda...') : t("Bu davrda forma sotilmagan")}
          </div>
        ) : (
          <div className="sa-table-wrap" style={{ border: 'none', background: 'transparent' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>{t('Forma')}</th>
                  {SIZES.map((size) => (
                    <th key={size} style={{ textAlign: 'right' }}>{size}</th>
                  ))}
                  {hasOther && <th style={{ textAlign: 'right' }}>{t('Boshqa')}</th>}
                  <th style={{ textAlign: 'right' }}>{t('Jami (dona)')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Summa')}</th>
                </tr>
              </thead>
              <tbody>
                {kitSales.map((k, i) => (
                  <tr key={`${k.type}-${k.name}-${i}`}>
                    <td className="sa-table__sub">{i + 1}</td>
                    <td>
                      <b>{k.name}</b>
                      {k.type !== 'CLUB_KIT' && k.name !== t(PRODUCT_LABEL[k.type]) && (
                        <span className="sa-table__sub">{t(PRODUCT_LABEL[k.type])}</span>
                      )}
                    </td>
                    {SIZES.map((size) => (
                      <td key={size} style={{ textAlign: 'right', color: k.sizes[size] ? undefined : 'var(--sa-mu-2)' }}>{k.sizes[size] ?? '—'}</td>
                    ))}
                    {hasOther && <td style={{ textAlign: 'right' }}>{k.other || '—'}</td>}
                    <td style={{ textAlign: 'right' }}><b>{k.quantity}</b></td>
                    <td style={{ textAlign: 'right' }}>{money(k.revenue)}</td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td><b>{t('Jami')}</b></td>
                  {SIZES.map((size) => (
                    <td key={size} style={{ textAlign: 'right' }}><b>{sizeTotal(size)}</b></td>
                  ))}
                  {hasOther && <td style={{ textAlign: 'right' }}><b>{kitSales.reduce((s, k) => s + k.other, 0)}</b></td>}
                  <td style={{ textAlign: 'right' }}><b>{soldTotal}</b></td>
                  <td style={{ textAlign: 'right' }}><b>{money(kitSales.reduce((s, k) => s + k.revenue, 0))}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
