import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Send } from 'lucide-react';
import { chatApi, supportApi } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useLang } from '../i18n';
import './messages.css';

const POLL_MS = 5000;
const NEAR_BOTTOM = 120;

// Sahifa ko'rinib turgandagina `fn` ni har POLL_MS da chaqiradi; tab yashirilsa yoki unmount bo'lsa to'xtaydi
function usePolling(fn) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let timer = null;
    let busy = false;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(async () => {
        // Sekin serverda so'rovlar ustma-ust yig'ilmasin
        if (busy) return;
        busy = true;
        try {
          await ref.current();
        } finally {
          busy = false;
        }
      }, POLL_MS);
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        ref.current();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

const MODES = [
  { id: 'customers', label: 'Mijozlar', api: supportApi },
  { id: 'workshops', label: 'Sexlar', api: chatApi },
];

/**
 * Xabarlar (operator paneli o'rniga): mobil ilova mijozlarining "Yordam chati" va tikuv sexlari bilan yozishma.
 * Ro'yxat va ochiq suhbat har 5 soniyada yangilanadi (sahifa ko'rinib turganda).
 */
export default function SuperadminMessages() {
  const { t, locale } = useLang();
  const [mode, setMode] = useState('customers');
  const api = MODES.find((m) => m.id === mode).api;
  // Tab almashganda eski rejimdan kechikib kelgan javob ro'yxatni bosib ketmasin
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const bodyRef = useRef(null);
  const stickRef = useRef(true);
  const lastIdRef = useRef(0);
  const activeRef = useRef(null);

  const loadThreads = useCallback(async () => {
    const requested = mode;
    try {
      const list = await api.threads();
      if (modeRef.current !== requested) return;
      setThreads(list);
      setError('');
    } catch (err) {
      if (modeRef.current !== requested) return;
      setError(err.message);
      setThreads((prev) => prev ?? []);
    }
  }, [api, mode]);

  // Yangi xabarlarni qo'shadi (id bo'yicha takrorlanmaydi)
  const appendMessages = useCallback((id, items) => {
    if (!items.length || activeRef.current !== id) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = items.filter((m) => !known.has(m.id));
      if (!fresh.length) return prev;
      lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id));
      return [...prev, ...fresh];
    });
  }, []);

  const pollMessages = useCallback(async () => {
    const id = activeRef.current;
    if (!id) return;
    try {
      const res = await api.messages(id, lastIdRef.current || undefined);
      appendMessages(id, res.items);
    } catch {
      // keyingi poll qayta urinadi
    }
  }, [api, appendMessages]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  usePolling(() => Promise.all([loadThreads(), pollMessages()]));

  useEffect(() => {
    activeRef.current = activeId;
    lastIdRef.current = 0;
    stickRef.current = true;
    setMessages([]);
    setSendError('');
    if (!activeId) return undefined;
    let cancelled = false;
    api
      .messages(activeId)
      .then((res) => {
        if (cancelled) return;
        lastIdRef.current = res.items.reduce((mx, m) => Math.max(mx, m.id), 0);
        setMessages(res.items);
        loadThreads();
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [activeId, api, loadThreads]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = bodyRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
  };

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !activeId || sending) return;
    setSending(true);
    setSendError('');
    try {
      const msg = await api.send(activeId, value);
      setText('');
      stickRef.current = true;
      appendMessages(activeId, [msg]);
      loadThreads();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (threads ?? []).filter((th) => !q || th.name?.toLowerCase().includes(q) || th.phone?.includes(q));
  }, [threads, debouncedSearch]);

  const active = (threads ?? []).find((th) => th.workshopId === activeId) ?? null;
  const phone = active?.phone ?? null;
  const time = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const day = (iso) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const stamp = (iso) => (new Date(iso).toDateString() === new Date().toDateString() ? time(iso) : `${day(iso)} ${time(iso)}`);
  const unreadTotal = (threads ?? []).reduce((s, th) => s + (th.unread || 0), 0);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xabarlar')}</h1>
          <p>{t("Mijozlar ilovadagi «Yordam chati»dan yozadi, sexlar — o'z panelidan. Javobingiz ularga darhol ko'rinadi.")}</p>
        </div>
      </div>

      <div className="sa-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`sa-tab${mode === m.id ? ' is-active' : ''}`}
            onClick={() => {
              if (mode === m.id) return;
              setMode(m.id);
              setActiveId(null);
              setThreads(null);
            }}
          >
            {t(m.label)}
            {mode === m.id && unreadTotal > 0 ? ` · ${unreadTotal}` : ''}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className={`sa-chat${activeId ? ' has-active' : ''}`}>
        <aside className="sa-chat__list" aria-label={t('Suhbatlar')}>
          <div className="sa-chat__search">
            <input
              type="search"
              className="sa-input"
              placeholder={t('Ism yoki telefon')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              aria-label={t('Ism yoki telefon')}
            />
          </div>
          <div className="sa-chat__threads">
            {threads === null ? (
              <p className="sa-table__sub sa-chat__note">{t('Yuklanmoqda...')}</p>
            ) : visible.length === 0 ? (
              <p className="sa-table__sub sa-chat__note">
                {mode === 'customers' ? t('Hali hech bir mijoz yozmagan') : t('Sexlar topilmadi')}
              </p>
            ) : (
              visible.map((th) => {
                const last = th.lastMessage;
                return (
                  <button
                    key={th.workshopId}
                    type="button"
                    className={`sa-chat__thread${activeId === th.workshopId ? ' is-on' : ''}`}
                    onClick={() => setActiveId(th.workshopId)}
                    aria-pressed={activeId === th.workshopId}
                  >
                    <span className="sa-chat__avatar" aria-hidden="true">
                      {th.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="sa-chat__meta">
                      <b>{th.name}</b>
                      <small>{last ? `${last.fromWorkshop ? '' : `${t('Siz')}: `}${last.text}` : t("Xabar yo'q")}</small>
                    </span>
                    {th.unread > 0 && <span className="sa-badge sa-badge--orange">{th.unread}</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="sa-chat__thread-view">
          {!activeId ? (
            <div className="sa-chat__empty">
              <MessagesSquare size={28} aria-hidden="true" />
              <h3>{t('Suhbatni tanlang')}</h3>
              <p>{t("Chapdagi ro'yxatdan mijoz yoki sexni tanlang")}</p>
            </div>
          ) : (
            <>
              <header className="sa-chat__head">
                <button type="button" className="sa-iconbtn sa-chat__back" onClick={() => setActiveId(null)} aria-label={t('Orqaga')}>
                  <ArrowLeft size={16} />
                </button>
                <span className="sa-chat__avatar" aria-hidden="true">
                  {active?.name?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="sa-chat__meta">
                  <b>{active?.name}</b>
                  {phone && <small>{prettyPhone(phone)}</small>}
                </div>
                {phone && (
                  <a href={`tel:${phone}`} className="sa-btn">
                    <Phone size={14} aria-hidden="true" />
                    <span>{t("Qo'ng'iroq")}</span>
                  </a>
                )}
              </header>

              <div className="sa-chat__body" ref={bodyRef} onScroll={onScroll}>
                {messages.length === 0 ? (
                  <div className="sa-chat__empty">
                    <MessagesSquare size={28} aria-hidden="true" />
                    <h3>{t("Xabarlar yo'q")}</h3>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`sa-chat__msg${m.fromWorkshop ? '' : ' is-mine'}`}>
                      {m.text}
                      <time dateTime={m.createdAt}>{stamp(m.createdAt)}</time>
                    </div>
                  ))
                )}
              </div>

              <form className="sa-chat__form" onSubmit={send}>
                <input
                  className="sa-input"
                  placeholder={t('Javob yozing...')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  disabled={sending}
                  aria-label={t('Javob yozing...')}
                />
                <button type="submit" className="sa-btn" disabled={sending || !text.trim()} aria-label={t('Yuborish')}>
                  <Send size={16} />
                </button>
              </form>
              {sendError && <div className="form-error sa-chat__senderr">{sendError}</div>}
            </>
          )}
        </div>
      </section>
    </>
  );
}
