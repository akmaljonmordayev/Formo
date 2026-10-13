import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from '../utils';

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl animate-fade-in'
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Oynani yopish"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
