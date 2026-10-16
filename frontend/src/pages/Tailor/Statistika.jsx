import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, Zap, PieChart } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';

const STAT_DATA = {
  bugun: {
    total: 185,
    avgTime: '11.8',
    defectRate: '0.5%',
    defectCount: 1,
    efficiency: '98.2%',
    points: [
      { label: '08:00', val: 25 },
      { label: '10:00', val: 40 },
      { label: '12:00', val: 35 },
      { label: '14:00', val: 50 },
      { label: '16:00', val: 30 },
      { label: '18:00', val: 15 },
    ],
    maxVal: 60,
    materials: { white: 88, black: 72, fabric: 95 },
  },
  hafta: {
    total: 1335,
    avgTime: '14.2',
    defectRate: '1.2%',
    defectCount: 6,
    efficiency: '94.8%',
    points: [
      { labelKey: 'dush', val: 140 },
      { labelKey: 'sesh', val: 185 },
      { labelKey: 'chor', val: 210 },
      { labelKey: 'pay', val: 175 },
      { labelKey: 'jum', val: 240 },
      { labelKey: 'shan', val: 195 },
      { labelKey: 'yak', val: 90 },
    ],
    maxVal: 280,
    materials: { white: 82, black: 65, fabric: 91 },
  },
  oy: {
    total: 5840,
    avgTime: '13.5',
    defectRate: '0.9%',
    defectCount: 24,
    efficiency: '96.5%',
    points: [
      { labelKey: 'week1', val: 1320 },
      { labelKey: 'week2', val: 1480 },
      { labelKey: 'week3', val: 1650 },
      { labelKey: 'week4', val: 1390 },
    ],
    maxVal: 2000,
    materials: { white: 78, black: 80, fabric: 88 },
  },
};

const PERIODS = [
  { key: 'bugun', labelKey: 'stat.today' },
  { key: 'hafta', labelKey: 'stat.week' },
  { key: 'oy', labelKey: 'stat.month' },
];

