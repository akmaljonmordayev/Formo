import { useEffect, useMemo, useState } from 'react';
import { clubsApi, inventoryApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { Layers, Pencil, Search, Shield } from 'lucide-react';
import { useMoney, useT } from '../i18n';
import Select from '../Select';
import { NumberField, Presets, groupDigits } from '../NumberField';

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
 * Formalar: har bir forma — bitta karta, har bir o'lcham — bitta katak (omborda nechta va narxi).
 * Katak bosilsa — shu o'lcham uchun soni va narxini o'zgartirish oynasi; «Narx va soni» —
 * formaning bir nechta o'lchamiga bir yo'la. O'zgarish oynaning o'zida darhol saqlanadi.
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
  const [stockEdit, setStockEdit] = useState(null); // { kit, sizes: string[], bulk: boolean }
  const [notice, setNotice] = useState(null); // { text } — har saqlashda yangi obyekt, taymer qaytadan boshlanadi
  const [flash, setFlash] = useState([]); // hozirgina saqlangan kataklar — bir lahza yonadi

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

  // «Saqlandi» yozuvi va katakning yonishi bir necha soniyadan keyin o'zi yo'qoladi
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => {
      setNotice(null);
      setFlash([]);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Zaxira: forma + o'lcham -> soni (yozuv bo'lmasa — null, "—" ko'rinadi)
  const qtyMap = useMemo(() => Object.fromEntries(items.map((i) => [cellKey(i.kitId, i.size), i.qty])), [items]);
  const qtyOf = (kit, size) => qtyMap[cellKey(kit.id, size)] ?? null;
  // Alohida narx qo'yilmagan o'lcham formaning komplekt narxini oladi
  const priceOf = (kit, size) => kit.sizePrices?.[size] ?? kit.shirtPrice;

  /** Oyna chaqiradi: qty / price null bo'lsa o'zgarmaydi. Xato bo'lsa throw — oyna o'zida ko'rsatadi */
  const saveCells = async (kit, sizes, { qty, price }) => {
    if (qty !== null) await inventoryApi.save(sizes.map((size) => ({ productType: PRODUCT, kitId: kit.id, size, qty })));
    if (price !== null) {
      // Komplekt narxi bilan teng o'lchamlar yozilmaydi — ular narxni formaning o'zidan oladi
      const next = { ...(kit.sizePrices ?? {}), ...Object.fromEntries(sizes.map((s) => [s, price])) };
      const sizePrices = Object.fromEntries(Object.entries(next).filter(([, n]) => Number(n) > 0 && Number(n) !== kit.shirtPrice));
      await clubsApi.updateKit(kit.id, { sizePrices });
    }
    await load();
    setStockEdit(null);
    setFlash(sizes.map((s) => cellKey(kit.id, s)));
    setNotice({ text: sizes.length === 1 ? t('{size} saqlandi ✓', { size: sizes[0] }) : t("{n} ta o'lcham saqlandi ✓", { n: sizes.length }) });
  };

  // Ro'yxat, qidiruv va sahifalash (10 tadan)
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
          <p>{t("O'lcham katagini bosing — omborda nechta borligi va narxini o'zgartirish oynasi ochiladi.")}</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t('+ Yangi forma')}</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-dlv-toolbar">
        <label className="sa-dlv-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('Klub yoki forma nomi bo‘yicha qidirish')}
            aria-label={t('Klub yoki forma nomi bo‘yicha qidirish')}
          />
        </label>
        <div className="sa-legend">
          <span><i style={{ background: 'var(--sa-accent)' }} />{t('kam qoldi (5 dan kam)')}</span>
          <span><i style={{ background: 'var(--sa-red)' }} />{t("tugagan — mijozga ko'rinmaydi")}</span>
        </div>
      </div>

      {loading ? (
        <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>
      ) : filteredKits.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t(kits.length === 0 ? '«+ Yangi forma» bilan birinchisini qo‘shing.' : 'Hech narsa topilmadi.')}</div>
        </div>
      ) : (
        <div className="sa-kits">
          {pageKits.map((kit, i) => {
            const total = ALL_SIZES.reduce((sum, s) => sum + (qtyOf(kit, s) ?? 0), 0);
            return (
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
                        {[kit.colorsLabel, `${t('Komplekt')} ${money(kit.shirtPrice)}`, `${t('bosma')} ${money(kit.printPrice)}`, t('omborda {n} dona', { n: total })]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="sa-kit__actions">
                    <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setStockEdit({ kit, sizes: [...ALL_SIZES], bulk: true })}>
                      <Layers size={15} aria-hidden="true" /> {t('Narx va soni')}
                    </button>
                    <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(kit)}>{t('Tahrirlash')}</button>
                  </div>
                </div>

                <div className="sa-sizes">
                  {ALL_SIZES.map((size) => {
                    const qty = qtyOf(kit, size);
                    const state = qty === 0 ? ' is-out' : qty !== null && qty < LOW ? ' is-low' : '';
                    const lit = flash.includes(cellKey(kit.id, size)) ? ' is-flash' : '';
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`sa-size${state}${lit}`}
                        onClick={() => setStockEdit({ kit, sizes: [size], bulk: false })}
                        aria-label={t('{size} — soni va narxini o‘zgartirish', { size })}
                      >
                        <span className="sa-size__top">
                          <span className="sa-size__name">{size}</span>
                          <Pencil size={13} aria-hidden="true" className="sa-size__pen" />
                        </span>
                        <span className="sa-size__qty">
                          {qty ?? '—'} <small>{t('dona')}</small>
                        </span>
                        <span className="sa-size__price">{money(priceOf(kit, size))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav className="sa-pager">
          <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Oldingi sahifa')} disabled={current === 0} onClick={() => goTo(current - 1)}>←</button>
          <span>{first + 1}–{first + pageKits.length} / {filteredKits.length}</span>
          <button type="button" className="sa-btn sa-btn--ghost" aria-label={t('Keyingi sahifa')} disabled={current === pages - 1} onClick={() => goTo(current + 1)}>→</button>
        </nav>
      )}

      {notice && (
        <div className="sa-dlv-toast" role="status">
          {notice.text}
        </div>
      )}

      {stockEdit && (
        <SizeModal
          {...stockEdit}
          qtyOf={(s) => qtyOf(stockEdit.kit, s)}
          priceOf={(s) => priceOf(stockEdit.kit, s)}
          onSave={(sizes, values) => saveCells(stockEdit.kit, sizes, values)}
          onClose={() => setStockEdit(null)}
        />
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

const MAX_QTY = 999_999;
const MAX_PRICE = 9_999_999;
const QTY_ADD = [5, 10, 20, 50];
const PRICE_PRESETS = [149000, 159000, 179000, 199000];

/**
 * O'lcham(lar) soni va narxi oynasi. Bitta o'lcham — hozirgi qiymatlar to'ldirilgan;
 * bulk — tanlangan o'lchamlarga bir xil son/narx (bo'sh qoldirilgan maydon o'zgarmaydi).
 */
function SizeModal({ kit, sizes: initialSizes, bulk, qtyOf, priceOf, onSave, onClose }) {
  const t = useT();
  const money = useMoney();
  const single = bulk ? null : initialSizes[0];
  const [sizes, setSizes] = useState(initialSizes);
  const [qty, setQty] = useState(single ? String(qtyOf(single) ?? '') : '');
  const [price, setPrice] = useState(single ? String(priceOf(single)) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const qtyN = qty === '' ? null : Number(qty);
  const priceN = price === '' ? null : Number(price);
  // Bitta o'lchamda — faqat o'zgargan maydon yuboriladi
  const qtyNext = single && qtyN === qtyOf(single) ? null : qtyN;
  const priceNext = single && priceN === priceOf(single) ? null : priceN;
  const badPrice = priceN === 0;
  const canSave = !saving && sizes.length > 0 && !badPrice && (qtyNext !== null || priceNext !== null);
  const priceDiff = single && priceN ? priceN - priceOf(single) : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await onSave(sizes, { qty: qtyNext, price: priceNext });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const toggle = (s) => setSizes((cur) => ALL_SIZES.filter((x) => (x === s ? !cur.includes(s) : cur.includes(x))));
  const kitName = `${kit.club.name} · ${kit.label}`;

  return (
    <Modal title={single ? t('{kit} — {size} o‘lcham', { kit: kitName, size: single }) : t('{kit} — narx va soni', { kit: kitName })} onClose={onClose}>
      <form onSubmit={submit} className="sa-dlv-modal">
        {error && <div className="form-error">{error}</div>}

        {single ? (
          <div className="sa-dlv-modal__current">
            <span>{t('Hozir')}</span>
            <b>
              {qtyOf(single) ?? '—'} {t('dona')} · {money(priceOf(single))}
            </b>
          </div>
        ) : (
          <div className="field">
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              {t("O'lchamlar ({n} ta tanlandi)", { n: sizes.length })}
              <button type="button" className="sa-dlv-link" onClick={() => setSizes(sizes.length === ALL_SIZES.length ? [] : [...ALL_SIZES])}>
                {sizes.length === ALL_SIZES.length ? t('Tanlovni tozalash') : t('Hammasini tanlash')}
              </button>
            </span>
            <div className="sa-size-picks">
              {ALL_SIZES.map((s) => (
                <label key={s} className={sizes.includes(s) ? 'is-on' : ''}>
                  <input type="checkbox" checked={sizes.includes(s)} onChange={() => toggle(s)} />
                  <b>{s}</b>
                  <small>{qtyOf(s) ?? '—'} {t('dona')}</small>
                  <small>{groupDigits(priceOf(s))}</small>
                </label>
              ))}
            </div>
          </div>
        )}

        <section className="sa-dlv-modal__block">
          <div className="field" style={{ marginBottom: 10 }}>
            <span>{t('Soni (dona)')}</span>
            <NumberField
              autoFocus
              value={qty}
              onChange={setQty}
              max={MAX_QTY}
              step={1}
              suffix={t('dona')}
              label={t('Soni (dona)')}
              placeholder={bulk ? t("o'zgarmaydi") : '0'}
            />
            {bulk && <small>{t("Bo'sh qoldirilsa — soni o'zgarmaydi")}</small>}
          </div>
          <Presets
            label={t("Tez qo'shish")}
            value={qty}
            onPick={(next) => setQty(String(next))}
            // Bitta o'lchamda "+N" hozirgisiga qo'shadi; bir nechtasida har o'lchamga aynan N qo'yiladi (yozuv ham shunday)
            options={[
              { value: 0, label: t('Tugadi (0)'), active: qty === '0' },
              ...QTY_ADD.map((n) =>
                bulk ? { value: n, label: String(n) } : { value: Math.min(MAX_QTY, (qtyN ?? 0) + n), label: `+${n}`, active: false },
              ),
            ]}
          />
        </section>

        <section className="sa-dlv-modal__block">
          <div className="field" style={{ marginBottom: 10 }}>
            <span>{t("Narxi (so'm)")}</span>
            <NumberField
              value={price}
              onChange={setPrice}
              max={MAX_PRICE}
              step={1000}
              suffix={t("so'm")}
              label={t("Narxi (so'm)")}
              placeholder={bulk ? t("o'zgarmaydi") : groupDigits(kit.shirtPrice)}
            />
            {badPrice && <small style={{ color: 'var(--sa-red)' }}>{t("Narx 0 bo'lishi mumkin emas")}</small>}
            {!badPrice && priceDiff !== 0 && (
              <small className={priceDiff > 0 ? 'sa-dlv-diff is-up' : 'sa-dlv-diff is-down'}>
                {priceDiff > 0 ? '+' : '−'}
                {money(Math.abs(priceDiff))} {t('avvalgisiga nisbatan')}
              </small>
            )}
            {bulk && <small>{t("Bo'sh qoldirilsa — narx o'zgarmaydi")}</small>}
          </div>
          <Presets
            label={t('Tez tanlash')}
            value={price}
            onPick={(p) => setPrice(String(p))}
            options={[
              { value: kit.shirtPrice, label: t('Komplekt narxi') },
              ...PRICE_PRESETS.filter((p) => p !== kit.shirtPrice).map((p) => ({ value: p, label: groupDigits(p) })),
            ]}
          />
        </section>

        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Bekor qilish')}
          </button>
          <button type="submit" className="btn btn--accent" disabled={!canSave}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </form>
    </Modal>
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
