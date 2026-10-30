import { Suspense, lazy, useEffect, useState } from 'react';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDateTime } from '../../../features/platform/platformApi';
import { prettyPhone, workshopsApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { downloadCsv } from '../../../utils/csvExport';
import Modal from '../../../components/ui/Modal';
import { useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';

// 3D ko'rinish (three.js) faqat 3D dizaynli buyurtma ochilganda yuklanadi
const KitOrderPreview = lazy(() => import('../KitDesigns/KitOrderPreview'));

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
  const money = useMoney();
  const { t } = useLang();
  const [LIMIT] = useState(() => loadAdminPrefs().ordersPageSize || 20);
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
  }, [debouncedSearch, tab, page, reload, LIMIT]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  const exportCsv = () => {
    downloadCsv(
      `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t("Raqam"), (o) => o.code],
        [t("Mijoz"), (o) => o.customerName],
        [t("Telefon"), (o) => prettyPhone(o.customerPhone)],
        [t("Summa"), (o) => o.totalSum],
        [t("To'lov"), (o) => paymentLabel(o.paymentMethod, o.paymentStatus)],
        [t("Status"), (o) => t(ORDER_STATUS[o.status]?.label ?? o.status)],
        [t("Sex"), (o) => o.workshop?.workshopName || o.workshop?.fullName || ''],
        [t("Kanal"), (o) => (o.channel === 'APP' ? 'app' : 'web')],
        [t("Sana"), (o) => formatDateTime(o.createdAt)],
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
          <h1>{t("Buyurtmalar")}</h1>
          <p>{t("Barcha buyurtmalar. Qatorni bosib tafsilot va amallarni oching.")}</p>
        </div>
      </div>

      <div className="sa-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.label}
            type="button"
            className={`sa-tab${tab.label === tb.label ? ' is-active' : ''}`}
            onClick={() => setTab(tb)}
          >
            {t(tb.label)} · {countFor(tb.status)}
          </button>
        ))}
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder={t("Raqam, telefon yoki ism")}
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
              <th>{t("Raqam")}</th>
              <th>{t("Mijoz")}</th>
              <th>{t("Summa")}</th>
              <th>{t("To'lov")}</th>
              <th>{t("Status")}</th>
              <th>{t("Sex")}</th>
              <th>{t("Kanal")}</th>
              <th>{t("Sana")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t("Yuklanmoqda...")}
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t("Buyurtma topilmadi")}
                </td>
              </tr>
            ) : (
              data.items.map((o) => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'blue' };
                return (
                  <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor: 'pointer' }}>
                    <td>
                      <b>{o.code}</b>
                      {o.productType === 'KIT_DESIGN' && (
                        <span className="sa-badge sa-badge--violet" style={{ marginLeft: 6 }}>3D</span>
                      )}
                    </td>
                    <td>
                      {o.customerName}
                      <span className="sa-table__sub">{prettyPhone(o.customerPhone)}</span>
                    </td>
                    <td>{money(o.totalSum)}</td>
                    <td>{paymentLabel(o.paymentMethod, o.paymentStatus)}</td>
                    <td><span className={`sa-badge sa-badge--${st.color}`}>{t(st.label)}</span></td>
                    <td>{o.workshop?.workshopName || o.workshop?.fullName || '—'}</td>
                    <td>{o.channel === 'APP' ? t('ilova') : 'web'}</td>
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
          <span className="sa-table__sub" style={{ marginTop: 0 }}>{t('Jami')}: {data.total}</span>
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
  const money = useMoney();
  const { t, locale } = useLang();
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
    [t("Mijoz"), `${order.customerName} · ${prettyPhone(order.customerPhone)}`],
    [t("To'lov"), `${paymentLabel(order.paymentMethod, order.paymentStatus)} · ${money(order.totalSum)}`],
    order.discountSum > 0 && [t("Chegirma"), money(order.discountSum)],
    order.deliveryAddress && [t("Manzil"), order.deliveryAddress],
    order.deliveryDate && [t("Yetkazish"), `${new Date(order.deliveryDate).toLocaleDateString(locale)} ${order.deliverySlot ?? ''}`],
    order.comment && [t("Izoh"), order.comment],
    [t("Sana"), formatDateTime(order.createdAt)],
  ].filter(Boolean);

  return (
    <Modal title={t('Buyurtma {code}', { code: order.code })} onClose={onClose}>
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
            <div style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13.5 }}>{t("Mahsulotlar")}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {order.items.map((it) => {
                // 3D dizayn: buyurtma paytidagi nusxa (designSnapshot) — dizayn keyin o'zgarsa ham shu tikiladi
                if (it.designSnapshot) {
                  const s = it.designSnapshot;
                  return (
                    <div key={it.id} style={{ fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>
                          <b>{s.name || it.clubName}</b> · {t('3D dizayn')} · {it.shirtSize}
                          {it.withShorts && it.shortsSize ? ` / ${it.shortsSize}` : ''} × {it.quantity}
                        </span>
                        <b>{money(it.totalPrice)}</b>
                      </div>
                      <div className="sa-table__sub" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                        <span>{t('Orqadagi ism')}: <b>{it.printName || '—'}</b></span>
                        <span>{t('Raqam')}: <b>{it.printNumber ?? '—'}</b></span>
                        <span>{t("O'lcham")}: <b>{it.shirtSize}</b></span>
                        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          {[s.primaryColor, s.secondaryColor, s.textColor].map((c) => (
                            <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid var(--sa-line)' }} />
                          ))}
                          {s.pattern}
                        </span>
                      </div>
                      <Suspense fallback={<div className="sa-table__sub">{t('Yuklanmoqda...')}</div>}>
                        <KitOrderPreview snapshot={s} backName={it.printName} number={it.printNumber} />
                      </Suspense>
                    </div>
                  );
                }
                const custom = it.kitId == null || it.design;
                const d = it.design;
                return (
                  <div key={it.id} style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>
                        <b>{custom ? t('Maxsus dizayn') : it.clubName}</b>
                        {!custom && it.kitLabel ? ` · ${it.kitLabel}` : ''} · {it.shirtSize}
                        {it.withShorts && it.shortsSize ? ` / ${it.shortsSize}` : ''}
                        {it.withShorts && it.numberOnShorts && it.shortsNumber ? ` (${t('shortik raqami')} ${it.shortsNumber})` : ''}
                        {(it.printName || it.printNumber) && ` · ${[it.printName, it.printNumber].filter(Boolean).join(' ')}`}
                        {' '}× {it.quantity}
                      </span>
                      <b>{money(it.totalPrice)}</b>
                    </div>
                    {custom && d && (
                      <div className="sa-table__sub" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {t('Rang')}:
                          {d.color?.hex && (
                            <span style={{ width: 14, height: 14, borderRadius: 4, background: d.color.hex, border: '1px solid var(--sa-line)' }} />
                          )}
                          {d.color?.hex || d.color?.id || '—'}
                          {d.color?.type === 'gradient' ? ` (${t('gradient')})` : ''}
                        </span>
                        {d.font && <span>{t('Shrift')}: {d.font}</span>}
                        <span>{t('Patch')}: {d.patch ? (typeof d.patch === 'string' ? d.patch : JSON.stringify(d.patch)) : t("yo'q")}</span>
                        {d.package && <span>{t('Paket')}: {typeof d.package === 'string' ? d.package : JSON.stringify(d.package)}</span>}
                        {d.textColor && <span>{t('Yozuv rangi')}: {d.textColor}</span>}
                        {d.textEffect === 'neon' && <span>{t('Neon yozuv')}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="form-grid">
          <label className="field">
            <span>{t("Holat")}</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ORDER_STATUS).map(([value, s]) => (
                <option key={value} value={value}>{t(s.label)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("Tikuv sexi")}</span>
            <select value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
              {!order.workshop && <option value="">{t("— Biriktirilmagan —")}</option>}
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
            {t("Yopish")}
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving || !changed}>
            {saving ? t("Saqlanmoqda...") : t("Saqlash")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
