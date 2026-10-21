import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi } from '../../../features/platform/platformApi';
import { useT, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';

const RANGES = [
  { label: 'Bugun', days: 1 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
];

const delta = (t, pct) =>
  pct === null || pct === undefined ? null : t('{pct}% oldingi davrga nisbatan', { pct: `${pct > 0 ? '+' : ''}${pct}` });

export default function SuperadminDashboard() {
  const money = useMoney();
  const t = useT();
  const { user } = useAuth();
  const [range, setRange] = useState(() => RANGES.find((r) => r.days === loadAdminPrefs().dashboardDays) ?? RANGES[2]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  const now = new Date();
  const today = `${t(WEEKDAYS[now.getDay()])}, ${now.getDate()}-${t(MONTHS[now.getMonth()])}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    dashboardApi
      .get(range.days)
      .then((d) => active && setStats(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const bars = stats?.dailyTrend ?? [];
  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const totalOrders = bars.reduce((s, b) => s + b.count, 0);

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
        <div className="sa-tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              className={`sa-tab${range.label === r.label ? ' is-active' : ''}`}
              onClick={() => setRange(r)}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      </div>

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
              <div className="sa-panel__title">{t('Buyurtmalar')} · {t(range.label)}</div>
              <div className="sa-panel__sub">
                {t("jami {total} · o'rtacha kuniga {avg}", { total: totalOrders, avg: bars.length ? Math.round(totalOrders / bars.length) : 0 })}
              </div>
            </div>
          </div>
          {bars.length === 0 ? (
            <div className="sa-table__sub" style={{ padding: '24px 0', textAlign: 'center' }}>
              {loading ? t('Yuklanmoqda...') : t("Bu davrda buyurtma yo'q")}
            </div>
          ) : (
            <div className="sa-bars">
              {bars.map((b, i) => (
                <div
                  key={b.date}
                  className={`sa-bars__col${i === bars.length - 1 ? ' is-today' : ''}`}
                  style={{ height: `${(b.count / maxBar) * 100}%` }}
                  title={`${b.date}: ${t('{n} ta', { n: b.count })}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("Tizim holati")}</div>
            <a className="sa-panel__link" href="/superadmin/settings">{t("Integratsiyalar →")}</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            {t("Integratsiya monitoringi (SMS, webhook, backup) hali ulanmagan — bu bo'lim keyingi bosqichda qo'shiladi.")}
          </div>
        </div>
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("So'nggi muhim amallar")}</div>
            <a className="sa-panel__link" href="/superadmin/audit-log">{t("Audit jurnali →")}</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            {t("To'liq ro'yxat Audit jurnali sahifasida.")}
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">{t("Xodimlar")}</div>
            <a className="sa-panel__link" href="/superadmin/users">{t("Boshqarish →")}</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            {t("Operator va tikuv sexi akkauntlari \"Foydalanuvchilar\" bo'limida boshqariladi.")}
          </div>
        </div>
      </div>
    </>
  );
}