export default function Statistika() {
  const t = useT();
  const [period, setPeriod] = useState('hafta');
  const current = STAT_DATA[period];

  const operatorStats = [
    { name: 'Dilshod Nurmatov', roleKey: 'stat.role.printer', done: 142, avgTime: '12', defect: 1, rate: '98.5%' },
    { name: 'Sardor Olimov', roleKey: 'stat.role.printer', done: 128, avgTime: '14', defect: 2, rate: '96.2%' },
    { name: 'Otabek Toshpo‘latov', roleKey: 'stat.role.sewer', done: 110, avgTime: '16', defect: 0, rate: '100%' },
    { name: 'Bekzod Qodirov', roleKey: 'stat.role.sewer', done: 95, avgTime: '18', defect: 3, rate: '94.0%' },
  ];

  const labelOf = (p) => (p.labelKey ? t(`stat.label.${p.labelKey}`) : p.label);

  // Helper to generate SVG polyline / curve path from points
  const pointsString = current.points
    .map((p, i) => {
      const x = (i / (current.points.length - 1)) * 500 + 40;
      const y = 200 - (p.val / current.maxVal) * 160;
      return `${x},${y}`;
    })
    .join(' ');

  const fillAreaString = `40,200 ${pointsString} ${(current.points.length - 1) * (500 / (current.points.length - 1)) + 40},200`;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{t('stat.title')}</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">{t('stat.subtitle')}</p>
        </div>

        <div className="flex rounded-xl bg-[#121829] p-1 border border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-xs font-extrabold capitalize transition cursor-pointer',
                period === p.key
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 bg-[#121829] p-5 border border-white/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">{t('stat.totalVolume')}</span>
            <p className="mt-1 text-2xl font-black text-white">
              {t('stat.qtyUnit', { n: current.total.toLocaleString(t.locale) })}
            </p>
            <span className="text-[10px] font-bold text-emerald-400">{t(`stat.growth.${period}`)}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[#121829] p-5 border border-white/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">{t('stat.avgTime')}</span>
            <p className="mt-1 text-2xl font-black text-white">
              {current.avgTime} {t('unit.min')}
            </p>
            <span className="text-[10px] font-bold text-teal-400">{t(`stat.avgDiff.${period}`)}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[#121829] p-5 border border-white/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">{t('stat.defectRate')}</span>
            <p className="mt-1 text-2xl font-black text-rose-400">{current.defectRate}</p>
            <span className="text-[10px] font-bold text-slate-400">
              {t('stat.defectCount', { n: current.defectCount })}
            </span>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[#121829] p-5 border border-white/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">{t('stat.efficiency')}</span>
            <p className="mt-1 text-2xl font-black text-amber-300">{current.efficiency}</p>
            <span className="text-[10px] font-bold text-emerald-400">{t('stat.high')}</span>
          </div>
        </Card>
      </div>

      {/* Main Dynamic Area Diagram & Donut Chart Row */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Dynamic SVG Area Curve Chart */}
        <Card className="flex flex-col justify-between bg-[#121829] p-6 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">{t('stat.volumeChart')}</h3>
              <p className="text-xs text-slate-400">{t('stat.volumeChartHint', { period: t(PERIODS.find((p) => p.key === period).labelKey) })}</p>
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

              {/* Horizontal Grid lines */}
              <line x1="40" y1="40" x2="540" y2="40" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="90" x2="540" y2="90" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="145" x2="540" y2="145" stroke="#ffffff15" strokeDasharray="4" />
              <line x1="40" y1="200" x2="540" y2="200" stroke="#ffffff30" />

              {/* Area Gradient Fill */}
              <polygon points={fillAreaString} fill="url(#areaGradient)" />

              {/* Glowing Line Chart */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Data Node Circles */}
              {current.points.map((p, i) => {
                const x = (i / (current.points.length - 1)) * 500 + 40;
                const y = 200 - (p.val / current.maxVal) * 160;
                return (
                  <g key={p.labelKey ?? p.label}>
                    <circle cx={x} cy={y} r="5" fill="#0b0f19" stroke="#22d3ee" strokeWidth="3" />
                    <text x={x} y={y - 12} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                      {p.val}
                    </text>
                    <text x={x} y="220" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                      {labelOf(p)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        {/* Right: Material & Defect Breakdown Donut Ring Chart */}
        <Card className="flex flex-col justify-between bg-[#121829] p-6 border border-white/10">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white">{t('stat.materials')}</h3>
              <PieChart className="h-5 w-5 text-teal-400" />
            </div>

            {/* Donut Chart Visual */}
            <div className="my-5 flex justify-center">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="12" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#22d3ee" strokeWidth="12" strokeDasharray="238" strokeDashoffset={238 - (238 * current.materials.white) / 100} fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="12" strokeDasharray="238" strokeDashoffset={238 - (238 * current.materials.black) / 100} fill="none" opacity="0.7" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-white">{current.materials.white}%</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">{t('stat.whiteShort')}</span>
                </div>
              </div>
            </div>

            {/* Material Meters */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">{t('stat.whitePaint')}</span>
                  <span className="text-teal-400">{current.materials.white}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-teal-400 transition-all duration-500" style={{ width: `${current.materials.white}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">{t('stat.blackPaint')}</span>
                  <span className="text-blue-400">{current.materials.black}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${current.materials.black}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">{t('stat.fabricRolls')}</span>
                  <span className="text-emerald-400">{current.materials.fabric}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${current.materials.fabric}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Operator Ranking Table */}
      <Card className="overflow-hidden bg-[#121829] p-6 border border-white/10">
        <h3 className="text-base font-extrabold text-white mb-1">{t('stat.teamRating')}</h3>
        <p className="text-xs text-slate-400 mb-4">{t('stat.teamRatingHint')}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase font-bold tracking-wider">
                <th className="pb-3">{t('stat.col.employee')}</th>
                <th className="pb-3">{t('stat.col.role')}</th>
                <th className="pb-3">{t('stat.col.done')}</th>
                <th className="pb-3">{t('stat.col.avg')}</th>
                <th className="pb-3">{t('stat.col.defects')}</th>
                <th className="pb-3">{t('stat.col.quality')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {operatorStats.map((op) => (
                <tr key={op.name} className="hover:bg-white/5 transition">
                  <td className="py-3.5 font-extrabold text-white">{op.name}</td>
                  <td className="py-3.5 text-slate-400">{t(op.roleKey)}</td>
                  <td className="py-3.5 font-bold text-teal-400">{t('unit.donaCount', { n: op.done })}</td>
                  <td className="py-3.5 font-semibold">
                    {op.avgTime} {t('unit.min')}
                  </td>
                  <td className="py-3.5 font-semibold text-rose-400">{t('unit.donaCount', { n: op.defect })}</td>
                  <td className="py-3.5">
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-extrabold text-emerald-400 ring-1 ring-emerald-500/40">
                      {op.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
