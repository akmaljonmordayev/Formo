import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import { LANGS, translate } from './i18n';
import { TailorContext, loadPrefs, storePrefs } from './prefs';
import { cx } from './utils';
import {
  acceptTailorOrder,
  listTailorOrders,
  orderToQueueItem,
  rejectTailorOrder,
  TAILOR_NEXT_STATUS,
  updateTailorOrderStatus,
} from './tailorApi';

const OUTER_CHROME_CSS = `
  body.tailor-shell .layout__sidebar,
  body.tailor-shell .layout__header { display: none !important; }
  body.tailor-shell .layout__content { padding: 0 !important; }
  body.tailor-shell .layout__main { background: #0b0f19 !important; }
  body.tailor-shell { background: #0b0f19 !important; }

  /* Yorug' mavzu: qorong'i palitrani qayta moslaydi */
  body.tailor-shell.tailor-light, body.tailor-shell.tailor-light .layout__main { background: #f1f5f9 !important; }
  .tl-light { color-scheme: light; }
  .tl-light img[alt="Formo"] { filter: invert(1) hue-rotate(180deg); mix-blend-mode: multiply !important; }
  .tl-light .from-\\[\\#0d1322\\] { background-image: none !important; background-color: #ffffff !important; }
  .tl-light .hover\\:text-white:hover { color: #0f172a !important; }
  .tl-light .hover\\:bg-white\\/10:hover, .tl-light .hover\\:bg-white\\/5:hover { background-color: rgba(15,23,42,0.07) !important; }
  .tl-light .bg-rose-600.text-white, .tl-light .bg-rose-500.text-white { color: #ffffff !important; }
  .tl-light .bg-\\[\\#1e2b4d\\] { background-color: #e2e8f0 !important; }
  .tl-light .bg-\\[\\#281318\\] { background-color: #fff1f2 !important; }
  .tl-light .bg-\\[\\#281b10\\] { background-color: #fffbeb !important; }
  .tl-light .bg-white\\/70 { background-color: #94a3b8 !important; }
  .tl-light .bg-white\\/\\[0\\.04\\] { background-color: rgba(15,23,42,0.04) !important; }
  .tl-light .text-amber-200, .tl-light .text-amber-300, .tl-light .text-amber-400, .tl-light .text-amber-400\\/80 { color: #b45309 !important; }
  .tl-light .text-emerald-200, .tl-light .text-emerald-300, .tl-light .text-emerald-400 { color: #047857 !important; }
  .tl-light .text-cyan-300, .tl-light .text-cyan-400 { color: #0e7490 !important; }
  .tl-light .ring-white\\/10, .tl-light .ring-white\\/20 { --tw-ring-color: rgba(15,23,42,0.15) !important; }
  .tl-light .ring-\\[\\#121829\\] { --tw-ring-color: #ffffff !important; }
  .tl-light .ring-\\[\\#0b0f19\\] { --tw-ring-color: #f1f5f9 !important; }
  .tl-light .hover\\:border-white\\/20:hover, .tl-light .hover\\:border-white\\/25:hover { border-color: rgba(15,23,42,0.25) !important; }
  .tl-light .shadow-2xl { --tw-shadow-color: rgba(15,23,42,0.15); box-shadow: 0 10px 30px -10px rgba(15,23,42,0.25) !important; }
  .tl-light .text-teal-200 { color: #0f766e !important; }
  .tl-light .text-slate-800 { color: #1e293b !important; }
  .tl-light .placeholder-slate-500::placeholder, .tl-light .placeholder\\:text-slate-600::placeholder { color: #94a3b8 !important; }
  .tl-light .bg-black\\/65, .tl-light .bg-black\\/60 { background-color: rgba(15,23,42,0.35) !important; }
  .tl-light .from-white { --tw-gradient-from: #0f172a var(--tw-gradient-from-position) !important; }
  .tl-light .to-slate-300 { --tw-gradient-to: #475569 var(--tw-gradient-to-position) !important; }
  .tl-light.bg-\\[\\#0b0f19\\], .tl-light .bg-\\[\\#0b0f19\\] { background-color: #f1f5f9 !important; }
  .tl-light .bg-\\[\\#121829\\], .tl-light .bg-\\[\\#101627\\], .tl-light .tl-glass { background-color: #ffffff !important; }
  .tl-light .bg-\\[\\#0e1424\\], .tl-light .bg-\\[\\#0e1628\\] { background-color: #f8fafc !important; }
  .tl-light .bg-\\[\\#121829\\]\\/90 { background-color: rgba(255,255,255,0.95) !important; color: #0f172a !important; }
  .tl-light .bg-\\[\\#121829\\]\\/80,.tl-light .bg-\\[\\#0d1322\\]\\/80 { background-color: rgba(255,255,255,0.85) !important; }
  .tl-light .bg-\\[\\#0b0f19\\]\\/70 { background-color: rgba(241,245,249,0.8) !important; }
  .tl-light .text-white { color: #0f172a !important; }
  .tl-light .text-slate-200, .tl-light .text-slate-300 { color: #334155 !important; }
  .tl-light .text-slate-400 { color: #64748b !important; }
  .tl-light .text-slate-500, .tl-light .text-slate-600 { color: #64748b !important; }
  .tl-light .bg-teal-400 .text-white, .tl-light .bg-teal-400.text-white, .tl-light .bg-rose-500.text-white, .tl-light .bg-rose-500 .text-white { color: #fff !important; }
  .tl-light .border-white\\/10, .tl-light .border-white\\/5, .tl-light .border-white\\/20, .tl-light .divide-white\\/10 > * + *, .tl-light .divide-white\\/5 > * + * { border-color: rgba(15,23,42,0.12) !important; }
  .tl-light .bg-white\\/5 { background-color: rgba(15,23,42,0.04) !important; }
  .tl-light .bg-white\\/10 { background-color: rgba(15,23,42,0.08) !important; }
  .tl-light .text-teal-300, .tl-light .text-teal-400 { color: #0f766e !important; }
  .tl-light .text-rose-200, .tl-light .text-rose-300, .tl-light .text-rose-400 { color: #be123c !important; }
  .tl-light [class*="[color-scheme:dark]"] { color-scheme: light; }

  /* Qisqa va blur'siz: butun sahifani xiralashtirish kuchsiz kompyuterda sahifa ochilishini sekinlashtirardi */
  @keyframes tl-page-in {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: none; }
  }
  @keyframes tl-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tl-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes tl-slide-in { from { transform: translateX(100%); } to { transform: none; } }
  @keyframes tl-slide-out { from { transform: none; } to { transform: translateX(100%); } }
  @keyframes tl-pop { 0% { opacity: 0; transform: translateY(10px) scale(0.97); } 100% { opacity: 1; transform: none; } }
  @keyframes tl-drop { 0% { opacity: 0; transform: translateY(-8px) scale(0.97); } 100% { opacity: 1; transform: none; } }
  @keyframes tl-drift {
    0%, 100% { transform: translate3d(0, 0, 0); }
    50% { transform: translate3d(40px, 30px, 0); }
  }
  /* backwards: animatsiyadan keyin transform/filter qolmasin — aks holda ichidagi fixed oynalar (modal) sahifa balandligiga cho'zilib, tugmalar ekrandan tashqarida qoladi */
  .tl-page { animation: tl-page-in 0.16s ease-out backwards; }
  .tl-pop { animation: tl-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: var(--tl-delay, 0ms); }
  .tl-drop { animation: tl-drop 0.2s ease-out both; }
  .tl-glass { background: rgba(18, 24, 41, 0.72); backdrop-filter: blur(14px); }
  @media (prefers-reduced-motion: reduce) {
    .tl-page, .tl-pop, .tl-drop { animation: none !important; }
  }
`;

