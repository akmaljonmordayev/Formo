import { useEffect, useState } from 'react';
import { clubsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';

const CONTINENTS = [
  { value: 'EUROPE', label: 'Yevropa' },
  { value: 'ASIA', label: 'Osiyo' },
  { value: 'AMERICA', label: 'Amerika' },
  { value: 'AFRICA', label: 'Afrika' },
  { value: 'OCEANIA', label: 'Okeaniya' },
];
const continentLabel = (v) => CONTINENTS.find((c) => c.value === v)?.label ?? v;

export default function SuperadminClubs() {
  const [section, setSection] = useState('CLUB'); // 'CLUB' | 'NATIONAL'
  const [leagueFilter, setLeagueFilter] = useState('');
  const [continentFilter, setContinentFilter] = useState('');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | club object
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    clubsApi
      .list({
        type: section,
        league: section === 'CLUB' ? leagueFilter || undefined : undefined,
        continent: section === 'NATIONAL' ? continentFilter || undefined : undefined,
      })
      .then((d) => setClubs(d.items));

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
  }, [section, leagueFilter, continentFilter]);

  const leagues = Array.from(new Set(clubs.map((c) => c.league)));

  const selectSection = (s) => {
    setSection(s);
    setLeagueFilter('');
    setContinentFilter('');
  };

  const remove = async (c) => {
    if (!window.confirm(`"${c.name}" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    setBusyId(c.id);
    try {
      await clubsApi.remove(c.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
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
              <button type="button" className={`sa-tab${!leagueFilter ? ' is-active' : ''}`} onClick={() => setLeagueFilter('')}>
                Barchasi · {clubs.length}
              </button>
              {leagues.map((l) => (
                <button key={l} type="button" className={`sa-tab${leagueFilter === l ? ' is-active' : ''}`} onClick={() => setLeagueFilter(l)}>
                  {l}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" className={`sa-tab${!continentFilter ? ' is-active' : ''}`} onClick={() => setContinentFilter('')}>
                Barchasi · {clubs.length}
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
            {section === 'CLUB'
              ? "Hali klub qo'shilmagan. \"+ Klub qo'shish\" tugmasi bilan birinchi klubni yarating."
              : "Hali terma jamoa qo'shilmagan. \"+ Terma jamoa qo'shish\" tugmasi bilan birinchisini yarating."}
          </div>
        </div>
      ) : (
        <div className="sa-grid-2">
          {clubs.map((c) => (
            <div key={c.id} className="sa-panel">
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
                    <div className="sa-panel__title" style={{ fontSize: 14.5 }}>{c.name}</div>
                    <div className="sa-table__sub">
                      {c.type === 'NATIONAL' ? continentLabel(c.continent) : c.league} · {c.season} mavsumi
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="sa-table__sub" style={{ marginTop: 0 }}>{c.sold} ta sotildi</span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(c)}>
                    Tahrirlash
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busyId === c.id} onClick={() => remove(c)}>
                    O'chirish
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.kits.length || 1}, 1fr)`, gap: 10 }}>
                {c.kits.map((k) => (
                  <div key={k.id} style={{ textAlign: 'center' }}>
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClubForm
          initial={editing === 'new' ? null : editing}
          initialType={section}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load().catch((e) => setError(e.message));
          }}
        />
      )}
    </>
  );
}

const KIT_LABELS = ['Uy', 'Mehmon', 'Uchinchi'];

function ClubForm({ initial, initialType, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [type, setType] = useState(initial?.type ?? initialType ?? 'CLUB');
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    league: initial?.type === 'NATIONAL' ? '' : (initial?.league ?? ''),
    continent: initial?.continent ?? CONTINENTS[0].value,
    season: initial?.season ?? '',
    code: initial?.code ?? '',
    markColor: initial?.markColor ?? '#0e1a3f',
  });
  const [kits, setKits] = useState(
    initial?.kits?.length
      ? initial.kits.map((k) => ({ id: k.id, label: k.label, bgColor: k.bgColor, textColor: k.textColor }))
      : [{ label: 'Uy', bgColor: '#0e1a3f', textColor: '#ffffff' }],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setKit = (i, key) => (e) =>
    setKits((ks) => ks.map((k, idx) => (idx === i ? { ...k, [key]: e.target.value } : k)));

  const addKit = () => {
    const nextLabel = KIT_LABELS.find((l) => !kits.some((k) => k.label === l)) ?? 'Uchinchi';
    setKits((ks) => (ks.length >= 3 ? ks : [...ks, { label: nextLabel, bgColor: '#0e1a3f', textColor: '#ffffff' }]));
  };
  const removeKit = (i) => setKits((ks) => (ks.length <= 1 ? ks : ks.filter((_, idx) => idx !== i)));

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
        kits,
        ...(type === 'NATIONAL'
          ? { league: `${continentLabel(form.continent)} terma jamoalari`, continent: form.continent }
          : { league: form.league.trim() }),
      };
      if (isEdit) {
        await clubsApi.update(initial.id, body);
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
    <Modal title={isEdit ? 'Klubni tahrirlash' : (type === 'NATIONAL' ? 'Yangi terma jamoa' : 'Yangi klub')} onClose={onClose}>
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
              <span>Liga</span>
              <input value={form.league} onChange={set('league')} required minLength={2} maxLength={60} />
            </label>
          )}
          <label className="field">
            <span>Mavsum</span>
            <input value={form.season} onChange={set('season')} placeholder="2026/27" maxLength={20} />
          </label>
          <label className="field">
            <span>Nishon harfi</span>
            <input value={form.code} onChange={set('code')} required minLength={1} maxLength={4} placeholder="RM" />
          </label>
          <label className="field">
            <span>Nishon rangi</span>
            <input type="color" value={form.markColor} onChange={set('markColor')} />
          </label>
        </div>

        <div style={{ margin: '14px 0 8px', fontWeight: 600, fontSize: 13.5 }}>Formalar</div>
        {kits.map((k, i) => (
          <div key={k.id ?? i} className="form-grid" style={{ marginBottom: 8, alignItems: 'end' }}>
            <label className="field">
              <span>Nomi</span>
              <input value={k.label} onChange={setKit(i, 'label')} required minLength={1} maxLength={30} />
            </label>
            <label className="field">
              <span>Fon rangi</span>
              <input type="color" value={k.bgColor} onChange={setKit(i, 'bgColor')} />
            </label>
            <label className="field">
              <span>Matn rangi</span>
              <input type="color" value={k.textColor} onChange={setKit(i, 'textColor')} />
            </label>
            {kits.length > 1 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeKit(i)}>
                O'chirish
              </button>
            )}
          </div>
        ))}
        {kits.length < 3 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={addKit}>
            + Forma qo'shish
          </button>
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
