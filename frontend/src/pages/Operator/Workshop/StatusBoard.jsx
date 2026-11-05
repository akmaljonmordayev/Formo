import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { ordersApi } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { OrderDetails } from '../Orders';
import { useT } from '../i18n';

const POLL_MS = 30_000;

/**
 * Operator holatni sex o'rniga ham o'zgartira oladi (hozircha sex yo'q — bitta odam boshqaradi).
 * Har holat uchun bitta asosiy amal: keyingi holat va tugma matni.
 */
const NEXT = {
  SENT_TO_WORKSHOP: { to: 'ACCEPTED', label: 'board.accept', icon: ClipboardCheck },
  ACCEPTED: { to: 'READY', label: 'board.ready', icon: PackageCheck },
  // eski oraliq holatlar — ular ham "Tayyor"ga o'tadi
  PRINTING: { to: 'READY', label: 'board.ready', icon: PackageCheck },
  QUALITY_CHECK: { to: 'READY', label: 'board.ready', icon: PackageCheck },
  READY: { to: 'DELIVERING', label: 'board.deliver', icon: Truck },
  DELIVERING: { to: 'DELIVERED', label: 'board.delivered', icon: CheckCircle2 },
};

/**
 * Holatlar bo'yicha ustunli doska. columns: [{ key, statuses: [...] }] — har ustun alohida so'rov
 * (GET /admin/orders?statuses=...). Ustun nomi: t(`board.col.${key}`).
 */
export default function StatusBoard({ title, subtitle, columns, emptyIcon: EmptyIcon }) {
  const t = useT();
  const [data, setData] = useState({}); // key -> { items, total }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');

  const lastReq = useRef(0);
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const req = ++lastReq.current;
      if (!silent) setLoading(true);
      try {
        const results = await Promise.all(
          columns.map((c) => ordersApi.list({ statuses: c.statuses.join(','), page: 1, limit: 100 })),
        );
        if (req !== lastReq.current) return;
        setData(Object.fromEntries(columns.map((c, i) => [c.key, results[i]])));
        setError('');
      } catch (err) {
        if (req === lastReq.current) setError(err.message);
      } finally {
        if (req === lastReq.current) setLoading(false);
      }
    },
    [columns],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const move = async (order) => {
    const next = NEXT[order.status];
    if (!next) return;
    setBusyId(order.id);
    setError('');
    setNotice('');
    try {
      await ordersApi.updateStatus(order.id, { status: next.to });
      setNotice(t('board.moved', { code: order.code, status: t(`orders.st.${next.to}`) }));
      await load({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const date = (iso) => new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: '2-digit' });
  const total = columns.reduce((s, c) => s + (data[c.key]?.total ?? 0), 0);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="op-b is-line is-sm" onClick={() => load()} disabled={loading}>
          <RefreshCw size={14} aria-hidden="true" /> {t('board.refresh')}
        </button>
      </div>

      {error && (
        <div className="op-msg" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="op-msg is-ok" role="status" style={{ marginBottom: 12 }}>
          {notice}
        </div>
      )}

      {!loading && total === 0 ? (
        <section className="op-cd">
          <div className="op-em">
            <EmptyIcon size={28} aria-hidden="true" />
            <h3>{t('board.empty')}</h3>
            <p>{t('board.emptyHint')}</p>
          </div>
        </section>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: `repeat(auto-fit, minmax(${columns.length > 1 ? 300 : 360}px, 1fr))`,
            alignItems: 'start',
          }}
        >
          {columns.map((col) => {
            const items = data[col.key]?.items ?? [];
            return (
              <section key={col.key} className="op-cd" aria-label={t(`board.col.${col.key}`)}>
                <div className="op-pd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{t(`board.col.${col.key}`)}</b>
                  <span className="op-bd">{data[col.key]?.total ?? (loading ? '…' : 0)}</span>
                </div>
                <div style={{ display: 'grid', gap: 10, padding: '0 12px 12px' }}>
                  {loading && !items.length ? (
                    <div className="op-sub" style={{ padding: 8 }}>{t('orders.loading')}</div>
                  ) : !items.length ? (
                    <div className="op-sub" style={{ padding: 8 }}>{t('board.colEmpty')}</div>
                  ) : (
                    items.map((o) => {
                      const next = NEXT[o.status];
                      const Icon = next?.icon;
                      return (
                        <article
                          key={o.id}
                          style={{
                            border: '1px solid var(--op-ln)',
                            borderRadius: 12,
                            padding: 12,
                            background: 'var(--op-bg, transparent)',
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                            <b className="op-mono">{o.code}</b>
                            <span className="op-bd">{t(`orders.st.${o.status}`)}</span>
                          </div>
                          <div>
                            {o.customerName}
                            <div className="op-sub op-mono">{prettyPhone(o.customerPhone)}</div>
                          </div>
                          <div className="op-sub">
                            {[
                              o.workshop ? o.workshop.workshopName || o.workshop.fullName : null,
                              o.deliveryDate ? `${t('board.deliveryOn')} ${date(o.deliveryDate)}${o.deliverySlot ? `, ${o.deliverySlot}` : ''}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                          {openId === o.id && <OrderDetails order={o} t={t} date={date} />}
                          <div className="op-row is-w" style={{ gap: 6 }}>
                            {next && (
                              <button
                                type="button"
                                className="op-b is-p is-sm"
                                disabled={busyId === o.id}
                                onClick={() => move(o)}
                              >
                                {Icon && <Icon size={14} aria-hidden="true" />} {t(next.label)}
                              </button>
                            )}
                            <button
                              type="button"
                              className="op-b is-line is-sm"
                              aria-expanded={openId === o.id}
                              onClick={() => setOpenId(openId === o.id ? null : o.id)}
                            >
                              {t(openId === o.id ? 'orders.hideDetails' : 'orders.details')}
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