/* Tepa paneldagi sana va soat (Toshkent vaqti). O'z holati bor — har soniyada faqat shu qism qayta chiziladi */
function Clock({ locale }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const tz = { timeZone: 'Asia/Tashkent' };
  return (
    <div className="hidden flex-col items-end leading-tight sm:flex" aria-label={now.toLocaleString(locale, tz)}>
      <time dateTime={now.toISOString()} className="text-sm font-extrabold tabular-nums text-white">
        {now.toLocaleTimeString(locale, { ...tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </time>
      <span className="text-[11px] font-medium text-slate-400">
        {now.toLocaleDateString(locale, { ...tz, day: '2-digit', month: 'long', year: 'numeric' })}
      </span>
    </div>
  );
}

export default function TailorShell({ title, subtitle, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [prefs, setPrefs] = useState(() => loadPrefs(user?.id));
  const [orders, setOrdersState] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [prefsError, setPrefsError] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [noteReadIds, setNoteReadIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`formo_tailor_read_orders_${user?.id}`) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const notesRef = useRef(null);

  const t = useCallback((key, vars) => translate(prefs.lang, key, vars), [prefs.lang]);
  const savePrefs = useCallback((next) => {
    storePrefs(next, user?.id);
    setPrefs(next);
    setPrefsError('');
    return next;
  }, [user?.id]);
  useEffect(() => {
    setPrefs(loadPrefs(user?.id));
    setPrefsError('');
  }, [user?.id]);

  // Har so'rov tartib raqami oladi: eskirgan javob (masalan, qabul qilishdan oldin ketgan fon so'rovi) yangi holatni bosib ketmaydi
  const loadSeq = useRef(0);
  const loadsInFlight = useRef(0);
  // silent — fon yangilanishi: yuklanish holati ko'rsatilmaydi (sahifa sakramaydi)
  const reloadOrders = useCallback(async ({ silent = false } = {}) => {
    const seq = ++loadSeq.current;
    loadsInFlight.current += 1;
    if (!silent) setOrdersLoading(true);
    try {
      const freshOrders = await listTailorOrders();
      if (seq !== loadSeq.current) return;
      // Fon yangilanishida hech narsa o'zgarmagan bo'lsa — qayta chizilmaydi
      setOrdersState((prev) => (JSON.stringify(prev) === JSON.stringify(freshOrders) ? prev : freshOrders));
      setOrdersError('');
    } catch (requestError) {
      if (seq === loadSeq.current) setOrdersError(requestError.message);
    } finally {
      loadsInFlight.current -= 1;
      setOrdersLoading(false);
    }
  }, []);

  // Server javobi darhol ro'yxatga qo'llanadi (butun ro'yxat qayta yuklanishi kutilmaydi), keyin fon rejimida tekshiriladi
  const applyOrder = useCallback((apiId, updated) => {
    loadSeq.current += 1;
    const next = updated ? orderToQueueItem(updated) : null;
    setOrdersState((prev) => prev.flatMap((item) => (item.apiId !== apiId ? [item] : next ? [next] : [])));
    reloadOrders({ silent: true });
  }, [reloadOrders]);

  const processOrder = useCallback(async (order) => {
    if (!order.apiBacked || !order.apiId || !order.apiStatus) {
      return;
    }

    const isNew = order.apiStatus === 'SENT_TO_WORKSHOP';
    const nextStatus = TAILOR_NEXT_STATUS[order.apiStatus];
    if (!isNew && !nextStatus) return;
    setOrderActionLoading(true);
    try {
      const updated = isNew
        ? await acceptTailorOrder(order.apiId)
        : await updateTailorOrderStatus(order.apiId, nextStatus);
      if (updated?.items) applyOrder(order.apiId, updated);
      else await reloadOrders({ silent: true });
    } catch (requestError) {
      // Holat boshqa joyda o'zgargan bo'lishi mumkin (409) — ro'yxat serverdagi bilan tenglashtiriladi
      reloadOrders({ silent: true });
      throw requestError;
    } finally {
      setOrderActionLoading(false);
    }
  }, [applyOrder, reloadOrders]);

  const rejectOrder = useCallback(async (order, reason) => {
    setOrderActionLoading(true);
    try {
      await rejectTailorOrder(order.apiId, reason);
      // Rad etilgan buyurtma endi bu sexga tegishli emas — ro'yxatdan darhol olinadi
      applyOrder(order.apiId, null);
    } catch (requestError) {
      reloadOrders({ silent: true });
      throw requestError;
    } finally {
      setOrderActionLoading(false);
    }
  }, [applyOrder, reloadOrders]);
  const toggleTheme = async () => {
    try {
      await savePrefs({ ...prefs, theme: prefs.theme === 'light' ? 'dark' : 'light' });
    } catch {
      setPrefsError(translate(prefs.lang, 'profile.persistError'));
    }
  };
  const setLang = async (lang) => {
    try {
      await savePrefs({ ...prefs, lang });
      setPrefsError('');
    } catch {
      setPrefsError(translate(lang, 'profile.persistError'));
    }
  };

  const ctxValue = useMemo(
    () => ({
      prefs,
      savePrefs,
      orders,
      ordersLoading,
      ordersError,
      orderActionLoading,
      reloadOrders,
      processOrder,
      rejectOrder,
    }),
    [prefs, savePrefs, orders, ordersLoading, ordersError, orderActionLoading, reloadOrders, processOrder, rejectOrder]
  );

  const notes = useMemo(() => {
    const items = [];
    if (prefs.notifications.newOrders) {
      orders.filter((order) => order.status === 'yangi').forEach((order) => {
        items.push({
          id: `new-order:${order.id}`,
          title: t('note.newOrder.title'),
          text: t('note.orderStatus.text', {
            code: order.id,
            status: t(`status.${order.status}`),
          }),
          to: '/tailor',
        });
      });
    }
    if (prefs.notifications.deadline) {
      orders.filter((order) => order.deadline && order.deliveryTime && order.status !== 'tayyor')
        .forEach((order) => {
          items.push({
            id: `deadline:${order.id}:${order.deliveryTime}`,
            title: t('note.deadline.title'),
            text: t('note.deadline.text', {
              code: order.id,
              date: order.deliveryTime,
              slot: order.deadline.time,
            }),
            to: '/tailor',
          });
        });
    }
    if (prefs.notifications.summary && orders.length > 0) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
      items.push({
        id: `summary:${today}`,
        title: t('note.summary.title'),
        text: t('note.summary.text', {
          count: orders.length,
          accepted: orders.filter((order) => order.status === 'qabul').length,
          ready: orders.filter((order) => order.status === 'tayyor').length,
        }),
        to: '/tailor',
      });
    }
    return items;
  }, [orders, prefs.notifications, t]);

  const unreadNotes = notes.filter((n) => !noteReadIds.includes(n.id));
  const unreadCount = unreadNotes.length;
  useEffect(() => {
    document.body.classList.add('tailor-shell');
    return () => document.body.classList.remove('tailor-shell');
  }, []);
  useEffect(() => {
    document.body.classList.toggle('tailor-light', prefs.theme === 'light');
    return () => document.body.classList.remove('tailor-light');
  }, [prefs.theme]);

  useEffect(() => {
    reloadOrders();
    // Tab yashirin bo'lsa so'ramaymiz
    const refresh = () => {
      // Oldingi so'rov hali tugamagan bo'lsa (sekin internet) — ustiga yangisi yuborilmaydi
      if (!document.hidden && loadsInFlight.current === 0) reloadOrders({ silent: true });
    };
    const timer = window.setInterval(refresh, 5_000);
    // Tabga qaytganda yoki internet tiklanganda darhol yangilanadi
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [reloadOrders]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (notesRef.current && !notesRef.current.contains(e.target)) setNotesOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const saveReadIds = (next) => {
    setNoteReadIds(next);
    try {
      localStorage.setItem(`formo_tailor_read_orders_${user?.id}`, JSON.stringify(next));
    } catch {
      // Reading statuses still works when browser storage is unavailable.
    }
  };

  const openNote = (note) => {
    if (!noteReadIds.includes(note.id)) saveReadIds([...noteReadIds, note.id]);
    setNotesOpen(false);
    navigate(note.to);
  };

  return (
    <TailorContext.Provider value={ctxValue}>
      <div className={cx('relative min-h-screen bg-[#0b0f19] text-slate-200', prefs.theme === 'light' && 'tl-light')}>
        <style>{OUTER_CHROME_CSS}</style>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-teal-500/10 blur-3xl"
          />
          <div
            className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-indigo-500/10 blur-3xl"
          />
        </div>

        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="relative lg:pl-[264px]">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/70 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button
                type="button"
                aria-label={t('shell.openMenu')}
                onClick={() => setMenuOpen(true)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate bg-gradient-to-r from-white to-slate-300 bg-clip-text text-lg font-extrabold text-transparent">{t(title)}</h1>
                {subtitle && <p className="truncate text-xs font-medium text-slate-400">{t(subtitle)}</p>}
              </div>

              <div className="flex items-center gap-3">
                <Clock locale={t.locale} />
                <div className="flex rounded-xl border border-white/10 bg-[#121829] p-0.5" role="group" aria-label={t('shell.lang')}>
                  {LANGS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLang(l.value)}
                      aria-pressed={prefs.lang === l.value}
                      className={cx(
                        'rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold uppercase transition',
                        prefs.lang === l.value
                          ? 'bg-teal-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {l.shortLabel}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={t('shell.theme')}
                  title={t('shell.theme')}
                  onClick={toggleTheme}
                  className="rounded-xl border border-white/10 bg-[#121829] p-2 text-slate-300 transition hover:bg-white/10"
                >
                  {prefs.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
                <div className="relative" ref={notesRef}>
                  <button
                    type="button"
                    aria-label={t('shell.notifications')}
                    onClick={() => {
                      setNotesOpen((v) => !v);
                    }}
                    className="relative rounded-xl border border-white/10 bg-[#121829] p-2 text-slate-300 transition hover:bg-white/10"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-[#0b0f19]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notesOpen && (
                    <div className="tl-drop absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#121829] shadow-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <p className="text-xs font-extrabold text-white">{t('shell.notifications')}</p>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => saveReadIds(notes.map((n) => n.id))}
                            className="text-[10px] font-bold text-teal-400 hover:text-teal-300"
                          >
                            {t('shell.markAllRead')}
                          </button>
                        )}
                      </div>
                      <p className="border-b border-white/5 px-4 py-2 text-[10px] text-slate-500">
                        {t('note.currentStatuses')}
                      </p>
                      <div className="max-h-80 overflow-y-auto">
                        {unreadNotes.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">{t('note.empty')}</p>}
                        {unreadNotes.map((note) => {
                          const unread = !noteReadIds.includes(note.id);
                          return (
                            <button
                              key={note.id}
                              type="button"
                              onClick={() => openNote(note)}
                              className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-0"
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-white">{note.title}</span>
                                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />}
                              </div>
                              <span className="text-[11px] text-slate-400">{note.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {prefsError && (
            <div role="alert" className="mx-4 mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200 sm:mx-6">
              {prefsError}
            </div>
          )}

          <main key={pathname} className="tl-page p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </TailorContext.Provider>
  );
}
