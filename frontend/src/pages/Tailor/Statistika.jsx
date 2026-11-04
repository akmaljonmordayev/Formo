import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { getTailorDashboard } from './tailorApi';

const PERIODS = [
  { key: 'bugun', labelKey: 'stat.today', days: 1 },
  { key: 'hafta', labelKey: 'stat.week', days: 7 },
  { key: 'oy', labelKey: 'stat.month', days: 30 },
  { key: 'chorak', labelKey: 'stat.quarter', days: 90 },
];

export default function Statistika() {
  const t = useT();
  const [period, setPeriod] = useState('hafta');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDashboard(null);
    const days = PERIODS.find((item) => item.key === period).days;
    getTailorDashboard(days)
      .then((data) => {
        if (!cancelled) setDashboard(data);
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
  }, [period]);

  const points = (dashboard?.dailyTrend ?? []).map((item) => ({
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit' }),
    value: item.count,
  }));
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  // Ustunlar x o'qi bo'ylab teng bo'linadi; ko'p ustunda yorliqlar bir-birini bosmasligi uchun siyraklashtiriladi
  const slot = 500 / Math.max(points.length, 1);
  const barWidth = Math.min(48, slot * 0.6);
  const xOf = (index) => 40 + slot * index + slot / 2;
  const heightOf = (value) => (value / maxValue) * 160;
  const labelStep = Math.ceil(points.length / 8);

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

      <div>
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
              <line x1="40" y1="40" x2="540" y2="40" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="90" x2="540" y2="90" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="145" x2="540" y2="145" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="200" x2="540" y2="200" stroke="#ffffff30" />
              {points.map((point, index) => {
                const x = xOf(index);
                const h = heightOf(point.value);
                const showValue = points.length <= 14 || (point.value > 0 && point.value === maxValue);
                return (
                  <g key={`${point.label}-${index}`}>
                    <rect
                      x={x - barWidth / 2}
                      y={200 - h}
                      width={barWidth}
                      height={h}
                      rx={Math.min(6, barWidth / 2)}
                      className="fill-teal-400/80 transition-colors hover:fill-teal-300"
                    >
                      <title>{`${point.label}: ${point.value}`}</title>
                    </rect>
                    {showValue && point.value > 0 && (
                      <text x={x} y={200 - h - 8} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">{point.value}</text>
                    )}
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
      </div>
    </div>
  );
}
