import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Send } from 'lucide-react';
import { chatApi } from '../../../features/platform/platformApi';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

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
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => ref.current(), POLL_MS);
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

export default function OperatorMessages() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [phones, setPhones] = useState({});
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
      setThreads(await chatApi.threads());
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
      const res = await chatApi.messages(wid, lastIdRef.current || undefined);
      appendMessages(wid, res.items);
    } catch {
      // keyingi poll qayta urinadi
    }
  }, [appendMessages]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Telefon raqamlari faqat ma'lumot uchun (chat ma'lumoti chatApi'dan)
  useEffect(() => {
    workshopsApi
      .list({ page: 1, limit: 100 })
      .then((res) => setPhones(Object.fromEntries(res.items.map((w) => [w.id, w.phone]))))
      .catch(() => {});
  }, []);

  usePolling(() => {
    loadThreads();
    pollMessages();
  });

  useEffect(() => {
    activeRef.current = activeId;
    lastIdRef.current = 0;
    stickRef.current = true;
    setMessages([]);
    setSendError('');
    if (!activeId) return undefined;
    let cancelled = false;
    chatApi
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
      const msg = await chatApi.send(activeId, value);
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

  const colorOf = (wid) => (threads ?? []).findIndex((th) => th.workshopId === wid) % 5;
  const active = (threads ?? []).find((th) => th.workshopId === activeId) ?? null;
  const phone = activeId ? phones[activeId] : null;
  const time = (iso) => new Date(iso).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
  const day = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit' });
  const stamp = (iso) => (new Date(iso).toDateString() === new Date().toDateString() ? time(iso) : `${day(iso)} ${time(iso)}`);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.messages')}</h1>
          <p>{t('msg.subtitle')}</p>
        </div>
      </div>

      <section className={`op-cd op-chat${activeId ? ' has-active' : ''}`}>
        <aside className="op-chat-ls" aria-label={t('menu.messages')}>
          <div className="op-chat-sr">
            <input
              type="search"
              className="op-in"
              placeholder={t('msg.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              aria-label={t('msg.search')}
            />
          </div>
          {error && (
            <div className="op-msg" style={{ margin: '0 12px 12px' }}>
              {error}
            </div>
          )}
          <div className="op-chat-cs">
            {threads === null ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="op-chat-c">
                  <span className="op-sk" style={{ width: 40, height: 40, borderRadius: 12 }} />
                  <div style={{ flex: 1 }}>
                    <span className="op-sk" style={{ width: '70%', height: 12, marginBottom: 6 }} />
                    <span className="op-sk" style={{ width: '40%', height: 10 }} />
                  </div>
                </div>
              ))
            ) : visible.length === 0 ? (
              <p className="op-sub" style={{ padding: 16, textAlign: 'center' }}>
                {t('msg.noThreads')}
              </p>
            ) : (
              visible.map((th) => {
                const i = colorOf(th.workshopId);
                const last = th.lastMessage;
                return (
                  <button
                    key={th.workshopId}
                    type="button"
                    className={`op-chat-c${activeId === th.workshopId ? ' is-on' : ''}`}
                    onClick={() => setActiveId(th.workshopId)}
                    aria-pressed={activeId === th.workshopId}
                  >
                    <span className={`op-lt is-c${i}`} aria-hidden="true">
                      {th.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="op-chat-ci">
                      <b>{th.name}</b>
                      <small>{last ? `${last.fromWorkshop ? '' : t('msg.you')}${last.text}` : t('msg.noPreview')}</small>
                    </span>
                    {th.unread > 0 && <span className="op-bd is-ok">{th.unread}</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="op-chat-th">
          {!activeId ? (
            <div className="op-em">
              <MessagesSquare size={28} aria-hidden="true" />
              <h3>{t('msg.pick')}</h3>
              <p>{t('msg.pickHint')}</p>
            </div>
          ) : (
            <>
              <header className="op-chat-hd">
                <button
                  type="button"
                  className="op-b is-ic is-rd op-chat-bk"
                  onClick={() => setActiveId(null)}
                  aria-label={t('msg.back')}
                >
                  <ArrowLeft size={16} />
                </button>
                <span className={`op-lt is-c${Math.max(0, colorOf(activeId))}`} aria-hidden="true">
                  {active?.name?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="op-chat-ci">
                  <b>{active?.name}</b>
                  {phone && <small>{prettyPhone(phone)}</small>}
                </div>
                {phone && (
                  <a href={`tel:${phone}`} className="op-b is-p">
                    <Phone size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span className="op-chat-call">{t('dash.call')}</span>
                  </a>
                )}
              </header>

              <div
                className="op-chat-bd"
                ref={bodyRef}
                onScroll={onScroll}
                style={messages.length ? { justifyContent: 'flex-start', padding: 16, gap: 8 } : undefined}
              >
                {messages.length === 0 ? (
                  <div className="op-em">
                    <MessagesSquare size={28} aria-hidden="true" />
                    <h3>{t('msg.noMessages')}</h3>
                    <p>{t('msg.noMessagesHint')}</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.fromWorkshop ? 'flex-start' : 'flex-end',
                        maxWidth: '78%',
                        padding: '8px 12px',
                        borderRadius: 14,
                        background: m.fromWorkshop ? 'var(--op-cd, #fff)' : 'var(--op-ac)',
                        color: m.fromWorkshop ? 'inherit' : 'var(--op-acf)',
                        border: m.fromWorkshop ? '1px solid var(--op-ln)' : 'none',
                        overflowWrap: 'anywhere',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.text}
                      <div className="op-mono" style={{ fontSize: 11, opacity: 0.65, textAlign: 'right', marginTop: 2 }}>
                        {stamp(m.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="op-chat-fm" onSubmit={send}>
                <input
                  className="op-in"
                  placeholder={t('msg.placeholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  disabled={sending}
                  aria-label={t('msg.placeholder')}
                />
                <button
                  type="submit"
                  className="op-b is-p is-rd"
                  disabled={sending || !text.trim()}
                  aria-label={t('msg.send')}
                >
                  <Send size={16} strokeWidth={2.2} />
                </button>
              </form>
              {sendError && (
                <p className="op-msg" style={{ margin: '0 16px 12px' }}>
                  {sendError}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
