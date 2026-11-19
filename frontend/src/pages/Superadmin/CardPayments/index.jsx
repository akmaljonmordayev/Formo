import { useEffect, useRef, useState } from 'react';
import { ordersApi, formatDateTime } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useLang, useMoney } from '../i18n';
import { COUNTS_EVENT, Pager } from '../ui';
import OrderModal from '../Orders/OrderModal';

const LIMIT = 20;

/** Buyurtma tarkibi bir qatorda: "Real Madrid · Uy · L × 2, Maxsus dizayn · M" */
export function itemsSummary(o, t) {
  const items = o.items?.length ? o.items : [];
  if (!items.length) return [o.club?.name, o.kitLabel, o.size].filter(Boolean).join(' · ');
  return items
    .map((it) => {
      const name = it.kitId == null || it.design ? t('Maxsus dizayn') : [it.clubName, it.kitLabel].filter(Boolean).join(' · ');
      return `${name} · ${it.shirtSize}${it.quantity > 1 ? ` × ${it.quantity}` : ''}`;
    })
    .join(', ');
}

/**
 * Kartadan to'lovchilar: mijoz checkout'da "Kartadan to'lash"ni tanlagan, hali sexga yuborilmagan buyurtmalar
 * (`?paymentMethod=CARD&status=NEW`). Admin mijozga qo'ng'iroq qilib karta raqamini beradi, pul tushgach
 * "To'landi" qiladi va tikuv sexini tanlaydi — buyurtma sexga ketadi va bu ro'yxatdan chiqadi.
 * Holatni oddiy Buyurtmalar sahifasidagi kabi shu yerning o'zida o'zgartirish mumkin (bir xil oyna).
 */
export default function CardPayments() {
  const money = useMoney();
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const [paying, setPaying] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch]);

  // Yangi so'rovlar sahifani yangilamasdan ko'rinsin (yashirin vkladkada va ochiq oynada — yo'q)
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
      .list({ paymentMethod: 'CARD', status: 'NEW', search: debouncedSearch, page, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, reload, poll]);

  const refresh = () => {
    setReload((n) => n + 1);
    window.dispatchEvent(new Event(COUNTS_EVENT));
  };

  const markPaid = async (o) => {
    setPaying(o.id);
    setError('');
    try {
      const updated = await ordersApi.cardPaid(o.id);
      refresh();
      // To'landi — endi sexni tanlash uchun oyna darhol ochiladi
      setSelected(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(null);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Kartadan to'lovchilar")}</h1>
          <p>
            {t(
              "Kartadan to'lashni tanlagan mijozlar. Qo'ng'iroq qilib karta raqamini bering, pul tushgach «To'landi»ni bosing va tikuv sexini tanlang — buyurtma sexga ketadi va bu ro'yxatdan chiqadi.",
            )}{' '}
            {t("Qo'ng'iroq kutayotganlar 24 soat ichida to'lamasa, buyurtma avtomatik bekor bo'ladi.")}
          </p>
        </div>
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder={t('Raqam, telefon yoki ism')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>№</th>
              <th>{t('Mijoz')}</th>
              <th>{t('Buyurtma')}</th>
              <th>{t('Summa')}</th>
              <th>{t("To'lov")}</th>
              <th>{t('Sana')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={7} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t('Yuklanmoqda...')}
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={7} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>
                  {t("Kartadan to'lov so'rovlari yo'q")}
                </td>
              </tr>
            ) : (
              data.items.map((o, i) => {
                const paid = o.paymentStatus === 'PAID';
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
                    <td className="sa-table__sub" style={{ fontWeight: 700 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      <b>{o.customerName}</b>
                      <a
                        className="sa-table__sub"
                        href={`tel:+${String(o.customerPhone).replace(/\D/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'block' }}
                      >
                        {prettyPhone(o.customerPhone)}
                      </a>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <b>{o.code}</b>
                      <span className="sa-table__sub">{itemsSummary(o, t)}</span>
                    </td>
                    <td><b>{money(o.totalSum)}</b></td>
                    <td>
                      <span className={`sa-badge sa-badge--${paid ? 'green' : 'orange'}`}>
                        {paid ? t("To'landi") : t("Qo'ng'iroq kutmoqda")}
                      </span>
                    </td>
                    <td>{formatDateTime(o.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="sa-btn"
                        disabled={paying === o.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (paid) setSelected(o);
                          else markPaid(o);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {paying === o.id ? t('Kuting...') : paid ? t('Sexga yuborish') : t("To'landi")}
                      </button>
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
          // To'landi bosilgandan keyin yangilangan buyurtma bilan qayta ochiladi
          key={`${selected.id}-${selected.paymentStatus}`}
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
