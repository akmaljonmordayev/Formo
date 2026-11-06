import { CheckCircle, Truck } from 'lucide-react';
import { useT } from './i18n';
import { cx } from './utils';

const STRIP = {
  late: 'bg-rose-500',
  today: 'bg-amber-400',
  upcoming: 'bg-slate-500',
  nodate: 'bg-slate-600',
  ready: 'bg-emerald-400',
};

const DEADLINE_TEXT = {
  late: 'text-rose-400',
  today: 'text-amber-300',
  upcoming: 'text-slate-300',
  nodate: 'text-slate-400',
  ready: 'text-emerald-400',
};

/** Muddat yozuvi: "2 kun kechikdi" / "Bugun · 14:00-18:00" / "07.11.2026 · 10:00-14:00" */
function deadlineText(t, order, bucket) {
  const slot = order.deadline?.time ?? '';
  if (bucket === 'ready') return t('q.readyState');
  if (bucket === 'late') {
    const late = order.daysLate > 0 ? t('q.lateDays', { n: order.daysLate }) : t('q.lateToday');
    return slot ? `${late} · ${slot}` : late;
  }
  if (bucket === 'today') return t('q.dueToday', { slot });
  if (!order.deliveryTime) return t('q.noDate');
  const date = new Date(order.deliveryTime).toLocaleDateString(t.locale, { timeZone: 'UTC' });
  return slot ? `${date} · ${slot}` : date;
}

/** Ixcham qator: tartib raqami · mijoz va kod · muddat · tugma. Qolgani — bosganda ochiladi */
export default function OrderCard({ order, index, bucket, onOpen, onAdvance, actionLoading }) {
  const t = useT();
  const canAdvance = order.status === 'yangi' || order.status === 'qabul';

  return (
    <article
      onClick={() => onOpen(order)}
      className="relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#121829] py-3 pl-6 pr-4 transition hover:border-teal-400/60 sm:flex-row sm:items-center"
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1.5', STRIP[bucket])} />
      <span
        aria-label={`№ ${index}`}
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-extrabold tabular-nums',
          bucket === 'late' ? 'bg-rose-500 text-white' : 'bg-white/10 text-white'
        )}
      >
        {index}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-white">
          {order.customer} <span className="ml-1 font-mono text-xs font-normal text-slate-500">#{order.id}</span>
        </p>
        <p className={cx('mt-0.5 text-sm font-semibold', DEADLINE_TEXT[bucket])}>{deadlineText(t, order, bucket)}</p>
      </div>

      <div className="sm:w-40">
        {canAdvance ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={(e) => { e.stopPropagation(); onAdvance(order); }}
            className={cx(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-950 transition active:scale-95 disabled:opacity-60',
              order.status === 'yangi' ? 'bg-teal-400 hover:bg-teal-300' : 'bg-emerald-400 hover:bg-emerald-300'
            )}
          >
            <CheckCircle className="h-4 w-4" />
            {order.status === 'yangi' ? t('q.accept') : t('q.markReady')}
          </button>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300">
            <Truck className="h-4 w-4 shrink-0" />
            {t('q.readyWait')}
          </p>
        )}
      </div>
    </article>
  );
}
