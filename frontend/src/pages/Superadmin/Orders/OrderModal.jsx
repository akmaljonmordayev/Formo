import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Factory } from 'lucide-react';
import { ordersApi, ORDER_STATUS, paymentLabel, formatDate, formatDateTime } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useActiveWorkshops } from '../../../features/orders/useOrderWorkflow';
import Modal from '../../../components/ui/Modal';
import { useLang, useMoney } from '../i18n';
import Select from '../Select';

// 3D ko'rinish (three.js) faqat 3D dizaynli buyurtma ochilganda yuklanadi
const KitOrderPreview = lazy(() => import('../KitDesigns/KitOrderPreview'));

/** Buyurtma tafsiloti va amallari — "Kartadan to'lovchilar" sahifasi ham shu oynadan foydalanadi */
export default function OrderModal({ order, onClose, onSaved }) {
  const money = useMoney();
  const { t } = useLang();
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
  // Kartadan to'lov: admin mijozga qo'ng'iroq qilib karta raqamini beradi, pul tushgach shu yerda "To'landi"
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const cardUnpaid = order.paymentMethod === 'CARD' && paymentStatus !== 'PAID' && order.status === 'NEW';
  const [markingPaid, setMarkingPaid] = useState(false);
  // "To'landi" bosilganini alohida eslab qolamiz: `assigned` faqat haqiqiy assign uchun (save() unga tayanadi)
  const paidNow = useRef(false);
  const markPaid = async () => {
    setMarkingPaid(true);
    setError('');
    try {
      await ordersApi.cardPaid(order.id);
      setPaymentStatus('PAID');
      paidNow.current = true; // yopilganda ro'yxat yangilansin
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingPaid(false);
    }
  };
  const close =() => (assigned.current || paidNow.current ? onSaved() : onClose());

  const submit = (e) => {
    e.preventDefault();
    save(status);
  };

  const save = async (status) => {
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

  // Buyurtmaning hozirgi sexi faol ro'yxatda bo'lmasa (bloklangan) ham tanlovda ko'rinadi
  const workshopOptions = [
    !order.workshop && { value: '', label: t('— Biriktirilmagan —'), dot: 'gray' },
    order.workshop &&
      !workshops.some((w) => w.id === order.workshop.id) && {
        value: String(order.workshop.id),
        label: order.workshop.workshopName || order.workshop.fullName,
        icon: Factory,
      },
    ...workshops.map((w) => ({
      value: String(w.id),
      label: w.workshopName || w.fullName,
      hint: w.workshopName && w.fullName !== w.workshopName ? w.fullName : undefined,
      icon: Factory,
    })),
  ].filter(Boolean);

  const hasPoint = typeof order.deliveryLat === 'number' && typeof order.deliveryLng === 'number';
  const rows = [
    [t("Mijoz"), `${order.customerName} · ${prettyPhone(order.customerPhone)}`],
    [t("To'lov"), `${paymentLabel(order.paymentMethod, paymentStatus, t)} · ${money(order.totalSum)}`],
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
      ? [t("Yetkazish"), `${formatDate(order.deliveryDate)} ${order.deliverySlot ?? ''}`]
      : // Sana tanlanmagan mobil buyurtma — viloyatga, pochta bo'limigacha
        order.deliveryAddress && order.deliveryRegion && order.deliveryRegion !== 'TOSHKENT_SHAHRI' && [t("Yetkazish"), t("Pochta orqali (pochta bo'limigacha)")],
    order.comment && [t("Izoh"), order.comment],
    [t("Sana"), formatDateTime(order.createdAt)],
  ].filter(Boolean);

  return (
    <Modal title={t('Buyurtma {code}', { code: order.code })} onClose={close}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}

        {cardUnpaid && (
          <div className="sa-cardpay">
            <div>
              <b>{t("Kartadan to'lov kutilmoqda")}</b>
              <span>
                {t("Mijozga qo'ng'iroq qiling va karta raqamini bering. Pul tushgach «To'landi»ni bosing, so'ng tikuv sexini tanlang.")}
              </span>
              <a href={`tel:+${String(order.customerPhone).replace(/\D/g, '')}`}>{prettyPhone(order.customerPhone)}</a>
            </div>
            <button type="button" className="btn btn--accent" disabled={markingPaid || saving} onClick={markPaid}>
              {markingPaid ? t('Saqlanmoqda...') : t("To'landi")}
            </button>
          </div>
        )}

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
          <div className="field">
            <span>{t("Holat")}</span>
            <Select
              value={status}
              onChange={setStatus}
              ariaLabel={t('Holat')}
              options={Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: t(s.label), dot: s.color }))}
            />
          </div>
          <div className="field">
            <span>{t("Tikuv sexi")}</span>
            <Select
              value={workshopId}
              onChange={(value) => {
                setWorkshopId(value);
                // Yangi buyurtmaga sex tanlansa — assign uni SENT_TO_WORKSHOP qiladi, holat selecti ham shuni ko'rsatsin
                if (value && status === 'NEW') setStatus('SENT_TO_WORKSHOP');
              }}
              ariaLabel={t('Tikuv sexi')}
              icon={Factory}
              options={workshopOptions}
            />
          </div>
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
