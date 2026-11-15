import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Scissors, Truck } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { getTailorDashboard, listWorkshopOrdersPage } from './tailorApi';

const RANGES = [
  [7, 'stat.week'],
  [30, 'stat.month'],
  [90, 'stat.quarter'],
];

const WEEKDAYS = {
  uz: ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

// Tepadagi sonlar. "Tayyor" — yon menyudagi "Tayyor" bo'limi bilan bir xil (faqat READY); sexdan chiqib ketganlari alohida
const IN_WORK = ['SENT_TO_WORKSHOP', 'ACCEPTED', 'PRINTING', 'QUALITY_CHECK'];
const READY = ['READY'];
const HANDED_OVER = ['DELIVERING', 'DELIVERED'];

// Oxirgi javoblar: sahifaga qaytilganda grafik darhol ko'rinadi, yangi ma'lumot fonda olinadi
const dashboardCache = {};

// Brauzer uz-UZ uchun sanani inglizcha yoki "11-03" ko'rinishida beradi — o'zimiz yozamiz
const pad = (n) => String(n).padStart(2, '0');

function Kpi({ icon: Icon, label, value, hint, primary = false }) {
  return (
    <Card className={cx('p-5', primary && 'border-teal-400/40')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-extrabold leading-none tabular-nums text-white">{value}</p>
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

export default function Statistika() {
  const t = useT();
  const [days, setDays] = useState(7);
  const [dashboard, setDashboard] = useState(dashboardCache[7] ?? null);
  const [loading, setLoading] = useState(!dashboardCache[7]);
  const [error, setError] = useState('');
  // Holatlar bo'yicha jami sonlar buyurtmalar ro'yxati javobidan keladi (barcha vaqt uchun)
  const [byStatus, setByStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listWorkshopOrdersPage({ limit: 1 })
      .then((result) => {
        if (!cancelled) setByStatus(result.byStatus ?? {});
      })
      .catch(() => {}); // sonlar o'rnida "—" qoladi — asosiy xato pastdagi so'rovdan ko'rinadi
    return () => {
      cancelled = true;
    };
  }, []);

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
  const periodSummary = [t('queue.count', { n: totalInPeriod }), dashboard?.piecesCount != null && t('unit.donaCount', { n: dashboard.piecesCount })]
    .filter(Boolean)
    .join(' · ');

  const counts = byStatus ?? {};
  const sumOf = (keys) => keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  const allTime = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const shown = (n) => (byStatus ? n : '—');
  const toRows = (list) => (list ?? []).map((row) => ({ key: row.name, label: row.name, value: row.pieces }));

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

      {/* Umumiy sonlar — davr tanloviga bog'liq emas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ClipboardList} label={t('stat.kpi.total')} value={shown(allTime)} hint={t('stat.kpi.totalHint')} primary />
        <Kpi icon={Scissors} label={t('stat.kpi.inWork')} value={shown(sumOf(IN_WORK))} hint={t('stat.kpi.inWorkHint')} />
        <Kpi icon={CheckCircle2} label={t('stat.kpi.ready')} value={shown(sumOf(READY))} hint={t('stat.kpi.readyHint')} />
        <Kpi icon={Truck} label={t('stat.kpi.handed')} value={shown(sumOf(HANDED_OVER))} hint={t('stat.kpi.handedHint')} />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-white">{t('stat.volumeChart')}</h3>
            <p className="flex items-center gap-2 text-xs text-slate-400">
              {t('stat.chartHint', { n: days })}
              {loading && <Loader2 role="status" aria-label={t('api.loading')} className="h-3.5 w-3.5 animate-spin" />}
            </p>
          </div>
          <div role="group" aria-label={t('stat.title')} className="flex gap-1 rounded-xl border border-white/10 bg-[#0e1424] p-1">
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
        </div>
        {dashboard && (
          <p className="mt-4 text-sm text-slate-400">
            {t('stat.periodTotal')}: <span className="font-extrabold tabular-nums text-white">{periodSummary}</span>
          </p>
        )}
        <div role="img" aria-label={t('stat.volumeChart')}>
          <DailyChart key={days} points={points} empty={!loading && !error && totalInPeriod === 0 ? t('api.empty') : ''} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Forma va o'lcham hisobi serverning yangi javobida bor — eski serverda bu kartalar ko'rsatilmaydi */}
        {dashboard?.topModels && (
          <RankCard title={t('stat.topModels')} hint={t('stat.inPeriodPieces')} rows={toRows(dashboard.topModels)} empty={t('api.empty')} />
        )}
        {dashboard?.sizes && (
          <RankCard title={t('stat.sizes')} hint={t('stat.inPeriodPieces')} rows={toRows(dashboard.sizes)} empty={t('api.empty')} />
        )}
      </div>
    </div>
  );
}
