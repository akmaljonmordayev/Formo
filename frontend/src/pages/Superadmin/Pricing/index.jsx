import { useEffect, useState } from 'react';
import { clubsApi, pricingApi, settingsApi } from '../../../features/platform/platformApi';
import { TEAMS } from '../Kit360/render';
import { DEFAULT_PRICING, PRICE_KEYS, SETTING_KEYS } from '../adminApi';
import { useT, useMoney } from '../i18n';

// PUT /admin/pricing faqat shu maydonlarni qabul qiladi (id, sortOrder, updatedAt yuborilsa 400 qaytadi)
const toInput = ({ key, section, step, label, sub, price }) => ({ key, section, step, label, sub, price: Number(price) || 0 });

const KIT360_ORDER = new Map(TEAMS.map((tm, i) => [tm.id, i]));

async function fetchKit360Clubs() {
  const out = [];
  for (let page = 1; page <= 20; page += 1) {
    const d = await clubsApi.list({ page, limit: 100 });
    out.push(...(d.items ?? []));
    if (out.length >= (d.total ?? 0) || (d.items ?? []).length < 100) break;
  }
  // Bitta jamoaga bitta forma — Forma 360° bilan bir xil 18 ta jamoa, o'sha tartibda
  return out
    .filter((c) => c.kit360Id)
    .map((c) => ({ ...c, kit: [...(c.kits ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0] }))
    .filter((c) => c.kit)
    .sort((a, b) => (KIT360_ORDER.get(a.kit360Id) ?? 99) - (KIT360_ORDER.get(b.kit360Id) ?? 99));
}

export default function SuperadminPricing() {
  const money = useMoney();
  const t = useT();
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const [fee, setFee] = useState('');
  const [savedFee, setSavedFee] = useState('');
  const [kit360Rows, setKit360Rows] = useState(null); // [{ kitId, clubName, bgColor, textColor }]
  // kitId -> { shirtPrice, printPrice }: shirtPrice — KOMPLEKT (futbolka + shortik) narxi, shortik alohida sotilmaydi
  const [draft360, setDraft360] = useState({});
  const [saved360, setSaved360] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saving360, setSaving360] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [error360, setError360] = useState('');
  const [notice360, setNotice360] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([pricingApi.list(), settingsApi.all().catch(() => ({}))])
      .then(([list, settings]) => {
        if (!active) return;
        // Shortik komplekt ichida — eski "club.shorts" qatori (migratsiyadan oldingi baza) ko'rsatilmaydi
        const rows = list.filter((i) => i.key !== 'club.shorts');
        setItems(rows);
        setSaved(rows);
        const f = Number(settings?.[SETTING_KEYS.deliveryFee] ?? 0);
        setFee(f);
        setSavedFee(f);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    fetchKit360Clubs()
      .then((clubs) => {
        if (!active) return;
        setKit360Rows(clubs.map((c) => ({ kitId: c.kit.id, clubName: c.name, bgColor: c.kit.bgColor, textColor: c.kit.textColor })));
        const prices = Object.fromEntries(
          clubs.map((c) => [c.kit.id, { shirtPrice: c.kit.shirtPrice + (c.kit.shortsPrice || 0), printPrice: c.kit.printPrice }]),
        );
        setDraft360(prices);
        setSaved360(prices);
      })
      .catch((e) => active && setError360(e.message));
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
  const kitSet = priced(PRICE_KEYS.shirt);
  const print = priced(PRICE_KEYS.print);
  const delivery = Number(fee) || 0;

  const set360Price = (kitId, field, value) => {
    const v = value === '' ? '' : Math.max(0, Math.round(Number(value)));
    setDraft360((prev) => ({ ...prev, [kitId]: { ...prev[kitId], [field]: v } }));
    setNotice360('');
  };

  const rowDirty = (kitId) => {
    const d = draft360[kitId];
    const s = saved360[kitId];
    return d?.shirtPrice !== s?.shirtPrice || d?.printPrice !== s?.printPrice;
  };
  const dirty360 = (kit360Rows ?? []).some((r) => rowDirty(r.kitId));
  const invalid360 = Object.values(draft360).some(
    (p) => p.shirtPrice === '' || p.printPrice === '' || Number.isNaN(p.shirtPrice) || Number.isNaN(p.printPrice),
  );

  const applyDefaultToAll360 = () => {
    setDraft360((prev) => Object.fromEntries(
      Object.keys(prev).map((kitId) => [kitId, { shirtPrice: kitSet, printPrice: print }]),
    ));
    setNotice360('');
  };

  const cancel360 = () => setDraft360(saved360);

  const save360 = async () => {
    setSaving360(true);
    setError360('');
    setNotice360('');
    const dirtyRows = (kit360Rows ?? []).filter((r) => rowDirty(r.kitId));
    const failed = [];
    const succeeded = {};
    for (const r of dirtyRows) {
      try {
        // shortsPrice: 0 — eski bazada qolgan alohida shortik narxi ham tozalanadi
        await clubsApi.updateKit(r.kitId, { ...draft360[r.kitId], shortsPrice: 0 });
        succeeded[r.kitId] = draft360[r.kitId];
      } catch {
        failed.push(r.clubName);
      }
    }
    // Faqat saqlanganlari "saqlangan" deb belgilanadi — xato bo'lganlari o'zgargan bo'lib qoladi va qayta yuboriladi
    setSaved360((s) => ({ ...s, ...succeeded }));
    setSaving360(false);
    if (failed.length) setError360(t('{n} ta formani yangilab bo‘lmadi: {list}', { n: failed.length, list: failed.join(', ') }));
    else setNotice360(t('{n} ta forma narxi yangilandi', { n: dirtyRows.length }));
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
          <p>{t("Komplekt (futbolka + shortik), ism-raqam bosmasi va yetkazish narxi. O'ng tomonda mijoz ko'radigan yakuniy narx.")}</p>
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
                  <span>{t('Komplekt (futbolka + shortik)')}</span>
                </div>
                {[
                  [t('Komplekt'), money(kitSet)],
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
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{(kitSet + print).toLocaleString('uz-UZ')}</b>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sa-table__sub">{t('Yetkazish bilan')}</div>
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--sa-accent)' }}>
                      {(kitSet + print + delivery).toLocaleString('uz-UZ')}
                    </b>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {!loading && (
        <div className="sa-panel" style={{ marginTop: 16 }}>
          <div className="sa-panel__head">
            <div>
              <span className="sa-panel__title">{t('Forma 360° narxlari')}</span>
              <p className="sa-table__sub" style={{ marginTop: 4 }}>
                {t('Har bir forma (Real Madrid, Barselona va h.k.) narxini alohida belgilang. Mobil ilovada darhol shu narx ko‘rinadi.')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="sa-btn sa-btn--ghost" disabled={saving360 || !kit360Rows?.length} onClick={applyDefaultToAll360}>
                {t('Hammasiga yuqoridagi narxni qo‘yish')}
              </button>
              {dirty360 && (
                <button type="button" className="sa-btn sa-btn--ghost" disabled={saving360} onClick={cancel360}>
                  {t('Bekor qilish')}
                </button>
              )}
              <button type="button" className="sa-btn" disabled={!dirty360 || invalid360 || saving360} onClick={save360}>
                {saving360 ? t('Saqlanmoqda...') : t('Saqlash')}
              </button>
            </div>
          </div>

          {error360 && <div className="form-error">{error360}</div>}
          {notice360 && !dirty360 && <div className="sa-table__sub" style={{ marginBottom: 12, color: 'var(--sa-teal)' }}>{notice360}</div>}

          {kit360Rows === null ? (
            <div className="sa-table__sub">{t('Yuklanmoqda...')}</div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>{t('Forma')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Komplekt (futbolka + shortik)')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Ism + raqam')}</th>
                    <th style={{ textAlign: 'right' }}>{t('Bosma bilan')}</th>
                  </tr>
                </thead>
                <tbody>
                  {kit360Rows.map((r) => {
                    const p = draft360[r.kitId] ?? {};
                    return (
                      <tr key={r.kitId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                                background: r.bgColor || '#888', border: `2px solid ${r.textColor || '#333'}`,
                              }}
                            />
                            <b>{r.clubName}</b>
                          </div>
                        </td>
                        {['shirtPrice', 'printPrice'].map((field) => (
                          <td key={field} style={{ textAlign: 'right' }}>
                            <input
                              className="sa-input"
                              type="number"
                              min={0}
                              step={1000}
                              value={p[field] ?? ''}
                              onChange={(e) => set360Price(r.kitId, field, e.target.value)}
                              aria-label={t('{label} narxi', { label: `${r.clubName} ${field === 'shirtPrice' ? t('Komplekt') : t('Ism + raqam')}` })}
                              style={{ width: 110, textAlign: 'right' }}
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: 'right' }}>
                          <b>{money((Number(p.shirtPrice) || 0) + (Number(p.printPrice) || 0))}</b>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
