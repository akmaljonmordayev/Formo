import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ChevronLeft, ChevronRight, Clock, Undo2, Wallet } from 'lucide-react';
import { ordersApi } from '../../../features/platform/platformApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

const LIMIT = 10;
// chip → backend PaymentStatus
const STATUSES = { all: '', paid: 'PAID', pending: 'PENDING', refund: 'REFUNDED' };
const BADGE = { PAID: 'is-ok', REFUNDED: 'is-off', FAILED: 'is-off' };

// To'lovlar alohida jadval emas: har bir buyurtmaning to'lovi (usul, holat, summa) buyurtmadan olinadi
export default function OperatorPayments() {
  const t = useT();
  const [data, setData] = useState({ items: [], total: 0, paymentTotals: {} });
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedQuery = useDebounced(query, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await ordersApi.list({ search: debouncedQuery, paymentStatus: STATUSES[status], page, limit: LIMIT }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedQuery, status]);

  const sum = (n) => `${Number(n ?? 0).toLocaleString(t.locale)} ${t('pay.currency')}`;
  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const totals = data.paymentTotals ?? {};
  const cards = [
    { label: 'pay.income', icon: ArrowDownLeft, tone: 'is-c2', value: totals.PAID },
    { label: 'pay.pending', icon: Clock, tone: 'is-c3', value: totals.PENDING },
    { label: 'pay.refunded', icon: Undo2, tone: 'is-c4', value: totals.REFUNDED },
  ];
  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.payments')}</h1>
          <p>{t('pay.subtitle')}</p>
        </div>
      </div>

      <div className="op-pay">
        {cards.map(({ label, icon: Icon, tone, value }) => (
          <div key={label} className={`op-pay-k ${tone}`}>
            <span>
              <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
              {t(label)}
            </span>
            <b>{sum(value)}</b>
            <small>{t('pay.excludesCancelled')}</small>
          </div>
        ))}
      </div>

      <section className="op-cd">
        <div className="op-fl">
          <input
            type="search"
            className="op-in"
            style={{ flex: '1 1 220px', width: 'auto' }}
            placeholder={t('pay.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            aria-label={t('pay.search')}
          />
          <div className="op-row is-w" style={{ gap: 6 }}>
            {Object.keys(STATUSES).map((s) => (
              <button
                key={s}
                type="button"
                className={`op-chip${status === s ? ' is-on' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
              >
                {t(`pay.s.${s}`)}
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
            <Wallet size={28} aria-hidden="true" />
            <h3>{t(loading ? 'orders.loading' : 'pay.empty')}</h3>
            {!loading && <p>{t('pay.emptyHint')}</p>}
          </div>
        ) : (
          <div className="op-sc">
            <table className="op-tb">
              <thead>
                <tr>
                  <th>{t('pay.col.order')}</th>
                  <th>{t('pay.col.payer')}</th>
                  <th>{t('pay.col.amount')}</th>
                  <th>{t('pay.col.method')}</th>
                  <th>{t('pay.col.status')}</th>
                  <th>{t('orders.col.date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="op-mono">
                      <b>{o.code}</b>
                    </td>
                    <td>{o.customerName}</td>
                    <td className="op-mono">{sum(o.totalSum)}</td>
                    <td>{t(`pay.method.${o.paymentMethod}`)}</td>
                    <td>
                      <span className={`op-bd ${BADGE[o.paymentStatus] ?? ''}`}>{t(`pay.st.${o.paymentStatus}`)}</span>
                    </td>
                    <td className="op-mono">{date(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="op-pg">
          <span className="op-sub">{t('orders.total', { n: data.total })}</span>
          <div className="op-row" style={{ gap: 6 }}>
            <button type="button" className="op-b is-ic is-rd" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t('orders.prev')}>
              <ChevronLeft size={16} />
            </button>
            <span className="op-mono" aria-live="polite">
              {page} / {pages}
            </span>
            <button type="button" className="op-b is-ic is-rd" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={t('orders.next')}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
