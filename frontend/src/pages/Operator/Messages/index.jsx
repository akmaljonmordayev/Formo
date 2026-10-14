import { useEffect, useState } from 'react';
import { ArrowLeft, MessagesSquare, Phone, Send } from 'lucide-react';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

// Chat API hali yo'q (backendga tegilmaydi): suhbatdoshlar — haqiqiy tikuv sexlari,
// yozishma oynasi tayyor, yuborish modul ulanganda yoqiladi
export default function OperatorMessages() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    let cancelled = false;
    workshopsApi
      .list({ search: debouncedSearch, page: 1, limit: 50 })
      .then((res) => !cancelled && setContacts(res.items))
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.messages')}</h1>
          <p>{t('msg.subtitle')}</p>
        </div>
      </div>

      <section className={`op-cd op-chat${active ? ' has-active' : ''}`}>
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
            {contacts === null ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="op-chat-c">
                  <span className="op-sk" style={{ width: 40, height: 40, borderRadius: 12 }} />
                  <div style={{ flex: 1 }}>
                    <span className="op-sk" style={{ width: '70%', height: 12, marginBottom: 6 }} />
                    <span className="op-sk" style={{ width: '40%', height: 10 }} />
                  </div>
                </div>
              ))
            ) : contacts.length === 0 ? (
              <p className="op-sub" style={{ padding: 16, textAlign: 'center' }}>
                {t('msg.noContacts')}
              </p>
            ) : (
              contacts.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  className={`op-chat-c${active?.id === w.id ? ' is-on' : ''}`}
                  onClick={() => setActive({ ...w, color: i % 5 })}
                  aria-pressed={active?.id === w.id}
                >
                  <span className={`op-lt is-c${i % 5}`} aria-hidden="true">
                    {w.workshopName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="op-chat-ci">
                    <b>{w.workshopName}</b>
                    <small>{w.fullName}</small>
                  </span>
                  {!w.isActive && <span className="op-bd is-off">{t('dash.blocked')}</span>}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="op-chat-th">
          {!active ? (
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
                  onClick={() => setActive(null)}
                  aria-label={t('msg.back')}
                >
                  <ArrowLeft size={16} />
                </button>
                <span className={`op-lt is-c${active.color}`} aria-hidden="true">
                  {active.workshopName?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="op-chat-ci">
                  <b>{active.workshopName}</b>
                  <small>
                    {active.fullName} · {prettyPhone(active.phone)}
                  </small>
                </div>
                <a href={`tel:${active.phone}`} className="op-b is-p">
                  <Phone size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span className="op-chat-call">{t('dash.call')}</span>
                </a>
              </header>

              <div className="op-chat-bd">
                <div className="op-em">
                  <MessagesSquare size={28} aria-hidden="true" />
                  <h3>{t('msg.empty')}</h3>
                  <p>{t('msg.emptyHint')}</p>
                </div>
              </div>

              <form className="op-chat-fm" onSubmit={(e) => e.preventDefault()}>
                <input
                  className="op-in"
                  placeholder={t('msg.placeholder')}
                  disabled
                  aria-label={t('msg.placeholder')}
                  title={t('msg.offline')}
                />
                <button type="submit" className="op-b is-p is-rd" disabled aria-label={t('msg.send')} title={t('msg.offline')}>
                  <Send size={16} strokeWidth={2.2} />
                </button>
              </form>
              <p className="op-sub op-chat-nt">{t('msg.offline')}</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
