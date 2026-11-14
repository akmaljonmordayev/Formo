import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LogoutConfirm from './LogoutConfirm';
import Sidebar from './Sidebar';
import { LANGS, translate } from './i18n';
import { TailorContext, loadPrefs, storePrefs } from './prefs';
import { cx } from './utils';
import './tailorLight.css';
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

  /* Qisqa va blur'siz: butun sahifani xiralashtirish kuchsiz kompyuterda sahifa ochilishini sekinlashtirardi */
  @keyframes tl-page-in {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: none; }
  }
  @keyframes tl-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tl-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes tl-slide-in { from { transform: translateX(100%); } to { transform: none; } }
  @keyframes tl-slide-out { from { transform: none; } to { transform: translateX(100%); } }
  @keyframes tl-sheet-in { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes tl-sheet-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(16px) scale(0.98); } }
  @keyframes tl-pop { 0% { opacity: 0; transform: translateY(10px) scale(0.97); } 100% { opacity: 1; transform: none; } }
  @keyframes tl-drop { 0% { opacity: 0; transform: translateY(-8px) scale(0.97); } 100% { opacity: 1; transform: none; } }
  @keyframes tl-bar-rise { from { transform: scaleY(0); } to { transform: none; } }
  @keyframes tl-drift {
    0%, 100% { transform: translate3d(0, 0, 0); }
    50% { transform: translate3d(40px, 30px, 0); }
  }
  /* backwards: animatsiyadan keyin transform/filter qolmasin — aks holda ichidagi fixed oynalar (modal) sahifa balandligiga cho'zilib, tugmalar ekrandan tashqarida qoladi */
  .tl-page { animation: tl-page-in 0.16s ease-out backwards; }
  .tl-pop { animation: tl-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: var(--tl-delay, 0ms); }
  .tl-drop { animation: tl-drop 0.2s ease-out both; }
  /* Statistika ustunlari: pastdan ko'tarilib chiqadi, navbat bilan */
  .tl-bar { transform-origin: bottom; animation: tl-bar-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) backwards; animation-delay: var(--tl-delay, 0ms); }
  .tl-glass { background: rgba(18, 24, 41, 0.72); backdrop-filter: blur(14px); }
  @media (prefers-reduced-motion: reduce) {
    .tl-page, .tl-pop, .tl-drop, .tl-bar { animation: none !important; }
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

  // Chiqish tasdig'i bitta joyda: yon menyu ham, profil sahifasi ham shu oynani ochadi
  const [logoutOpen, setLogoutOpen] = useState(false);
  const askLogout = useCallback(() => setLogoutOpen(true), []);
  const closeLogout = useCallback(() => setLogoutOpen(false), []);

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
      askLogout,
    }),
    [prefs, savePrefs, orders, ordersLoading, ordersError, orderActionLoading, reloadOrders, processOrder, rejectOrder, askLogout]
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
      <div className={cx('relative min-h-screen text-slate-200', prefs.theme === 'light' ? 'tl-light-root bg-[#f3f4f6]' : 'bg-[#0b0f19]')}>
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

        <div className={cx('relative lg:pl-[264px]', prefs.theme === 'light' && 'tl-light')}>
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
          <LogoutConfirm open={logoutOpen} onClose={closeLogout} />
        </div>
      </div>
    </TailorContext.Provider>
  );
}
