import { useEffect, useState } from 'react';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDateTime, money } from '../../../features/platform/platformApi';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { downloadCsv } from '../../../utils/csvExport';
import Modal from '../../../components/ui/Modal';

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
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => setPage(1), [debouncedSearch, tab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    ordersApi
      .list({ search: debouncedSearch, status: tab.status, page, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, tab, page, reload]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  const exportCsv = () => {
    downloadCsv(
      `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ['Raqam', (o) => o.code],
        ['Mijoz', (o) => o.customerName],
        ['Telefon', (o) => prettyPhone(o.customerPhone)],
        ['Summa', (o) => o.totalSum],
        ["To'lov", (o) => paymentLabel(o.paymentMethod, o.paymentStatus)],
        ['Status', (o) => ORDER_STATUS[o.status]?.label ?? o.status],
        ['Sex', (o) => o.workshop?.workshopName || o.workshop?.fullName || ''],
        ['Kanal', (o) => (o.channel === 'APP' ? 'app' : 'web')],
        ['Sana', (o) => formatDateTime(o.createdAt)],
      ],
      data.items,
    );
  };

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
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!data.items.length}>CSV</button>
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
                  <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor: 'pointer' }}>
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

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="sa-table__sub" style={{ marginTop: 0 }}>Jami: {data.total}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="sa-btn sa-btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            <span className="sa-table__sub" style={{ marginTop: 0 }}>{page} / {pages}</span>
            <button type="button" className="sa-btn sa-btn--ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>→</button>
          </div>
        </div>
      )}

      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

function OrderModal({ order, onClose, onSaved }) {
  const [status, setStatus] = useState(order.status);
  const [workshopId, setWorkshopId] = useState(order.workshop?.id ? String(order.workshop.id) : '');
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    workshopsApi
      .list({ isActive: 'true', page: 1, limit: 100 })
      .then((d) => setWorkshops(d.items))
      .catch((e) => setError(e.message));
  }, []);

  const changed = status !== order.status || workshopId !== (order.workshop?.id ? String(order.workshop.id) : '');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { status };
      if (workshopId) body.workshopId = Number(workshopId);
      await ordersApi.updateStatus(order.id, body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const rows = [
    ['Mijoz', `${order.customerName} · ${prettyPhone(order.customerPhone)}`],
    ["To'lov", `${paymentLabel(order.paymentMethod, order.paymentStatus)} · ${money(order.totalSum)}`],
    order.discountSum > 0 && ['Chegirma', money(order.discountSum)],
    order.deliveryAddress && ['Manzil', order.deliveryAddress],
    order.deliveryDate && ['Yetkazish', `${new Date(order.deliveryDate).toLocaleDateString('uz-UZ')} ${order.deliverySlot ?? ''}`],
    order.comment && ['Izoh', order.comment],
    ['Sana', formatDateTime(order.createdAt)],
  ].filter(Boolean);

  return (
    <Modal title={`Buyurtma ${order.code}`} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 13.5, marginBottom: 14 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <span className="muted">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        {order.items?.length > 0 && (
          <>
            <div style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13.5 }}>Mahsulotlar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {order.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span>
                    {it.clubName} · {it.kitLabel} · {it.shirtSize}
                    {it.withShorts && it.shortsSize ? ` / ${it.shortsSize}` : ''}
                    {(it.printName || it.printNumber) && ` · ${[it.printName, it.printNumber].filter(Boolean).join(' ')}`}
                    {' '}× {it.quantity}
                  </span>
                  <b>{money(it.totalPrice)}</b>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="form-grid">
          <label className="field">
            <span>Holat</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ORDER_STATUS).map(([value, s]) => (
                <option key={value} value={value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tikuv sexi</span>
            <select value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
              {!order.workshop && <option value="">— Biriktirilmagan —</option>}
              {order.workshop && !workshops.some((w) => w.id === order.workshop.id) && (
                <option value={order.workshop.id}>{order.workshop.workshopName || order.workshop.fullName}</option>
              )}
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>{w.workshopName || w.fullName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Yopish
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving || !changed}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
