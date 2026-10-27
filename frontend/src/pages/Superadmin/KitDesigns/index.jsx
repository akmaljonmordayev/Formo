import { useEffect, useState } from 'react';
import { KIT_PATTERN_LABELS } from '@formo/kit-3d/design';
import { kitDesignsApi } from '../../../features/kits/kitsApi';
import { assetUrl } from '../../../services/api';
import { ConfirmModal } from '../ui';
import { useT } from '../i18n';
import KitDesignEditor from './KitDesignEditor';

/**
 * 3D formalar: ro'yxat (saqlashda chizilgan PNG — ro'yxatda jonli 3D yo'q), nashr qilish, tahrirlovchi.
 * Nashr qilingan (isActive) dizaynlarni mobil ilova GET /kits/designs orqali ko'radi.
 */
export default function SuperadminKitDesigns() {
  const t = useT();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | dizayn
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    kitDesignsApi
      .list()
      .then((list) => {
        setItems(list);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (d) => {
    setBusyId(d.id);
    setError('');
    try {
      await kitDesignsApi.update(d.id, { isActive: !d.isActive });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    setBusyId(deleting.id);
    try {
      await kitDesignsApi.remove(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const save = async (payload, thumbnail) => {
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const saved = editing === 'new' ? await kitDesignsApi.create(payload) : await kitDesignsApi.update(editing.id, payload);
      // Kichik rasm alohida: chizilmasa ham dizayn saqlangan bo'ladi
      try {
        const blob = await thumbnail();
        if (blob) await kitDesignsApi.setThumbnail(saved.id, blob);
      } catch (e) {
        setNotice(t("Dizayn saqlandi, lekin kichik rasm yuklanmadi: {msg}", { msg: e.message }));
      }
      setEditing(null);
      await load();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const isNew = editing === 'new';
    return (
      <>
        <div className="sa-head">
          <div>
            <h1>{isNew ? t('Yangi dizayn') : t('Dizaynni tahrirlash')}</h1>
            <p>{t("Saqlash — qoralama sifatida; Nashr qilish — ilovada ko'rinadi.")}</p>
          </div>
        </div>
        <KitDesignEditor
          key={isNew ? 'new' : editing.id}
          initial={isNew ? { sortOrder: items.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1 } : editing}
          onSave={save}
          onCancel={() => {
            setEditing(null);
            setSaveError('');
          }}
          saving={saving}
          error={saveError}
        />
      </>
    );
  }

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('3D formalar')}</h1>
          <p>{t("Forma dizaynlari: ilovada mijoz shu dizaynni 3D ko'rinishda ko'radi va orqasiga ism-raqam yozadi.")}</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>
          {t('+ Yangi dizayn')}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="kd-notice">{notice}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t('Yuklanmoqda...')}</div>
      ) : error && !items.length ? (
        <div className="sa-panel">
          <button type="button" className="sa-btn sa-btn--ghost" onClick={() => { setLoading(true); load(); }}>
            {t('Qayta urinish')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t("Hali dizayn yo'q. «+ Yangi dizayn» bilan birinchisini yarating.")}</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table kd-table">
            <thead>
              <tr>
                <th>{t('Rasm')}</th>
                <th>{t('Nomi')}</th>
                <th>{t('Tartib')}</th>
                <th>{t('Nashr')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="kd-thumb" style={{ '--kd-c1': d.design.primaryColor, '--kd-c2': d.design.secondaryColor }}>
                      {d.thumbnailUrl ? <img src={assetUrl(d.thumbnailUrl)} alt={d.design.name} loading="lazy" /> : null}
                    </div>
                  </td>
                  <td>
                    <b>{d.design.name}</b>
                    <span className="sa-table__sub">
                      {t(KIT_PATTERN_LABELS[d.design.pattern] || d.design.pattern)} · {d.design.sponsorText || '—'}
                    </span>
                  </td>
                  <td>{d.sortOrder}</td>
                  <td>
                    <button
                      type="button"
                      className="kd-toggle"
                      aria-pressed={d.isActive}
                      disabled={busyId === d.id}
                      onClick={() => togglePublish(d)}
                      aria-label={d.isActive ? t('Nashrdan olish') : t('Nashr qilish')}
                    >
                      <span />
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setEditing(d)}>
                        {t('Tahrirlash')}
                      </button>
                      <button type="button" className="sa-btn sa-btn--ghost" disabled={busyId === d.id} onClick={() => setDeleting(d)}>
                        {t("O'chirish")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title={t("Dizaynni o'chirish")}
          text={t("«{name}» o'chiriladi va ilovadan yo'qoladi. Mijozlarning savatidagi shu dizayn ham olib tashlanadi; berilgan buyurtmalardagi nusxa saqlanib qoladi.", { name: deleting.design.name })}
          busy={busyId === deleting.id}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
