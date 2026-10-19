import { useEffect, useMemo, useRef, useState } from 'react';
import { categoriesApi, clubsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { ConfirmModal } from '../ui';
import { FALLBACK_PRICES, kitSetPrice, loadKitPrices } from '../adminApi';
import { useMoney, useT } from '../i18n';
import ClubCard from './ClubCard';

const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const KID_SIZES = ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13'];

const CONTINENTS = [
  { value: 'EUROPE', label: 'Yevropa' },
  { value: 'ASIA', label: 'Osiyo' },
  { value: 'AMERICA', label: 'Amerika' },
  { value: 'AFRICA', label: 'Afrika' },
  { value: 'OCEANIA', label: 'Okeaniya' },
];
const continentLabel = (v) => CONTINENTS.find((c) => c.value === v)?.label ?? v;
// Terma jamoalar kategoriyasi qit'a nomidan avtomatik yaratiladi — klub ligalari ro'yxatida ko'rsatilmaydi.
// Nom backendga doim o'zbekcha (lotin) yuboriladi — tarjima faqat ko'rinishda.
const nationalLeague = (continent) => `${continentLabel(continent)} terma jamoalari`;
const NATIONAL_LEAGUES = new Set(CONTINENTS.map((c) => nationalLeague(c.value)));

const clubType = (c) => c.type ?? (NATIONAL_LEAGUES.has(c.league) || c.continent ? 'NATIONAL' : 'CLUB');
const PAGE = 100; // backend limit maksimumi

/**
 * Barcha sahifalarni yig'ib oladi (avval faqat birinchi 50 tasi ko'rinardi).
 * Eski backend `type`/`continent` filtrini tanimasa (400) — filtrsiz so'rab, brauzerda ajratiladi.
 */
async function fetchClubs(params) {
  const all = async (p) => {
    const out = [];
    for (let page = 1; page <= 20; page += 1) {
      const d = await clubsApi.list({ ...p, page, limit: PAGE });
      out.push(...(d.items ?? []));
      if (out.length >= (d.total ?? 0) || (d.items ?? []).length < PAGE) break;
    }
    return out;
  };
  try {
    return await all(params);
  } catch (e) {
    if (e.status !== 400) throw e;
    return all({ categoryId: params.categoryId });
  }
}

export default function SuperadminClubs() {
  const t = useT();
  const money = useMoney();
  const [section, setSection] = useState('CLUB'); // 'CLUB' | 'NATIONAL'
  const [categoryId, setCategoryId] = useState('');
  const [continentFilter, setContinentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | club
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyKit, setBusyKit] = useState(null);
  const [basePrices, setBasePrices] = useState({
    shirtPrice: FALLBACK_PRICES.shirt,
    shortsPrice: FALLBACK_PRICES.shorts,
    printPrice: FALLBACK_PRICES.print,
  });
  const reqId = useRef(0);

  const load = async () => {
    const id = ++reqId.current;
    const items = await fetchClubs({
      type: section,
      categoryId: section === 'CLUB' ? categoryId || undefined : undefined,
      continent: section === 'NATIONAL' ? continentFilter || undefined : undefined,
    });
    // Eski javob yangisini bosib ketmasin (tez-tez tab almashtirilganda boshqa jamoalar formasi chiqib qolardi)
    if (id !== reqId.current) return;
    setClubs(items);
  };
  const loadCategories = () => categoriesApi.list().then(setCategories);

  useEffect(() => {
    loadCategories().catch((e) => setError(e.message));
    loadKitPrices().then(setBasePrices);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load()
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, categoryId, continentFilter]);

  const refresh = () => Promise.all([load(), loadCategories()]).catch((e) => setError(e.message));

  const toggleKit = async (kit) => {
    setBusyKit(kit.id);
    setError('');
    try {
      const updated = await clubsApi.updateKit(kit.id, { isActive: !kit.isActive });
      setClubs((prev) =>
        prev.map((c) => ({ ...c, kits: c.kits.map((k) => (k.id === updated.id ? { ...k, ...updated } : k)) })),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKit(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clubsApi.remove(deleting.id);
      setDeleting(null);
      refresh();
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const clubCategories = categories.filter((c) => !NATIONAL_LEAGUES.has(c.name));
  const totalClubs = clubCategories.reduce((s, c) => s + (c.clubsCount ?? 0), 0);

  // Faqat tanlangan bo'limga tegishlilari: klub ligasida terma jamoa, terma jamoada klub ko'rinmaydi
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubs.filter((c) => {
      if (clubType(c) !== section) return false;
      if (section === 'CLUB' && categoryId && c.categoryId !== categoryId) return false;
      if (section === 'NATIONAL' && continentFilter && c.continent !== continentFilter) return false;
      if (q && !`${c.name} ${c.code} ${c.league ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clubs, section, categoryId, continentFilter, search]);

  const selectSection = (s) => {
    setSection(s);
    setCategoryId('');
    setContinentFilter('');
  };

  const subtitle = (c) =>
    t('{group} · {season} mavsumi · {n} ta sotildi', {
      group: clubType(c) === 'NATIONAL' ? t(continentLabel(c.continent)) : (c.category?.name ?? c.league),
      season: c.season,
      n: c.sold ?? 0,
    });

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Klublar va formalar')}</h1>
          <p>
            {t(
              "Ilovadagi «Klub formalari» katalogi: liga klublari va davlat terma jamoalari. Har birida uy, mehmon va uchinchi forma. O'chirilgan forma ilovada ko'rinmaydi.",
            )}
          </p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>
          {section === 'CLUB' ? t("+ Klub qo'shish") : t("+ Terma jamoa qo'shish")}
        </button>
      </div>

      <div className="sa-tabs">
        <button type="button" className={`sa-tab${section === 'CLUB' ? ' is-active' : ''}`} onClick={() => selectSection('CLUB')}>
          {t('Klub ligalari')}
        </button>
        <button type="button" className={`sa-tab${section === 'NATIONAL' ? ' is-active' : ''}`} onClick={() => selectSection('NATIONAL')}>
          {t('Milliy terma jamoalar')}
        </button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {section === 'CLUB' ? (
            <>
              <button type="button" className={`sa-tab${!categoryId ? ' is-active' : ''}`} onClick={() => setCategoryId('')}>
                {t('Barchasi')} · {categoryId ? totalClubs : visible.length}
              </button>
              {clubCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`sa-tab${categoryId === cat.id ? ' is-active' : ''}`}
                  onClick={() => setCategoryId(cat.id)}
                >
                  {cat.name} · {cat.clubsCount ?? 0}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" className={`sa-tab${!continentFilter ? ' is-active' : ''}`} onClick={() => setContinentFilter('')}>
                {t('Barchasi')}
              </button>
              {CONTINENTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`sa-tab${continentFilter === c.value ? ' is-active' : ''}`}
                  onClick={() => setContinentFilter(c.value)}
                >
                  {t(c.label)}
                </button>
              ))}
            </>
          )}
        </div>
        <input
          className="sa-input"
          type="search"
          style={{ width: 220 }}
          placeholder={t('Nomi yoki nishon bo‘yicha')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="sa-table__sub" style={{ margin: '-4px 0 14px' }}>
        {t('Standart to‘plam narxi (Narxlar bo‘limidan): {sum}', {
          sum: money(kitSetPrice(basePrices)),
        })}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : visible.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            {search
              ? t('Qidiruv bo‘yicha hech narsa topilmadi.')
              : section === 'NATIONAL'
                ? continentFilter
                  ? t("Bu qit'ada terma jamoa yo'q.")
                  : t("Hali terma jamoa qo'shilmagan. «+ Terma jamoa qo'shish» tugmasi bilan birinchisini yarating.")
                : categoryId
                  ? t("Bu kategoriyada klub yo'q.")
                  : t("Hali klub qo'shilmagan. «+ Klub qo'shish» tugmasi bilan birinchi klubni yarating.")}
          </div>
        </div>
      ) : (
        <div className="sa-grid-2">
          {visible.map((c) => (
            <ClubCard
              key={c.id}
              club={c}
              subtitle={subtitle(c)}
              busyKit={busyKit}
              onToggleKit={toggleKit}
              onEdit={() => setEditing(c)}
              onDelete={() => setDeleting(c)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ClubForm
          club={editing === 'new' ? null : editing}
          categories={clubCategories}
          initialType={section}
          initialCategoryId={section === 'CLUB' ? categoryId : ''}
          initialContinent={section === 'NATIONAL' ? continentFilter : ''}
          basePrices={basePrices}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t("Klubni o'chirish")}
          text={t("{name} ({season}) va uning barcha formalari o'chiriladi. Buyurtmalar tarixi saqlanib qoladi.", {
            name: deleting.name,
            season: deleting.season,
          })}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

// Backendga ketadigan forma nomlari o'zbekcha qoladi (ilova shu nomni ko'rsatadi)
const KIT_LABELS = ['Uy', 'Mehmon', 'Uchinchi'];
const KIT_COLORS = {
  Uy: { bgColor: '#ffffff', textColor: '#0e1a3f' },
  Mehmon: { bgColor: '#0e1a3f', textColor: '#ffffff' },
  Uchinchi: { bgColor: '#19a7a1', textColor: '#0e1a3f' },
};
const NEW_CATEGORY = 'new';

const emptyKit = (label, prices) => ({
  label,
  ...(KIT_COLORS[label] ?? KIT_COLORS.Uy),
  colorsLabel: '',
  description: '',
  shirtPrice: prices.shirtPrice,
  shortsPrice: prices.shortsPrice,
  printPrice: prices.printPrice,
  sizes: [...ADULT_SIZES, ...KID_SIZES],
  isActive: true,
});

/** Yangi klub/terma jamoa uchun doim 3 ta standart forma: uy, mehmon, uchinchi */
const defaultKits = (prices) => KIT_LABELS.map((l) => emptyKit(l, prices));

// Backend (forbidNonWhitelisted) faqat DTO maydonlarini qabul qiladi — clubId, sortOrder kabilar olib tashlanadi
const toKitInput = (k) => ({
  ...(k.id && { id: k.id }),
  label: k.label.trim(),
  bgColor: k.bgColor,
  textColor: k.textColor,
  colorsLabel: k.colorsLabel?.trim() || null,
  description: k.description?.trim() || null,
  shirtPrice: Number(k.shirtPrice) || 0,
  shortsPrice: Number(k.shortsPrice) || 0,
  printPrice: Number(k.printPrice) || 0,
  sizes: k.sizes,
  isActive: k.isActive,
});

function ClubForm({ club, categories, initialType, initialCategoryId, initialContinent, basePrices, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(club);
  const [type, setType] = useState(club ? clubType(club) : (initialType ?? 'CLUB'));
  const isClubCategory = club?.categoryId && categories.some((cat) => cat.id === club.categoryId);
  const firstCategory = initialCategoryId || categories[0]?.id;
  const [form, setForm] = useState({
    name: club?.name ?? '',
    categoryId: isClubCategory ? String(club.categoryId) : firstCategory ? String(firstCategory) : NEW_CATEGORY,
    league: '',
    continent: club?.continent ?? (initialContinent || CONTINENTS[0].value),
    season: club?.season ?? '2026/27',
    code: club?.code ?? '',
    markColor: club?.markColor ?? '#0e1a3f',
    isActive: club?.isActive ?? true,
  });
  const [kits, setKits] = useState(() =>
    club?.kits?.length
      ? club.kits.map((k) => ({ ...k, colorsLabel: k.colorsLabel ?? '', description: k.description ?? '' }))
      : defaultKits(basePrices),
  );
  const [openKit, setOpenKit] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateKit = (i, patch) => setKits((ks) => ks.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  const setKit = (i, key) => (e) => updateKit(i, { [key]: e.target.value });
  const toggleSize = (i, size) =>
    setKits((ks) =>
      ks.map((k, idx) =>
        idx === i
          ? { ...k, sizes: k.sizes.includes(size) ? k.sizes.filter((s) => s !== size) : [...k.sizes, size] }
          : k,
      ),
    );

  const addKit = () => {
    if (kits.length >= 3) return;
    const nextLabel = KIT_LABELS.find((l) => !kits.some((k) => k.label === l)) ?? 'Uchinchi';
    setKits((ks) => [...ks, emptyKit(nextLabel, basePrices)]);
    setOpenKit(kits.length);
  };
  const removeKit = (i) => {
    setKits((ks) => (ks.length <= 1 ? ks : ks.filter((_, idx) => idx !== i)));
    setOpenKit(0);
  };
  const applyBasePrices = () => setKits((ks) => ks.map((k) => ({ ...k, ...basePrices })));

  const submit = async (e) => {
    e.preventDefault();
    if (kits.some((k) => !k.sizes.length)) {
      setError(t("Har bir formada kamida bitta o'lcham tanlang"));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        season: form.season.trim(),
        code: form.code.trim().toUpperCase(),
        markColor: form.markColor,
        type,
        kits: kits.map(toKitInput),
      };
      if (type === 'NATIONAL') {
        body.league = nationalLeague(form.continent);
        body.continent = form.continent;
      } else if (form.categoryId === NEW_CATEGORY) body.league = form.league.trim();
      else body.categoryId = Number(form.categoryId);
      if (isEdit) {
        body.isActive = form.isActive;
        await clubsApi.update(club.id, body);
      } else {
        await clubsApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? t('{name} — tahrirlash', { name: club.name }) : type === 'NATIONAL' ? t('Yangi terma jamoa') : t('Yangi klub')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>{t('Turi')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="CLUB">{t('Klub (liga jamoasi)')}</option>
              <option value="NATIONAL">{t('Davlat terma jamoasi')}</option>
            </select>
          </label>
          <label className="field field--full">
            <span>{type === 'NATIONAL' ? t('Davlat nomi') : t('Klub nomi')}</span>
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
          </label>
          {type === 'NATIONAL' ? (
            <label className="field">
              <span>{t("Qit'a")}</span>
              <select value={form.continent} onChange={set('continent')}>
                {CONTINENTS.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.label)}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>{t('Kategoriya (liga)')}</span>
              <select value={form.categoryId} onChange={set('categoryId')}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value={NEW_CATEGORY}>{t('+ Yangi kategoriya')}</option>
              </select>
            </label>
          )}
          <label className="field">
            <span>{t('Mavsum')}</span>
            <input value={form.season} onChange={set('season')} placeholder="2026/27" required maxLength={20} />
          </label>
          {type === 'CLUB' && form.categoryId === NEW_CATEGORY && (
            <label className="field field--full">
              <span>{t('Yangi kategoriya nomi')}</span>
              <input value={form.league} onChange={set('league')} required minLength={2} maxLength={60} placeholder="LaLiga" />
            </label>
          )}
          <label className="field">
            <span>{t('Nishon harfi')}</span>
            <input value={form.code} onChange={set('code')} required minLength={1} maxLength={4} placeholder="RM" />
          </label>
          <label className="field">
            <span>{t('Nishon rangi')}</span>
            <input type="color" value={form.markColor} onChange={set('markColor')} />
          </label>
          {isEdit && (
            <label className="field">
              <span>{t('Ilovada')}</span>
              <select value={form.isActive ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}>
                <option value="1">{t("Ko'rinadi")}</option>
                <option value="0">{t('Yashirilgan')}</option>
              </select>
            </label>
          )}
        </div>

        <div style={{ margin: '14px 0 8px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13.5, marginRight: 6 }}>{t('Formalar')}</span>
          {kits.map((k, i) => (
            <button
              key={k.id ?? `new-${i}`}
              type="button"
              className={`btn btn--sm ${openKit === i ? 'btn--accent' : 'btn--ghost'}`}
              onClick={() => setOpenKit(i)}
            >
              {KIT_LABELS.includes(k.label) ? t(k.label) : k.label || t('Forma {n}', { n: i + 1 })}
            </button>
          ))}
          {kits.length < 3 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={addKit}>
              {t('+ Forma')}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={applyBasePrices}
            title={t('Narxlar bo‘limidagi standart narxlarni hamma formalarga qo‘yish')}
          >
            {t('Standart narxlar')}
          </button>
        </div>

        {kits[openKit] && (
          <KitFields
            kit={kits[openKit]}
            canRemove={kits.length > 1}
            onField={(key) => setKit(openKit, key)}
            onPatch={(patch) => updateKit(openKit, patch)}
            onToggleSize={(size) => toggleSize(openKit, size)}
            onRemove={() => removeKit(openKit)}
          />
        )}

        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Bekor qilish')}
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function KitFields({ kit, canRemove, onField, onPatch, onToggleSize, onRemove }) {
  const t = useT();
  const money = useMoney();
  return (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--line, #e3e6ef)' }}>
      <div className="form-grid">
        <label className="field">
          <span>{t('Nomi')}</span>
          <input value={kit.label} onChange={onField('label')} required minLength={1} maxLength={30} />
        </label>
        <label className="field">
          <span>{t('Ranglar tavsifi')}</span>
          <input value={kit.colorsLabel} onChange={onField('colorsLabel')} maxLength={60} placeholder={t('Oq / oltin')} />
        </label>
        <label className="field">
          <span>{t('Fon rangi')}</span>
          <input type="color" value={kit.bgColor} onChange={onField('bgColor')} />
        </label>
        <label className="field">
          <span>{t('Matn rangi')}</span>
          <input type="color" value={kit.textColor} onChange={onField('textColor')} />
        </label>
        <label className="field">
          <span>{t("Futbolka (so'm)")}</span>
          <input type="number" min={0} max={10000000} value={kit.shirtPrice} onChange={onField('shirtPrice')} required />
        </label>
        <label className="field">
          <span>{t("Shortik (so'm)")}</span>
          <input type="number" min={0} max={10000000} value={kit.shortsPrice} onChange={onField('shortsPrice')} required />
        </label>
        <label className="field">
          <span>{t("Ism + raqam (so'm)")}</span>
          <input type="number" min={0} max={10000000} value={kit.printPrice} onChange={onField('printPrice')} required />
        </label>
        <label className="field">
          <span>{t('Sotuvda')}</span>
          <select value={kit.isActive ? '1' : '0'} onChange={(e) => onPatch({ isActive: e.target.value === '1' })}>
            <option value="1">{t('Ha')}</option>
            <option value="0">{t("Yo'q")}</option>
          </select>
        </label>
        <label className="field field--full">
          <span>{t('Tavsif')}</span>
          <input value={kit.description} onChange={onField('description')} maxLength={500} placeholder="Dry-fit polyester · DTF" />
        </label>
      </div>

      <div style={{ marginTop: 6, fontSize: 12.5 }} className="muted">
        {t('To‘plam narxi (futbolka + shortik + ism/raqam): {sum}', { sum: money(kitSetPrice(kit)) })}
      </div>

      <div style={{ marginTop: 10, fontSize: 13 }}>
        <div className="muted" style={{ marginBottom: 6 }}>{t("O'lchamlar")}</div>
        {[ADULT_SIZES, KID_SIZES].map((group, gi) => (
          <div key={gi} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {group.map((size) => (
              <button
                key={size}
                type="button"
                className={`btn btn--sm ${kit.sizes.includes(size) ? 'btn--accent' : 'btn--ghost'}`}
                onClick={() => onToggleSize(size)}
                aria-pressed={kit.sizes.includes(size)}
              >
                {size}
              </button>
            ))}
          </div>
        ))}
      </div>

      {canRemove && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove} style={{ marginTop: 6 }}>
          {t("Bu formani o'chirish")}
        </button>
      )}
    </div>
  );
}
