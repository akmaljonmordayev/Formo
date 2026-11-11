import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDateTime } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useActiveWorkshops } from '../../../features/orders/useOrderWorkflow';
import { useDebounced } from '../../../hooks/useDebounced';
import { downloadCsv } from '../../../utils/csvExport';
import Modal from '../../../components/ui/Modal';
import { useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';
import { Pager } from '../ui';

// 3D ko'rinish (three.js) faqat 3D dizaynli buyurtma ochilganda yuklanadi
const KitOrderPreview = lazy(() => import('../KitDesigns/KitOrderPreview'));

const TABS = [
  { label: 'Yangi', status: 'NEW' }, // naqd/balans buyurtmalari shu holatda keladi
  { label: 'Sexga yuborildi', status: 'SENT_TO_WORKSHOP' },
  { label: "To'lov kutilmoqda", status: 'PENDING_PAYMENT' },
  { label: 'Qabul qilindi', status: 'ACCEPTED' },
  { label: 'Ishlab chiqarishda', status: 'PRINTING' },
  { label: 'Tayyor', status: 'READY' },
  { label: 'Yetkazishda', status: 'DELIVERING' },
  { label: 'Yetkazildi', status: 'DELIVERED' },
  { label: 'Bekor qilingan', status: 'CANCELLED' },
  { label: 'Qaytarilgan', status: 'RETURNED' },
];

export default function SuperadminOrders() {
  const money = useMoney();
  const { t } = useLang();
  const [LIMIT] = useState(() => loadAdminPrefs().ordersPageSize || 20);
  const [tab, setTab] = useState(TABS[0]);
  // Dashboard / Ishlab chiqarish dan ?search=KOD bilan kelinsa — shu buyurtma darhol topiladi
  const [params] = useSearchParams();
  const urlSearch = params.get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => setSearch(urlSearch), [urlSearch]); // SPA ichida boshqa ?search= bilan kelinsa ham
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => setPage(1), [debouncedSearch, tab]);

  // Yangi buyurtmalar sahifani yangilamasdan ko'rinsin: 30 s da bir jim yangilash (yashirin vkladkada va ochiq modalda — yo'q)
  const [poll, setPoll] = useState(0);
  const lastPoll = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !selected) setPoll((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [selected]);

  useEffect(() => {
    let active = true;
    const silent = poll !== lastPoll.current;
    lastPoll.current = poll;
    if (!silent) setLoading(true);
    setError('');
    ordersApi
      .list({ search: debouncedSearch, status: tab.status, page, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, tab, page, reload, LIMIT, poll]);

  const exportCsv = () => {
    downloadCsv(
      `buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t("Raqam"), (o) => o.code],
        [t("Mijoz"), (o) => o.customerName],
        [t("Telefon"), (o) => prettyPhone(o.customerPhone)],
        [t("Summa"), (o) => o.totalSum],
        [t("To'lov"), (o) => paymentLabel(o.paymentMethod, o.paymentStatus, t)],
        [t("Status"), (o) => t(ORDER_STATUS[o.status]?.label ?? o.status)],
        [t("Sex"), (o) => o.workshop?.workshopName || o.workshop?.fullName || ''],
        [t("Kanal"), (o) => (o.channel === 'APP' ? 'app' : 'web')],
        [t("Sana"), (o) => formatDateTime(o.createdAt)],
      ],
      data.items,
    );
  };

  // byStatus — butun baza bo'yicha (qidiruv/tabdan qat'i nazar); "Barchasi" ham shundan yig'iladi,
  // aks holda boshqa tabda turganda u joriy tabning sonini ko'rsatardi
  const countFor = (status) => {
    if (!status) return Object.values(data.byStatus ?? {}).reduce((s, n) => s + n, 0);
    return data.byStatus?.[status] ?? 0;
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
                  <tr
                    key={o.id}
                    tabIndex={0}
                    onClick={() => setSelected(o)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(o);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
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
                    <td>{paymentLabel(o.paymentMethod, o.paymentStatus, t)}</td>
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

      <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />

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
  const { workshops, error: workshopsError } = useActiveWorkshops();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workshopsError) setError(workshopsError);
  }, [workshopsError]);

  // assign o'tib, holat yangilash xato bersa: qayta bosishda assign takrorlanmaydi, yopilganda ro'yxat yangilanadi
  const assigned = useRef(false);
  const [savedWorkshopId, setSavedWorkshopId] = useState(order.workshop?.id ? String(order.workshop.id) : '');
  const workshopChanged = workshopId !== savedWorkshopId;
  const changed = status !== order.status || workshopChanged;
  const close = () => (assigned.current ? onSaved() : onClose());

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Sex almashishi — faqat assign orqali (to'lanmagan/tikilayotgan buyurtmani server rad etadi, tarix yoziladi).
      // assign holatni SENT_TO_WORKSHOP qiladi; boshqa holat tanlangan bo'lsa u alohida o'rnatiladi
      if (workshopChanged && workshopId) {
        await ordersApi.assign(order.id, { workshopId: Number(workshopId) });
        assigned.current = true;
        setSavedWorkshopId(workshopId);
      }
      const assignedNow = assigned.current && status === 'SENT_TO_WORKSHOP';
      if (status !== order.status && !assignedNow) await ordersApi.updateStatus(order.id, { status });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const hasPoint = typeof order.deliveryLat === 'number' && typeof order.deliveryLng === 'number';
  const rows = [
    [t("Mijoz"), `${order.customerName} · ${prettyPhone(order.customerPhone)}`],
    [t("To'lov"), `${paymentLabel(order.paymentMethod, order.paymentStatus, t)} · ${money(order.totalSum)}`],
    order.discountSum > 0 && [t("Chegirma"), money(order.discountSum)],
    order.deliveryAddress && [t("Manzil"), order.deliveryAddress],
    // Mijoz xaritada belgilagan aniq nuqta — kuryer/pochta shu yerga olib boradi
    hasPoint && [
      t("Xaritadagi nuqta"),
      <span key="map" style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <a href={`https://yandex.uz/maps/?pt=${order.deliveryLng},${order.deliveryLat}&z=17&l=map`} target="_blank" rel="noopener noreferrer">
          {t("Yandex xaritada ochish")}
        </a>
        <a href={`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`} target="_blank" rel="noopener noreferrer">
          Google Maps
        </a>
        <span className="muted">{`${order.deliveryLat.toFixed(5)}, ${order.deliveryLng.toFixed(5)}`}</span>
      </span>,
    ],
    order.deliveryDate
      ? [t("Yetkazish"), `${new Date(order.deliveryDate).toLocaleDateString(locale)} ${order.deliverySlot ?? ''}`]
      : // Sana tanlanmagan mobil buyurtma — viloyatga, pochta bo'limigacha
        order.deliveryAddress && order.deliveryRegion && order.deliveryRegion !== 'TOSHKENT_SHAHRI' && [t("Yetkazish"), t("Pochta orqali (pochta bo'limigacha)")],
    order.comment && [t("Izoh"), order.comment],
    [t("Sana"), formatDateTime(order.createdAt)],
  ].filter(Boolean);

  return (
    <Modal title={t('Buyurtma {code}', { code: order.code })} onClose={close}>
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
            <select
              value={workshopId}
              onChange={(e) => {
                setWorkshopId(e.target.value);
                // Yangi buyurtmaga sex tanlansa — assign uni SENT_TO_WORKSHOP qiladi, holat selecti ham shuni ko'rsatsin
                if (e.target.value && status === 'NEW') setStatus('SENT_TO_WORKSHOP');
              }}
            >
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
          <button type="button" className="btn btn--ghost" onClick={close}>
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
