import { useEffect, useState } from 'react';
import { categoriesApi, clubsApi, money } from '../../../features/platform/platformApi';
import Modal, { ConfirmModal } from '../../../components/ui/Modal';

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
// Terma jamoalar kategoriyasi qit'a nomidan avtomatik yaratiladi — klub ligalari ro'yxatida ko'rsatilmaydi
const nationalLeague = (continent) => `${continentLabel(continent)} terma jamoalari`;
const NATIONAL_LEAGUES = new Set(CONTINENTS.map((c) => nationalLeague(c.value)));

export default function SuperadminClubs() {
  const [section, setSection] = useState('CLUB'); // 'CLUB' | 'NATIONAL'
  const [categoryId, setCategoryId] = useState('');
  const [continentFilter, setContinentFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | club
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyKit, setBusyKit] = useState(null);

  const load = () =>
    clubsApi
      .list({
        type: section,
        categoryId: section === 'CLUB' ? categoryId || undefined : undefined,
        continent: section === 'NATIONAL' ? continentFilter || undefined : undefined,
      })
      .then((d) => setClubs(d.items));
  const loadCategories = () => categoriesApi.list().then(setCategories);

  useEffect(() => {
    loadCategories().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
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
  const totalClubs = clubCategories.reduce((s, c) => s + c.clubsCount, 0);

  const selectSection = (s) => {
    setSection(s);
    setCategoryId('');
    setContinentFilter('');
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Klublar va formalar</h1>
          <p>
            Ilovadagi «Klub formalari» katalogi: liga klublari va davlat terma jamoalari. Har birida uy, mehmon va
            uchinchi forma. O'chirilgan forma ilovada ko'rinmaydi.
          </p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>
          {section === 'CLUB' ? "+ Klub qo'shish" : "+ Terma jamoa qo'shish"}
        </button>
      </div>

      <div className="sa-tabs">
        <button type="button" className={`sa-tab${section === 'CLUB' ? ' is-active' : ''}`} onClick={() => selectSection('CLUB')}>
          Klub ligalari
        </button>
        <button type="button" className={`sa-tab${section === 'NATIONAL' ? ' is-active' : ''}`} onClick={() => selectSection('NATIONAL')}>
          Milliy terma jamoalar
        </button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {section === 'CLUB' ? (
            <>
              <button type="button" className={`sa-tab${!categoryId ? ' is-active' : ''}`} onClick={() => setCategoryId('')}>
                Barchasi · {categoryId ? totalClubs : clubs.length}
              </button>
              {clubCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`sa-tab${categoryId === cat.id ? ' is-active' : ''}`}
                  onClick={() => setCategoryId(cat.id)}
                >
                  {cat.name} · {cat.clubsCount}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" className={`sa-tab${!continentFilter ? ' is-active' : ''}`} onClick={() => setContinentFilter('')}>
                Barchasi
              </button>
              {CONTINENTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`sa-tab${continentFilter === c.value ? ' is-active' : ''}`}
                  onClick={() => setContinentFilter(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : clubs.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            {section === 'NATIONAL'
              ? continentFilter
                ? "Bu qit'ada terma jamoa yo'q."
                : "Hali terma jamoa qo'shilmagan. \"+ Terma jamoa qo'shish\" tugmasi bilan birinchisini yarating."
              : categoryId
                ? "Bu kategoriyada klub yo'q."
                : "Hali klub qo'shilmagan. \"+ Klub qo'shish\" tugmasi bilan birinchi klubni yarating."}
          </div>
        </div>
      ) : (
        <div className="sa-grid-2">
          {clubs.map((c) => (
            <div key={c.id} className="sa-panel" style={c.isActive ? undefined : { opacity: 0.6 }}>
              <div className="sa-panel__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10,
                      background: c.markColor, color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-display)',
                    }}
                  >
                    {c.code}
                  </span>
                  <div>
                    <div className="sa-panel__title" style={{ fontSize: 14.5 }}>
                      {c.name}
                      {!c.isActive && <span className="sa-badge sa-badge--red" style={{ marginLeft: 8 }}>Yashirilgan</span>}
                    </div>
                    <div className="sa-table__sub">
                      {c.type === 'NATIONAL' ? continentLabel(c.continent) : (c.category?.name ?? c.league)} · {c.season} mavsumi ·{' '}
                      {c.sold} ta sotildi
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(c)}>Tahrirlash</button>
                  <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setDeleting(c)} aria-label={`${c.name} ni o'chirish`}>
                    O'chirish
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.kits.length || 1}, 1fr)`, gap: 10 }}>
                {c.kits.map((k) => (
                  <div key={k.id} style={{ textAlign: 'center', opacity: k.isActive ? 1 : 0.45 }}>
                    <div
                      style={{
                        height: 56, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 6,
                        background: k.bgColor, color: k.textColor, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
                        border: '1px solid var(--sa-line)',
                      }}
                    >
                      {c.code}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sa-mu)' }}>{k.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--sa-mu)' }}>{money(k.shirtPrice)}</div>
                    <button
                      type="button"
                      className={`sa-badge sa-badge--${k.isActive ? 'green' : 'red'}`}
                      style={{ border: 'none', cursor: 'pointer', marginTop: 4 }}
                      disabled={busyKit === k.id}
                      onClick={() => toggleKit(k)}
                      title="Sotuvga chiqarish / olib qo'yish"
                    >
                      {k.isActive ? 'Sotuvda' : "Sotuvda yo'q"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClubForm
          club={editing === 'new' ? null : editing}
          categories={clubCategories}
          initialType={section}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Klubni o'chirish"
          text={`${deleting.name} (${deleting.season}) va uning barcha formalari o'chiriladi. Buyurtmalar tarixi saqlanib qoladi.`}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

const KIT_LABELS = ['Uy', 'Mehmon', 'Uchinchi'];
const NEW_CATEGORY = 'new';

const emptyKit = (label) => ({
  label,
  bgColor: '#0e1a3f',
  textColor: '#ffffff',
  colorsLabel: '',
  description: '',
  shirtPrice: 99000,
  shortsPrice: 60000,
  printPrice: 30000,
  sizes: [...ADULT_SIZES],
  isActive: true,
});

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

function ClubForm({ club, categories, initialType, onClose, onSaved }) {
  const isEdit = Boolean(club);
  const [type, setType] = useState(club?.type ?? initialType ?? 'CLUB');
  const isClubCategory = club?.categoryId && categories.some((cat) => cat.id === club.categoryId);
  const [form, setForm] = useState({
    name: club?.name ?? '',
    categoryId: isClubCategory ? String(club.categoryId) : categories[0] ? String(categories[0].id) : NEW_CATEGORY,
    league: '',
    continent: club?.continent ?? CONTINENTS[0].value,
    season: club?.season ?? '',
    code: club?.code ?? '',
    markColor: club?.markColor ?? '#0e1a3f',
    isActive: club?.isActive ?? true,
  });
  const [kits, setKits] = useState(() =>
    club?.kits?.length
      ? club.kits.map((k) => ({ ...k, colorsLabel: k.colorsLabel ?? '', description: k.description ?? '' }))
      : [emptyKit('Uy')],
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
    const nextLabel = KIT_LABELS.find((l) => !kits.some((k) => k.label === l)) ?? 'Uchinchi';
    if (kits.length >= 3) return;
    setKits((ks) => [...ks, emptyKit(nextLabel)]);
    setOpenKit(kits.length);
  };
  const removeKit = (i) => {
    setKits((ks) => (ks.length <= 1 ? ks : ks.filter((_, idx) => idx !== i)));
    setOpenKit(0);
  };

  const submit = async (e) => {
    e.preventDefault();
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
      title={isEdit ? `${club.name} — tahrirlash` : type === 'NATIONAL' ? 'Yangi terma jamoa' : 'Yangi klub'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>Turi</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="CLUB">Klub (liga jamoasi)</option>
              <option value="NATIONAL">Davlat terma jamoasi</option>
            </select>
          </label>
          <label className="field field--full">
            <span>{type === 'NATIONAL' ? 'Davlat nomi' : 'Klub nomi'}</span>
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
          </label>
          {type === 'NATIONAL' ? (
            <label className="field">
              <span>Qit'a</span>
              <select value={form.continent} onChange={set('continent')}>
                {CONTINENTS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Kategoriya (liga)</span>
              <select value={form.categoryId} onChange={set('categoryId')}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value={NEW_CATEGORY}>+ Yangi kategoriya</option>
              </select>
            </label>
          )}
          <label className="field">
            <span>Mavsum</span>
            <input value={form.season} onChange={set('season')} placeholder="2026/27" maxLength={20} />
          </label>
          {type === 'CLUB' && form.categoryId === NEW_CATEGORY && (
            <label className="field field--full">
              <span>Yangi kategoriya nomi</span>
              <input value={form.league} onChange={set('league')} required minLength={2} maxLength={60} placeholder="LaLiga" />
            </label>
          )}
          <label className="field">
            <span>Nishon harfi</span>
            <input value={form.code} onChange={set('code')} required minLength={1} maxLength={4} placeholder="RM" />
          </label>
          <label className="field">
            <span>Nishon rangi</span>
            <input type="color" value={form.markColor} onChange={set('markColor')} />
          </label>
          {isEdit && (
            <label className="field">
              <span>Ilovada</span>
              <select value={form.isActive ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}>
                <option value="1">Ko'rinadi</option>
                <option value="0">Yashirilgan</option>
              </select>
            </label>
          )}
        </div>

        <div style={{ margin: '14px 0 8px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13.5, marginRight: 6 }}>Formalar</span>
          {kits.map((k, i) => (
            <button
              key={k.id ?? `new-${i}`}
              type="button"
              className={`btn btn--sm ${openKit === i ? 'btn--accent' : 'btn--ghost'}`}
              onClick={() => setOpenKit(i)}
            >
              {k.label || `Forma ${i + 1}`}
            </button>
          ))}
          {kits.length < 3 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={addKit}>
              + Forma
            </button>
          )}
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
            Bekor qilish
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function KitFields({ kit, canRemove, onField, onPatch, onToggleSize, onRemove }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--line, #e3e6ef)' }}>
      <div className="form-grid">
        <label className="field">
          <span>Nomi</span>
          <input value={kit.label} onChange={onField('label')} required minLength={1} maxLength={30} />
        </label>
        <label className="field">
          <span>Ranglar tavsifi</span>
          <input value={kit.colorsLabel} onChange={onField('colorsLabel')} maxLength={60} placeholder="Oq / oltin" />
        </label>
        <label className="field">
          <span>Fon rangi</span>
          <input type="color" value={kit.bgColor} onChange={onField('bgColor')} />
        </label>
        <label className="field">
          <span>Matn rangi</span>
          <input type="color" value={kit.textColor} onChange={onField('textColor')} />
        </label>
        <label className="field">
          <span>Futbolka (so'm)</span>
          <input type="number" min={0} max={10000000} value={kit.shirtPrice} onChange={onField('shirtPrice')} required />
        </label>
        <label className="field">
          <span>Shortik (so'm)</span>
          <input type="number" min={0} max={10000000} value={kit.shortsPrice} onChange={onField('shortsPrice')} required />
        </label>
        <label className="field">
          <span>Ism + raqam (so'm)</span>
          <input type="number" min={0} max={10000000} value={kit.printPrice} onChange={onField('printPrice')} required />
        </label>
        <label className="field">
          <span>Sotuvda</span>
          <select value={kit.isActive ? '1' : '0'} onChange={(e) => onPatch({ isActive: e.target.value === '1' })}>
            <option value="1">Ha</option>
            <option value="0">Yo'q</option>
          </select>
        </label>
        <label className="field field--full">
          <span>Tavsif</span>
          <input value={kit.description} onChange={onField('description')} maxLength={500} placeholder="Dry-fit polyester · DTF bosma" />
        </label>
      </div>

      <div style={{ marginTop: 10, fontSize: 13 }}>
        <div className="muted" style={{ marginBottom: 6 }}>O'lchamlar</div>
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
          Bu formani o'chirish
        </button>
      )}
    </div>
  );
}
