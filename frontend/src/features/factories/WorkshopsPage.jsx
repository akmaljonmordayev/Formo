import { useCallback, useEffect, useState } from 'react';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import PhoneInput, { phoneDigits } from '../../components/ui/PhoneInput';
import { formatDate, prettyPhone, workshopsApi } from '../accounts/accountsApi';
import { useDebounced } from '../../hooks/useDebounced';

const LIMIT = 10;

// Tikuv sexlari: superadmin uchun to'liq CRUD, operator uchun faqat ko'rish (readOnly)
export default function WorkshopsPage({ readOnly = false }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | workshop
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await workshopsApi.list({ search: debouncedSearch, isActive: status, page, limit: LIMIT }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const toggleActive = async (w) => {
    try {
      await workshopsApi.update(w.id, { isActive: !w.isActive });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await workshopsApi.remove(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Tikuv sexlari</h2>
          <p>{readOnly ? "Hamkor tikuv sexlari ro'yxati" : 'Tikuv sexlariga akkaunt ochish va boshqarish'}</p>
        </div>
        {!readOnly && (
          <button type="button" className="btn btn--accent" onClick={() => setEditing('new')}>
            + Tikuv sexi qo‘shish
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Nomi, mas'ul shaxs yoki telefon bo'yicha qidirish"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Holat">
          <option value="">Barchasi</option>
          <option value="true">Faol</option>
          <option value="false">Bloklangan</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tikuv sexi</th>
              <th>Mas'ul shaxs</th>
              <th>Telefon</th>
              <th>Holat</th>
              <th>Qo‘shilgan</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={6} className="table__empty">
                  Yuklanmoqda...
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={6} className="table__empty">
                  Tikuv sexlari topilmadi
                </td>
              </tr>
            ) : (
              data.items.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong>{w.workshopName}</strong>
                    {w.address && <span className="table__sub">{w.address}</span>}
                  </td>
                  <td>{w.fullName}</td>
                  <td className="mono">{prettyPhone(w.phone)}</td>
                  <td>
                    <span className={`badge ${w.isActive ? 'badge--on' : 'badge--off'}`}>
                      {w.isActive ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                  <td className="mono">{formatDate(w.createdAt)}</td>
                  {!readOnly && (
                    <td>
                      <div className="table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(w)}>
                          Tahrirlash
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleActive(w)}>
                          {w.isActive ? 'Bloklash' : 'Faollashtirish'}
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(w)}>
                          O‘chirish
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span>Jami: {data.total}</span>
        <div>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </button>
          <span className="btn btn--ghost btn--sm" aria-live="polite">
            {page} / {pages}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            →
          </button>
        </div>
      </div>

      {editing && (
        <WorkshopForm
          workshop={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Tikuv sexini o‘chirish"
          text={`«${deleting.workshopName}» akkaunti butunlay o‘chiriladi va barcha qurilmalardan chiqariladi.`}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function WorkshopForm({ workshop, onClose, onSaved }) {
  const isEdit = !!workshop;
  const [form, setForm] = useState({
    workshopName: workshop?.workshopName ?? '',
    fullName: workshop?.fullName ?? '',
    phone: phoneDigits(workshop?.phone),
    address: workshop?.address ?? '',
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.phone.length !== 9) return setError("Telefon raqamni to'liq kiriting");
    setSaving(true);
    setError('');
    try {
      const body = {
        workshopName: form.workshopName.trim(),
        fullName: form.fullName.trim(),
        phone: `+998${form.phone}`,
      };
      if (form.address.trim()) body.address = form.address.trim();
      if (form.password) body.password = form.password;
      if (isEdit) await workshopsApi.update(workshop.id, body);
      else await workshopsApi.create(body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Tikuv sexini tahrirlash' : 'Yangi tikuv sexi'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>Tikuv sexi nomi</span>
            <input value={form.workshopName} onChange={set('workshopName')} required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            <span>Mas'ul shaxs</span>
            <input value={form.fullName} onChange={set('fullName')} required minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>Telefon (login)</span>
            <PhoneInput value={form.phone} onChange={set('phone')} required />
          </label>
          <label className="field field--full">
            <span>Manzil</span>
            <input value={form.address} onChange={set('address')} maxLength={255} />
          </label>
          <label className="field field--full">
            <span>{isEdit ? 'Yangi parol' : 'Parol'}</span>
            <input
              type="text"
              value={form.password}
              onChange={set('password')}
              required={!isEdit}
              minLength={6}
              maxLength={64}
              autoComplete="new-password"
            />
            <small>{isEdit ? "Bo'sh qoldirilsa o'zgarmaydi" : 'Kamida 6 belgi. Tikuv sexiga yetkazing.'}</small>
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '8px 0 0' }}>
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
