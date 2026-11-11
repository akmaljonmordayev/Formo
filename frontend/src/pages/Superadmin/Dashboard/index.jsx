import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { auditLogApi, dashboardApi, ordersApi, ORDER_STATUS, formatDateTime } from '../../../features/platform/platformApi';
import { useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';
import RangePicker, { RANGES, rangeParams, todayKey as utcToday } from '../RangePicker';

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
  const [actions, setActions] = useState(null);
  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  const now = new Date();
  const today = `${t(WEEKDAYS[now.getDay()])}, ${now.getDate()}-${t(MONTHS[now.getMonth()])}`;
  const todayKey = utcToday();
  const custom = Boolean(from && to);
  const badRange = custom && from > to;

  useEffect(() => {
    if (badRange) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    dashboardApi
      .get(rangeParams(range, from, to))
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
    auditLogApi
      .list({ limit: 5 })
      .then((d) => active && setActions(d.items))
      .catch(() => active && setActions([]));
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
        <RangePicker range={range} onRange={setRange} from={from} to={to} onFrom={setFrom} onTo={setTo} />
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
                    className={`sa-bars__item${hover === i ? ' is-active' : ''}`}
                    onMouseEnter={() => setHover(i)}
                    aria-label={`${dayLabel(b.date)}: ${t('{n} ta', { n: b.count })}, ${money(b.revenue ?? 0)}`}
                  >
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
              {/* Tanlangan kun statistikasi grafik ostida: balandligi doimiy — hover paytida karta sakramaydi */}
              <div className={`sa-bars__info${hover !== null && bars[hover] ? ' is-active' : ''}`} aria-live="polite">
                <div key={hover ?? 'hint'} className="sa-bars__info-body">
                  {hover !== null && bars[hover] ? (
                    <>
                      <b>{dayLabel(bars[hover].date)}</b>
                      <span>{t('Buyurtmalar')}: {bars[hover].count}</span>
                      <span>{t('Tushum')}: {money(bars[hover].revenue ?? 0)}</span>
                    </>
                  ) : (
                    <span>{t('Kun statistikasi uchun ustun ustiga olib boring')}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("So'nggi buyurtmalar")}</div>
            <Link className="sa-panel__link" to="/superadmin/orders">{t('Barchasi →')}</Link>
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
          <Link className="sa-panel__link" to="/superadmin/audit-log">{t("Audit jurnali →")}</Link>
        </div>
        {actions === null ? (
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>{t('Yuklanmoqda...')}</div>
        ) : actions.length === 0 ? (
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>{t('Yozuv topilmadi')}</div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>{t('Vaqt')}</th>
                  <th>{t('Kim')}</th>
                  <th>{t('Amal')}</th>
                  <th>{t('Obyekt')}</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.createdAt)}</td>
                    <td><b>{l.actorName}</b></td>
                    <td>{t(l.action)}</td>
                    <td style={{ color: 'var(--sa-mu)' }}>{l.context || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
