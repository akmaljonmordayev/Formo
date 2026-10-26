import { useCallback, useEffect, useState } from 'react';
import { settingsApi, topupsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { useLang, useMoney, useT } from '../i18n';

/*
 * Balansni qo'lda to'ldirish: mijoz botda summa tanlaydi → kartaga o'tkazadi → chek rasmini yuboradi.
 * Pul faqat shu yerda "Tasdiqlash" bosilganda (backend'da atomik, bir marta) qo'shiladi.
 * Chek rasmi serverda saqlanmaydi — har ochilganda Telegram'dan olinadi.
 */

const TABS = [
  { status: 'REVIEW', label: 'Tekshiruvda' },
  { status: 'PENDING', label: 'Chek kutilmoqda' },
  { status: 'APPROVED', label: 'Tasdiqlangan' },
  { status: 'REJECTED', label: 'Rad etilgan' },
  { status: 'CANCELLED', label: 'Bekor qilingan' },
  { status: '', label: 'Hammasi' },
];

const STATUS = {
  PENDING: { label: 'Chek kutilmoqda', tone: 'orange' },
  REVIEW: { label: 'Tekshiruvda', tone: 'blue' },
  APPROVED: { label: 'Tasdiqlangan', tone: 'green' },
  REJECTED: { label: 'Rad etilgan', tone: 'red' },
  CANCELLED: { label: 'Bekor qilingan', tone: 'violet' },
};

const METHOD = { MANUAL_CARD: 'Karta (qo‘lda)', CLICK: 'Click', PAYME: 'Payme' };
const OPEN = ['PENDING', 'REVIEW'];
const LINK_WARNING = {
  NOT_LINKED: "Mijozning Telegram ulanishi yo'q — chek kimdan kelganini tekshiring",
  LINK_CHANGED: 'Chek boshqa Telegram akkauntidan yuborilgan (ulanish keyin almashgan)',
};
const REJECT_PRESETS = [
  "Chekdagi summa so'rovga mos emas",
  'Bu chek avval ishlatilgan',
  "Chek o'qilmaydi yoki to'liq emas",
  'Kartaga tushum topilmadi',
];
const MANUAL_KEY = 'payments.manual';

export default function SuperadminTopUps() {
  const t = useT();
  const money = useMoney();
  const { locale } = useLang();
  const [tab, setTab] = useState('REVIEW');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return topupsApi
      .list({ status: tab || undefined, limit: 50 })
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const date = (d) => (d ? new Date(d).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const counts = data?.byStatus ?? {};
  const items = data?.items ?? [];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Balans to'ldirish")}</h1>
          <p>{t("Mijoz Telegram botda yuborgan cheklar. Pul faqat siz tasdiqlaganingizdan keyin balansga qo'shiladi.")}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={load} disabled={loading}>
          {t('Yangilash')}
        </button>
      </div>

      <ManualCardSettings />

      <div className="sa-tabs">
        {TABS.map((x) => (
          <button key={x.label} type="button" className={`sa-tab${tab === x.status ? ' is-active' : ''}`} onClick={() => setTab(x.status)}>
            {t(x.label)}
            {x.status && counts[x.status] ? ` · ${counts[x.status]}` : ''}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading && !data ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : items.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t("Bu bo'limda so'rov yo'q.")}</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("So'rov")}</th>
                <th>{t('Mijoz')}</th>
                <th>{t('Summa')}</th>
                <th>{t('Joriy balans')}</th>
                <th>{t('Sana')}</th>
                <th>{t('Holat')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.code}</b>
                    <div className="sa-table__sub">{t(METHOD[x.method] ?? x.method)}</div>
                  </td>
                  <td>
                    {x.user?.fullName ?? '—'} <span className="sa-table__sub">#{x.user?.id}</span>
                    <div className="sa-table__sub">{x.user?.phone} · TG {x.telegram?.telegramUserId ?? '—'}</div>
                    {x.linkWarning && <div className="sa-table__sub" style={{ color: '#e5484d' }}>⚠ {t(LINK_WARNING[x.linkWarning])}</div>}
                  </td>
                  <td>
                    <b>{money(x.amount)}</b>
                    {x.requestedAmount != null && <div className="sa-table__sub">{t("So'ralgan")}: {money(x.requestedAmount)}</div>}
                  </td>
                  <td>{money(x.user?.balance)}</td>
                  <td>
                    {date(x.createdAt)}
                    {x.receiptSubmittedAt && <div className="sa-table__sub">{t('Chek')}: {date(x.receiptSubmittedAt)}</div>}
                    {x.reviewedAt && <div className="sa-table__sub">{t("Ko'rib chiqildi")}: {date(x.reviewedAt)}</div>}
                  </td>
                  <td>
                    <span className={`sa-badge sa-badge--${STATUS[x.status]?.tone ?? 'blue'}`}>{t(STATUS[x.status]?.label ?? x.status)}</span>
                    {x.rejectReason && <div className="sa-table__sub">{x.rejectReason}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className={`sa-btn${OPEN.includes(x.status) ? '' : ' sa-btn--ghost'}`} onClick={() => setSelected(x)}>
                      {OPEN.includes(x.status) && x.method === 'MANUAL_CARD' ? t("Ko'rib chiqish") : t('Batafsil')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReviewModal
          topUp={selected}
          date={date}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </>
  );
}

function ReviewModal({ topUp, date, onClose, onDone }) {
  const t = useT();
  const money = useMoney();
  const [img, setImg] = useState(null);
  const [imgError, setImgError] = useState('');
  const [mode, setMode] = useState('view'); // view | approve | reject
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(String(topUp.amount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canReview = OPEN.includes(topUp.status) && topUp.method === 'MANUAL_CARD';
  // Pul faqat chek kelgandan keyin (backend ham REVIEW + chek talab qiladi)
  const canApprove = canReview && topUp.status === 'REVIEW' && topUp.hasReceipt;
  const credit = Number(amount.replace(/\D/g, ''));
  const creditValid = Number.isSafeInteger(credit) && credit >= 10_000 && credit <= 10_000_000;
  const corrected = creditValid && credit !== topUp.amount;

  useEffect(() => {
    if (!topUp.hasReceipt) return undefined;
    let url = null;
    let active = true;
    topupsApi
      .receiptUrl(topUp.id)
      .then((u) => {
        url = u;
        if (active) setImg(u);
        else URL.revokeObjectURL(u);
      })
      .catch((e) => active && setImgError(e.message));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [topUp.id, topUp.hasReceipt]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onDone();
    } catch (e) {
      // 409 — boshqa admin allaqachon ko'rib chiqqan: ro'yxat yangilanadi
      setError(e.message);
      setBusy(false);
    }
  };

  const footer = !canReview ? (
    <button type="button" className="btn btn--ghost" onClick={onClose}>{t('Yopish')}</button>
  ) : mode === 'approve' ? (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setMode('view')} disabled={busy}>{t('Orqaga')}</button>
      <button type="button" className="btn" onClick={() => run(() => topupsApi.approve(topUp.id, corrected ? credit : undefined))} disabled={busy || !creditValid}>
        {busy ? t('Kuting...') : t("Ha, {sum} qo'shilsin", { sum: money(creditValid ? credit : topUp.amount) })}
      </button>
    </>
  ) : mode === 'reject' ? (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setMode('view')} disabled={busy}>{t('Orqaga')}</button>
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => run(() => topupsApi.reject(topUp.id, reason.trim()))}
        disabled={busy || reason.trim().length < 3}
      >
        {busy ? t('Kuting...') : t('Rad etish')}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn--danger" onClick={() => setMode('reject')}>{t('Rad etish')}</button>
      <button type="button" className="btn" onClick={() => setMode('approve')} disabled={!canApprove}>{t('Tasdiqlash')}</button>
    </>
  );

  return (
    <Modal title={`${topUp.code} · ${money(topUp.amount)}`} onClose={busy ? () => {} : onClose} footer={footer}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 14 }}>
          <span className="muted">{t('Formo akkaunti')}</span>
          <b>#{topUp.user?.id} · {topUp.user?.fullName ?? '—'}</b>
          <span className="muted">{t('Tasdiqlangan telefon')}</span>
          <b>{topUp.user?.phone ?? '—'}</b>
          <span className="muted">{t('Telegram akkaunti')}</span>
          <span>
            {topUp.telegram ? (
              <>
                <a href={`tg://user?id=${topUp.telegram.telegramUserId}`}>ID {topUp.telegram.telegramUserId}</a>
                <span className="muted"> · {t('ulangan')} {date(topUp.telegram.linkedAt)}</span>
              </>
            ) : (
              t('Ulanmagan')
            )}
          </span>
          {topUp.receiptTelegramUserId && topUp.receiptTelegramUserId !== topUp.telegram?.telegramUserId && (
            <>
              <span className="muted">{t('Chekni yuborgan')}</span>
              <span>Telegram ID {topUp.receiptTelegramUserId}</span>
            </>
          )}
          <span className="muted">{t('Summa')}</span>
          <b>
            {money(topUp.amount)}
            {topUp.requestedAmount != null && <span className="muted"> ({t("So'ralgan")}: {money(topUp.requestedAmount)})</span>}
          </b>
          <span className="muted">{t('Joriy balans')}</span>
          <span>{money(topUp.user?.balance)}</span>
          <span className="muted">{t("So'rov ochilgan")}</span>
          <span>{date(topUp.createdAt)}</span>
          <span className="muted">{t('Chek yuborilgan')}</span>
          <span>{date(topUp.receiptSubmittedAt)}</span>
          <span className="muted">{t('Holat')}</span>
          <span>
            {t(STATUS[topUp.status]?.label ?? topUp.status)}
            {topUp.reviewedBy && <span className="muted"> · {topUp.reviewedBy.fullName} · {date(topUp.reviewedAt)}</span>}
          </span>
          {topUp.rejectReason && (
            <>
              <span className="muted">{t('Sabab')}</span>
              <span>{topUp.rejectReason}</span>
            </>
          )}
        </div>

        {topUp.linkWarning && <div className="form-error">⚠ {t(LINK_WARNING[topUp.linkWarning])}</div>}

        {topUp.hasReceipt ? (
          img ? (
            <a href={img} target="_blank" rel="noreferrer" title={t("To'liq o'lchamda ochish")}>
              <img src={img} alt={t('Chek')} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, background: '#0b0f1e' }} />
            </a>
          ) : (
            <div className="muted">{imgError || t('Chek yuklanmoqda...')}</div>
          )
        ) : (
          <div className="form-error">{t("Mijoz hali chek yubormagan. Tushumni bank ilovasida ko'rmaguncha tasdiqlamang.")}</div>
        )}

        {mode === 'approve' && (
          <>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="muted">{t("Balansga qo'shiladigan summa (chekdagi haqiqiy summa)")}</span>
              <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))} />
            </label>
            {!creditValid && <div className="form-error">{t("Summa 10 000 dan 10 000 000 so'mgacha bo'lishi kerak")}</div>}
            {corrected && (
              <div className="form-error">
                {t("Summa so'rovdan farq qiladi: mijoz {req} so'ragan. Tuzatish audit jurnaliga yoziladi.", { req: money(topUp.amount) })}
              </div>
            )}
            <div className="form-error" style={{ background: 'rgba(242,163,58,.12)', color: 'inherit' }}>
              {t("Kartaga {sum} haqiqatan tushganini bank ilovasida tekshirdingizmi? Tasdiqlangach summa mijoz balansiga bir marta qo'shiladi va bekor qilinmaydi.", { sum: money(creditValid ? credit : topUp.amount) })}
            </div>
          </>
        )}
        {mode === 'reject' && (
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="muted">{t('Rad etish sababi (mijozga yuboriladi)')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {REJECT_PRESETS.map((r) => (
                <button key={r} type="button" className={`sa-tab${reason === t(r) ? ' is-active' : ''}`} onClick={() => setReason(t(r))}>
                  {t(r)}
                </button>
              ))}
            </div>
            <textarea className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Masalan: chekdagi summa so'rovga mos emas")} />
          </label>
        )}
        {error && <div className="form-error">{error}</div>}
      </div>
    </Modal>
  );
}

