import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { ordersApi } from '../../../features/platform/platformApi';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

const LIMIT = 10;
const STATUSES = [
  '',
  'NEW',
  'SENT_TO_WORKSHOP',
  'ACCEPTED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
];
// Operator qayta yo'naltira oladigan holatlar (sex hali qabul qilmagan yoki buyurtma yangi)
const ASSIGNABLE = ['NEW', 'SENT_TO_WORKSHOP'];
const CLOSED = ['DELIVERED', 'CANCELLED', 'RETURNED'];

function badgeClass(status) {
  if (status === 'DELIVERED') return 'is-ok';
  if (status === 'CANCELLED' || status === 'RETURNED') return 'is-off';
  return '';
}

function designSummary(design, t) {
  if (!design) return '';
  const c = design.color;
  const color = c ? (c.type === 'gradient' ? `${t('orders.line.gradient')} ${c.id ?? ''}` : c.hex || c.id || '') : '';
  const parts = [];
  if (color) parts.push(`${t('orders.line.color')}: ${color.trim()}`);
  if (design.font) parts.push(`${t('orders.line.font')}: ${design.font}`);
  if (design.patch) parts.push(`${t('orders.line.patch')}: ${typeof design.patch === 'string' ? design.patch : design.patch.id ?? design.patch.name ?? '✓'}`);
  if (design.package) parts.push(`${t('orders.line.package')}: ${typeof design.package === 'string' ? design.package : design.package.id ?? design.package.name ?? '✓'}`);
  if (design.textColor) parts.push(`${t('orders.line.textColor')}: ${design.textColor}`);
  if (design.textEffect === 'neon') parts.push(t('orders.line.neon'));
  return parts.join(' · ');
}

function OrderDetails({ order, t, date }) {
  const lines = order.items ?? [];
  const delivery = [order.deliveryAddress, order.deliveryDate && date(order.deliveryDate), order.deliverySlot].filter(Boolean).join(' · ');
  return (
    <div style={{ padding: '4px 4px 8px' }}>
      {lines.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {lines.map((l, i) => (
            <li key={l.id ?? i}>
              <b>{l.kitId == null ? t('orders.line.custom') : [l.clubName, l.kitLabel].filter(Boolean).join(' · ')}</b>
              {' — '}
              {t('orders.line.size')}: {l.shirtSize}, {t('orders.line.qty')}: {l.quantity}
              {(l.printName || l.printNumber) && (
                <>
                  , {t('orders.line.print')}: {[l.printName, l.printNumber].filter(Boolean).join(' ')}
                </>
              )}
              {l.withShorts && (
                <>
                  , {t('orders.line.shorts')}: {l.shortsSize}
                  {l.numberOnShorts && l.shortsNumber ? ` (${t('orders.line.shortsNumber')} ${l.shortsNumber})` : ''}
                </>
              )}
              {l.kitId == null && l.design && <div className="op-sub">{designSummary(l.design, t)}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <span className="op-sub">{t('orders.noLines')}</span>
      )}
      {delivery && (
        <div className="op-sub" style={{ marginTop: 8 }}>
          {t('orders.delivery')}: {delivery}
        </div>
      )}
      {order.comment && (
        <div className="op-sub">
          {t('orders.comment')}: {order.comment}
        </div>
      )}
    </div>
  );
}

function OrderActions({ order, workshops, onDone, onError }) {
  const t = useT();
  const [workshopId, setWorkshopId] = useState(order.workshop?.id ? String(order.workshop.id) : '');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    onError('');
    try {
      await fn();
      onDone();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canAssign = ASSIGNABLE.includes(order.status);
  const unchanged = order.status === 'SENT_TO_WORKSHOP' && String(order.workshop?.id ?? '') === workshopId;

  return (
    <div className="op-row is-w" style={{ gap: 6 }}>
      {canAssign && (
        <>
          <select
            className="op-in"
            style={{ width: 'auto', minWidth: 150 }}
            value={workshopId}
            onChange={(e) => setWorkshopId(e.target.value)}
            disabled={busy || !workshops.length}
            aria-label={t('orders.pickWorkshop')}
            title={workshops.length ? undefined : t('orders.noWorkshop')}
          >
            <option value="">{t('orders.pickWorkshop')}</option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.workshopName || w.fullName}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="op-b is-p is-sm"
            disabled={busy || !workshopId || unchanged}
            onClick={() => run(() => ordersApi.assign(order.id, { workshopId: Number(workshopId) }))}
          >
            {t(order.status === 'NEW' ? 'orders.assign' : 'orders.reassign')}
          </button>
        </>
      )}
      {order.status === 'DELIVERING' && (
        <button
          type="button"
          className="op-b is-p is-sm"
          disabled={busy}
          onClick={() => run(() => ordersApi.updateStatus(order.id, { status: 'DELIVERED' }))}
        >
          {t('orders.delivered')}
        </button>
      )}
      {!CLOSED.includes(order.status) && (
        <button
          type="button"
          className="op-b is-line is-sm"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t('orders.cancelConfirm', { code: order.code }))) {
              run(() => ordersApi.updateStatus(order.id, { status: 'CANCELLED' }));
            }
          }}
        >
          {t('orders.cancel')}
        </button>
      )}
    </div>
  );
}

