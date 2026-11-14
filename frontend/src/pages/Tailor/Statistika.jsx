import { useEffect, useState } from 'react';
import { AlarmClock, ChevronLeft, ChevronRight, ClipboardList, Gauge, Loader2, PackageCheck, Search } from 'lucide-react';
import { Badge, Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { getTailorDashboard, listWorkshopOrdersPage } from './tailorApi';

const RANGES = [
  [7, 'stat.week'],
  [30, 'stat.month'],
  [90, 'stat.quarter'],
];
const PAGE_SIZE = 15;

const WEEKDAYS = {
  uz: ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

// Sex ko'radigan holatlar tartibi (ish jarayoni bo'yicha) va nishon rangi
const STATUS_ORDER = ['SENT_TO_WORKSHOP', 'ACCEPTED', 'PRINTING', 'QUALITY_CHECK', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const STATUS_BADGE = {
  SENT_TO_WORKSHOP: 'amber',
  ACCEPTED: 'cyan',
  PRINTING: 'cyan',
  QUALITY_CHECK: 'cyan',
  READY: 'emerald',
  DELIVERING: 'teal',
  DELIVERED: 'slate',
  CANCELLED: 'red',
  RETURNED: 'red',
};

// Oxirgi javoblar: sahifaga qaytilganda grafik darhol ko'rinadi, yangi ma'lumot fonda olinadi
const dashboardCache = {};

// Brauzer uz-UZ uchun sanani inglizcha yoki "11-03" ko'rinishida beradi — o'zimiz yozamiz
const pad = (n) => String(n).padStart(2, '0');
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

function Kpi({ icon: Icon, label, value, hint, alert = false, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className={cx('h-5 w-5 shrink-0', alert ? 'text-rose-400' : 'text-slate-500')} aria-hidden="true" />
      </div>
      <p className={cx('mt-3 text-3xl font-extrabold leading-none tabular-nums', alert ? 'text-rose-400' : 'text-white')}>{value}</p>
      {children}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

/** Kunlik buyurtmalar: ustunli grafik, ustun ustiga borilganda aniq son chiqadi */
function DailyChart({ points, empty }) {
  const [hovered, setHovered] = useState(null);
  // O'q 4 teng qismga bo'linadi va chiziqlar yaxlit sonlarda (1, 2, 5, 10, 20 ...) turadi — ustun balandligi chiziqqa aynan mos
  const rawStep = Math.max(1, Math.max(0, ...points.map((point) => point.value)) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((v) => v >= rawStep);
  const maxValue = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => ({ value: step * i, pct: i * 25 }));
  // Ko'p ustunda sana yozuvlari bir-birini bosmasligi uchun siyraklashtiriladi
  const labelStep = Math.ceil(points.length / 8);
  const dense = points.length > 31;
  const gap = dense ? 'gap-px' : points.length > 14 ? 'gap-1' : 'gap-1 sm:gap-2';

  return (
    <div className="relative mt-6 flex gap-3">
      <div className="relative h-64 w-8 shrink-0" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick.value} className="absolute right-0 -translate-y-1/2 text-xs font-semibold tabular-nums text-slate-500" style={{ bottom: `${tick.pct}%` }}>
            {tick.value}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-64">
          {ticks.map((tick) => (
            <div
              key={tick.value}
              className={cx('absolute inset-x-0 border-t', tick.value === 0 ? 'border-white/30' : 'border-white/5')}
              style={{ bottom: `${tick.pct}%` }}
            />
          ))}
          <div className={cx('absolute inset-0 flex items-end', gap)} onMouseLeave={() => setHovered(null)}>
            {points.map((point, index) => {
              const height = (point.value / maxValue) * 100;
              const active = hovered === index;
              return (
                // Butun ustun yo'lagi sichqonchani tutadi — past ustunni ham nishonga olish oson
                <div key={point.key} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end" onMouseEnter={() => setHovered(index)}>
                  {active && <div className="absolute inset-0 rounded-md bg-white/5" />}
                  {points.length <= 14 && point.value > 0 && !active && (
                    <span className="mb-1 text-xs font-bold tabular-nums text-slate-300">{point.value}</span>
                  )}
                  <div
                    className={cx('tl-bar relative w-full max-w-[44px] rounded-t transition-colors', active ? 'bg-teal-300' : 'bg-teal-400/85')}
                    style={{ height: `${height}%`, minHeight: point.value > 0 ? 3 : 0 }}
                  />
                  {active && (
                    <div
                      role="status"
                      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#121829] px-3 py-2 text-center shadow-lg"
                      style={{ bottom: `calc(${Math.min(height, 78)}% + 10px)` }}
                    >
                      <span className="block text-[11px] font-semibold text-slate-400">{point.weekday}, {point.label}</span>
                      <span className="block text-sm font-extrabold tabular-nums text-white">{point.tip}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={cx('mt-2 flex', gap)} aria-hidden="true">
          {points.map((point, index) => (
            <div key={point.key} className="min-w-0 flex-1 text-center leading-tight">
              {index % labelStep === 0 && (
                <>
                  <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-400">{point.label}</span>
                  {!dense && <span className="block text-[10px] text-slate-500">{point.weekday}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {empty && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">{empty}</p>}
    </div>
  );
}

/** Gorizontal ustunlar ro'yxati: nom — chiziq — son (kattasidan kichigiga) */
function RankCard({ title, hint, rows, empty }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Card className="p-6">
      <h3 className="text-base font-extrabold text-white">{title}</h3>
      <p className="text-xs text-slate-400">{hint}</p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
              <span className="truncate text-sm font-semibold text-slate-300" title={row.label}>{row.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
                <span className="block h-full rounded-full bg-teal-400" style={{ width: `${(row.value / max) * 100}%`, minWidth: row.value > 0 ? 4 : 0 }} />
              </span>
              <span className="w-12 text-right text-sm font-extrabold tabular-nums text-white">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Sexga kelgan hamma buyurtmalar (tugaganlari ham): qidiruv, holat bo'yicha filtr, sahifalash */
function OrdersTable({ onCounts }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Har harfda serverga bormaslik uchun qidiruv biroz kechiktiriladi
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWorkshopOrdersPage({ page, limit: PAGE_SIZE, search, status })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
        onCounts?.(result.byStatus ?? {});
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const byStatus = data?.byStatus ?? {};
  const filters = STATUS_ORDER.filter((key) => byStatus[key] > 0 || key === status);

  const pickStatus = (next) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h3 className="text-base font-extrabold text-white">{t('stat.allOrders')}</h3>
          <p className="text-xs text-slate-400">{t('queue.count', { n: total })}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('queue.searchPlaceholder')}
            aria-label={t('queue.searchPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-[#0e1424] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3" role="group" aria-label={t('queue.filterStatus')}>
        {['', ...filters].map((key) => (
          <button
            key={key || 'all'}
            type="button"
            aria-pressed={status === key}
            onClick={() => pickStatus(key)}
            className={cx(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition',
              status === key ? 'bg-teal-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
          >
            {key ? `${t(`ostatus.${key}`)} · ${byStatus[key] ?? 0}` : t('status.all')}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="border-b border-white/10 bg-rose-500/10 px-5 py-3 text-xs text-rose-200">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-bold">{t('stat.col.code')}</th>
              <th className="px-3 py-3 font-bold">{t('stat.col.customer')}</th>
              <th className="px-3 py-3 font-bold">{t('stat.col.model')}</th>
              <th className="px-3 py-3 text-right font-bold">{t('q.qty')}</th>
              <th className="px-3 py-3 font-bold">{t('stat.col.created')}</th>
              <th className="px-3 py-3 font-bold">{t('stat.col.delivery')}</th>
              <th className="px-5 py-3 font-bold">{t('ws.col.status')}</th>
            </tr>
          </thead>
          <tbody className={cx('divide-y divide-white/5 transition-opacity', loading && data && 'opacity-50')}>
            {items.map((order) => {
              const lines = order.items ?? [];
              const qty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0) || order.quantity || 0;
              const model = [lines[0]?.clubName || order.club?.name, lines[0]?.kitLabel].filter(Boolean).join(' · ');
              return (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-5 py-3 font-bold tabular-nums text-white">{order.code}</td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-slate-300">{order.customerName}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-slate-300">
                    {model || '—'}
                    {lines.length > 1 && <span className="ml-1.5 text-xs text-slate-500">+{lines.length - 1}</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-white">{qty}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-400">{formatDate(order.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-400">
                    {formatDate(order.deliveryDate)}
                    {order.deliverySlot && <span className="ml-1.5 text-xs text-slate-500">{order.deliverySlot}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_BADGE[order.status]}>{t(`ostatus.${order.status}`)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!items.length && (
          <p className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('api.loading')}</> : !error && t('queue.empty')}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
        <span className="text-xs tabular-nums text-slate-400">
          {total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total}` : '0'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('ws.prev')}
          </button>
          <span className="text-xs font-bold tabular-nums text-slate-300">{page} / {pages}</span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            {t('ws.next')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function Statistika() {
  const t = useT();
  const [days, setDays] = useState(7);
  const [dashboard, setDashboard] = useState(dashboardCache[7] ?? null);
  const [loading, setLoading] = useState(!dashboardCache[7]);
  const [error, setError] = useState('');
  // Holatlar bo'yicha jami sonlar buyurtmalar ro'yxati javobidan keladi (barcha vaqt uchun)
  const [byStatus, setByStatus] = useState({});

  useEffect(() => {
    let cancelled = false;
    setDashboard(dashboardCache[days] ?? null);
    setLoading(!dashboardCache[days]);
    getTailorDashboard(days)
      .then((data) => {
        dashboardCache[days] = data;
        if (!cancelled) {
          setDashboard(data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const weekdays = t.locale.startsWith('ru') ? WEEKDAYS.ru : WEEKDAYS.uz;
  const points = (dashboard?.dailyTrend ?? []).map((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    const orders = t('queue.count', { n: item.count });
    return {
      key: item.date,
      label: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
      weekday: weekdays[date.getDay()],
      value: item.count,
      tip: item.pieces == null ? orders : `${orders} · ${t('unit.donaCount', { n: item.pieces })}`,
    };
  });
  const totalInPeriod = dashboard?.ordersCount ?? 0;
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), { value: 0, label: '' });
  const average = points.length ? totalInPeriod / points.length : 0;

  const allTime = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  const statusRows = STATUS_ORDER.filter((key) => byStatus[key] > 0).map((key) => ({ key, label: t(`ostatus.${key}`), value: byStatus[key] }));
  const toRows = (list) => (list ?? []).map((row) => ({ key: row.name, label: row.name, value: row.pieces }));
  const loadPct = dashboard?.loadPct;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('stat.title')} className="flex gap-1 rounded-xl border border-white/10 bg-[#121829] p-1">
          {RANGES.map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              onClick={() => setDays(value)}
              className={cx(
                'rounded-lg px-4 py-2 text-xs font-bold transition',
                days === value ? 'bg-teal-400 text-slate-950' : 'text-slate-400 hover:text-white'
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        {loading && (
          <span role="status" className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('api.loading')}
          </span>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={ClipboardList}
          label={t('stat.kpi.period')}
          value={dashboard ? totalInPeriod : '—'}
          hint={dashboard?.piecesCount != null ? t('unit.donaCount', { n: dashboard.piecesCount }) : t('stat.apiOrdersHint')}
        />
        <Kpi icon={PackageCheck} label={t('stat.apiActive')} value={dashboard?.activeCount ?? '—'} hint={t('stat.apiActiveHint')} />
        <Kpi
          icon={AlarmClock}
          label={t('stat.kpi.late')}
          value={dashboard?.lateCount ?? '—'}
          hint={t('stat.kpi.lateHint')}
          alert={dashboard?.lateCount > 0}
        />
        <Kpi
          icon={Gauge}
          label={t('stat.col.load')}
          value={loadPct == null ? '—' : `${loadPct}%`}
          hint={dashboard?.capacity ? t('stat.apiCapacity', { n: dashboard.capacity }) : t('stat.noCapacity')}
        >
          {loadPct != null && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${loadPct}%`}>
              <div className={cx('h-full rounded-full', loadPct > 100 ? 'bg-rose-400' : 'bg-teal-400')} style={{ width: `${Math.min(loadPct, 100)}%` }} />
            </div>
          )}
        </Kpi>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white">{t('stat.volumeChart')}</h3>
            <p className="text-xs text-slate-400">{t('stat.chartHint', { n: days })}</p>
          </div>
          <dl className="flex gap-6 text-right">
            {[
              [t('stat.sumTotal'), totalInPeriod],
              [t('stat.avg'), average.toFixed(1)],
              [t('stat.peak'), peak.value ? `${peak.value} · ${peak.label}` : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div role="img" aria-label={t('stat.volumeChart')}>
          <DailyChart key={days} points={points} empty={!loading && !error && totalInPeriod === 0 ? t('api.empty') : ''} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <RankCard title={t('stat.byStatus')} hint={`${t('stat.allTime')} · ${t('queue.count', { n: allTime })}`} rows={statusRows} empty={t('api.empty')} />
        {/* Forma va o'lcham hisobi serverning yangi javobida bor — eski serverda bu kartalar ko'rsatilmaydi */}
        {dashboard?.topModels && (
          <RankCard title={t('stat.topModels')} hint={t('stat.inPeriodPieces')} rows={toRows(dashboard.topModels)} empty={t('api.empty')} />
        )}
        {dashboard?.sizes && (
          <RankCard title={t('stat.sizes')} hint={t('stat.inPeriodPieces')} rows={toRows(dashboard.sizes)} empty={t('api.empty')} />
        )}
      </div>

      <OrdersTable onCounts={setByStatus} />
    </div>
  );
}
