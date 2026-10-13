import { Search } from 'lucide-react';
import { cx } from '../utils';

export default function SearchInput({ value, onChange, placeholder = 'Qidirish...', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}
