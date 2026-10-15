import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi, money } from '../../../features/platform/platformApi';

const RANGES = [
  { label: 'Bugun', days: 1 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
];

const delta = (pct) => (pct === null || pct === undefined ? null : `${pct > 0 ? '+' : ''}${pct}% oldingi davrga nisbatan`);

export default function SuperadminDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState(RANGES[2]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const name = (user?.fullName || 'Super admin').split(' ')[0];
  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  const now = new Date();
  const today = `${WEEKDAYS[now.getDay()]}, ${now.getDate()}-${MONTHS[now.getMonth()]}`;

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
        { label: 'Buyurtmalar', value: String(stats.ordersCount), delta: delta(stats.ordersDeltaPct), up: stats.ordersDeltaPct > 0 },
        { label: 'Tushum', value: money(stats.revenue), delta: delta(stats.revenueDeltaPct), up: stats.revenueDeltaPct > 0 },
        {
          label: 'Sexdagi yuk',
          value: stats.loadPct !== null ? `${stats.loadPct}%` : '—',
          delta: stats.capacity ? `${stats.activeCount} / ${stats.capacity} dona` : "Sig'im kiritilmagan",
        },
        { label: 'Kechikayotgan', value: String(stats.lateCount), delta: 'muddatga 3 soatdan kam', up: stats.lateCount === 0 },
      ]
    : [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Xayrli kun, {name}</h1>
          <p>{today} · barcha tizimlar kuzatuvda</p>
        </div>
        <div className="sa-tabs" style={{ marginBottom: 0 }}>
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              className={`sa-tab${range.label === r.label ? ' is-active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r.label}
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
              <div className="sa-panel__title">Buyurtmalar · {range.label}</div>
              <div className="sa-panel__sub">
                jami {totalOrders} · o'rtacha kuniga {bars.length ? Math.round(totalOrders / bars.length) : 0}
              </div>
            </div>
          </div>
          {bars.length === 0 ? (
            <div className="sa-table__sub" style={{ padding: '24px 0', textAlign: 'center' }}>
              {loading ? 'Yuklanmoqda...' : 'Bu davrda buyurtma yo\'q'}
            </div>
          ) : (
            <div className="sa-bars">
              {bars.map((b, i) => (
                <div
                  key={b.date}
                  className={`sa-bars__col${i === bars.length - 1 ? ' is-today' : ''}`}
                  style={{ height: `${(b.count / maxBar) * 100}%` }}
                  title={`${b.date}: ${b.count} ta`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Tizim holati</div>
            <a className="sa-panel__link" href="#">Integratsiyalar →</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            Integratsiya monitoringi (SMS, webhook, backup) hali ulanmagan — bu bo'lim keyingi bosqichda qo'shiladi.
          </div>
        </div>
      </div>

      <div className="sa-grid-2">
        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">So'nggi muhim amallar</div>
            <a className="sa-panel__link" href="/superadmin/audit-log">Audit jurnali →</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            To'liq ro'yxat Audit jurnali sahifasida.
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-panel__head">
            <div className="sa-panel__title">Xodimlar</div>
            <a className="sa-panel__link" href="/superadmin/users">Boshqarish →</a>
          </div>
          <div className="sa-table__sub" style={{ padding: '8px 0' }}>
            Operator va tikuv sexi akkauntlari "Foydalanuvchilar" bo'limida boshqariladi.
          </div>
        </div>
      </div>
    </>
  );
}
