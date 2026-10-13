import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Factory } from 'lucide-react';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

const LIMIT = 10;
const STATUSES = [
  { value: '', label: 'dash.all' },
  { value: 'true', label: 'dash.wsActive' },
  { value: 'false', label: 'dash.blocked' },
];

// Operator tikuv sexlarini faqat ko'radi (akkaunt ochish superadminda).
// Umumiy WorkshopsPage o'zbekchaga qotirilgan, shuning uchun operatorda alohida, tarjima qilinadigan sahifa.
export default function OperatorFactories() {
  const t = useT();
  const [data, setData] = useState({ items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await workshopsApi.list({ search: debouncedSearch, isActive: status, page, limit: LIMIT }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));
  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.factories')}</h1>
          <p>{t('fac.subtitle')}</p>
        </div>
      </div>

      <section className="op-cd">
        <div className="op-fl">
          <input
            type="search"
            className="op-in"
            style={{ flex: '1 1 240px', width: 'auto' }}
            placeholder={t('fac.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            aria-label={t('fac.search')}
          />
          <div className="op-row is-w" style={{ gap: 6 }} role="group" aria-label={t('fac.status')}>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`op-chip${status === s.value ? ' is-on' : ''}`}
                onClick={() => setStatus(s.value)}
                aria-pressed={status === s.value}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="op-msg" style={{ margin: 12 }}>
            {error}
          </div>
        )}

        {!data.items.length ? (
          <div className="op-em">
            <Factory size={28} aria-hidden="true" />
            <h3>{t(loading ? 'fac.loading' : 'fac.empty')}</h3>
          </div>
        ) : (
          <div className="op-sc">
            <table className="op-tb">
              <thead>
                <tr>
                  <th>{t('fac.col.name')}</th>
                  <th>{t('fac.col.person')}</th>
                  <th>{t('fac.col.phone')}</th>
                  <th>{t('fac.status')}</th>
                  <th>{t('fac.col.added')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((w, i) => (
                  <tr key={w.id}>
                    <td>
                      <div className="op-row">
                        <span className={`op-lt is-c${i % 5}`} aria-hidden="true">
                          {w.workshopName?.[0]?.toUpperCase() ?? '?'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b>{w.workshopName}</b>
                          {w.address && <div className="op-sub">{w.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{w.fullName}</td>
                    <td className="op-mono">
                      <a href={`tel:${w.phone}`}>{prettyPhone(w.phone)}</a>
                    </td>
                    <td>
                      <span className={`op-bd ${w.isActive ? 'is-ok' : 'is-off'}`}>
                        {t(w.isActive ? 'dash.wsActive' : 'dash.blocked')}
                      </span>
                    </td>
                    <td className="op-mono">{date(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="op-pg">
          <span className="op-sub">{t('fac.total', { n: data.total })}</span>
          <div className="op-row" style={{ gap: 6 }}>
            <button
              type="button"
              className="op-b is-ic is-rd"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label={t('fac.prev')}
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
              aria-label={t('fac.next')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
