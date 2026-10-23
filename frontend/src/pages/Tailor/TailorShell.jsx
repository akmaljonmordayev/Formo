import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './tailor.css';
import Sidebar from './Sidebar';
import { LANGS, translate } from './i18n';
import { TailorContext, loadPrefs, storePrefs } from './prefs';
import { cx } from './utils';
import {
  acceptTailorOrder,
  listTailorOrders,
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
`;

export default function TailorShell({ title, subtitle, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const reloadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const freshOrders = await listTailorOrders();
      setOrdersState(freshOrders);
    } catch (requestError) {
      setOrdersError(requestError.message);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const processOrder = useCallback(async (order) => {
    if (!order.apiBacked || !order.apiId || !order.apiStatus) {
      return;
    }

    const isNew = order.apiStatus === 'SENT_TO_WORKSHOP';
    const nextStatus = TAILOR_NEXT_STATUS[order.apiStatus];
    if (!isNew && !nextStatus) return;
    setOrderActionLoading(true);
    try {
      if (isNew) await acceptTailorOrder(order.apiId);
      else await updateTailorOrderStatus(order.apiId, nextStatus);
      await reloadOrders();
    } finally {
      setOrderActionLoading(false);
    }
  }, [reloadOrders]);

  const rejectOrder = useCallback(async (order, reason) => {
    setOrderActionLoading(true);
    try {
      await rejectTailorOrder(order.apiId, reason);
      await reloadOrders();
    } finally {
      setOrderActionLoading(false);
    }
  }, [reloadOrders]);
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

  const unreadCount = notes.filter((n) => !noteReadIds.includes(n.id)).length;
  useEffect(() => {
    document.body.classList.add('tailor-shell');
    return () => document.body.classList.remove('tailor-shell');
  }, []);

  useEffect(() => {
    reloadOrders();
    const timer = window.setInterval(reloadOrders, 30_000);
    return () => window.clearInterval(timer);
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
      <div className="tailor-app min-h-screen bg-[#0b0f19] text-slate-200">
        <style>{OUTER_CHROME_CSS}</style>

        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="lg:pl-[264px]">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-md">
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
                <h1 className="truncate text-lg font-extrabold text-white">{t(title)}</h1>
                {subtitle && <p className="truncate text-xs font-medium text-slate-400">{t(subtitle)}</p>}
              </div>

              <div className="flex items-center gap-2">
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
                    <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#121829] shadow-2xl">
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
                        {notes.map((note) => {
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

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </TailorContext.Provider>
  );
}
