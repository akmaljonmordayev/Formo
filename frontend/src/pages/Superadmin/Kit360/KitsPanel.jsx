import { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { clubsApi } from '../../../features/platform/platformApi';
import { ConfirmModal } from '../ui';
import { useMoney, useT } from '../i18n';

export const SLEEVES = { SLEEVED: 'Yengli', SLEEVELESS: 'Yengsiz' };
export const BOTTOMS = { SHORTS: 'Shortik', PANTS: 'Shalvar' };

async function findClub(kit360Id) {
  for (let page = 1; page <= 20; page += 1) {
    const d = await clubsApi.list({ page, limit: 100 });
    const club = (d.items ?? []).find((c) => c.kit360Id === kit360Id);
    if (club || (d.items ?? []).length < 100) return club ?? null;
  }
  return null;
}

/** Tanlangan Forma 360° jamoasining formalari: qo'shish, tahrirlash, o'chirish */
export default function KitsPanel({ teamId, teamName }) {
  const t = useT();
  const money = useMoney();
  const [club, setClub] = useState(undefined); // undefined — yuklanmoqda, null — katalogda yo'q
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // 'new' | kit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    return findClub(teamId).then(setClub).catch((e) => { setClub(null); setError(e.message); });
  }, [teamId]);

  useEffect(() => {
    setClub(undefined);
    load();
  }, [load]);

  const remove = async () => {
    setBusy(true);
    try {
      await clubsApi.removeKit(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(e.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const kits = [...(club?.kits ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="sa-panel" style={{ marginTop: 20 }}>
      <div className="sa-head" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{t('{team} formalari', { team: t(teamName) })}</h2>
        </div>
        {club && (
          <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t("+ Forma qo'shish")}</button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {club === undefined ? (
        <div className="sa-table__sub">{t('Yuklanmoqda...')}</div>
      ) : !club ? (
        <div className="sa-table__sub">{t("Bu jamoa katalogda yo'q")}</div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t('Forma')}</th>
                <th>{t('Turi')}</th>
                <th>{t('Komplekt narxi')}</th>
                <th>{t('Bosma narxi')}</th>
                <th>{t('Holat')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {kits.map((k) => (
                <tr key={k.id}>
                  <td>
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block', width: 14, height: 14, borderRadius: 4, marginRight: 8, verticalAlign: 'middle',
                        background: k.bgColor, border: `3px solid ${k.textColor}`,
                      }}
                    />
                    <b>{k.label}</b>
                    {k.colorsLabel && <span className="sa-table__sub">{k.colorsLabel}</span>}
                  </td>
                  <td>{t(SLEEVES[k.sleeve] ?? 'Yengli')} · {t(BOTTOMS[k.bottom] ?? 'Shortik')}</td>
                  <td>{money(k.shirtPrice + (k.shortsPrice || 0))}</td>
                  <td>{money(k.printPrice)}</td>
                  <td>{t(k.isActive ? 'Faol' : 'Nofaol')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="sa-btn sa-btn--ghost" style={{ marginRight: 8 }} onClick={() => setEditing(k)}>
                      {t('Tahrirlash')}
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost"
                      disabled={kits.length <= 1}
                      title={kits.length <= 1 ? t("Yagona formani o'chirib bo'lmaydi") : undefined}
                      onClick={() => setDeleting(k)}
                    >
                      {t("O'chirish")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <KitForm
          clubId={club.id}
          kit={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={t("Formani o'chirish")}
          text={t("«{name}» formasi o'chiriladi. Avvalgi buyurtmalarda u saqlanib qoladi.", { name: deleting.label })}
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function KitForm({ clubId, kit, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(kit);
  const [form, setForm] = useState({
    label: kit?.label ?? '',
    sleeve: kit?.sleeve ?? 'SLEEVED',
    bottom: kit?.bottom ?? 'SHORTS',
    bgColor: kit?.bgColor ?? '#ffffff',
    textColor: kit?.textColor ?? '#111111',
    colorsLabel: kit?.colorsLabel ?? '',
    shirtPrice: kit ? kit.shirtPrice + (kit.shortsPrice || 0) : 159000,
    printPrice: kit?.printPrice ?? 30000,
    isActive: kit?.isActive ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        label: form.label.trim(),
        colorsLabel: form.colorsLabel.trim(),
        shirtPrice: Number(form.shirtPrice),
        shortsPrice: 0, // shortik komplekt narxi ichida
        printPrice: Number(form.printPrice),
      };
      if (isEdit) await clubsApi.updateKit(kit.id, body);
      else await clubsApi.createKit(clubId, body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? t('Formani tahrirlash') : t('Yangi forma')} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>{t('Nomi')}</span>
            <input value={form.label} onChange={set('label')} required maxLength={30} placeholder={t('Uy')} />
          </label>
          <Choice label={t('Ustki qism')} options={SLEEVES} value={form.sleeve} onChange={(v) => setForm((f) => ({ ...f, sleeve: v }))} />
          <Choice label={t('Pastki qism')} options={BOTTOMS} value={form.bottom} onChange={(v) => setForm((f) => ({ ...f, bottom: v }))} />
          <label className="field">
            <span>{t('Asosiy rang')}</span>
            <input type="color" value={form.bgColor} onChange={set('bgColor')} />
          </label>
          <label className="field">
            <span>{t('Yozuv rangi')}</span>
            <input type="color" value={form.textColor} onChange={set('textColor')} />
          </label>
          <label className="field field--full">
            <span>{t('Ranglar tavsifi')}</span>
            <input value={form.colorsLabel} onChange={set('colorsLabel')} maxLength={60} placeholder={t('Oq / oltin')} />
          </label>
          <label className="field">
            <span>{t("Komplekt narxi (so'm)")}</span>
            <input type="number" required min={0} max={10000000} value={form.shirtPrice} onChange={set('shirtPrice')} />
          </label>
          <label className="field">
            <span>{t("Bosma narxi (so'm)")}</span>
            <input type="number" required min={0} max={10000000} value={form.printPrice} onChange={set('printPrice')} />
          </label>
          <label className="field field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span>{t('Sotuvda (faol)')}</span>
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Yengli/Yengsiz, Shortik/Shalvar — bitta bosish bilan tanlanadigan tugmalar */
function Choice({ label, options, value, onChange }) {
  const t = useT();
  return (
    <div className="field" role="group" aria-label={label}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {Object.entries(options).map(([v, l]) => (
          <button
            key={v}
            type="button"
            className={`btn btn--sm ${value === v ? 'btn--accent' : 'btn--ghost'}`}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            style={{ flex: 1 }}
          >
            {t(l)}
          </button>
        ))}
      </div>
    </div>
  );
}
