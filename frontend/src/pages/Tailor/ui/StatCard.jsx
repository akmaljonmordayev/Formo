import { cx } from '../utils';

const TONES = {
  teal: 'bg-teal-500/15 text-teal-400 ring-teal-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  red: 'bg-red-500/15 text-red-400 ring-red-500/30',
};

export default function StatCard({ label, value, hint, icon: Icon, tone = 'teal' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold leading-none text-white">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cx('rounded-xl p-2.5 ring-1 ring-inset', TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
