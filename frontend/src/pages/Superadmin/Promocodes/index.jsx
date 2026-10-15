import { useEffect, useState } from 'react';
import { promocodesApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';

const TYPE_LABEL = { PERCENT: 'Foiz', FIXED: "Qat'iy", FREE_SHIPPING: 'Bepul yetkazish' };

const formatPeriod = (p) => {
  if (!p.startsAt && !p.endsAt) return 'doimiy';
  const fmt = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  if (p.endsAt && new Date(p.endsAt) < new Date()) return 'tugagan';
  return `${p.startsAt ? fmt(p.startsAt) : '—'} – ${p.endsAt ? fmt(p.endsAt) : '—'}`;
};

export default function SuperadminPromocodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new'

  const load = () =>
    promocodesApi
      .list()
      .then(setCodes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (c) => {
    setBusyId(c.id);
    try {
      await promocodesApi.update(c.id, { isActive: !c.isActive });
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
          <h1>Promokodlar</h1>
          <p>Chegirma kodlari. O'chirilgan kod to'lovda qabul qilinmaydi.</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>+ Promokod</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : codes.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">Hali promokod yaratilmagan. "+ Promokod" bilan birinchisini qo'shing.</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Turi</th>
                <th>Qiymat</th>
                <th>Min. summa</th>
                <th>Ishlatildi</th>
                <th>Amal qilish</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.code}</b></td>
                  <td>{TYPE_LABEL[c.type] ?? c.type}</td>
                  <td>{c.type === 'FREE_SHIPPING' ? '—' : c.type === 'PERCENT' ? `${c.value}%` : c.value.toLocaleString('uz-UZ')}</td>
                  <td>{c.minSum ? c.minSum.toLocaleString('uz-UZ') : '—'}</td>
                  <td style={{ minWidth: 150 }}>
                    <div style={{ fontSize: 12.5, marginBottom: 4 }}>{c.usedCount} / {c.usageCap ?? '∞'}</div>
                    {c.usageCap && (
                      <div className="sa-progress">
                        <div className="sa-progress__fill" style={{ width: `${Math.min(100, (c.usedCount / c.usageCap) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  <td>{formatPeriod(c)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => toggle(c)}
                      style={{
                        display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: c.isActive ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', padding: 0,
                      }}
                      aria-label={c.isActive ? "O'chirish" : 'Yoqish'}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2, left: c.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        }}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PromocodeForm
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

function PromocodeForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENT',
    value: '',
    minSum: '',
    usageCap: '',
    startsAt: '',
    endsAt: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { code: form.code.trim().toUpperCase(), type: form.type };
      if (form.type !== 'FREE_SHIPPING' && form.value) body.value = Number(form.value);
      if (form.minSum) body.minSum = Number(form.minSum);
      if (form.usageCap) body.usageCap = Number(form.usageCap);
      if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
      if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();
      await promocodesApi.create(body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Yangi promokod" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>Kod</span>
            <input
              value={form.code}
              onChange={set('code')}
              required
              minLength={3}
              maxLength={20}
              placeholder="FORMO10"
              style={{ textTransform: 'uppercase' }}
            />
            <small>Faqat katta harf, raqam, - va _ (3-20 belgi)</small>
          </label>
          <label className="field">
            <span>Turi</span>
            <select value={form.type} onChange={set('type')}>
              <option value="PERCENT">Foiz</option>
              <option value="FIXED">Qat'iy summa</option>
              <option value="FREE_SHIPPING">Bepul yetkazish</option>
            </select>
          </label>
          {form.type !== 'FREE_SHIPPING' && (
            <label className="field">
              <span>{form.type === 'PERCENT' ? 'Qiymat (%)' : "Qiymat (so'm)"}</span>
              <input type="number" min={0} value={form.value} onChange={set('value')} />
            </label>
          )}
          <label className="field">
            <span>Minimal summa (so'm)</span>
            <input type="number" min={0} value={form.minSum} onChange={set('minSum')} />
          </label>
          <label className="field">
            <span>Ishlatish limiti</span>
            <input type="number" min={1} value={form.usageCap} onChange={set('usageCap')} />
          </label>
          <label className="field">
            <span>Boshlanishi</span>
            <input type="date" value={form.startsAt} onChange={set('startsAt')} />
          </label>
          <label className="field">
            <span>Tugashi</span>
            <input type="date" value={form.endsAt} onChange={set('endsAt')} />
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
