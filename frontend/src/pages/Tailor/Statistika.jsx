import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { getTailorDashboard } from './tailorApi';

// Grafik bitta: oxirgi 7 kun
const DAYS = 7;

const WEEKDAYS = {
  uz: ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Jum', 'Shan'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

// Oxirgi javob: sahifaga qaytilganda grafik darhol ko'rinadi, yangi ma'lumot fonda olinadi
let lastDashboard = null;

export default function Statistika() {
  const t = useT();
  const [dashboard, setDashboard] = useState(lastDashboard);
  const [loading, setLoading] = useState(!lastDashboard);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getTailorDashboard(DAYS)
      .then((data) => {
        lastDashboard = data;
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
  }, []);

  const points = (dashboard?.dailyTrend ?? []).map((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    // Brauzer uz-UZ uchun sana/hafta kunini inglizcha yoki "11-03" ko'rinishida beradi — o'zimiz yozamiz
    const weekdays = t.locale.startsWith('ru') ? WEEKDAYS.ru : WEEKDAYS.uz;
    return {
      label: `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`,
      weekday: weekdays[date.getDay()],
      value: item.count,
    };
  });
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), { value: 0, label: '' });
  // O'q 4 teng qismga bo'linadi va chiziqlar yaxlit sonlarda (1, 2, 5, 10, 20 ...) turadi — ustun balandligi chiziqqa aynan mos
  const rawStep = Math.max(1, Math.max(0, ...points.map((point) => point.value)) / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((v) => v >= rawStep);
  const maxValue = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => ({ value: step * i, pct: i * 25 }));
  // Ko'p ustunda sana yozuvlari bir-birini bosmasligi uchun siyraklashtiriladi
  const labelStep = Math.ceil(points.length / 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('stat.title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">{t('stat.subtitle')}</p>
        </div>
      </div>

      {loading && <div role="status" className="text-xs text-slate-400">{t('api.loading')}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

      <div>
        <Card className="border border-white/10 bg-[#121829] p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">{t('stat.volumeChart')}</h3>
              <p className="text-xs text-slate-400">{t('stat.volumeChartHint')}</p>
            </div>
            <BarChart3 className="h-5 w-5 text-teal-400" />
          </div>
          <div className="relative mt-8 flex gap-3" role="img" aria-label={t('stat.volumeChart')}>
            <div className="relative h-64 w-8 shrink-0">
              {ticks.map((tick) => (
                <span key={tick.value} className="absolute right-0 -translate-y-1/2 text-sm font-semibold tabular-nums text-slate-400" style={{ bottom: `${tick.pct}%` }}>
                  {tick.value}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative h-64">
                {ticks.map((tick) => (
                  <div
                    key={tick.value}
                    className={cx('absolute inset-x-0 border-t', tick.value === 0 ? 'border-white/30' : 'border-dashed border-white/10')}
                    style={{ bottom: `${tick.pct}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
                  {points.map((point, index) => {
                    const showValue = points.length <= 14 || (point.value > 0 && point.value === peak.value);
                    return (
                      <div key={`${point.label}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${point.label}: ${point.value}`}>
                        {showValue && point.value > 0 && <span className="mb-1 text-sm font-extrabold tabular-nums text-white">{point.value}</span>}
                        <div
                          className="w-full max-w-[56px] rounded-t-lg bg-teal-400/85 transition-colors group-hover:bg-teal-300"
                          style={{ height: `${(point.value / maxValue) * 100}%`, minHeight: point.value > 0 ? 4 : 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex gap-1 sm:gap-2">
                {points.map((point, index) => (
                  <div key={`${point.label}-${index}`} className="min-w-0 flex-1 text-center leading-tight">
                    {index % labelStep === 0 && (
                      <>
                        <span className="block whitespace-nowrap text-xs font-bold text-slate-300">{point.label}</span>
                        {point.weekday && <span className="block text-[11px] font-semibold text-slate-500">{point.weekday}</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {!loading && !error && points.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">{t('api.empty')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
