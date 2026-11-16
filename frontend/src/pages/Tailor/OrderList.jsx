import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import OrderCard from './OrderCard';
import OrderDrawer from './OrderDrawer';
import { groupActiveOrders } from './orderBuckets';
import { useT } from './i18n';
import { useTailor } from './prefs';

// Toshkent vaqti bo'yicha sana ('YYYY-MM-DD') — tayyorlar "bugun" va "avvalgilar"ga shu bo'yicha ajratiladi
const tashkentDay = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
import useOrderActions from './useOrderActions';

const PAGE_SIZE = 10;
const PAGE_BTN = 'flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#121829] text-white transition hover:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-30';

/** Bitta tekis ro'yxat. view: active (kechikmagan, muddat bo'yicha) | late (kechikkanlar) | ready (tayyorlar) */
export default function OrderList({ view }) {
  const t = useT();
  const { orders = [], ordersError = '', ordersLoading = false } = useTailor() ?? {};
  const { advance, reject, toastView, actionLoading } = useOrderActions();
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    if (view === 'ready') {
      // Eng oxirgi tayyor bo'lgani tepada, eskilari pastda
      return orders
        .filter((o) => o.status === 'tayyor')
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt))
        .map((order) => ({ order, bucket: 'ready' }));
    }
    const groups = groupActiveOrders(orders);
    const buckets = view === 'late' ? ['late'] : ['today', 'upcoming', 'nodate'];
    return buckets.flatMap((bucket) => groups[bucket].map((order) => ({ order, bucket })));
  }, [orders, view]);

  // Faol ro'yxatda yangi (qabul kutayotgan) buyurtmalar tepada, alohida bo'limda.
  // Tartib raqami butun ro'yxat bo'yicha uzluksiz — keyingi sahifa 11 dan davom etadi
  const { numbered, counts } = useMemo(() => {
    const today = tashkentDay(Date.now());
    const sectionOf = ({ order }) => {
      if (view === 'ready') return tashkentDay(order.updatedAt ?? order.createdAt) === today ? 'readyToday' : 'readyOld';
      return view !== 'active' ? view : order.status === 'yangi' ? 'new' : 'progress';
    };
    const ordered = view === 'active'
      ? [...rows.filter((row) => sectionOf(row) === 'new'), ...rows.filter((row) => sectionOf(row) === 'progress')]
      : rows;
    const counts = {};
    const numbered = ordered.map((row, i) => {
      const section = sectionOf(row);
      counts[section] = (counts[section] ?? 0) + 1;
      return { ...row, section, n: i + 1 };
    });
    return { numbered, counts };
  }, [rows, view]);

  // Sahifada 10 tadan buyurtma; bo'lim almashganda birinchi sahifaga qaytadi
  const [page, setPage] = useState(0);
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(numbered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = numbered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const topRef = useRef(null);
  const goTo = (next) => {
    setPage(next);
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  const sections = [
    { key: 'new', title: t('q.new') },
    { key: 'progress', title: t('prod.inProgress') },
    { key: 'readyToday', title: t('prod.readyToday') },
    { key: 'readyOld', title: t('prod.readyOld') },
    { key: view },
  ]
    .map((section) => ({ ...section, rows: pageRows.filter((row) => row.section === section.key) }))
    .filter((section) => section.rows.length > 0);

  const opened = orders.find((o) => o.id === openId) ?? null;
  // Barqaror havola — OrderCard (memo) har yangilanishda qayta chizilmasin
  const open = useCallback((o) => setOpenId(o.id), []);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <div ref={topRef} className="space-y-3">
      {toastView}
      {ordersError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{ordersError}</div>
      )}

      {sections.map(({ key, title, rows: sectionRows }) => (
        <section key={key} className="space-y-3">
          {title && (
            <h2 className="flex items-center gap-2 pt-2 text-sm font-bold uppercase tracking-wide text-slate-300">
              {title}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{counts[key]}</span>
            </h2>
          )}
          <div className={view === 'ready' ? 'grid gap-2 md:grid-cols-2' : 'space-y-3'}>
          {sectionRows.map(({ order, bucket, n }) => (
            <OrderCard
              key={order.id}
              index={n}
              order={order}
              bucket={bucket}
              onOpen={open}
            />
          ))}
          </div>
        </section>
      ))}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            aria-label={t('orders.prev')}
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
            className={PAGE_BTN}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold tabular-nums text-slate-300">
            {pageRows[0].n}–{pageRows[pageRows.length - 1].n} / {numbered.length}
          </span>
          <button
            type="button"
            aria-label={t('orders.next')}
            disabled={current === pageCount - 1}
            onClick={() => goTo(current + 1)}
            className={PAGE_BTN}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </nav>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#121829] px-6 py-12 text-center text-sm text-slate-400">
          {ordersLoading ? t('api.loading') : view === 'ready' ? t('prod.emptyReady') : view === 'late' ? t('q.emptyLate') : t('q.allDone')}
        </div>
      )}

      <p className="sticky bottom-3 z-20 mx-auto w-fit rounded-full border border-white/10 bg-[#121829]/90 px-5 py-2 text-center text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-md">
        {t(view === 'late' ? 'orders.totalLate' : view === 'ready' ? 'orders.totalReady' : 'orders.total', { n: rows.length })}
      </p>

      <OrderDrawer
        order={opened}
        onClose={close}
        onAdvance={advance}
        onReject={reject}
        actionLoading={actionLoading}
      />
    </div>
  );
}
