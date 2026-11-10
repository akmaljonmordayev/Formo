import { useEffect, useMemo, useState } from 'react';
import { clubsApi, inventoryApi, settingsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { DEFAULT_REGION_FEE, REGIONS, SETTING_KEYS } from '../adminApi';
import { useT } from '../i18n';

const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];
const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const ALL_SIZES = [...KID_SIZES, ...ADULT_SIZES];
const PRODUCT = 'TSHIRT';
const LOW = 5;
const cellKey = (kitId, size) => `${kitId}::${size}`;
const money = (n) => `${Number(n || 0).toLocaleString('uz-UZ')} so'm`;

/** Klub tanlovi uchun — barcha sahifalarni terib chiqadi (Pricing sahifasidagi bilan bir xil uslub) */
async function fetchAllClubs() {
  const out = [];
  for (let page = 1; page <= 20; page += 1) {
    const d = await clubsApi.list({ page, limit: 100 });
    out.push(...(d.items ?? []));
    if (out.length >= (d.total ?? 0) || (d.items ?? []).length < 100) break;
  }
  return out;
}

export default function SuperadminForms() {
  const t = useT();
  const [kits, setKits] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | kit

  const load = () =>
    Promise.all([clubsApi.listKits(), fetchAllClubs(), inventoryApi.list({ productType: PRODUCT })])
      .then(([k, c, inv]) => {
        setKits(k);
        setClubs(c);
        setItems(inv);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // ── Zaxira (har bir formaning o'lcham bo'yicha qoldig'i) ──────────────────
  const qtyMap = useMemo(() => Object.fromEntries(items.map((i) => [cellKey(i.kitId, i.size), String(i.qty)])), [items]);
  const [draft, setDraft] = useState({});
  useEffect(() => setDraft(qtyMap), [qtyMap]);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockSaved, setStockSaved] = useState(false);

  const valueOf = (kitId, size) => draft[cellKey(kitId, size)] ?? '';
  const setQty = (kitId, size, value) => {
    if (value !== '' && !/^\d{1,6}$/.test(value)) return;
    setDraft((m) => ({ ...m, [cellKey(kitId, size)]: value }));
    setStockSaved(false);
  };
  const stockDirty = useMemo(
    () => Object.keys(draft).some((k) => (draft[k] ?? '') !== (qtyMap[k] ?? '')),
    [draft, qtyMap],
  );

  const saveStock = async () => {
    const payload = [];
    kits.forEach((k) => {
      ALL_SIZES.forEach((size) => {
        const key = cellKey(k.id, size);
        const raw = draft[key];
        if (raw === qtyMap[key]) return; // o'zgarmagan — yubormaymiz
        payload.push({ productType: PRODUCT, kitId: k.id, size, qty: raw === '' ? 0 : Number(raw) });
      });
    });
    if (!payload.length) return;
    setStockSaving(true);
    setError('');
    try {
      const fresh = (await inventoryApi.save(payload)).filter((i) => i.productType === PRODUCT);
      setItems(fresh);
      setStockSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setStockSaving(false);
    }
  };

  // ── Narx (har bir formaning o'lcham bo'yicha narxi) — bo'lmasa kit.shirtPrice ────
  const priceMap = useMemo(
    () => Object.fromEntries(kits.flatMap((k) => ALL_SIZES.map((s) => [cellKey(k.id, s), String(k.sizePrices?.[s] ?? k.shirtPrice)]))),
    [kits],
  );
  const [priceDraft, setPriceDraft] = useState({});
  useEffect(() => setPriceDraft(priceMap), [priceMap]);
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

  const priceOf = (kitId, size) => priceDraft[cellKey(kitId, size)] ?? '';
  const setPrice = (kitId, size, value) => {
    if (value !== '' && !/^\d{1,7}$/.test(value)) return;
    setPriceDraft((m) => ({ ...m, [cellKey(kitId, size)]: value }));
    setPriceSaved(false);
  };
  const priceDirty = useMemo(
    () => Object.keys(priceDraft).some((k) => (priceDraft[k] ?? '') !== (priceMap[k] ?? '')),
    [priceDraft, priceMap],
  );

  const savePrices = async () => {
    const updates = [];
    kits.forEach((k) => {
      const changed = ALL_SIZES.some((s) => priceOf(k.id, s) !== (priceMap[cellKey(k.id, s)] ?? ''));
      if (!changed) return;
      // shirtPrice bilan teng bo'lgan o'lchamlar sizePrices'ga yozilmaydi — ular shirtPrice'dan o'zi oladi
      const sizePrices = Object.fromEntries(
        ALL_SIZES.map((s) => [s, Number(priceOf(k.id, s) || 0)]).filter(([, n]) => n > 0 && n !== k.shirtPrice),
      );
      updates.push(clubsApi.updateKit(k.id, { sizePrices }));
    });
    if (!updates.length) return;
    setPriceSaving(true);
    setError('');
    try {
      await Promise.all(updates);
      await load();
      setPriceSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setPriceSaving(false);
    }
  };

  // ── Ro'yxat va qidiruv ─────────────────────────────────────────────────────
  const filteredKits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kits;
    return kits.filter((k) => k.club.name.toLowerCase().includes(q) || k.label.toLowerCase().includes(q));
  }, [kits, search]);

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Formalar')}</h1>
          <p>{t("Barcha klublarning barcha formalari (uy/mehmon/uchinchi) bitta joyda — narx, rang, o'lchamlar va zaxira.")}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {priceSaved && <span className="sa-table__sub" style={{ color: 'var(--sa-teal)' }}>{t('Saqlandi ✓')}</span>}
          <button type="button" className="sa-btn sa-btn--ghost" onClick={savePrices} disabled={!priceDirty || priceSaving}>
            {priceSaving ? t('Saqlanmoqda...') : t('Narxlarni saqlash')}
          </button>
          {stockSaved && <span className="sa-table__sub" style={{ color: 'var(--sa-teal)' }}>{t('Saqlandi ✓')}</span>}
          <button type="button" className="sa-btn sa-btn--ghost" onClick={saveStock} disabled={!stockDirty || stockSaving}>
            {stockSaving ? t('Saqlanmoqda...') : t('Zaxirani saqlash')}
          </button>
          <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t('+ Yangi forma')}</button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <DeliveryFeesPanel t={t} />

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          className="sa-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Klub yoki forma nomi bo‘yicha qidirish')}
          style={{ maxWidth: 320 }}
        />
        <span className="sa-table__sub" style={{ marginTop: 0, display: 'flex', gap: 14 }}>
          <span><span style={{ color: 'var(--sa-accent)' }}>●</span> {t('kam qoldi (5 dan kam)')}</span>
          <span><span style={{ color: 'var(--sa-red)' }}>●</span> {t("tugagan — mijozga ko'rinmaydi")}</span>
        </span>
      </div>

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : filteredKits.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t(kits.length === 0 ? '«+ Yangi forma» bilan birinchisini qo‘shing.' : 'Hech narsa topilmadi.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredKits.map((kit) => (
            <div key={kit.id} className="sa-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: kit.bgColor || '#888', border: `2px solid ${kit.textColor || '#333'}`,
                    }}
                  />
                  <div>
                    <div><b>{kit.club.name}</b> · {kit.label}{!kit.isActive && <span className="sa-table__sub" style={{ marginLeft: 8 }}>({t('faol emas')})</span>}</div>
                    <div className="sa-table__sub" style={{ marginTop: 2 }}>
                      {kit.colorsLabel ? `${kit.colorsLabel} · ` : ''}{money(kit.shirtPrice)} · {t('bosma')} {money(kit.printPrice)}
                    </div>
                  </div>
                </div>
                <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(kit)}>{t('Tahrirlash')}</button>
              </div>

              <KitPricesPanel kit={kit} priceOf={priceOf} setPrice={setPrice} t={t} />

              <div className="sa-table-wrap" style={{ marginTop: 10 }}>
                <table className="sa-table">
                  <thead>
                    <tr>
                      {ALL_SIZES.map((s) => (
                        <th key={s} style={{ textAlign: 'center' }}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {ALL_SIZES.map((s) => {
                        const raw = valueOf(kit.id, s);
                        const v = raw === '' ? null : Number(raw);
                        const low = v !== null && v > 0 && v < LOW;
                        const out = v === 0;
                        return (
                          <td key={s} style={{ textAlign: 'center' }}>
                            <input
                              value={raw}
                              onChange={(e) => setQty(kit.id, s, e.target.value)}
                              inputMode="numeric"
                              placeholder="—"
                              style={{
                                width: 44, textAlign: 'center', padding: '3px 2px', borderRadius: 7,
                                background: 'transparent',
                                border: low ? '1px solid var(--sa-accent)' : out ? '1px solid var(--sa-red)' : '1px solid var(--sa-line)',
                                color: out ? '#ff8b9a' : low ? 'var(--sa-accent)' : 'var(--sa-ink)',
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <KitForm
          kit={editing === 'new' ? null : editing}
          clubs={clubs}
          t={t}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

/** Forma narxi — o'lcham bo'yicha (Yetkazish narxi paneli bilan bir xil uslub, standart — yopiq) */
function KitPricesPanel({ kit, priceOf, setPrice, t }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sa-panel__title">{t("Narxlar (o'lcham bo'yicha)")}</span>
        <span className="sa-table__sub">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
            marginTop: 10,
          }}
        >
          {ALL_SIZES.map((s) => (
            <div
              key={s}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
              }}
            >
              <span style={{ fontSize: 13.5 }}>{s}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="sa-input"
                  value={priceOf(kit.id, s)}
                  onChange={(e) => setPrice(kit.id, s, e.target.value)}
                  inputMode="numeric"
                  aria-label={t('{size} narxi', { size: s })}
                  style={{ width: 90, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                />
                <span className="sa-table__sub" style={{ marginTop: 0 }}>{t("so'm")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KitForm({ kit, clubs, t, onClose, onSaved }) {
  const isEdit = Boolean(kit);
  const [clubId, setClubId] = useState(kit?.clubId ? String(kit.clubId) : (clubs[0]?.id ? String(clubs[0].id) : ''));
  const [form, setForm] = useState({
    label: kit?.label ?? '',
    bgColor: kit?.bgColor ?? '#0e1a3f',
    textColor: kit?.textColor ?? '#ffffff',
    colorsLabel: kit?.colorsLabel ?? '',
    description: kit?.description ?? '',
    shirtPrice: kit?.shirtPrice ?? 159000,
    printPrice: kit?.printPrice ?? 30000,
    isActive: kit?.isActive ?? true,
  });
  const [sizes, setSizes] = useState(kit?.sizes ?? ADULT_SIZES);
  // O'lcham -> narx: faqat shirtPrice'dan farqli qiymatlar saqlanadi, qolgani shirtPrice'dan oladi
  const [sizePrices, setSizePrices] = useState(() => ({ ...(kit?.sizePrices ?? {}) }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleSize = (s) => setSizes((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  const sizePriceOf = (s) => (sizePrices[s] !== undefined && sizePrices[s] !== '' ? String(sizePrices[s]) : String(form.shirtPrice));
  const setSizePrice = (s, value) => {
    if (value !== '' && !/^\d{1,7}$/.test(value)) return;
    setSizePrices((m) => ({ ...m, [s]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        label: form.label.trim(),
        bgColor: form.bgColor,
        textColor: form.textColor,
        colorsLabel: form.colorsLabel.trim() || undefined,
        description: form.description.trim() || undefined,
        shirtPrice: Number(form.shirtPrice),
        printPrice: Number(form.printPrice),
        sizes,
        // shirtPrice bilan teng yoki bo'sh o'lchamlar yuborilmaydi — ular shirtPrice'dan oladi
        sizePrices: Object.fromEntries(
          sizes.map((s) => [s, Number(sizePriceOf(s))]).filter(([, n]) => n > 0 && n !== Number(form.shirtPrice)),
        ),
        isActive: form.isActive,
      };
      if (isEdit) await clubsApi.updateKit(kit.id, body);
      else await clubsApi.createKit(Number(clubId), body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? t('{club} — {label} tahrirlash', { club: kit.club.name, label: kit.label }) : t('Yangi forma')} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          {!isEdit && (
            <label className="field field--full">
              <span>{t('Klub')}</span>
              <select value={clubId} onChange={(e) => setClubId(e.target.value)} required>
                <option value="" disabled>{t('Tanlang')}</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.season})</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>{t('Nomi')}</span>
            <input value={form.label} onChange={set('label')} required minLength={1} maxLength={30} placeholder="Uy" />
          </label>
          <label className="field">
            <span>{t('Fon rangi')}</span>
            <input type="color" value={form.bgColor} onChange={set('bgColor')} style={{ padding: 2, height: 38 }} />
          </label>
          <label className="field">
            <span>{t('Matn rangi')}</span>
            <input type="color" value={form.textColor} onChange={set('textColor')} style={{ padding: 2, height: 38 }} />
          </label>
          <label className="field field--full">
            <span>{t('Ranglar tavsifi')}</span>
            <input value={form.colorsLabel} onChange={set('colorsLabel')} maxLength={60} placeholder="Oq / oltin" />
          </label>
          <label className="field field--full">
            <span>{t('Tavsif')}</span>
            <input value={form.description} onChange={set('description')} maxLength={500} placeholder="Dry-fit polyester · DTF bosma" />
          </label>
          <label className="field">
            <span>{t("Komplekt narxi (so'm)")}</span>
            <input type="number" min={0} value={form.shirtPrice} onChange={set('shirtPrice')} />
          </label>
          <label className="field">
            <span>{t("Bosma narxi (so'm)")}</span>
            <input type="number" min={0} value={form.printPrice} onChange={set('printPrice')} />
          </label>
          <label className="field field--full">
            <span>{t("O'lchamlar va narxi")}</span>
            <p className="sa-table__sub" style={{ marginTop: -2, marginBottom: 2 }}>
              {t("Bo'sh qoldirilsa — komplekt narxidan olinadi")}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ALL_SIZES.map((s) => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`sa-tab${sizes.includes(s) ? ' is-active' : ''}`}
                  >
                    {s}
                  </button>
                  {sizes.includes(s) && (
                    <input
                      className="sa-input"
                      value={sizePriceOf(s)}
                      onChange={(e) => setSizePrice(s, e.target.value)}
                      inputMode="numeric"
                      aria-label={t('{size} narxi', { size: s })}
                      style={{ width: 76, textAlign: 'center', padding: '3px 2px' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </label>
          <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span>{t('Sotuvda (faol)')}</span>
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" className="btn btn--accent" disabled={saving}>{saving ? t('Saqlanmoqda...') : t('Saqlash')}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Yetkazish narxi — viloyat bo'yicha (delivery.feesByRegion sozlamasi) */
function DeliveryFeesPanel({ t }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null); // null — hali yuklanmagan
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    settingsApi
      .all()
      .then((s) => {
        const fromSetting = s[SETTING_KEYS.deliveryFeesByRegion] || {};
        const full = Object.fromEntries(REGIONS.map((r) => [r.code, fromSetting[r.code] ?? DEFAULT_REGION_FEE]));
        setDraft(full);
        setSaved(full);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const setFee = (code, value) => {
    setDraft((d) => ({ ...d, [code]: value === '' ? '' : Math.max(0, Math.round(Number(value))) }));
    setNotice('');
  };

  const dirty = draft && saved && REGIONS.some((r) => draft[r.code] !== saved[r.code]);
  const invalid = draft && REGIONS.some((r) => draft[r.code] === '' || Number.isNaN(draft[r.code]));

  const save = async () => {
    setSaving(true);
    setErr('');
    setNotice('');
    try {
      await settingsApi.update(SETTING_KEYS.deliveryFeesByRegion, draft);
      setSaved(draft);
      setNotice(t('Saqlandi ✓'));
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-panel" style={{ marginBottom: 12 }}>
      <div
        className="sa-panel__head"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <span className="sa-panel__title">{t('Yetkazish narxi (viloyat bo‘yicha)')}</span>
          <p className="sa-table__sub" style={{ marginTop: 4 }}>
            {t("Har bir viloyat uchun alohida narx — Toshkent shahri ham alohida. Mijoz manzil qo'shayotganda viloyatini tanlaydi.")}
          </p>
        </div>
        <span className="sa-table__sub">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        loading || !draft ? (
          <div className="sa-table__sub" style={{ padding: '12px 0' }}>{t('Yuklanmoqda...')}</div>
        ) : (
          <>
            {err && <div className="form-error">{err}</div>}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 10,
                marginTop: 10,
              }}
            >
              {REGIONS.map((r) => (
                <div
                  key={r.code}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
                  }}
                >
                  <span style={{ fontSize: 13.5 }}>{t(r.label)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      className="sa-input"
                      type="number"
                      min={0}
                      step={1000}
                      value={draft[r.code]}
                      onChange={(e) => setFee(r.code, e.target.value)}
                      aria-label={t('{label} yetkazish narxi', { label: r.label })}
                      style={{ width: 100, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                    />
                    <span className="sa-table__sub" style={{ marginTop: 0 }}>{t("so'm")}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <button type="button" className="sa-btn" onClick={save} disabled={!dirty || invalid || saving}>
                {saving ? t('Saqlanmoqda...') : t('Narxlarni saqlash')}
              </button>
              {notice && <span className="sa-table__sub" style={{ color: 'var(--sa-teal)' }}>{notice}</span>}
            </div>
          </>
        )
      )}
    </div>
  );
}
