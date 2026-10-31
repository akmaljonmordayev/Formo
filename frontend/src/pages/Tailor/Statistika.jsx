import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Factory, Layers, Timer } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { getTailorDashboard, getTailorProduction } from './tailorApi';

const PERIODS = [
  { key: 'bugun', labelKey: 'stat.today', days: 1 },
  { key: 'hafta', labelKey: 'stat.week', days: 7 },
  { key: 'oy', labelKey: 'stat.month', days: 30 },
  { key: 'chorak', labelKey: 'stat.quarter', days: 90 },
];

// Ishlab chiqarish ustunlari (GET /workshop/production → columns) — API holatlari tartibi
const STAGES = ['ACCEPTED', 'PRINTING', 'QUALITY_CHECK', 'READY'];
const orderPieces = (order) => order.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? order.quantity ?? 0;

export default function Statistika() {
  const t = useT();
  const [period, setPeriod] = useState('hafta');
  const [dashboard, setDashboard] = useState(null);
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDashboard(null);
    setProduction(null);
    const days = PERIODS.find((item) => item.key === period).days;
    Promise.allSettled([getTailorDashboard(days), getTailorProduction()])
      .then(([dashboardResult, productionResult]) => {
        if (cancelled) return;
        if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
        if (productionResult.status === 'fulfilled') setProduction(productionResult.value);
        setError([dashboardResult, productionResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason.message)
          .join(' · '));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const points = (dashboard?.dailyTrend ?? []).map((item) => ({
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit' }),
    value: item.count,
  }));
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  // Bitta nuqta (bugun) — grafik o'rtasida; ko'p nuqtada x o'qi yorliqlari bir-birini bosmasligi uchun siyraklashtiriladi
  const xOf = (index) => (points.length === 1 ? 290 : (index / (points.length - 1)) * 500 + 40);
  const yOf = (value) => 200 - (value / maxValue) * 160;
  const pointsString = points.map((point, index) => `${xOf(index)},${yOf(point.value)}`).join(' ');
  const fillAreaString = `${xOf(0)},200 ${pointsString} ${xOf(points.length - 1)},200`;
  const labelStep = Math.ceil(points.length / 8);

  const stats = [
    { label: 'stat.apiOrders', value: dashboard?.ordersCount, hint: 'stat.apiOrdersHint', Icon: Layers, iconStyle: 'bg-teal-500/20 text-teal-400' },
    { label: 'stat.apiActive', value: dashboard?.activeCount, hint: 'stat.apiActiveHint', Icon: Activity, iconStyle: 'bg-blue-500/20 text-blue-400' },
    { label: 'stat.apiLate', value: dashboard?.lateCount, hint: 'stat.apiLateHint', Icon: AlertTriangle, iconStyle: 'bg-rose-500/20 text-rose-400' },
    {
      label: 'stat.apiLoad',
      value: dashboard?.loadPct == null ? null : `${dashboard.loadPct}%`,
      hint: 'stat.apiCapacity',
      hintVars: { n: dashboard?.capacity ?? '—' },
      Icon: Timer,
      iconStyle: 'bg-amber-500/20 text-amber-400',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('stat.title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">{t('stat.subtitle')}</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-[#121829] p-1">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={cx(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-extrabold capitalize transition',
                period === item.key ? 'bg-teal-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div role="status" className="text-xs text-slate-400">{t('api.loading')}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, hint, hintVars, Icon, iconStyle }) => (
          <Card key={label} className="flex items-center gap-4 border border-white/10 bg-[#121829] p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconStyle}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-400">{t(label)}</span>
              <p className="mt-1 text-2xl font-black text-white">
                {typeof value === 'number' ? value.toLocaleString(t.locale) : value ?? '—'}
              </p>
              <span className="text-[10px] font-bold text-slate-400">{t(hint, hintVars)}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border border-white/10 bg-[#121829] p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">{t('stat.volumeChart')}</h3>
              <p className="text-xs text-slate-400">{t('stat.volumeChartHint', { period: t(PERIODS.find((item) => item.key === period).labelKey) })}</p>
            </div>
            <BarChart3 className="h-5 w-5 text-teal-400" />
          </div>
          <div className="relative mt-4 h-60 w-full pt-4">
            <svg viewBox="0 0 580 230" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="40" y1="40" x2="540" y2="40" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="90" x2="540" y2="90" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="145" x2="540" y2="145" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="200" x2="540" y2="200" stroke="#ffffff30" />
              {points.length > 1 && <polygon points={fillAreaString} fill="url(#areaGradient)" />}
              <polyline fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={pointsString} />
              {points.map((point, index) => {
                const x = xOf(index);
                const y = yOf(point.value);
                const showValue = points.length <= 14 || (point.value > 0 && point.value === maxValue);
                return (
                  <g key={`${point.label}-${index}`}>
                    <circle cx={x} cy={y} r={points.length > 14 ? 3 : 5} fill="#0b0f19" stroke="#22d3ee" strokeWidth="3" />
                    {showValue && <text x={x} y={y - 12} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">{point.value}</text>}
                    {index % labelStep === 0 && <text x={x} y="220" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">{point.label}</text>}
                  </g>
                );
              })}
            </svg>
            {!loading && !error && points.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">{t('api.empty')}</p>
            )}
          </div>
        </Card>

        <Card className="border border-white/10 bg-[#121829] p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-extrabold text-white">{t('stat.apiLoad')}</h3>
            <Factory className="h-5 w-5 text-teal-400" />
          </div>
          <div className="mt-4 space-y-4">
            {dashboard && (
              <div>
                <div className="flex justify-between gap-3 text-xs font-bold">
                  <span className="truncate text-slate-300">{t('stat.myLoad')}</span>
                  <span className="shrink-0 text-teal-400">{dashboard.activeCount} / {dashboard.capacity ?? '—'}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(100, dashboard.loadPct ?? 0)}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-400">
                  {dashboard.loadPct == null ? t('stat.noCapacity') : `${dashboard.loadPct}%`}
                </p>
              </div>
            )}
            {!loading && !dashboard && (
              <p className="py-8 text-center text-xs text-slate-500">{t('api.empty')}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border border-white/10 bg-[#121829] p-6">
        <h3 className="mb-1 text-base font-extrabold text-white">{t('stat.stages')}</h3>
        <p className="mb-4 text-xs text-slate-400">{t('stat.stagesHint')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3">{t('stat.col.stage')}</th>
                <th className="pb-3">{t('stat.col.orders')}</th>
                <th className="pb-3">{t('stat.col.pieces')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {production && STAGES.map((stage) => {
                const orders = Array.isArray(production.columns?.[stage]) ? production.columns[stage] : [];
                return (
                  <tr key={stage} className="transition hover:bg-white/5">
                    <td className="py-3.5 font-extrabold text-white">{t(`stat.stage.${stage}`)}</td>
                    <td className="py-3.5 font-bold text-teal-400">{orders.length}</td>
                    <td className="py-3.5 text-slate-300">{orders.reduce((sum, order) => sum + orderPieces(order), 0)}</td>
                  </tr>
                );
              })}
              {!loading && !production && (
                <tr><td colSpan={3} className="py-6 text-center text-xs text-slate-500">{t('api.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
