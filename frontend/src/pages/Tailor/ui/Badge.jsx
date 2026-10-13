import { cx } from '../utils';

const VARIANTS = {
  teal: 'bg-teal-500/15 text-teal-400 ring-teal-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  red: 'bg-red-500/15 text-red-400 ring-red-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
};

export default function Badge({ variant = 'slate', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset',
        VARIANTS[variant] ?? VARIANTS.slate,
        className
      )}
    >
      {children}
    </span>
  );
}