// Operator buyurtmani tekshiradi → tikuv sexiga yuboradi → sex qabul qiladi/rad etadi (rad etsa NEW ga qaytadi) →
// ishlab chiqarish → yetkazish. Yetkazildi deb faqat operator belgilaydi.
export default function OperatorOrders() {
  const t = useT();
  const [data, setData] = useState({ items: [], total: 0 });
  const [workshops, setWorkshops] = useState([]);
  const [status, setStatus] = useState(STATUSES[0]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const debouncedQuery = useDebounced(query, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await ordersApi.list({ search: debouncedQuery, status, page, limit: LIMIT }));
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

  useEffect(() => {
    workshopsApi
      .list({ isActive: 'true', page: 1, limit: 100 })
      .then((d) => setWorkshops(d.items))
      .catch((err) => setError(err.message));
  }, []);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));
  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.orders')}</h1>
          <p>{t('orders.subtitle')}</p>
        </div>
      </div>

      <section className="op-cd">
        <div className="op-fl">
          <input
            type="search"
            className="op-in"
            style={{ flex: '1 1 220px', width: 'auto' }}
            placeholder={t('orders.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            aria-label={t('orders.searchLabel')}
          />
          <div className="op-row is-w" style={{ gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                type="button"
                className={`op-chip${status === s ? ' is-on' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
              >
                {s ? t(`orders.st.${s}`) : t('orders.s.all')}
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
            <ShoppingBag size={28} aria-hidden="true" />
            <h3>{t(loading ? 'orders.loading' : 'orders.empty')}</h3>
            {!loading && <p>{t('orders.emptyHint')}</p>}
          </div>
        ) : (
          <div className="op-sc">
            <table className="op-tb">
              <thead>
                <tr>
                  <th>{t('orders.col.order')}</th>
                  <th>{t('orders.col.client')}</th>
                  <th>{t('orders.col.workshop')}</th>
                  <th>{t('orders.col.status')}</th>
                  <th>{t('orders.col.date')}</th>
                  <th>{t('orders.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <Fragment key={o.id}>
                  <tr>
                    <td className="op-mono">
                      <b>{o.code}</b>
                    </td>
                    <td>
                      {o.customerName}
                      <div className="op-sub op-mono">{prettyPhone(o.customerPhone)}</div>
                    </td>
                    <td>{o.workshop ? o.workshop.workshopName || o.workshop.fullName : '—'}</td>
                    <td>
                      <span className={`op-bd ${badgeClass(o.status)}`}>{t(`orders.st.${o.status}`)}</span>
                    </td>
                    <td className="op-mono">{date(o.createdAt)}</td>
                    <td>
                      <div className="op-row is-w" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="op-b is-line is-sm"
                          aria-expanded={openId === o.id}
                          onClick={() => setOpenId(openId === o.id ? null : o.id)}
                        >
                          {t(openId === o.id ? 'orders.hideDetails' : 'orders.details')}
                        </button>
                        <OrderActions order={o} workshops={workshops} onDone={load} onError={setError} />
                      </div>
                    </td>
                  </tr>
                  {openId === o.id && (
                    <tr>
                      <td colSpan={6}>
                        <OrderDetails order={o} t={t} date={date} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="op-pg">
          <span className="op-sub">{t('orders.total', { n: data.total })}</span>
          <div className="op-row" style={{ gap: 6 }}>
            <button
              type="button"
              className="op-b is-ic is-rd"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label={t('orders.prev')}
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
              aria-label={t('orders.next')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
