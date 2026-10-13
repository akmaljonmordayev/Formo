import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import { useT } from '../i18n';

const STATUSES = ['all', 'paid', 'pending', 'refund'];

// To'lovlar API hali yo'q: tuzilma tayyor, modul ulanganda kartalar va jadval to'ladi
export default function OperatorPayments() {
  const t = useT();
  const [status, setStatus] = useState(STATUSES[0]);
  const [query, setQuery] = useState('');

  const cards = [
    { label: 'pay.income', icon: ArrowDownLeft, tone: 'is-c2' },
    { label: 'pay.pending', icon: Clock, tone: 'is-c3' },
    { label: 'pay.paidOut', icon: ArrowUpRight, tone: 'is-c4' },
  ];

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.payments')}</h1>
          <p>{t('pay.subtitle')}</p>
        </div>
      </div>

      <div className="op-pay">
        {cards.map(({ label, icon: Icon, tone }) => (
          <div key={label} className={`op-pay-k ${tone}`}>
            <span>
              <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
              {t(label)}
            </span>
            <b>—</b>
            <small>
              {t('pay.month')} · {t('dash.notConnected')}
            </small>
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
            aria-label={t('pay.search')}
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
                {t(`pay.s.${s}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="op-sc">
          <table className="op-tb">
            <thead>
              <tr>
                <th>{t('pay.col.id')}</th>
                <th>{t('pay.col.order')}</th>
                <th>{t('pay.col.payer')}</th>
                <th>{t('pay.col.amount')}</th>
                <th>{t('pay.col.method')}</th>
                <th>{t('orders.col.status')}</th>
                <th>{t('orders.col.date')}</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="op-em">
          <Wallet size={28} aria-hidden="true" />
          <h3>{t('pay.empty')}</h3>
          <p>{t('pay.emptyHint')}</p>
        </div>
      </section>
    </>
  );
}
