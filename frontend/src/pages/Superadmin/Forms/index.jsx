import { useEffect, useMemo, useState } from 'react';
import { clubsApi, inventoryApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { Shield } from 'lucide-react';
import { useMoney, useT } from '../i18n';
import Select from '../Select';

const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const ALL_SIZES = ADULT_SIZES;
const PRODUCT = 'TSHIRT';
const LOW = 5;
const PAGE_SIZE = 10;
const cellKey = (kitId, size) => `${kitId}::${size}`;

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

/**
 * Formalar: har bir forma — bitta karta, har bir o'lcham — bitta katak (tepada soni, pastida narxi).
 * O'zgarishlar sahifa pastidagi bitta «Saqlash» tugmasi bilan saqlanadi.
 */
export default function SuperadminForms() {
  const t = useT();
  const money = useMoney();
  const [kits, setKits] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // null | 'new' | kit
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
  const [qtyDraft, setQtyDraft] = useState({});
  useEffect(() => setQtyDraft(qtyMap), [qtyMap]);

  // ── Narx (o'lcham bo'yicha) — alohida narx qo'yilmagan bo'lsa formaning komplekt narxi ────
  const priceMap = useMemo(
    () => Object.fromEntries(kits.flatMap((k) => ALL_SIZES.map((s) => [cellKey(k.id, s), String(k.sizePrices?.[s] ?? k.shirtPrice)]))),
    [kits],
  );
  const [priceDraft, setPriceDraft] = useState({});
  useEffect(() => setPriceDraft(priceMap), [priceMap]);

  const qtyOf = (key) => qtyDraft[key] ?? '';
  const priceOf = (key) => priceDraft[key] ?? '';
  const qtyChanged = (key) => qtyOf(key) !== (qtyMap[key] ?? '');
  const priceChanged = (key) => priceOf(key) !== (priceMap[key] ?? '');

  const setQty = (key, value) => {
    if (value !== '' && !/^\d{1,6}$/.test(value)) return;
    setQtyDraft((m) => ({ ...m, [key]: value }));
    setSaved(false);
  };
  const setPrice = (key, value) => {
    if (value !== '' && !/^\d{1,7}$/.test(value)) return;
    setPriceDraft((m) => ({ ...m, [key]: value }));
    setSaved(false);
  };

  const allKeys = useMemo(() => kits.flatMap((k) => ALL_SIZES.map((s) => cellKey(k.id, s))), [kits]);
  const changes = allKeys.filter(qtyChanged).length + allKeys.filter(priceChanged).length;

  // «Saqlandi» yozuvi bir necha soniyadan keyin o'zi yo'qoladi
  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const reset = () => {
    setQtyDraft(qtyMap);
    setPriceDraft(priceMap);
  };

  const save = async () => {
    const stock = [];
    const prices = [];
    kits.forEach((k) => {
      ALL_SIZES.forEach((size) => {
        const key = cellKey(k.id, size);
        if (qtyChanged(key)) stock.push({ productType: PRODUCT, kitId: k.id, size, qty: Number(qtyOf(key) || 0) });
      });
      if (!ALL_SIZES.some((s) => priceChanged(cellKey(k.id, s)))) return;
      // Komplekt narxi bilan teng o'lchamlar yozilmaydi — ular narxni formaning o'zidan oladi
      const sizePrices = Object.fromEntries(
        ALL_SIZES.map((s) => [s, Number(priceOf(cellKey(k.id, s)) || 0)]).filter(([, n]) => n > 0 && n !== k.shirtPrice),
      );
      prices.push([k.id, { sizePrices }]);
    });
    setSaving(true);
    setError('');
    try {
      // Ketma-ket: avval zaxira, keyin narx — oxirida hammasi qayta yuklanadi
      if (stock.length) await inventoryApi.save(stock);
      await Promise.all(prices.map(([id, body]) => clubsApi.updateKit(id, body)));
      await load();
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Ro'yxat, qidiruv va sahifalash (10 tadan) ──────────────────────────────
  const filteredKits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kits;
    return kits.filter((k) => k.club.name.toLowerCase().includes(q) || k.label.toLowerCase().includes(q));
  }, [kits, search]);
  const pages = Math.max(1, Math.ceil(filteredKits.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const first = current * PAGE_SIZE;
  const pageKits = filteredKits.slice(first, first + PAGE_SIZE);
  const goTo = (next) => {
    setPage(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Formalar')}</h1>
          <p>{t("Har bir o'lcham katagida tepada — omborda nechta borligi, pastida — narxi. O'zgartiring va pastdagi «Saqlash»ni bosing.")}</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t('+ Yangi forma')}</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          className="sa-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('Klub yoki forma nomi bo‘yicha qidirish')}
          style={{ width: '100%', maxWidth: 320 }}
        />
        <div className="sa-legend">
          <span><i style={{ background: 'var(--sa-accent)' }} />{t('kam qoldi (5 dan kam)')}</span>
          <span><i style={{ background: 'var(--sa-red)' }} />{t("tugagan — mijozga ko'rinmaydi")}</span>
          <span><i style={{ background: 'var(--sa-teal)' }} />{t("o'zgartirilgan, saqlanmagan")}</span>
        </div>
      </div>

      {loading ? (
        <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>
      ) : filteredKits.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t(kits.length === 0 ? '«+ Yangi forma» bilan birinchisini qo‘shing.' : 'Hech narsa topilmadi.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pageKits.map((kit, i) => (
            <div key={kit.id} className="sa-panel sa-kit">
              <div className="sa-kit__head">
                <div className="sa-kit__name">
                  <span className="sa-kit__no">{first + i + 1}</span>
                  <SleeveIcon kit={kit} t={t} />
                  <div style={{ minWidth: 0 }}>
                    <div>
                      <b>{kit.club.name}</b> · {kit.label}
                      {!kit.isActive && <span className="sa-badge sa-badge--red" style={{ marginLeft: 8 }}>{t('faol emas')}</span>}
                    </div>
                    <div className="sa-table__sub">
                      {[kit.colorsLabel, `${t('Komplekt')} ${money(kit.shirtPrice)}`, `${t('bosma')} ${money(kit.printPrice)}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(kit)}>{t('Tahrirlash')}</button>
              </div>

              <div className="sa-sizes">
                {ALL_SIZES.map((size) => {
                  const key = cellKey(kit.id, size);
                  const qty = qtyOf(key) === '' ? null : Number(qtyOf(key));
                  const state = qty === 0 ? ' is-out' : qty !== null && qty < LOW ? ' is-low' : '';
                  return (
                    <div key={size} className={`sa-size${state}`}>
                      <div className="sa-size__name">{size}</div>
                      <label>
                        {t('Soni (dona)')}
                        <input
                          className={qtyChanged(key) ? 'is-changed' : undefined}
                          value={qtyOf(key)}
                          onChange={(e) => setQty(key, e.target.value)}
                          inputMode="numeric"
                          placeholder="—"
                        />
                      </label>
                      <label>
                        {t("Narxi (so'm)")}
                        <input
                          className={priceChanged(key) ? 'is-changed' : undefined}
                          value={priceOf(key)}
                          onChange={(e) => setPrice(key, e.target.value)}
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="sa-pager">
          <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Oldingi sahifa')} disabled={current === 0} onClick={() => goTo(current - 1)}>←</button>
          <span>{first + 1}–{first + pageKits.length} / {filteredKits.length}</span>
          <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Keyingi sahifa')} disabled={current === pages - 1} onClick={() => goTo(current + 1)}>→</button>
        </nav>
      )}

      {(changes > 0 || saved) && (
        <div className="sa-savebar" role="status">
          <b style={{ color: changes ? undefined : 'var(--sa-teal)' }}>
            {changes ? t("{n} ta o'zgarish saqlanmagan", { n: changes }) : t('Saqlandi ✓')}
          </b>
          {changes > 0 && (
            <div className="sa-savebar__actions">
              <button type="button" className="sa-btn sa-btn--ghost" onClick={reset} disabled={saving}>{t('Bekor qilish')}</button>
              <button type="button" className="sa-btn" onClick={save} disabled={saving}>{saving ? t('Saqlanmoqda...') : t('Saqlash')}</button>
            </div>
          )}
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

/** Kalta yoki uzun yengli futbolka belgisi — forma rangida */
function SleeveIcon({ kit, t }) {
  const long = kit.sleeve === 'LONG';
  const label = t(long ? 'Uzun yengli' : 'Kalta yengli');
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <title>{label}</title>
      <path
        d={
          long
            ? 'M9 3 L4.5 5 L2.5 20.5 L5.5 21 L7 10 L7 21 L17 21 L17 10 L18.5 21 L21.5 20.5 L19.5 5 L15 3 Q12 5.5 9 3 Z'
            : 'M9 3 L3 6 L4.5 10.5 L7 9.5 L7 21 L17 21 L17 9.5 L19.5 10.5 L21 6 L15 3 Q12 5.5 9 3 Z'
        }
        fill={kit.bgColor || '#888'}
        stroke={kit.textColor || '#333'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
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
  const [sizes, setSizes] = useState(() => (kit?.sizes ?? ADULT_SIZES).filter((s) => ALL_SIZES.includes(s)));
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
            <div className="field field--full">
              <span>{t('Klub')}</span>
              <Select
                value={clubId}
                onChange={setClubId}
                ariaLabel={t('Klub')}
                required
                icon={Shield}
                options={clubs.map((c) => ({ value: String(c.id), label: c.name, hint: c.season, icon: Shield }))}
              />
            </div>
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
