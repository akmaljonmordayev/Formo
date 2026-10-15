import { useEffect, useState } from 'react';
import { clubsApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';

export default function SuperadminClubs() {
  const [leagueFilter, setLeagueFilter] = useState('');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new'

  const load = () => clubsApi.list({ league: leagueFilter || undefined }).then((d) => setClubs(d.items));

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
  }, [leagueFilter]);

  const leagues = Array.from(new Set(clubs.map((c) => c.league)));

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Klublar va formalar</h1>
          <p>
            Ilovadagi «Klub formalari» katalogi. Har bir klubda uy, mehmon va uchinchi forma. O'chirilgan forma ilovada
            ko'rinmaydi.
          </p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>+ Klub qo'shish</button>
      </div>

      <div className="sa-tabs" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`sa-tab${!leagueFilter ? ' is-active' : ''}`} onClick={() => setLeagueFilter('')}>
            Barchasi · {clubs.length}
          </button>
          {leagues.map((l) => (
            <button key={l} type="button" className={`sa-tab${leagueFilter === l ? ' is-active' : ''}`} onClick={() => setLeagueFilter(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : clubs.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">
            Hali klub qo'shilmagan. "+ Klub qo'shish" tugmasi bilan birinchi klubni yarating.
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
                    <div className="sa-table__sub">{c.league} · {c.season} mavsumi</div>
                  </div>
                </div>
                <span className="sa-table__sub" style={{ marginTop: 0 }}>{c.sold} ta sotildi</span>
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

function ClubForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', league: '', season: '', code: '', markColor: '#0e1a3f' });
  const [kits, setKits] = useState([{ label: 'Uy', bgColor: '#0e1a3f', textColor: '#ffffff' }]);
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
      await clubsApi.create({
        name: form.name.trim(),
        league: form.league.trim(),
        season: form.season.trim(),
        code: form.code.trim().toUpperCase(),
        markColor: form.markColor,
        kits,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Yangi klub" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>Klub nomi</span>
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>Liga</span>
            <input value={form.league} onChange={set('league')} required minLength={2} maxLength={60} />
          </label>
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
          <div key={i} className="form-grid" style={{ marginBottom: 8, alignItems: 'end' }}>
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
