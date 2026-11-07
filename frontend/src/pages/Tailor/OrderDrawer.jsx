import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Truck, X, XCircle } from 'lucide-react';
import OrderDetail from './OrderDetail';
import { useT } from './i18n';

/** Buyurtma tafsiloti — o'ng tomondan ochiladigan panel. Qabul / tayyor / rad etish tugmalari tepada turadi */
export default function OrderDrawer({ order, onClose, onAdvance, onReject, actionLoading }) {
  const t = useT();
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  useEffect(() => {
    setRejecting(false);
    setReason('');
  }, [order?.id]);

  if (!order) return null;

  const submitReject = async () => {
    const text = reason.trim();
    if (!text) return;
    if (await onReject(order, text)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t('q.close')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-sm"
        style={{ animation: 'tl-fade 0.2s ease-out both' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`#${order.id}`}
        className="absolute inset-y-0 right-0 flex w-[min(960px,100vw)] flex-col bg-[#0b0f19] shadow-2xl"
        style={{ animation: 'tl-slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <div className="border-b border-white/10 bg-[#0b0f19] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{order.customer}</p>
              <p className="font-mono text-xs text-slate-500">#{order.id}</p>
            </div>

            {order.status !== 'yangi' && (
              <button
                type="button"
                onClick={() => navigate('/tailor/brak', { state: { order } })}
                className="flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/10"
              >
                <AlertTriangle className="h-4 w-4" />
                {t('order.defect')}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label={t('q.close')}
              className="rounded-lg border border-white/10 p-2.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <OrderDetail key={order.id} order={order} />
        </div>

        <div className="border-t border-white/10 bg-[#0b0f19] p-4 sm:px-5">
          {rejecting ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder={t('order.rejectReason')}
                aria-label={t('order.rejectReason')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRejecting(false); setReason(''); }}
                  className="rounded-xl border border-white/10 px-5 py-4 text-base font-bold text-slate-300 hover:bg-white/10"
                >
                  {t('order.cancel')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !reason.trim()}
                  onClick={submitReject}
                  className="rounded-xl bg-rose-500 px-5 py-4 text-base font-extrabold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  {t('order.rejectConfirm')}
                </button>
              </div>
            </div>
          ) : order.status === 'yangi' ? (
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 px-5 py-4 text-base font-bold text-rose-300 hover:bg-rose-500/10"
              >
                <XCircle className="h-5 w-5" />
                {t('order.reject')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onAdvance(order)}
                className="flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-6 py-4 text-lg font-extrabold text-slate-950 hover:bg-teal-300 active:scale-[0.99] disabled:opacity-60"
              >
                <CheckCircle className="h-6 w-6" />
                {t('q.accept')}
              </button>
            </div>
          ) : order.status === 'qabul' ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => onAdvance(order)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-4 text-lg font-extrabold text-slate-950 hover:bg-emerald-300 active:scale-[0.99] disabled:opacity-60"
            >
              <CheckCircle className="h-6 w-6" />
              {t('q.markReady')}
            </button>
          ) : (
            <p className="flex items-center justify-center gap-2 py-3 text-base font-bold text-emerald-300">
              <Truck className="h-5 w-5" />
              {t('q.readyWait')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
