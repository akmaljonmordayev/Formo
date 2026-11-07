import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Send } from 'lucide-react';
import { supportApi } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useLang, useT } from '../i18n';

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

// Mijozlar (mobil ilova) bilan qo'llab-quvvatlash yozishmasi.
// Tikuv sexi (Otabek) bilan yozishma — uning o'z paneli: https://admin.formo.uz/tailor
export default function SuperadminMessages() {
  const t = useT();
  const { locale } = useLang();
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
    try {
      const list = await supportApi.threads();
      setThreads(list);
      setError('');
    } catch (err) {
      setError(err.message);
      setThreads((prev) => prev ?? []);
    }
  }, []);

  // Yangi xabarlarni qo'shadi (id bo'yicha takrorlanmaydi)
  const appendMessages = useCallback((wid, items) => {
    if (!items.length || activeRef.current !== wid) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = items.filter((m) => !known.has(m.id));
      if (!fresh.length) return prev;
      lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id));
      return [...prev, ...fresh];
    });
  }, []);

  const pollMessages = useCallback(async () => {
    const wid = activeRef.current;
    if (!wid) return;
    try {
      const res = await supportApi.messages(wid, lastIdRef.current || undefined);
      appendMessages(wid, res.items);
    } catch {
      // keyingi poll qayta urinadi
    }
  }, [appendMessages]);

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
    supportApi
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
  }, [activeId, loadThreads]);

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
      const msg = await supportApi.send(activeId, value);
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
    return (threads ?? []).filter((th) => !q || th.name?.toLowerCase().includes(q));
  }, [threads, debouncedSearch]);

  const active = (threads ?? []).find((th) => th.workshopId === activeId) ?? null;
  const phone = activeId ? active?.phone : null;
  const time = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const day = (iso) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const stamp = (iso) => (new Date(iso).toDateString() === new Date().toDateString() ? time(iso) : `${day(iso)} ${time(iso)}`);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xabarlar')}</h1>
          <p>{t('Mobil ilova mijozlari bilan qo‘llab-quvvatlash yozishmasi.')}</p>
        </div>
      </div>

      <section className={`sa-chat${activeId ? ' has-active' : ''}`}>
        <aside className="sa-chat-list" aria-label={t('Xabarlar')}>
          <div className="sa-chat-search">
            <input
              type="search"
              className="sa-input"
              placeholder={t('Qidirish...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              aria-label={t('Qidirish...')}
            />
          </div>
          {error && <div className="form-error" style={{ margin: '0 12px 12px' }}>{error}</div>}
          <div className="sa-chat-threads">
            {threads === null ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="sa-chat-thread sa-chat-thread--skeleton" />)
            ) : visible.length === 0 ? (
              <p className="sa-table__sub" style={{ padding: 16, textAlign: 'center' }}>{t('Suhbatlar topilmadi')}</p>
            ) : (
              visible.map((th) => {
                const last = th.lastMessage;
                return (
                  <button
                    key={th.workshopId}
                    type="button"
                    className={`sa-chat-thread${activeId === th.workshopId ? ' is-active' : ''}`}
                    onClick={() => setActiveId(th.workshopId)}
                    aria-pressed={activeId === th.workshopId}
                  >
                    <span className="sa-chat-avatar" aria-hidden="true">{th.name?.[0]?.toUpperCase() ?? '?'}</span>
                    <span className="sa-chat-thread-info">
                      <b>{th.name}</b>
                      <small>{last ? `${last.fromWorkshop ? '' : `${t('Siz')}: `}${last.text}` : t('Hali xabar yo‘q')}</small>
                    </span>
                    {th.unread > 0 && <span className="sa-badge sa-badge--orange">{th.unread}</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="sa-chat-panel">
          {!activeId ? (
            <div className="sa-chat-empty">
              <MessagesSquare size={28} aria-hidden="true" />
              <h3>{t('Suhbatni tanlang')}</h3>
              <p>{t('Chapdagi ro‘yxatdan mijozni tanlang')}</p>
            </div>
          ) : (
            <>
              <header className="sa-chat-head">
                <button type="button" className="sa-btn sa-btn--ghost sa-chat-back" onClick={() => setActiveId(null)} aria-label={t('Orqaga')}>
                  <ArrowLeft size={16} />
                </button>
                <span className="sa-chat-avatar" aria-hidden="true">{active?.name?.[0]?.toUpperCase() ?? '?'}</span>
                <div className="sa-chat-thread-info">
                  <b>{active?.name}</b>
                  {phone && <small>{prettyPhone(phone)}</small>}
                </div>
                {phone && (
                  <a href={`tel:${phone}`} className="sa-btn sa-btn--ghost">
                    <Phone size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span>{t('Qo‘ng‘iroq')}</span>
                  </a>
                )}
              </header>

              <div className="sa-chat-body" ref={bodyRef} onScroll={onScroll}>
                {messages.length === 0 ? (
                  <div className="sa-chat-empty">
                    <MessagesSquare size={28} aria-hidden="true" />
                    <h3>{t('Xabarlar yo‘q')}</h3>
                    <p>{t('Birinchi xabarni shu yerda yozing')}</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`sa-chat-bubble${m.fromWorkshop ? ' is-them' : ' is-me'}`}>
                      {m.text}
                      <div className="sa-chat-bubble-time">{stamp(m.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>

              <form className="sa-chat-form" onSubmit={send}>
                <input
                  className="sa-input"
                  placeholder={t('Xabar yozing...')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  disabled={sending}
                  aria-label={t('Xabar yozing...')}
                />
                <button type="submit" className="sa-btn" disabled={sending || !text.trim()} aria-label={t('Yuborish')}>
                  <Send size={16} strokeWidth={2.2} />
                </button>
              </form>
              {sendError && <p className="form-error" style={{ margin: '0 16px 12px' }}>{sendError}</p>}
            </>
          )}
        </div>
      </section>
    </>
  );
}
