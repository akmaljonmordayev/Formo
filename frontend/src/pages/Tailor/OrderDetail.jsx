import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import OrderKitView, { orderVariant } from './OrderKitView';
import { useT, orderDeadline } from './i18n';
import { cx } from './utils';
import { getTailorOrder } from './tailorApi';

const BADGE_STYLES = {
  yangi: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
  qabul: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  tayyor: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

/**
 * Bir ekranga sig'adigan buyurtma ko'rinishi: chapda forma, o'ngda faqat tikish uchun kerakli ma'lumotlar.
 * Qabul / tayyor / rad etish / brak tugmalari OrderDrawer tepasida turadi.
 */
export default function OrderDetail({ order }) {
  const t = useT();
  const [fullOrder, setFullOrder] = useState(null);

  // Manzil va izoh ro'yxatda yo'q — tanlangan buyurtma uchun alohida olinadi
  const apiId = order?.apiId;
  useEffect(() => {
    setFullOrder(null);
    if (!apiId) return undefined;
    let cancelled = false;
    getTailorOrder(apiId)
      .then((data) => { if (!cancelled) setFullOrder(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [apiId, order?.apiStatus]);

  if (!order) return null;

  const statusBadge = (
    <span className="inline-block rounded-full bg-[#0b1220] shadow-lg">
      <span className={cx('inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase', BADGE_STYLES[order.status] ?? BADGE_STYLES.qabul)}>
        {t(`status.${order.status}`)}
      </span>
    </span>
  );

  const specs = [
    { label: t('order.spec.name'), value: order.apiPrintName || order.customer },
    { label: t('order.spec.number'), value: order.number, isHighlight: true, big: true },
    { label: t('order.spec.size'), value: order.size, big: true },
    { label: t('order.spec.qty'), value: t('order.qtyUnit', { n: order.qty }) },
    { label: t(orderVariant(order) === 'l' ? 'order.spec.pantsNumber' : 'order.spec.shortsNumber'), value: order.shortsNumber ? t('order.yes') : t('order.no'), isHighlight: Boolean(order.shortsNumber) },
    { label: t('order.spec.club'), value: order.clubName || order.kitDesign?.name },
  ].filter((item) => item.value !== undefined && item.value !== null && item.value !== '');

  const notes = [
    { label: t('order.address'), value: fullOrder?.deliveryAddress },
    { label: t('order.comment'), value: fullOrder?.comment },
  ].filter((item) => item.value);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <OrderKitView order={order} statusBadge={statusBadge} />

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
              <dd className={cx('mt-1 truncate font-extrabold', item.big ? 'text-2xl' : 'text-base', item.isHighlight ? 'text-cyan-400' : 'text-white')}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {notes.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0e1424] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
            <p className="mt-1 break-words text-sm font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
