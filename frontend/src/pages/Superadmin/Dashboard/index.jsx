import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi, ordersApi, ORDER_STATUS, formatDateTime } from '../../../features/platform/platformApi';
import { useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';

const RANGES = [
  { label: 'Bugun', days: 1 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
];

const delta = (t, pct) =>
  pct === null || pct === undefined ? null : t('{pct}% oldingi davrga nisbatan', { pct: `${pct > 0 ? '+' : ''}${pct}` });

const openOrderUrl = (code) => `/superadmin/orders?search=${encodeURIComponent(code)}`;

export default function SuperadminDashboard() {
  const money = useMoney();
  const { t, locale } = useLang();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState(() => RANGES.find((r) => r.days === loadAdminPrefs().dashboardDays) ?? RANGES[2]);
  // ikkala sana tanlansa — tezkor tugmalar o'rniga shu oraliq so'raladi
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metric, setMetric] = useState('count');
  const [hover, setHover] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(null);
  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  const now = new Date();
  const today = `${t(WEEKDAYS[now.getDay()])}, ${now.getDate()}-${t(MONTHS[now.getMonth()])}`;
  const todayKey = now.toISOString().slice(0, 10); // backend kunlarni UTC bo'yicha guruhlaydi
  const custom = Boolean(from && to);
  const badRange = custom && from > to;

  useEffect(() => {
    if (badRange) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    dashboardApi
      .get(custom ? { from, to } : { days: range.days })
      .then((d) => active && setStats(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, custom, from, to, badRange]);

  useEffect(() => {
    let active = true;
    ordersApi
      .list({ limit: 5 })
      .then((d) => active && setRecent(d.items))
      .catch(() => active && setRecent([]));
    return () => {
      active = false;
    };
  }, []);

  const bars = stats?.dailyTrend ?? [];
  const value = (b) => (metric === 'revenue' ? b.revenue ?? 0 : b.count);
  const maxBar = Math.max(1, ...bars.map(value));
  const total = bars.reduce((s, b) => s + value(b), 0);
  const avg = bars.length ? Math.round(total / bars.length) : 0;
  const fmt = (n) => (metric === 'revenue' ? money(n) : n);
  // 30+ kunda har bir sanani yozsak bir-biriga yopishadi — taxminan 10 ta yorliq qoldiramiz
  const labelStep = Math.max(1, Math.ceil(bars.length / 10));
  const dayLabel = (iso) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const STATS = stats
    ? [
        { label: t('Buyurtmalar'), value: String(stats.ordersCount), delta: delta(t, stats.ordersDeltaPct), up: stats.ordersDeltaPct > 0 },
        { label: t('Tushum'), value: money(stats.revenue), delta: delta(t, stats.revenueDeltaPct), up: stats.revenueDeltaPct > 0 },
        {
          label: t('Sexdagi yuk'),
          value: stats.loadPct !== null ? `${stats.loadPct}%` : '—',
          delta: stats.capacity ? t('{a} / {b} dona', { a: stats.activeCount, b: stats.capacity }) : t("Sig'im kiritilmagan"),
        },
        { label: t('Kechikayotgan'), value: String(stats.lateCount), delta: t('muddatga 3 soatdan kam'), up: stats.lateCount === 0 },
      ]
    : [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xayrli kun, {name}', { name })}</h1>
          <p>{today} · {t('barcha tizimlar kuzatuvda')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="sa-tabs" style={{ marginBottom: 0 }}>
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                className={`sa-tab${!custom && range.label === r.label ? ' is-active' : ''}`}
                onClick={() => {
                  setFrom('');
                  setTo('');
                  setRange(r);
                }}
              >
                {t(r.label)}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="sa-input"
            style={{ width: 'auto' }}
            aria-label={t('Boshlanish sanasi')}
            title={t('Boshlanish sanasi')}
            value={from}
            max={to || todayKey}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className="sa-input"
            style={{ width: 'auto' }}
            aria-label={t('Tugash sanasi')}
            title={t('Tugash sanasi')}
            value={to}
            min={from || undefined}
            max={todayKey}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {badRange && <div className="form-error">{t("Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak")}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="sa-stats">
        {(loading ? Array.from({ length: 4 }) : STATS).map((s, i) => (
          <div key={s?.label ?? i} className="sa-stat">
            <div className="sa-stat__label">{s?.label ?? '···'}</div>
            <div className="sa-stat__value">{loading ? '···' : s.value}</div>
            {!loading && s.delta && (
              <div className={`sa-stat__delta${s.up === true ? ' is-up' : s.up === false ? ' is-down' : ''}`}>{s.delta}</div>
            )}
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div>
              <div className="sa-panel__title">
                {t(metric === 'revenue' ? 'Tushum' : 'Buyurtmalar')} · {custom ? `${dayLabel(from)} — ${dayLabel(to)}` : t(range.label)}
              </div>
              <div className="sa-panel__sub">{t("jami {total} · o'rtacha kuniga {avg}", { total: fmt(total), avg: fmt(avg) })}</div>
            </div>
            <div className="sa-tabs" style={{ marginBottom: 0 }}>
              {[
                ['count', 'Buyurtmalar soni'],
                ['revenue', "Tushum (so'm)"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`sa-tab${metric === key ? ' is-active' : ''}`}
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
          {bars.length === 0 ? (
            <div className="sa-table__sub" style={{ padding: '24px 0', textAlign: 'center' }}>
              {loading ? t('Yuklanmoqda...') : t("Bu davrda buyurtma yo'q")}
            </div>
          ) : (
            <>
              <div className="sa-bars" onMouseLeave={() => setHover(null)}>
                {bars.map((b, i) => (
                  <div
                    key={b.date}
                    className="sa-bars__item"
                    onMouseEnter={() => setHover(i)}
                    aria-label={`${dayLabel(b.date)}: ${t('{n} ta', { n: b.count })}, ${money(b.revenue ?? 0)}`}
                  >
                    {hover === i && (
                      <div className={`sa-bars__tip${i > bars.length / 2 ? ' is-left' : ''}`} role="tooltip">
                        <b>{dayLabel(b.date)}</b>
                        <span>{t('Buyurtmalar')}: {b.count}</span>
                        <span>{t('Tushum')}: {money(b.revenue ?? 0)}</span>
                      </div>
                    )}
                    <div
                      className={`sa-bars__col${b.date === todayKey ? ' is-today' : ''}`}
                      style={{ height: `${(value(b) / maxBar) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="sa-bars__axis">
                {bars.map((b, i) => (
                  <span key={b.date}>{i % labelStep === 0 ? dayLabel(b.date) : ''}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("So'nggi buyurtmalar")}</div>
            <a className="sa-panel__link" href="/superadmin/orders">{t('Barchasi →')}</a>
          </div>
          {recent === null ? (
            <div className="sa-table__sub" style={{ padding: '8px 0' }}>{t('Yuklanmoqda...')}</div>
          ) : recent.length === 0 ? (
            <div className="sa-table__sub" style={{ padding: '8px 0' }}>{t('Buyurtma topilmadi')}</div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>{t('Raqam')}</th>
                    <th>{t('Mijoz')}</th>
                    <th>{t('Summa')}</th>
                    <th>{t('Status')}</th>
                    <th>{t('Sana')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => {
                    const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'blue' };
                    return (
                      <tr
                        key={o.id}
                        role="link"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(openOrderUrl(o.code))}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(openOrderUrl(o.code))}
                      >
                        <td><b>{o.code}</b></td>
                        <td>{o.customerName}</td>
                        <td>{money(o.totalSum)}</td>
                        <td><span className={`sa-badge sa-badge--${st.color}`}>{t(st.label)}</span></td>
                        <td>{formatDateTime(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="sa-panel">
        <div className="sa-panel__head">
          <div className="sa-panel__title">{t("So'nggi muhim amallar")}</div>
          <a className="sa-panel__link" href="/superadmin/audit-log">{t("Audit jurnali →")}</a>
        </div>
        <div className="sa-table__sub" style={{ padding: '8px 0' }}>
          {t("To'liq ro'yxat Audit jurnali sahifasida.")}
        </div>
      </div>
    </>
  );
}
