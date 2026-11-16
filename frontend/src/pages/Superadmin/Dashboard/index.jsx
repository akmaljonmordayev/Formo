import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CreditCard, Inbox, MessagesSquare, PackageCheck, Scissors, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi, ordersApi, supportApi, topupsApi, ORDER_STATUS, formatDateTime } from '../../../features/platform/platformApi';
import { useCompactNumber, useDayLabel, useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';
import RangePicker, { RANGES, rangeParams, todayKey } from '../RangePicker';
import { CountUp, Kpi, TrendChart } from '../ui';

const BASE = '/superadmin';
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const METRICS = [
  ['count', 'Buyurtmalar soni'],
  ['revenue', "Daromad (so'm)"],
];
// "Hozir" bloki (ish navbati va buyurtmalar yo'li) shu oraliqda jim yangilanadi
const NOW_REFRESH_MS = 30_000;

// Buyurtma yo'li: faol buyurtmalar hozir qaysi bosqichda turgani (chapdan o'ngga)
const FLOW = [
  { label: 'Yangi', hint: 'Sexga yuborilmagan', statuses: ['NEW'], icon: Inbox, color: 'var(--sa-accent)', to: `${BASE}/orders?status=NEW` },
  { label: 'Sexda', hint: 'Qabul qilingan', statuses: ['SENT_TO_WORKSHOP', 'ACCEPTED', 'PRINTING'], icon: Scissors, color: 'var(--sa-blue)', to: `${BASE}/orders?status=ACCEPTED` },
  { label: 'Tayyor', hint: 'Yetkazishni kutmoqda', statuses: ['READY'], icon: PackageCheck, color: 'var(--sa-teal)', to: `${BASE}/orders?status=READY` },
  { label: 'Yetkazishda', hint: "Mijozga yo'lda", statuses: ['DELIVERING'], icon: Truck, color: 'var(--sa-violet)', to: `${BASE}/orders?status=DELIVERING` },
];

// Holat ham beriladi — Buyurtmalar sahifasi aynan shu buyurtma turgan tabni ochadi
const openOrderUrl = (o) => `${BASE}/orders?search=${encodeURIComponent(o.code)}&status=${o.status}`;

/** Ish navbati kartasi: nechta ish kutayotgani; bosilsa o'sha sahifa ochiladi. 0 bo'lsa — tinch ko'rinish */
function Todo({ to, icon: Icon, label, count, hint, done, color }) {
  const waiting = count > 0;
  return (
    <Link to={to} className={`sa-todo${waiting ? ' is-waiting' : ''}`} style={{ '--todo': color }}>
      <span className="sa-todo__icon">
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="sa-todo__body">
        <span className="sa-todo__label">{label}</span>
        <span className="sa-todo__hint">{waiting ? hint : done}</span>
      </span>
      <b className="sa-todo__count">{count ?? '—'}</b>
    </Link>
  );
}

/** Bosh sahifa: tepada — hozir nima kutayotgani, pastda — tanlangan davr bo'yicha savdo */
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
  // Hozirgi holat: so'nggi buyurtmalar, holatlar bo'yicha sonlar, tekshiruvdagi cheklar, o'qilmagan xabarlar
  const [recent, setRecent] = useState(null);
  const [byStatus, setByStatus] = useState(null);
  const [receipts, setReceipts] = useState(null);
  const [unread, setUnread] = useState(null);

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

  // Har biri alohida: bittasi xato bersa qolganlari ko'rinaveradi (o'rnida "—" qoladi)
  const loadNow = useCallback(() => {
    ordersApi
      .list({ limit: 6 })
      .then((d) => {
        setRecent(d.items);
        setByStatus(d.byStatus ?? {});
      })
      .catch(() => setRecent((r) => r ?? []));
    topupsApi
      .list({ status: 'REVIEW', limit: 1 })
      .then((d) => setReceipts(d.byStatus?.REVIEW ?? 0))
      .catch(() => {});
    supportApi
      .unread()
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNow();
    const id = setInterval(() => document.visibilityState === 'visible' && loadNow(), NOW_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadNow]);

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
  const countOf = (statuses) => (byStatus ? statuses.reduce((s, key) => s + (byStatus[key] ?? 0), 0) : null);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xayrli kun, {name}', { name })}</h1>
          <p>{t(WEEKDAYS[now.getDay()])}, {now.getDate()}-{t(MONTHS[now.getMonth()])}</p>
        </div>
      </div>

      {/* 1. Hozir: sizdan ish kutayotgan narsalar — davr tanloviga bog'liq emas */}
      <div className="sa-section">
        <h2>{t('Sizni kutayotgan ishlar')}</h2>
      </div>
      <div className="sa-todos">
        <Todo
          to={`${BASE}/orders?status=NEW`}
          icon={ShoppingBag}
          label={t('Yangi buyurtmalar')}
          count={countOf(['NEW'])}
          hint={t('Sexga yuborish kerak')}
          done={t("Yangi buyurtma yo'q")}
          color="var(--sa-accent)"
        />
        <Todo
          to={`${BASE}/topups`}
          icon={CreditCard}
          label={t("To'lov cheklari")}
          count={receipts}
          hint={t('Tekshirib, tasdiqlash kerak')}
          done={t("Tekshiriladigan chek yo'q")}
          color="var(--sa-teal)"
        />
        <Todo
          to={`${BASE}/messages`}
          icon={MessagesSquare}
          label={t('Javobsiz xabarlar')}
          count={unread}
          hint={t('Mijozlar javob kutmoqda')}
          done={t("Hammasiga javob berilgan")}
          color="var(--sa-blue)"
        />
      </div>

      {/* 2. Savdo: tanlangan davr bo'yicha */}
      <div className="sa-section">
        <h2>{t('Savdo')}</h2>
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
          label={t('Daromad')}
          value={<CountUp value={stats?.revenue ?? 0} format={money} />}
          hint={deltaHint(stats?.revenueDeltaPct)}
          tone={tone(stats?.revenueDeltaPct)}
          color="var(--sa-teal)"
          delay={70}
        />
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div className="sa-panel__title">{t(isRevenue ? 'Kunlik daromad' : 'Kunlik buyurtmalar')}</div>
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
            <Link className="sa-panel__link" to={`${BASE}/orders`}>{t('Barchasi →')}</Link>
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
                    onClick={() => navigate(openOrderUrl(o))}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(openOrderUrl(o))}
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

      <div className="sa-panel sa-flow-panel">
        <div className="sa-panel__head">
          <div>
            <div className="sa-panel__title">{t('Buyurtmalar hozir qayerda')}</div>
            <div className="sa-panel__sub">{t("Tugallanmagan buyurtmalar bosqichlar bo'yicha. Bosqichni bossangiz ro'yxati ochiladi.")}</div>
          </div>
        </div>
        <div className="sa-flow">
          {FLOW.map((step, i) => (
            <Link key={step.label} to={step.to} className="sa-flow__step" style={{ '--flow': step.color }}>
              <span className="sa-flow__icon">
                <step.icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="sa-flow__text">
                <b>{countOf(step.statuses) ?? '—'}</b>
                <span>{t(step.label)}</span>
                <small>{t(step.hint)}</small>
              </span>
              {i < FLOW.length - 1 && <ChevronRight className="sa-flow__arrow" size={18} strokeWidth={2} aria-hidden="true" />}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
