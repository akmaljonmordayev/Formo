import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Plus, Send, X } from 'lucide-react';
import { useDebounced } from '../../hooks/useDebounced';
import { chatApi } from './chatApi';
import { usePolling } from './usePolling';
import './chat.css';

const POLL_MS = 5000;
const NEAR_BOTTOM = 120;
const ROLE_ORDER = ['OPERATOR', 'SUPERADMIN', 'TAILOR', 'USER'];

// Universal chat: chapda suhbatlar ro'yxati, o'ngda yozishma. Operator, Superadmin va Tailor sahifalari ishlatadi.
export default function ChatPanel({ labels, canCall = false, locale, autoOpenRole, initialOrderId }) {
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState(null);
  const [extra, setExtra] = useState([]); // hali xabarsiz (serverda ro'yxatga kirmaydigan) suhbatlar
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [contacts, setContacts] = useState(null);
  const [pickError, setPickError] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const debouncedPick = useDebounced(pickSearch, 300);
  const bodyRef = useRef(null);
  const stickRef = useRef(true);
  const lastIdRef = useRef(0);
  const activeRef = useRef(null);
  const autoOpenedRef = useRef(false);

  const roleName = (r) => labels.roles?.[r] ?? r;

  const addExtra = useCallback((conv) => {
    setExtra((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const list = await chatApi.conversations(initialOrderId);
      setThreads(list);
      setError('');
      // Serverda paydo bo'lgan suhbatlar lokal ro'yxatdan olib tashlanadi
      setExtra((prev) => (prev.some((c) => list.some((l) => l.id === c.id)) ? prev.filter((c) => !list.some((l) => l.id === c.id)) : prev));
      if (autoOpenRole && !autoOpenedRef.current) {
        autoOpenedRef.current = true;
        if (list.length === 0) {
          const conv = await chatApi.open({ role: autoOpenRole, orderId: initialOrderId });
          addExtra(conv);
          setActiveId(conv.id);
        }
      }
    } catch (err) {
      setError(err?.message || labels.loadError);
      setThreads((prev) => prev ?? []);
    }
  }, [initialOrderId, autoOpenRole, addExtra, labels.loadError]);

  // Faol suhbatga yangi xabarlarni qo'shadi (id bo'yicha takrorlanmaydi, eskirgan natijalar tashlanadi)
  const appendMessages = useCallback((cid, items) => {
    if (!items?.length || activeRef.current !== cid) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = items.filter((m) => !known.has(m.id));
      if (!fresh.length) return prev;
      lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id));
      return [...prev, ...fresh].sort((a, b) => a.id - b.id);
    });
  }, []);

  const pollMessages = useCallback(async () => {
    const cid = activeRef.current;
    if (!cid) return;
    try {
      const res = await chatApi.messages(cid, { after: lastIdRef.current || undefined });
      appendMessages(cid, res.items);
    } catch {
      // keyingi poll qayta urinadi
    }
  }, [appendMessages]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  usePolling(() => Promise.all([loadThreads(), pollMessages()]), POLL_MS);

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
        loadThreads(); // ochilganda o'qilgan deb belgilanadi — belgi yangilansin
      })
      .catch((err) => !cancelled && setError(err?.message || labels.loadError));
    return () => {
      cancelled = true;
    };
  }, [activeId, loadThreads, labels.loadError]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Kontaktlar ro'yxati (yangi chat tanlagich)
  useEffect(() => {
    if (!picking) return undefined;
    let cancelled = false;
    chatApi
      .contacts(undefined, debouncedPick.trim() || undefined)
      .then((res) => {
        if (cancelled) return;
        setContacts(res);
        setPickError('');
      })
      .catch((err) => !cancelled && setPickError(err?.message || labels.loadError));
    return () => {
      cancelled = true;
    };
  }, [picking, debouncedPick, labels.loadError]);

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
      setSendError(err?.message || labels.sendError);
    } finally {
      setSending(false);
    }
  };

  const startWith = async (contact) => {
    setPickError('');
    try {
      const conv = await chatApi.open({ participantId: contact.id, orderId: initialOrderId });
      addExtra(conv);
      setActiveId(conv.id);
      setPicking(false);
      setPickSearch('');
    } catch (err) {
      setPickError(err?.message || labels.loadError);
    }
  };

  const all = useMemo(() => {
    const server = threads ?? [];
    return [...extra.filter((c) => !server.some((s) => s.id === c.id)), ...server];
  }, [threads, extra]);

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return all.filter((th) => !q || th.counterpart?.name?.toLowerCase().includes(q));
  }, [all, debouncedSearch]);

  const grouped = useMemo(
    () =>
      ROLE_ORDER.map((r) => ({ role: r, items: (contacts ?? []).filter((c) => c.role === r) })).filter(
        (g) => g.items.length,
      ),
    [contacts],
  );

  const active = all.find((th) => th.id === activeId) ?? null;
  const phone = canCall ? active?.counterpart?.phone : null;
  const stamp = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString()
      ? time
      : `${d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })} ${time}`;
  };
  const initial = (name) => name?.[0]?.toUpperCase() ?? '?';

  return (
    <section className={`fchat${activeId ? ' has-active' : ''}`}>
      <aside className="fchat-ls" aria-label={labels.title}>
        {picking ? (
          <>
            <div className="fchat-top">
              <input
                type="search"
                className="fchat-in"
                placeholder={labels.search}
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                maxLength={100}
                aria-label={labels.search}
                autoFocus
              />
              <button type="button" className="fchat-btn is-ic" onClick={() => setPicking(false)} aria-label={labels.back}>
                <X size={16} />
              </button>
            </div>
            {pickError && <p className="fchat-err">{pickError}</p>}
            <div className="fchat-cs">
              <p className="fchat-grp" style={{ textTransform: 'none' }}>{labels.pickContact}</p>
              {contacts !== null && grouped.length === 0 && <p className="fchat-note">{labels.noContacts}</p>}
              {grouped.map((g) => (
                <div key={g.role}>
                  <div className="fchat-grp">{roleName(g.role)}</div>
                  {g.items.map((c) => (
                    <button key={c.id} type="button" className="fchat-c" onClick={() => startWith(c)}>
                      <span className="fchat-av" aria-hidden="true">{initial(c.name)}</span>
                      <span className="fchat-ci">
                        <b>{c.name}</b>
                        {canCall && c.phone && <small>{c.phone}</small>}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="fchat-top">
              <input
                type="search"
                className="fchat-in"
                placeholder={labels.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={100}
                aria-label={labels.search}
              />
              <button type="button" className="fchat-btn is-p is-ic" onClick={() => setPicking(true)} aria-label={labels.newChat} title={labels.newChat}>
                <Plus size={16} strokeWidth={2.4} />
              </button>
            </div>
            {error && <p className="fchat-err">{error}</p>}
            <div className="fchat-cs">
              {threads === null ? (
                <p className="fchat-note">…</p>
              ) : visible.length === 0 ? (
                <p className="fchat-note">{labels.noThreads}</p>
              ) : (
                visible.map((th) => {
                  const last = th.lastMessage;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      className={`fchat-c${activeId === th.id ? ' is-on' : ''}`}
                      onClick={() => setActiveId(th.id)}
                      aria-pressed={activeId === th.id}
                    >
                      <span className="fchat-av" aria-hidden="true">{initial(th.counterpart?.name)}</span>
                      <span className="fchat-ci">
                        <b>
                          {th.counterpart?.name}
                          <span className="fchat-chip">{roleName(th.counterpart?.role)}</span>
                          {th.order && <span className="fchat-chip is-order">#{th.order.code}</span>}
                        </b>
                        <small>{last ? `${last.mine ? labels.you : ''}${last.text}` : labels.noPreview}</small>
                      </span>
                      {th.unread > 0 && <span className="fchat-bd-n">{th.unread}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      <div className="fchat-th">
        {!activeId ? (
          <div className="fchat-em">
            <MessagesSquare size={28} aria-hidden="true" />
            <h3>{labels.pick}</h3>
            <p>{labels.pickHint}</p>
          </div>
        ) : (
          <>
            <header className="fchat-hd">
              <button type="button" className="fchat-btn is-ic fchat-bk" onClick={() => setActiveId(null)} aria-label={labels.back}>
                <ArrowLeft size={16} />
              </button>
              <span className="fchat-av" aria-hidden="true">{initial(active?.counterpart?.name)}</span>
              <div className="fchat-ci">
                <b>
                  {active?.counterpart?.name}
                  {active?.counterpart?.role && <span className="fchat-chip">{roleName(active.counterpart.role)}</span>}
                  {active?.order && <span className="fchat-chip is-order">{labels.orderLabel} #{active.order.code}</span>}
                </b>
                {phone && <small>{phone}</small>}
              </div>
              {phone && (
                <a href={`tel:${phone}`} className="fchat-btn is-p">
                  <Phone size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span className="fchat-call">{labels.call}</span>
                </a>
              )}
            </header>

            <div className="fchat-bd" ref={bodyRef} onScroll={onScroll}>
              {messages.length === 0 ? (
                <div className="fchat-em">
                  <MessagesSquare size={28} aria-hidden="true" />
                  <h3>{labels.noMessages}</h3>
                  {labels.empty && <p>{labels.empty}</p>}
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`fchat-m${m.mine ? ' is-me' : ''}`}>
                    {m.text}
                    <time dateTime={m.createdAt}>{stamp(m.createdAt)}</time>
                  </div>
                ))
              )}
            </div>

            <form className="fchat-fm" onSubmit={send}>
              <input
                className="fchat-in"
                placeholder={labels.placeholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                disabled={sending}
                aria-label={labels.placeholder}
              />
              <button type="submit" className="fchat-btn is-p is-ic" disabled={sending || !text.trim()} aria-label={labels.send}>
                <Send size={16} strokeWidth={2.2} />
              </button>
            </form>
            {sendError && <p className="fchat-err" role="alert">{sendError}</p>}
          </>
        )}
      </div>
    </section>
  );
}
