import { useEffect, useState } from 'react';
import { categoriesApi } from '../../../features/platform/platformApi';
import Modal, { ConfirmModal } from '../../../components/ui/Modal';

// Ligalar: ilova katalogidagi filtr chiplari. Klubi bor kategoriyani o'chirib bo'lmaydi (backend 409 qaytaradi)
export default function SuperadminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | category
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    categoriesApi
      .list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (c) => {
    setBusyId(c.id);
    setError('');
    try {
      await categoriesApi.update(c.id, { isActive: !c.isActive });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await categoriesApi.remove(deleting.id);
      setDeleting(null);
      load();
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Kategoriyalar</h1>
          <p>Ligalar — ilova katalogidagi filtrlar. Nomi o'zgarsa klublardagi liga nomi ham yangilanadi.</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>+ Kategoriya</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">Hali kategoriya yo'q. "+ Kategoriya" bilan birinchisini qo'shing.</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Slug</th>
                <th>Tartib</th>
                <th>Klublar</th>
                <th>Ilovada</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td className="sa-table__sub" style={{ marginTop: 0 }}>{c.slug}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.clubsCount}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => toggle(c)}
                      style={{
                        display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: c.isActive ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', padding: 0,
                      }}
                      aria-label={c.isActive ? 'Yashirish' : "Ko'rsatish"}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2, left: c.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        }}
                      />
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(c)}>Tahrirlash</button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        disabled={c.clubsCount > 0}
                        title={c.clubsCount > 0 ? "Avval klublarni boshqa kategoriyaga o'tkazing" : undefined}
                        onClick={() => setDeleting(c)}
                      >
                        O'chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CategoryForm
          category={editing === 'new' ? null : editing}
          nextOrder={items.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Kategoriyani o'chirish"
          text={`«${deleting.name}» kategoriyasi o'chiriladi.`}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function CategoryForm({ category, nextOrder, onClose, onSaved }) {
  const isEdit = Boolean(category);
  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    sortOrder: category?.sortOrder ?? nextOrder,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { name: form.name.trim(), sortOrder: Number(form.sortOrder) || 0 };
      // Bo'sh slug yuborilmaydi — backend nomdan o'zi yasaydi
      if (form.slug.trim()) body.slug = form.slug.trim();
      if (isEdit) await categoriesApi.update(category.id, body);
      else await categoriesApi.create(body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>Nomi</span>
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} placeholder="LaLiga" />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              value={form.slug}
              onChange={set('slug')}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="laliga"
            />
            <small>Bo'sh qolsa nomdan yasaladi</small>
          </label>
          <label className="field">
            <span>Tartib</span>
            <input type="number" min={0} max={10000} value={form.sortOrder} onChange={set('sortOrder')} />
            <small>Kichigi oldinda</small>
          </label>
        </div>
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
