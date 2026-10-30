import { useCallback, useEffect, useRef, useState } from 'react';
import { MessagesSquare, Send } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { listChatMessages, sendChatMessage } from './tailorApi';

const POLL_MS = 5000;

const timeOf = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Chat() {
  const t = useT();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const lastIdRef = useRef(0);
  const listRef = useRef(null);
  const stickRef = useRef(true);
  const busyRef = useRef(false);

  const merge = useCallback((items) => {
    if (!items?.length) return;
    setMessages((current) => {
      const known = new Set(current.map((m) => m.id));
      const fresh = items.filter((m) => !known.has(m.id));
      return fresh.length ? [...current, ...fresh].sort((a, b) => a.id - b.id) : current;
    });
    lastIdRef.current = Math.max(lastIdRef.current, ...items.map((m) => m.id));
  }, []);

  const poll = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const data = await listChatMessages(lastIdRef.current || undefined);
      merge(data?.items);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || t('chat.loadError'));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [merge, t]);

  useEffect(() => {
    poll();
    const timer = window.setInterval(() => {
      if (!document.hidden) poll();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      const created = await sendChatMessage(body);
      stickRef.current = true;
      if (created?.id) merge([created]);
      else await poll();
      setText('');
    } catch (err) {
      setSendError(err?.message || t('chat.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-white">{t('chat.title')}</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">{t('chat.subtitle')}</p>
      </div>

      <Card className="flex h-[min(70vh,640px)] flex-col overflow-hidden border border-white/10 bg-[#121829]">
        <div ref={listRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {loading && <p className="m-auto text-xs text-slate-400">{t('api.loading')}</p>}
          {!loading && messages.length === 0 && (
            <div className="m-auto flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
                <MessagesSquare size={25} aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs text-slate-400">{t('chat.empty')}</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cx('flex', m.fromWorkshop ? 'justify-end' : 'justify-start')}>
              <div
                className={cx(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-xs',
                  m.fromWorkshop ? 'bg-teal-400 text-slate-950' : 'bg-[#1e2b4d] text-white'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <span className={cx('mt-1 block text-[10px]', m.fromWorkshop ? 'text-slate-800' : 'text-slate-400')}>
                  {m.fromWorkshop ? t('chat.me') : t('chat.operator')} · {timeOf(m.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {(loadError || sendError) && (
          <p role="alert" className="px-4 pb-2 text-xs text-rose-300">{sendError || loadError}</p>
        )}
        <form className="flex items-center gap-2 border-t border-white/10 bg-[#0e1424] p-3" onSubmit={handleSubmit}>
          <input
            type="text"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121829] px-4 py-2.5 text-xs text-white placeholder-slate-500"
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 disabled:opacity-50"
            aria-label={t('chat.send')}
          >
            <Send size={15} aria-hidden="true" />
          </button>
        </form>
      </Card>
    </div>
  );
}
