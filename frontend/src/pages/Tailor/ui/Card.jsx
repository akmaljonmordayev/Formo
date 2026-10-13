import { cx } from '../utils';

export default function Card({ className, children }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_16px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}
