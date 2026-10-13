import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useT } from '../i18n';

const STATUSES = ['all', 'new', 'progress', 'sewing', 'delivered', 'cancelled'];

// Buyurtmalar API hali yo'q: tuzilma tayyor, ma'lumot ulanganda jadval to'ladi
export default function OperatorOrders() {
  const t = useT();
  const [status, setStatus] = useState(STATUSES[0]);
  const [query, setQuery] = useState('');

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
            aria-label={t('orders.searchLabel')}
          />
          <div className="op-row is-w" style={{ gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`op-chip${status === s ? ' is-on' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
              >
                {t(`orders.s.${s}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="op-sc">
          <table className="op-tb">
            <thead>
              <tr>
                <th>{t('orders.col.order')}</th>
                <th>{t('orders.col.client')}</th>
                <th>{t('orders.col.workshop')}</th>
                <th>{t('orders.col.status')}</th>
                <th>{t('orders.col.date')}</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="op-em">
          <ShoppingBag size={28} aria-hidden="true" />
          <h3>{t('orders.empty')}</h3>
          <p>{t('orders.emptyHint')}</p>
        </div>
      </section>
    </>
  );
}
