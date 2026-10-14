import { useEffect, useState } from 'react';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDateTime, money } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';

const LIMIT = 20;
const TABS = [
  { label: 'Barchasi', status: undefined },
  { label: "To'lov kutilmoqda", status: 'PENDING_PAYMENT' },
  { label: 'Qabul qilindi', status: 'ACCEPTED' },
  { label: 'Ishlab chiqarishda', status: 'PRINTING' },
  { label: 'Yetkazishda', status: 'DELIVERING' },
  { label: 'Yetkazildi', status: 'DELIVERED' },
  { label: 'Bekor / qaytarilgan', status: 'CANCELLED' },
];

export default function SuperadminOrders() {
  const [tab, setTab] = useState(TABS[0]);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    ordersApi
      .list({ search: debouncedSearch, status: tab.status, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, tab]);

  const countFor = (status) => {
    if (!status) return data.total;
    if (status === 'CANCELLED') return (data.byStatus.CANCELLED ?? 0) + (data.byStatus.RETURNED ?? 0);
    return data.byStatus[status] ?? 0;
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Buyurtmalar</h1>
          <p>Barcha buyurtmalar. Qatorni bosib tafsilot va amallarni oching.</p>
        </div>
      </div>

      <div className="sa-tabs">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`sa-tab${tab.label === t.label ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.label} · {countFor(t.status)}
          </button>
        ))}
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Raqam, telefon yoki ism"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="sa-btn sa-btn--ghost">CSV</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Mijoz</th>
              <th>Summa</th>
              <th>To'lov</th>
              <th>Status</th>
              <th>Sex</th>
              <th>Kanal</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  Buyurtma topilmadi
                </td>
              </tr>
            ) : (
              data.items.map((o) => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'blue' };
                return (
                  <tr key={o.id}>
                    <td><b>{o.code}</b></td>
                    <td>
                      {o.customerName}
                      <span className="sa-table__sub">{prettyPhone(o.customerPhone)}</span>
                    </td>
                    <td>{money(o.totalSum)}</td>
                    <td>{paymentLabel(o.paymentMethod, o.paymentStatus)}</td>
                    <td><span className={`sa-badge sa-badge--${st.color}`}>{st.label}</span></td>
                    <td>{o.workshop?.workshopName || o.workshop?.fullName || '—'}</td>
                    <td>{o.channel === 'APP' ? 'app' : 'web'}</td>
                    <td>{formatDateTime(o.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
