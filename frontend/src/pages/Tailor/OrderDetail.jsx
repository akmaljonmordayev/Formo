import { useState } from 'react';
import { Clock } from 'lucide-react';
import OrderKitView from './OrderKitView';
import { bottomStatus, useT, orderDeadline } from './i18n';
import { cx } from './utils';

const BADGE_STYLES = {
  yangi: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
  qabul: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  tayyor: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

/**
 * Bir ekranga sig'adigan buyurtma ko'rinishi: chapda forma, o'ngda faqat tikish uchun kerakli ma'lumotlar.
 * Buyurtmada bir nechta forma bo'lsa (masalan biri shortikli, biri shalvarli) — tepadagi tugmalar bilan almashtiriladi.
 * Qabul / tayyor / rad etish / brak tugmalari OrderDrawer tepasida turadi.
 */
export default function OrderDetail({ order }) {
  const t = useT();
  const [active, setActive] = useState(0);

  if (!order) return null;

  const lines = order.lines ?? [];
  const line = lines[Math.min(active, lines.length - 1)];
  if (!line) return null;
  // Manzil va izoh ro'yxat javobida bor — alohida so'rov kutilmaydi
  const api = order.apiOrder ?? {};

  const statusBadge = (
    <span className="inline-block rounded-full bg-[#0b1220] shadow-lg">
      <span className={cx('inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase', BADGE_STYLES[order.status] ?? BADGE_STYLES.qabul)}>
        {t(`status.${order.status}`)}
      </span>
    </span>
  );

  const pants = line.bottom === 'pants';
  const none = t('order.spec.none');
  const specs = [
    { label: t('order.spec.name'), value: line.name || none, muted: !line.name },
    { label: t('order.spec.number'), value: line.number || none, isHighlight: Boolean(line.number), big: Boolean(line.number), muted: !line.number },
    { label: t('order.spec.shirtSize'), value: line.size, big: true },
    { label: t('order.spec.qty'), value: t('order.qtyUnit', { n: line.qty }) },
    { label: t('order.spec.top'), value: t(`order.sleeve.${line.sleeve}`) },
    { label: t('order.spec.bottom'), value: line.withBottom ? t(`order.bottom.${line.bottom}`) : none, isHighlight: line.withBottom && pants, muted: !line.withBottom },
    line.withBottom && { label: t(pants ? 'order.spec.pantsSize' : 'order.spec.shortsSize'), value: line.bottomSize, big: true },
    line.withBottom && {
      label: t(pants ? 'order.spec.pantsNumber' : 'order.spec.shortsNumber'),
      value: line.bottomNumber ? `${t('order.yes')} · ${line.bottomNumber}` : t('order.no'),
      isHighlight: Boolean(line.bottomNumber),
    },
    { label: t('order.spec.club'), value: line.clubName || line.kitDesign?.name },
    { label: t('order.spec.kit'), value: line.kitLabel },
  ].filter((item) => item && item.value !== undefined && item.value !== null && item.value !== '');

  const notes = [
    {
      label: t('order.address'),
      value: api.deliveryAddress,
      // Mijoz xaritada belgilagan aniq nuqta (bo'lsa) — manzil bosilganda xaritada ochiladi
      href:
        typeof api.deliveryLat === 'number' && typeof api.deliveryLng === 'number'
          ? `https://yandex.uz/maps/?pt=${api.deliveryLng},${api.deliveryLat}&z=17&l=map`
          : null,
    },
    { label: t('order.comment'), value: api.comment },
  ].filter((item) => item.value);

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 1 && (
        <div className="rounded-2xl border border-white/10 bg-[#0e1424] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('order.items', { n: lines.length, qty: order.qty })}
          </p>
          <div className="flex flex-wrap gap-2" role="tablist">
            {lines.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={item === line}
                onClick={() => setActive(index)}
                className={cx(
                  'rounded-xl px-4 py-2.5 text-left text-sm font-bold transition',
                  item === line ? 'bg-teal-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="block">{index + 1}. {[item.clubName, item.size, `×${item.qty}`].filter(Boolean).join(' · ')}</span>
                <span className="block text-xs font-semibold opacity-80">{bottomStatus(t, item)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <OrderKitView line={line} statusBadge={statusBadge} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-[#281b10] px-4 py-3">
            <Clock className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400/80">{t('order.deadline')}</span>
              <p className="text-sm font-extrabold text-amber-200">{orderDeadline(t, order)}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl border border-white/10 bg-[#0e1424] p-5">
            {specs.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</dt>
                <dd
                  className={cx(
                    'mt-1 truncate font-extrabold',
                    item.big ? 'text-2xl' : 'text-base',
                    item.muted ? 'text-slate-400' : item.isHighlight ? 'text-cyan-400' : 'text-white'
                  )}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {notes.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0e1424] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
              <p className="mt-1 break-words text-sm font-bold text-white">{item.value}</p>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-amber-400 underline">
                  {t('order.openMap')}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
