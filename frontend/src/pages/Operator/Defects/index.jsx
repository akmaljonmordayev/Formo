import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { defectsApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

const LIMIT = 10;
const STATUSES = ['', 'OPEN', 'RESOLVED'];

export default function OperatorDefects() {
  const t = useT();
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await defectsApi.list({ status: status || undefined, page, limit: LIMIT }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [status]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await defectsApi.resolve(resolving.id, note.trim());
      setResolving(null);
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));
  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.defects')}</h1>
          <p>{t('defects.subtitle')}</p>
        </div>
      </div>

      <section className="op-cd">
        <div className="op-fl">
          <div className="op-row is-w" style={{ gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                type="button"
                className={`op-chip${status === s ? ' is-on' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
              >
                {t(`defects.s.${s || 'all'}`)}
                {s === 'OPEN' && data.openCount > 0 ? ` · ${data.openCount}` : ''}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="op-msg" style={{ margin: 12 }}>
            {error}
          </div>
        )}

        {resolving && (
          <form className="op-row is-w" style={{ gap: 8, padding: 12 }} onSubmit={submit}>
            <b>{t('defects.resolveFor', { code: resolving.order.code })}</b>
            <input
              className="op-in"
              style={{ flex: '1 1 220px', width: 'auto' }}
              placeholder={t('defects.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              aria-label={t('defects.notePlaceholder')}
            />
            <button type="submit" className="op-b is-p is-sm" disabled={busy}>
              {t('defects.confirm')}
            </button>
            <button
              type="button"
              className="op-b is-line is-sm"
              disabled={busy}
              onClick={() => {
                setResolving(null);
                setNote('');
              }}
            >
              {t('defects.cancel')}
            </button>
          </form>
        )}

        {!data.items.length ? (
          <div className="op-em">
            <AlertTriangle size={28} aria-hidden="true" />
            <h3>{t(loading ? 'defects.loading' : 'defects.empty')}</h3>
            {!loading && <p>{t('defects.emptyHint')}</p>}
          </div>
        ) : (
          <div className="op-sc">
            <table className="op-tb">
              <thead>
                <tr>
                  <th>{t('defects.col.order')}</th>
                  <th>{t('defects.col.workshop')}</th>
                  <th>{t('defects.col.reason')}</th>
                  <th>{t('defects.col.qty')}</th>
                  <th>{t('defects.col.note')}</th>
                  <th>{t('defects.col.status')}</th>
                  <th>{t('defects.col.date')}</th>
                  <th>{t('defects.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id}>
                    <td className="op-mono">
                      <b>{d.order?.code}</b>
                    </td>
                    <td>{d.workshop?.workshopName || d.workshop?.fullName || '—'}</td>
                    <td>{t(`defects.reason.${d.reason}`)}</td>
                    <td className="op-mono">{d.qty}</td>
                    <td>
                      {d.note || '—'}
                      {d.resolvedNote && <div className="op-sub">{t('defects.noteLabel', { note: d.resolvedNote })}</div>}
                    </td>
                    <td>
                      <span className={`op-bd ${d.status === 'RESOLVED' ? 'is-ok' : ''}`}>{t(`defects.s.${d.status}`)}</span>
                    </td>
                    <td className="op-mono">{date(d.createdAt)}</td>
                    <td>
                      {d.status === 'OPEN' && (
                        <button
                          type="button"
                          className="op-b is-p is-sm"
                          onClick={() => {
                            setResolving(d);
                            setNote('');
                          }}
                        >
                          {t('defects.resolve')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="op-pg">
          <span className="op-sub">{t('defects.total', { n: data.total })}</span>
          <div className="op-row" style={{ gap: 6 }}>
            <button
              type="button"
              className="op-b is-ic is-rd"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label={t('defects.prev')}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="op-mono" aria-live="polite">
              {page} / {pages}
            </span>
            <button
              type="button"
              className="op-b is-ic is-rd"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              aria-label={t('defects.next')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
