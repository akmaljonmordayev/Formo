import { useCallback, useEffect, useState } from 'react';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import PhoneInput, { phoneDigits } from '../../components/ui/PhoneInput';
import { formatDate, prettyPhone, workshopsApi } from '../accounts/accountsApi';
import { useDebounced } from '../../hooks/useDebounced';
import { useT } from '../../pages/Superadmin/i18n';

const LIMIT = 10;

// Tikuv sexlari: superadmin uchun to'liq CRUD, operator uchun faqat ko'rish (readOnly)
export default function WorkshopsPage({ readOnly = false }) {
  const t = useT();
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
          <h2>{t('Tikuv sexlari')}</h2>
          <p>{t(readOnly ? "Hamkor tikuv sexlari ro'yxati" : 'Tikuv sexlariga akkaunt ochish va boshqarish')}</p>
        </div>
        {!readOnly && (
          <button type="button" className="btn btn--accent" onClick={() => setEditing('new')}>
            {t("+ Tikuv sexi qo'shish")}
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder={t("Nomi, mas'ul shaxs yoki telefon bo'yicha qidirish")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('Holat')}>
          <option value="">{t('Barchasi')}</option>
          <option value="true">{t('Faol')}</option>
          <option value="false">{t('Bloklangan')}</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('Tikuv sexi')}</th>
              <th>{t("Mas'ul shaxs")}</th>
              <th>{t('Telefon')}</th>
              <th>{t("Kunlik sig'im")}</th>
              <th>{t('Holat')}</th>
              <th>{t("Qo'shilgan")}</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={7} className="table__empty">
                  {t('Yuklanmoqda...')}
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={7} className="table__empty">
                  {t('Tikuv sexlari topilmadi')}
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
                  <td>{w.dailyCapacity ? t('{n} dona', { n: w.dailyCapacity }) : '—'}</td>
                  <td>
                    <span className={`badge ${w.isActive ? 'badge--on' : 'badge--off'}`}>
                      {t(w.isActive ? 'Faol' : 'Bloklangan')}
                    </span>
                  </td>
                  <td className="mono">{formatDate(w.createdAt)}</td>
                  {!readOnly && (
                    <td>
                      <div className="table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(w)}>
                          {t('Tahrirlash')}
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleActive(w)}>
                          {t(w.isActive ? 'Bloklash' : 'Faollashtirish')}
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(w)}>
                          {t("O'chirish")}
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
        <span>{t('Jami')}: {data.total}</span>
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
          title={t("Tikuv sexini o'chirish")}
          text={t("«{name}» akkaunti butunlay o'chiriladi va barcha qurilmalardan chiqariladi.", { name: deleting.workshopName })}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function WorkshopForm({ workshop, onClose, onSaved }) {
  const t = useT();
  const isEdit = !!workshop;
  const [form, setForm] = useState({
    workshopName: workshop?.workshopName ?? '',
    fullName: workshop?.fullName ?? '',
    phone: phoneDigits(workshop?.phone),
    address: workshop?.address ?? '',
    dailyCapacity: workshop?.dailyCapacity ? String(workshop.dailyCapacity) : '',
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.phone.length !== 9) return setError(t("Telefon raqamni to'liq kiriting"));
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
      if (form.dailyCapacity) body.dailyCapacity = Number(form.dailyCapacity);
      if (isEdit) await workshopsApi.update(workshop.id, body);
      else await workshopsApi.create(body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={t(isEdit ? 'Tikuv sexini tahrirlash' : 'Yangi tikuv sexi')} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>{t('Tikuv sexi nomi')}</span>
            <input value={form.workshopName} onChange={set('workshopName')} required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            <span>{t("Mas'ul shaxs")}</span>
            <input value={form.fullName} onChange={set('fullName')} required minLength={2} maxLength={100} />
          </label>
          <label className="field">
            <span>{t('Telefon (login)')}</span>
            <PhoneInput value={form.phone} onChange={set('phone')} required />
          </label>
          <label className="field field--full">
            <span>{t('Manzil')}</span>
            <input value={form.address} onChange={set('address')} maxLength={255} />
          </label>
          <label className="field">
            <span>{t("Kunlik sig'im (dona)")}</span>
            <input type="number" min={1} max={10000} step={1} value={form.dailyCapacity} onChange={set('dailyCapacity')} />
          </label>
          <label className="field field--full">
            <span>{t(isEdit ? 'Yangi parol' : 'Parol')}</span>
            <input
              type="text"
              value={form.password}
              onChange={set('password')}
              required={!isEdit}
              minLength={6}
              maxLength={64}
              autoComplete="new-password"
            />
            <small>{t(isEdit ? "Bo'sh qoldirilsa o'zgarmaydi" : 'Kamida 6 belgi. Tikuv sexiga yetkazing.')}</small>
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '8px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Bekor qilish')}
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {t(saving ? 'Saqlanmoqda...' : 'Saqlash')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
