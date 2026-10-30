import { useEffect, useState } from 'react';
import { pricingApi, settingsApi } from '../../../features/platform/platformApi';
import { DEFAULT_PRICING, PRICE_KEYS, SETTING_KEYS } from '../adminApi';
import { useT, useMoney } from '../i18n';

// PUT /admin/pricing faqat shu maydonlarni qabul qiladi (id, sortOrder, updatedAt yuborilsa 400 qaytadi)
const toInput = ({ key, section, step, label, sub, price }) => ({ key, section, step, label, sub, price: Number(price) || 0 });

export default function SuperadminPricing() {
  const money = useMoney();
  const t = useT();
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const [fee, setFee] = useState('');
  const [savedFee, setSavedFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  const priced = (key, fallback = 0) => {
    const v = Number(items.find((i) => i.key === key)?.price);
    return Number.isFinite(v) ? v : fallback;
  };
  const tshirt = priced(PRICE_KEYS.shirt);
  const shorts = priced(PRICE_KEYS.shorts);
  const print = priced(PRICE_KEYS.print);
  const delivery = Number(fee) || 0;
  const studioBase = priced(PRICE_KEYS.studio);

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
          </div>
        </div>
      )}
    </>
  );
}
