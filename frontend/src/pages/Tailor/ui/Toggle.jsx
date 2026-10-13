import { cx } from '../utils';

export default function Toggle({ checked, onChange, label, description }) {
  return (
    <div
      onClick={() => onChange && onChange(!checked)}
      className="flex cursor-pointer items-center justify-between gap-4 py-3 select-none"
    >
      <span className="min-w-0">
        {label && <span className="block text-xs font-extrabold text-white">{label}</span>}
        {description && <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{description}</span>}
      </span>
      <div
        role="switch"
        aria-checked={checked}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out',
          checked ? 'bg-teal-400' : 'bg-white/10'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-slate-950 shadow-md transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-white/70'
          )}
        />
      </div>
    </div>
  );
}
