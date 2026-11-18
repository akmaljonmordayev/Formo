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
        .sort((a, b) => new Date(b.readyAt ?? b.createdAt) - new Date(a.readyAt ?? a.createdAt))
        .map((order) => ({ order, bucket: 'ready' }));
    }
    const groups = groupActiveOrders(orders);
    const buckets = view === 'late' ? ['late'] : ['today', 'upcoming', 'nodate'];
    return buckets.flatMap((bucket) => groups[bucket].map((order) => ({ order, bucket })));
  }, [orders, view]);

  // Faol ro'yxatda yangi (qabul kutayotgan) buyurtmalar tepada, alohida bo'limda.
  // Tartib raqami har bo'limda 1 dan, bo'lim ichidagi sahifalar bo'yicha uzluksiz — keyingi sahifa 11 dan davom etadi
  const { numbered, counts } = useMemo(() => {
    const today = tashkentDay(Date.now());
    const sectionOf = ({ order }) => {
      if (view === 'ready') return tashkentDay(order.readyAt ?? order.createdAt) === today ? 'readyToday' : 'readyOld';
      // Kechikkanlar: bugungi sloti o'tib ketganlar va avvalgi kunlardan qolganlar
      if (view === 'late') return order.daysLate > 0 ? 'lateOld' : 'lateToday';
      return view !== 'active' ? view : order.status === 'yangi' ? 'new' : 'progress';
    };
    const counts = {};
    const numbered = rows.map((row) => {
      const section = sectionOf(row);
      counts[section] = (counts[section] ?? 0) + 1;
      return { ...row, section, n: counts[section] };
    });
    return { numbered, counts };
  }, [rows, view]);

  // Har bo'limning o'z sahifasi (10 tadan); bo'lim almashganda hammasi birinchi sahifaga qaytadi
  const [pages, setPages] = useState({});
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    setPages({});
  }
  const sectionRefs = useRef({});
  const goTo = (key, next) => {
    setPages((prev) => ({ ...prev, [key]: next }));
    sectionRefs.current[key]?.scrollIntoView({ block: 'start' });
  };

  const paged = (key) => {
    const all = numbered.filter((row) => row.section === key);
    const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    const current = Math.min(pages[key] ?? 0, pageCount - 1);
    return { key, pageCount, current, rows: all.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE) };
  };

  const sections = [
    { key: 'new', title: t('q.new') },
    { key: 'progress', title: t('prod.inProgress') },
    { key: 'lateToday', title: t('q.lateTodayTitle') },
    { key: 'lateOld', title: t('q.lateOldTitle') },
  ]
    .map((section) => ({ ...section, ...paged(section.key) }))
    .filter((section) => section.rows.length > 0);

  // Tayyorlar: ikki ustun — chapda bugungilar, o'ngda avvalgi kunlarniki; har ustun o'zicha 10 tadan sahifalanadi
  const readyColumns = view === 'ready'
    ? [
        { key: 'readyToday', title: t('prod.readyToday'), empty: t('prod.emptyReadyToday') },
        { key: 'readyOld', title: t('prod.readyOld'), empty: t('prod.emptyReadyOld') },
      ].map((col) => ({ ...col, ...paged(col.key) }))
    : null;

  const pager = ({ key, title, rows: shown, pageCount, current }) =>
    pageCount > 1 && (
      <nav aria-label={title} className="flex items-center justify-center gap-4 pt-1">
        <button
          type="button"
          aria-label={t('orders.prev')}
          disabled={current === 0}
          onClick={() => goTo(key, current - 1)}
          className={PAGE_BTN}
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold tabular-nums text-slate-300">
          {shown[0].n}–{shown[shown.length - 1].n} / {counts[key]}
        </span>
        <button
          type="button"
          aria-label={t('orders.next')}
          disabled={current === pageCount - 1}
          onClick={() => goTo(key, current + 1)}
          className={PAGE_BTN}
        >
          <ChevronRight className="h-6 w-6" aria-hidden="true" />
        </button>
      </nav>
    );

  const opened = orders.find((o) => o.id === openId) ?? null;
  // Barqaror havola — OrderCard (memo) har yangilanishda qayta chizilmasin
  const open = useCallback((o) => setOpenId(o.id), []);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <div className="space-y-3">
      {toastView}
      {ordersError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{ordersError}</div>
      )}

      {readyColumns && rows.length > 0 && (
        <>
          {/* Tepada ikkala ustunning jami soni */}
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {readyColumns.map(({ key, title }) => (
              <span key={key} className="rounded-full border border-white/10 bg-[#121829] px-4 py-1.5 text-slate-200">
                {title}: <b className="tabular-nums text-white">{counts[key] ?? 0}</b>
              </span>
            ))}
            <span className="rounded-full bg-emerald-400/15 px-4 py-1.5 text-emerald-300">
              {t('prod.readyAll')}: <b className="tabular-nums">{rows.length}</b>
            </span>
          </div>
          <div className="grid items-start gap-4 md:grid-cols-2">
            {readyColumns.map((col) => (
              <section key={col.key} ref={(el) => { sectionRefs.current[col.key] = el; }} className="scroll-mt-4 space-y-2">
                <h2 className="flex items-center gap-2 pt-2 text-sm font-bold uppercase tracking-wide text-slate-300">
                  {col.title}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{counts[col.key] ?? 0}</span>
                </h2>
                {col.rows.map(({ order, bucket, n }) => (
                  <OrderCard key={order.id} index={n} order={order} bucket={bucket} onOpen={open} />
                ))}
                {col.rows.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">{col.empty}</p>
                )}
                {pager(col)}
              </section>
            ))}
          </div>
        </>
      )}

      {!readyColumns && sections.map(({ key, title, rows: sectionRows, pageCount, current }) => (
        <section key={key} ref={(el) => { sectionRefs.current[key] = el; }} className="scroll-mt-4 space-y-3">
          <h2 className="flex items-center gap-2 pt-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            {title}
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{counts[key]}</span>
          </h2>
          {sectionRows.map(({ order, bucket, n }) => (
            <OrderCard
              key={order.id}
              index={n}
              order={order}
              bucket={bucket}
              onOpen={open}
            />
          ))}
          {pager({ key, title, rows: sectionRows, pageCount, current })}
        </section>
      ))}

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
