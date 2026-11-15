import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlarmClock, Factory, ShoppingBag, Wallet } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi, ordersApi, ORDER_STATUS, formatDateTime } from '../../../features/platform/platformApi';
import { useCompactNumber, useDayLabel, useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';
import RangePicker, { RANGES, rangeParams, todayKey } from '../RangePicker';
import { CountUp, Kpi, TrendChart } from '../ui';

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const METRICS = [
  ['count', 'Buyurtmalar soni'],
  ['revenue', "Tushum (so'm)"],
];

const openOrderUrl = (code) => `/superadmin/orders?search=${encodeURIComponent(code)}`;

/** Bosh sahifa: 4 ta asosiy ko'rsatkich, kunlik grafik va so'nggi buyurtmalar */
export default function SuperadminDashboard() {
  const money = useMoney();
  const compact = useCompactNumber();
  const dayLabel = useDayLabel();
  const { t } = useLang();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState(() => RANGES.find((r) => r.days === loadAdminPrefs().dashboardDays) ?? RANGES[2]);
  // ikkala sana tanlansa — tezkor tugmalar o'rniga shu oraliq so'raladi
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metric, setMetric] = useState('count');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(null);

  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const now = new Date();
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
  }, [range, from, to, badRange]);

  useEffect(() => {
    let active = true;
    ordersApi
      .list({ limit: 6 })
      .then((d) => active && setRecent(d.items))
      .catch(() => active && setRecent([]));
    return () => {
      active = false;
    };
  }, []);

  const deltaHint = (pct) =>
    pct === null || pct === undefined ? t('Tanlangan davr uchun') : t('{pct}% oldingi davrga nisbatan', { pct: `${pct > 0 ? '+' : ''}${pct}` });
  const tone = (pct) => (pct > 0 ? 'up' : pct < 0 ? 'down' : undefined);

  const isRevenue = metric === 'revenue';
  const format = isRevenue ? money : (n) => t('{n} ta', { n: Math.round(n) });
  const today = todayKey();
  const points = (stats?.dailyTrend ?? []).map((d) => ({
    key: d.date,
    label: dayLabel(d.date),
    value: isRevenue ? d.revenue ?? 0 : d.count,
    today: d.date === today,
  }));
  const total = points.reduce((s, p) => s + p.value, 0);
  const best = points.reduce((top, p) => (p.value > (top?.value ?? 0) ? p : top), null);
  const late = stats?.lateCount ?? 0;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xayrli kun, {name}', { name })}</h1>
          <p>{t(WEEKDAYS[now.getDay()])}, {now.getDate()}-{t(MONTHS[now.getMonth()])}</p>
        </div>
        <RangePicker range={range} onRange={setRange} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {badRange && <div className="form-error">{t("Boshlanish sanasi tugash sanasidan keyin bo'lmasligi kerak")}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="sa-kpis" aria-busy={loading}>
        <Kpi
          icon={ShoppingBag}
          label={t('Buyurtmalar')}
          value={<CountUp value={stats?.ordersCount ?? 0} />}
          hint={deltaHint(stats?.ordersDeltaPct)}
          tone={tone(stats?.ordersDeltaPct)}
        />
        <Kpi
          icon={Wallet}
          label={t('Tushum')}
          value={<CountUp value={stats?.revenue ?? 0} format={money} />}
          hint={deltaHint(stats?.revenueDeltaPct)}
          tone={tone(stats?.revenueDeltaPct)}
          color="var(--sa-teal)"
          delay={70}
        />
        <Kpi
          icon={Factory}
          label={t('Hozir sexlarda')}
          value={<CountUp value={stats?.activeCount ?? 0} />}
          hint={
            stats?.capacity
              ? t("Sexlar sig'imi {b} dona · {pct}% band", { b: stats.capacity, pct: stats.loadPct })
              : t("Sexlar sig'imi kiritilmagan")
          }
          color="var(--sa-violet)"
          delay={140}
        />
        <Kpi
          icon={AlarmClock}
          label={t('Kechikayotgan')}
          value={<CountUp value={late} />}
          hint={late > 0 ? t("Qabul qilinganiga 21 soatdan oshgan, hali tayyor emas") : t("Hammasi o'z vaqtida")}
          tone={late > 0 ? 'down' : 'up'}
          color="var(--sa-green)"
          alert={late > 0}
          delay={210}
        />
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div className="sa-panel__title">{t(isRevenue ? 'Kunlik tushum' : 'Kunlik buyurtmalar')}</div>
              <div className="sa-panel__sub">{custom ? `${dayLabel(from)} — ${dayLabel(to)}` : t(range.label)}</div>
            </div>
            <div className="sa-tabs" style={{ marginBottom: 0 }}>
              {METRICS.map(([key, label]) => (
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
          <div className="sa-facts">
            <div>
              <span>{t('Jami')}</span>
              <b>{format(total)}</b>
            </div>
            <div>
              <span>{t("Kuniga o'rtacha")}</span>
              <b>{format(points.length ? total / points.length : 0)}</b>
            </div>
            <div>
              <span>{t('Eng yuqori kun')}</span>
              <b>{best ? `${best.label} · ${format(best.value)}` : '—'}</b>
            </div>
          </div>
          {/* key: davr yoki ko'rsatkich almashganda ustunlar qaytadan ko'tariladi */}
          <TrendChart
            key={`${metric}-${points[0]?.key}-${points.length}`}
            points={points}
            format={format}
            tick={isRevenue ? compact : (n) => String(Math.round(n))}
            empty={loading ? t('Yuklanmoqda...') : t("Bu davrda buyurtma yo'q")}
          />
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("So'nggi buyurtmalar")}</div>
            <Link className="sa-panel__link" to="/superadmin/orders">{t('Barchasi →')}</Link>
          </div>
          {recent === null ? (
            <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>
          ) : recent.length === 0 ? (
            <div className="sa-chart-empty">{t('Buyurtma topilmadi')}</div>
          ) : (
            <div className="sa-feed">
              {recent.map((o) => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'blue' };
                return (
                  <div
                    key={o.id}
                    className="sa-feed__row"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(openOrderUrl(o.code))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(openOrderUrl(o.code))}
                  >
                    <div className="sa-feed__who">
                      <b>{o.customerName}</b>
                      <span>{o.code} · {formatDateTime(o.createdAt)}</span>
                    </div>
                    <div className="sa-feed__sum">
                      <b>{money(o.totalSum)}</b>
                      <span className={`sa-badge sa-badge--${st.color}`}>{t(st.label)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