/** Qo'lda to'lov rekvizitlari (Setting payments.manual) — botda mijozga shu karta ko'rsatiladi */
function ManualCardSettings() {
  const t = useT();
  const [value, setValue] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    settingsApi
      .all()
      .then((all) => setValue(all[MANUAL_KEY] ?? null))
      .catch((e) => setMsg(e.message));
  }, []);

  const digits = (form?.cardNumber ?? '').replace(/\D/g, '');
  const valid = digits.length === 16 && (form?.cardHolder ?? '').trim().length >= 3;

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const next = {
        enabled: form.enabled,
        cardNumber: digits,
        cardHolder: form.cardHolder.trim(),
        ...(form.bankName?.trim() && { bankName: form.bankName.trim() }),
      };
      await settingsApi.update(MANUAL_KEY, next);
      setValue(next);
      setForm(null);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const on = value?.enabled === true && String(value.cardNumber ?? '').replace(/\D/g, '').length === 16;

  return (
    <div className="sa-panel" style={{ marginBottom: 16 }}>
      <div className="sa-panel__head">
        <div className="sa-panel__title">{t("Qo'lda to'lov kartasi")}</div>
        {!form && (
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            onClick={() => setForm({ enabled: value?.enabled ?? true, cardNumber: value?.cardNumber ?? '', cardHolder: value?.cardHolder ?? '', bankName: value?.bankName ?? '' })}
          >
            {t("O'zgartirish")}
          </button>
        )}
      </div>
      {!form ? (
        <div className="sa-table__sub">
          {on
            ? `${String(value.cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ')} · ${value.cardHolder}${value.bankName ? ` · ${value.bankName}` : ''}`
            : t("Sozlanmagan yoki o'chiq — botda karta orqali to'ldirish ko'rinmaydi.")}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="sa-table__sub">{t('Karta raqami (16 raqam)')}</span>
            <input className="sa-input" inputMode="numeric" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="sa-table__sub">{t('Qabul qiluvchi')}</span>
            <input className="sa-input" value={form.cardHolder} maxLength={80} onChange={(e) => setForm({ ...form, cardHolder: e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="sa-table__sub">{t('Bank (ixtiyoriy)')}</span>
            <input className="sa-input" value={form.bankName} maxLength={60} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            <span>{t('Yoqilgan')}</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setForm(null)} disabled={busy}>{t('Bekor qilish')}</button>
            <button type="button" className="sa-btn" onClick={save} disabled={busy || !valid}>{busy ? t('Kuting...') : t('Saqlash')}</button>
          </div>
        </div>
      )}
      {msg && <div className="form-error" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
