import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '../ui';
import { formatDate, prettyPhone, usersApi } from '../../../features/accounts/accountsApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { useT } from '../i18n';

const LIMIT = 15;
const GENDER = { MALE: 'Erkak', FEMALE: 'Ayol' };

// Mobil ilova foydalanuvchilari: o'zlari ro'yxatdan o'tadi, superadmin ko'radi/bloklaydi/o'chiradi
export default function SuperadminUsers() {
  const t = useT();
  const [data, setData] = useState({ items: [], total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await usersApi.list({ search: debouncedSearch, isActive: status, page, limit: LIMIT }));
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

  const toggle = async (u) => {
    try {
      await usersApi.setStatus(u.id, !u.isActive);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await usersApi.remove(deleting.id);
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
          <h2>{t("Foydalanuvchilar")}</h2>
          <p>{t("Mobil ilova orqali ro‘yxatdan o‘tganlar")}</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder={t("Ism yoki telefon bo'yicha qidirish")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("Holat")}>
          <option value="">{t("Barchasi")}</option>
          <option value="true">{t("Faol")}</option>
          <option value="false">{t("Bloklangan")}</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t("Foydalanuvchi")}</th>
              <th>{t("Telefon")}</th>
              <th>{t("Profil")}</th>
              <th>{t("Holat")}</th>
              <th>{t("Ro‘yxatdan o‘tgan")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={6} className="table__empty">
                  {t("Yuklanmoqda...")}
                </td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={6} className="table__empty">
                  {t("Foydalanuvchilar topilmadi")}
                </td>
              </tr>
            ) : (
              data.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.fullName}</strong>
                  </td>
                  <td className="mono">{prettyPhone(u.phone)}</td>
                  <td className="muted">
                    {[GENDER[u.gender] && t(GENDER[u.gender]), u.age && t('{n} yosh', { n: u.age }), u.height && `${u.height} sm`, u.weight && `${u.weight} kg`]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge--on' : 'badge--off'}`}>
                      {u.isActive ? t('Faol') : t('Bloklangan')}
                    </span>
                  </td>
                  <td className="mono">{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="table__actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggle(u)}>
                        {u.isActive ? t('Bloklash') : t('Faollashtirish')}
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(u)}>
                        {t("O‘chirish")}
                      </button>
                    </div>
                  </td>
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
          <span className="btn btn--ghost btn--sm">
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

      {deleting && (
        <ConfirmModal
          title={t("Foydalanuvchini o‘chirish")}
          text={t("{name} ({phone}) butunlay o'chiriladi.", { name: deleting.fullName, phone: prettyPhone(deleting.phone) })}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
