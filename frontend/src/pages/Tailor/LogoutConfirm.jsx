import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useT } from './i18n';

/** Chiqishdan oldin tasdiq oynasi: tasodifan bosilganda sessiya yopilib ketmaydi */
export default function LogoutConfirm({ open, onClose }) {
  const t = useT();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const confirm = async () => {
    setLeaving(true);
    try {
      // serverdagi sessiya yopilguncha kutamiz, aks holda /login dan qaytib sakraydi
      if (logout) await logout();
      navigate('/login', { replace: true });
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{ animation: 'tl-fade 0.15s ease-out both' }}
      onMouseDown={(e) => e.target === e.currentTarget && !leaving && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-text"
        className="tl-pop w-full max-w-sm rounded-2xl border border-white/10 bg-[#121829] p-6 text-center shadow-2xl"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
          <LogOut className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 id="logout-title" className="mt-4 text-lg font-bold text-white">{t('logout.confirmTitle')}</h2>
        <p id="logout-text" className="mt-1.5 text-sm text-slate-400">{t('logout.hint')}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={leaving}
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {t('logout.cancel')}
          </button>
          <button
            type="button"
            disabled={leaving}
            onClick={confirm}
            className="rounded-xl bg-rose-600 py-3 text-sm font-bold text-white transition hover:bg-rose-500 active:scale-95 disabled:opacity-60"
          >
            {t('logout.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
