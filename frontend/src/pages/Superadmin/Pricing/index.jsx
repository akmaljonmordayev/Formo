import { useEffect, useState } from 'react';
import { clubsApi, pricingApi, settingsApi } from '../../../features/platform/platformApi';
import { ConfirmModal } from '../ui';
import { DEFAULT_PRICING, FALLBACK_PRICES, PRICE_KEYS, SETTING_KEYS, priceOf } from '../adminApi';
import { useT, useMoney } from '../i18n';

// PUT /admin/pricing faqat shu maydonlarni qabul qiladi (id, sortOrder, updatedAt yuborilsa 400 qaytadi)
const toInput = ({ key, section, step, label, sub, price }) => ({ key, section, step, label, sub, price: Number(price) || 0 });

async function fetchAllClubs() {
  const out = [];
  for (let page = 1; page <= 20; page += 1) {
    const d = await clubsApi.list({ page, limit: 100 });
    out.push(...(d.items ?? []));
    if (out.length >= (d.total ?? 0) || (d.items ?? []).length < 100) break;
  }
  return out;
}

export default function SuperadminPricing() {
  const money = useMoney();
  const t = useT();
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const [fee, setFee] = useState('');
  const [savedFee, setSavedFee] = useState('');
  const [clubs, setClubs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const [applying, setApplying] = useState(null); // { done, total }

  useEffect(() => {
    let active = true;
    Promise.all([pricingApi.list(), settingsApi.all().catch(() => ({}))])
      .then(([list, settings]) => {
        if (!active) return;
        setItems(list);
        setSaved(list);
        const f = Number(settings?.[SETTING_KEYS.deliveryFee] ?? 0);
        setFee(f);
        setSavedFee(f);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    fetchAllClubs()
      .then((c) => active && setClubs(c))
      .catch(() => active && setClubs([]));
    return () => {
      active = false;
    };
  }, []);

  const setPrice = (key, value) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, price: value === '' ? '' : Math.max(0, Math.round(Number(value))) } : i)));

  const savedByKey = Object.fromEntries(saved.map((i) => [i.key, i.price]));
  const itemsDirty = items.length !== saved.length || items.some((i) => i.price !== savedByKey[i.key]);
  const feeDirty = Number(fee) !== Number(savedFee);
  const dirty = itemsDirty || feeDirty;
  const invalid = items.some((i) => i.price === '' || Number.isNaN(i.price)) || fee === '' || Number.isNaN(Number(fee));

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (itemsDirty && items.length) {
        const fresh = await pricingApi.save(items.map(toInput));
        setItems(fresh);
        setSaved(fresh);
      }
      if (feeDirty) {
        await settingsApi.update(SETTING_KEYS.deliveryFee, Number(fee) || 0);
        setSavedFee(Number(fee) || 0);
      }
      setNotice(t('Narxlar saqlandi'));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setItems(saved);
    setFee(savedFee);
  };

  const sections = Array.from(new Set(items.map((i) => i.section))).map((title) => ({
    title,
    step: items.find((i) => i.section === title)?.step ?? 1,
    items: items.filter((i) => i.section === title),
  }));

  // Saqlangan (API'dagi) narxlar — klub formalari shu bilan solishtiriladi
  const base = {
    shirtPrice: priceOf(saved, PRICE_KEYS.shirt, FALLBACK_PRICES.shirt),
    shortsPrice: priceOf(saved, PRICE_KEYS.shorts, FALLBACK_PRICES.shorts),
    printPrice: priceOf(saved, PRICE_KEYS.print, FALLBACK_PRICES.print),
  };
  const priced = (key, fallback = 0) => {
    const v = Number(items.find((i) => i.key === key)?.price);
    return Number.isFinite(v) ? v : fallback;
  };
  const tshirt = priced(PRICE_KEYS.shirt);
  const shorts = priced(PRICE_KEYS.shorts);
  const print = priced(PRICE_KEYS.print);
  const delivery = Number(fee) || 0;
  const studioBase = priced(PRICE_KEYS.studio);

  const allKits = (clubs ?? []).flatMap((c) => c.kits.map((k) => ({ ...k, clubName: c.name })));
  const mismatched = allKits.filter(
    (k) => k.shirtPrice !== base.shirtPrice || k.shortsPrice !== base.shortsPrice || k.printPrice !== base.printPrice,
  );

  const applyToKits = async () => {
    setConfirmApply(false);
    setError('');
    setNotice('');
    setApplying({ done: 0, total: mismatched.length });
    const failed = [];
    for (let i = 0; i < mismatched.length; i += 1) {
      const k = mismatched[i];
      try {
        await clubsApi.updateKit(k.id, base);
      } catch {
        failed.push(`${k.clubName} · ${k.label}`);
      }
      setApplying({ done: i + 1, total: mismatched.length });
    }
    setApplying(null);
    setClubs(await fetchAllClubs().catch(() => clubs));
    if (failed.length) setError(t('{n} ta formani yangilab bo‘lmadi: {list}', { n: failed.length, list: failed.join(', ') }));
    else setNotice(t('{n} ta forma narxi yangilandi', { n: mismatched.length }));
  };

  const row = (key, label, sub, value, onChange) => (
    <div
      key={key}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
        padding: '12px 14px', borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</div>
        <div className="sa-table__sub">{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          className="sa-input"
          type="number"
          min={0}
          step={1000}
          value={value}
          onChange={onChange}
          aria-label={t('{label} narxi', { label })}
          style={{ width: 120, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}
        />
        <span className="sa-table__sub" style={{ marginTop: 0 }}>{t("so'm")}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Narxlar')}</h1>
          <p>{t("Futbolka, bosma va yetkazish narxi. O'ng tomonda mijoz ko'radigan yakuniy narx.")}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {dirty && (
            <button type="button" className="sa-btn sa-btn--ghost" disabled={saving} onClick={cancel}>
              {t('Bekor qilish')}
            </button>
          )}
          <button type="button" className="sa-btn" disabled={!dirty || invalid || saving} onClick={save}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && !dirty && <div className="sa-table__sub" style={{ marginBottom: 12, color: 'var(--sa-teal)' }}>{notice}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : (
        <div className="sa-grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.length === 0 && (
              <div className="sa-panel">
                <div className="sa-table__sub" style={{ marginBottom: 12 }}>
                  {t('Narx jadvali hali bo‘sh. Standart qatorlarni yarating, narxlarni to‘g‘rilab «Saqlash»ni bosing.')}
                </div>
                <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setItems(DEFAULT_PRICING)}>
                  {t('Standart narxlarni yaratish')}
                </button>
              </div>
            )}

            {sections.map((sec) => (
              <div key={sec.title} className="sa-panel">
                <div className="sa-panel__head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="sa-kanban__step">{sec.step}</span>
                    <span className="sa-panel__title">{t(sec.title)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sec.items.map((it) => row(it.key, t(it.label), t(it.sub), it.price, (e) => setPrice(it.key, e.target.value)))}
                </div>
              </div>
            ))}

            <div className="sa-panel">
              <div className="sa-panel__head">
                <span className="sa-panel__title">{t('Yetkazish')}</span>
              </div>
              {row(
                'delivery-fee',
                t('Yetkazish narxi'),
                t('Ilovadagi savat va checkout shu narxni oladi (sozlama: delivery.fee)'),
                fee,
                (e) => setFee(e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value)))),
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sa-panel">
              <div className="sa-panel__title" style={{ marginBottom: 6 }}>{t("Mijoz ko'radigan narx")}</div>
              <p className="sa-table__sub" style={{ marginBottom: 14 }}>
                {t('Ilovadagi narx bilan bir xil — yuqoridagi jadvaldan avtomatik hisoblanadi.')}
              </p>

              <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
                  <span>{t('Klub formasi')}</span>
                </div>
                {[
                  [t('Futbolka'), money(tshirt)],
                  [t('Shortik'), `+ ${money(shorts)}`],
                  [t('Ism + raqam'), `+ ${money(print)}`],
                  [t('Yetkazish'), `+ ${money(delivery)}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                    <span>{l}</span>
                    <span>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sa-line)' }}>
                  <div>
                    <div className="sa-table__sub">{t('Jami')}</div>
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{(tshirt + shorts + print).toLocaleString('uz-UZ')}</b>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sa-table__sub">{t('Yetkazish bilan')}</div>
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--sa-accent)' }}>
                      {(tshirt + shorts + print + delivery).toLocaleString('uz-UZ')}
                    </b>
                  </div>
                </div>
              </div>

              {studioBase > 0 && (
                <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
                    <span>{t('Dizayn studiyasi')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                    <span>{t("O'z dizayni")}</span>
                    <span>{money(studioBase)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sa-panel">
              <div className="sa-panel__title" style={{ marginBottom: 6 }}>{t('Klub formalari narxi')}</div>
              <p className="sa-table__sub" style={{ marginBottom: 12 }}>
                {t('Ilova har bir formaning o‘z narxini ko‘rsatadi. Jadvaldagi narxdan farq qiladigan formalarni bir tugma bilan to‘g‘rilash mumkin.')}
              </p>
              {clubs === null ? (
                <div className="sa-table__sub">{t('Yuklanmoqda...')}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 13.5 }}>
                    <span>{t('Jami formalar')}: <b>{allKits.length}</b></span>
                    <span>
                      {t('Narxi farq qiladi')}:{' '}
                      <b style={{ color: mismatched.length ? 'var(--sa-accent)' : 'var(--sa-teal)' }}>{mismatched.length}</b>
                    </span>
                  </div>
                  {mismatched.length > 0 && (
                    <div className="sa-table__sub" style={{ marginBottom: 12, maxHeight: 120, overflow: 'auto' }}>
                      {mismatched.slice(0, 30).map((k) => (
                        <div key={k.id}>
                          {k.clubName} · {k.label}: {money(k.shirtPrice)} / {money(k.shortsPrice)} / {money(k.printPrice)}
                        </div>
                      ))}
                      {mismatched.length > 30 && <div>… +{mismatched.length - 30}</div>}
                    </div>
                  )}
                  <button
                    type="button"
                    className="sa-btn sa-btn--ghost"
                    disabled={!mismatched.length || Boolean(applying) || itemsDirty}
                    title={itemsDirty ? t('Avval jadvalni saqlang') : undefined}
                    onClick={() => setConfirmApply(true)}
                  >
                    {applying
                      ? t('Yangilanmoqda: {done} / {total}', applying)
                      : t('Barcha formalarga qo‘llash')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmApply && (
        <ConfirmModal
          title={t('Narxlarni formalarga qo‘llash')}
          text={t('{n} ta formaning narxi {shirt} / {shorts} / {print} ga o‘zgartiriladi. Ilovada darhol yangi narx ko‘rinadi.', {
            n: mismatched.length,
            shirt: money(base.shirtPrice),
            shorts: money(base.shortsPrice),
            print: money(base.printPrice),
          })}
          confirmLabel={t('Qo‘llash')}
          danger={false}
          busy={Boolean(applying)}
          onConfirm={applyToKits}
          onClose={() => setConfirmApply(false)}
        />
      )}
    </>
  );
}
