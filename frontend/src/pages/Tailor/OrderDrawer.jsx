import { useEffect, useState } from 'react';
import { CheckCircle, Truck, X, XCircle } from 'lucide-react';
import OrderDetail from './OrderDetail';
import { useT } from './i18n';

/** Buyurtma tafsiloti — o'ng tomondan ochiladigan panel. Qabul / tayyor / rad etish tugmalari tepada turadi */
export default function OrderDrawer({ order, onClose, onAdvance, onReject, actionLoading, onToast }) {
  const t = useT();
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
        className="absolute inset-y-0 right-0 w-[min(960px,100vw)] overflow-y-auto bg-[#0b0f19] shadow-2xl"
        style={{ animation: 'tl-slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0f19]/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{order.customer}</p>
              <p className="font-mono text-xs text-slate-500">#{order.id}</p>
            </div>

            {order.status === 'yangi' && !rejecting && (
              <>
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="flex items-center gap-2 rounded-lg border border-rose-500/40 px-4 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/10"
                >
                  <XCircle className="h-4 w-4" />
                  {t('order.reject')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onAdvance(order)}
                  className="flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('q.accept')}
                </button>
              </>
            )}
            {order.status === 'qabul' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onAdvance(order)}
                className="flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                {t('q.markReady')}
              </button>
            )}
            {order.status === 'tayyor' && (
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Truck className="h-4 w-4" />
                {t('q.readyWait')}
              </span>
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

          {rejecting && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder={t('order.rejectReason')}
                aria-label={t('order.rejectReason')}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRejecting(false); setReason(''); }}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
                >
                  {t('order.cancel')}
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !reason.trim()}
                  onClick={submitReject}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  {t('order.rejectConfirm')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-5">
          <OrderDetail key={order.id} order={order} hideActions onStartPress={onAdvance} onReject={onReject} actionLoading={actionLoading} onToast={onToast} />
        </div>
      </div>
    </div>
  );
}
