import { ChevronRight } from 'lucide-react';
import { memo } from 'react';
import { bottomStatus, useT } from './i18n';
import { JerseyMini } from './ui';
import { frameUrl, lineVariant, teamForClub } from './OrderKitView';
import { cx } from './utils';

const STRIP = {
  late: 'bg-rose-500',
  today: 'bg-amber-400',
  upcoming: 'bg-slate-500',
  nodate: 'bg-slate-600',
  ready: 'bg-emerald-400',
};

const STATUS_PILL = {
  yangi: 'bg-amber-400/20 text-amber-300',
  qabul: 'bg-teal-400/20 text-teal-300',
  tayyor: 'bg-emerald-400/20 text-emerald-300',
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

/** Forma rasmi: klubning haqiqiy surati (oldi tomoni), bo'lmasa — rangli chizma */
function KitThumb({ line, compact = false }) {
  const team = teamForClub(line.clubName, line.kit360Id);
  const src = team ? frameUrl(team.id, 0, lineVariant(line)) : null;
  if (!src) {
    return (
      <JerseyMini
        color={line.jerseyColor}
        number={line.number}
        name={line.name}
        shorts={line.withBottom}
        pants={line.bottom === 'pants'}
        shortsNumber={line.bottomNumber}
      />
    );
  }
  return (
    <div className={cx('shrink-0 overflow-hidden rounded-lg bg-[#b2b2b3]', compact ? 'h-28 w-20' : 'h-44 w-32')}>
      <img src={src} alt={team.name} loading="lazy" decoding="async" className="h-full w-full origin-[50%_36%] scale-[1.4] object-cover" />
    </div>
  );
}

// Kartada ko'rsatiladigan forma qatorlari soni (qolgani "+N" bilan — to'liq ro'yxat buyurtma ichida)
const MAX_LINES = 3;

/** Ixcham qator: tartib raqami · forma · mijoz va kod · muddat · holat. Qabul va tayyor qilish — faqat buyurtma ochilgandan keyin (formani ko'rib) */
function OrderCard({ order, index, bucket, onOpen }) {
  const t = useT();
  const lines = order.lines ?? [];

  return (
    <article
      onClick={() => onOpen(order)}
      className={cx(
        'relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#121829] pl-6 pr-4 transition hover:border-teal-400/60 sm:flex-row sm:items-center',
        bucket === 'ready' ? 'py-2' : 'py-3'
      )}
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

      {lines[0] && <KitThumb line={lines[0]} compact={bucket === 'ready'} />}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-white">
          {order.customer} <span className="ml-1 font-mono text-xs font-normal text-slate-500">#{order.id}</span>
        </p>
        {lines.length > 1 && (
          <p className="mt-0.5 text-xs font-bold text-amber-300">{t('order.itemsShort', { n: lines.length })}</p>
        )}
        {/* Har forma alohida qator: nima tikiladi, ism · raqam va pastki qism (shortik/shalvar, raqamli yoki yo'q) */}
        {lines.slice(0, MAX_LINES).map((line) => (
          <div key={line.key} className="mt-1">
            <p className="truncate text-xs text-slate-400">
              {[line.clubName, line.kitLabel, line.size, `×${line.qty}`].filter(Boolean).join(' · ')}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-cyan-300">
              {(line.name || line.number) && <span>{[line.name, line.number].filter(Boolean).join(' · ')}</span>}
              <span
                className={cx(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
                  line.bottom === 'pants' && line.withBottom ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/10 text-slate-300'
                )}
              >
                {bottomStatus(t, line)}
              </span>
            </p>
          </div>
        ))}
        {lines.length > MAX_LINES && <p className="mt-0.5 text-xs font-bold text-slate-400">+{lines.length - MAX_LINES}</p>}
        <p className={cx('mt-0.5 text-sm font-semibold', DEADLINE_TEXT[bucket])}>{deadlineText(t, order, bucket)}</p>
      </div>

      <div className="flex items-center gap-2 sm:w-52 sm:justify-end">
        <span className={cx('rounded-full px-3 py-1 text-xs font-bold', STATUS_PILL[order.status])}>
          {order.status === 'tayyor' ? t('q.readyWait') : t(`status.${order.status}`)}
        </span>
        <ChevronRight className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>
    </article>
  );
}

// Ro'yxat har 5 soniyada yangilanadi — o'zgarmagan kartalar qayta chizilmaydi
export default memo(OrderCard);
