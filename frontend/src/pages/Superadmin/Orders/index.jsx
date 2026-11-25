import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDateTime } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { downloadCsv } from '../../../utils/csvExport';
import { useLang, useMoney } from '../i18n';
import { loadAdminPrefs } from '../prefs';
import { COUNTS_EVENT, Pager } from '../ui';
import OrderModal from './OrderModal';

const TABS = [
  { label: 'Yangi', status: 'NEW' }, // naqd va karta buyurtmalari shu navbatga tushadi
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
  const [LIMIT] = useState(() => loadAdminPrefs().ordersPageSize || 10);
  // Dashboard / Ishlab chiqarish dan ?search=KOD bilan kelinsa — shu buyurtma darhol topiladi; ?status=READY — shu tab ochiladi
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => TABS.find((tb) => tb.status === params.get('status')) ?? TABS[0]);
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

  // Qatordagi "Qabul qilish": sexi bor buyurtma shu yerning o'zida qabul qilinadi, sexi yo'q bo'lsa — sex tanlash uchun oyna ochiladi
  const [accepting, setAccepting] = useState(null);
  const accept = async (o) => {
    if (!o.workshop) return setSelected(o);
    setAccepting(o.id);
    setError('');
    try {
      await ordersApi.updateStatus(o.id, { status: 'ACCEPTED' });
      setReload((n) => n + 1);
      window.dispatchEvent(new Event(COUNTS_EVENT));
    } catch (e) {
      setError(e.message);
    } finally {
      setAccepting(null);
    }
    return undefined;
  };

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
          <p>{t("Naqd to'lov faqat Toshkent shahrida, boshqa hududlarda karta orqali.")}</p>
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
              <th style={{ width: 44 }}>№</th>
              <th>{t("Raqam")}</th>
              <th>{t("Mijoz")}</th>
              <th>{t("Summa")}</th>
              <th>{t("To'lov")}</th>
              <th>{t("Status")}</th>
              <th>{t("Sex")}</th>
              <th>{t("Kanal")}</th>
              <th>{t("Sana")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={10} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t("Yuklanmoqda...")}
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={10} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t("Buyurtma topilmadi")}
                </td>
              </tr>
            ) : (
              data.items.map((o, i) => {
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
                    {/* Tartib raqami sahifalar bo'yicha uzluksiz: 2-sahifa LIMIT+1 dan davom etadi */}
                    <td className="sa-table__sub" style={{ fontWeight: 700 }}>{(page - 1) * LIMIT + i + 1}</td>
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
                    <td>
                      {(o.status === 'NEW' || o.status === 'SENT_TO_WORKSHOP') && (
                        <button
                          type="button"
                          className="sa-btn"
                          disabled={accepting === o.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            accept(o);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {accepting === o.id ? t('Kuting...') : t('Qabul qilish')}
                        </button>
                      )}
                    </td>
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
            // Menyudagi "yangi buyurtma" soni kutmasdan yangilanadi
            window.dispatchEvent(new Event(COUNTS_EVENT));
          }}
        />
      )}
    </>
  );
}
