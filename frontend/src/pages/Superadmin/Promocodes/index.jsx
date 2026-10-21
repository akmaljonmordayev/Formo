import { useEffect, useState } from 'react';
import { promocodesApi } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { useT } from '../i18n';

const TYPE_LABEL = { PERCENT: 'Foiz', FIXED: "Qat'iy", FREE_SHIPPING: 'Bepul yetkazish' };

const formatPeriod = (p, t) => {
  if (!p.startsAt && !p.endsAt) return t('doimiy');
  const fmt = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  if (p.endsAt && new Date(p.endsAt) < new Date()) return t('tugagan');
  return `${p.startsAt ? fmt(p.startsAt) : '—'} – ${p.endsAt ? fmt(p.endsAt) : '—'}`;
};

export default function SuperadminPromocodes() {
  const t = useT();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | promocode

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
          <h1>{t("Promokodlar")}</h1>
          <p>{t("Chegirma kodlari. O'chirilgan kod to'lovda qabul qilinmaydi.")}</p>
        </div>
        <button type="button" className="sa-btn" onClick={() => setEditing('new')}>{t("+ Promokod")}</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>{t("Yuklanmoqda...")}</div>
      ) : codes.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">{t("Hali promokod yaratilmagan. «+ Promokod» bilan birinchisini qo'shing.")}</div>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("Kod")}</th>
                <th>{t("Turi")}</th>
                <th>{t("Qiymat")}</th>
                <th>{t("Min. summa")}</th>
                <th>{t("Ishlatildi")}</th>
                <th>{t("Amal qilish")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.code}</b></td>
                  <td>{TYPE_LABEL[c.type] ? t(TYPE_LABEL[c.type]) : c.type}</td>
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
                  <td>{formatPeriod(c, t)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="sa-btn sa-btn--ghost" style={{ marginRight: 10, verticalAlign: 'middle' }} onClick={() => setEditing(c)}>
                      {t("Tahrirlash")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => toggle(c)}
                      style={{
                        display: 'inline-block', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: c.isActive ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative', padding: 0, verticalAlign: 'middle',
                      }}
                      aria-label={c.isActive ? t("O'chirish") : t('Yoqish')}
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
          promo={editing === 'new' ? null : editing}
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

// ISO -> <input type="date"> qiymati
const toDateInput = (iso) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '');

function PromocodeForm({ promo, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(promo);
  const [form, setForm] = useState({
    code: promo?.code ?? '',
    type: promo?.type ?? 'PERCENT',
    value: promo?.value ?? '',
    minSum: promo?.minSum ?? '',
    usageCap: promo?.usageCap ?? '',
    startsAt: toDateInput(promo?.startsAt),
    endsAt: toDateInput(promo?.endsAt),
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
      if (form.type !== 'FREE_SHIPPING' && form.value !== '') body.value = Number(form.value);
      if (form.minSum !== '') body.minSum = Number(form.minSum);
      if (form.usageCap !== '') body.usageCap = Number(form.usageCap);
      if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
      if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();
      if (isEdit) {
        // Tahrirlashda bo'shatilgan limitlar serverda ham olib tashlanadi
        if (form.minSum === '') body.minSum = null;
        if (form.usageCap === '') body.usageCap = null;
        await promocodesApi.update(promo.id, body);
      } else {
        await promocodesApi.create(body);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? t('{name} — tahrirlash', { name: promo.code }) : t('Yangi promokod')} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="field field--full">
            <span>{t("Kod")}</span>
            <input
              value={form.code}
              onChange={set('code')}
              required
              minLength={3}
              maxLength={20}
              placeholder="FORMO10"
              style={{ textTransform: 'uppercase' }}
            />
            <small>{t("Faqat katta harf, raqam, - va _ (3-20 belgi)")}</small>
          </label>
          <label className="field">
            <span>{t("Turi")}</span>
            <select value={form.type} onChange={set('type')}>
              <option value="PERCENT">{t("Foiz")}</option>
              <option value="FIXED">{t("Qat'iy summa")}</option>
              <option value="FREE_SHIPPING">{t("Bepul yetkazish")}</option>
            </select>
          </label>
          {form.type !== 'FREE_SHIPPING' && (
            <label className="field">
              <span>{form.type === 'PERCENT' ? t('Qiymat (%)') : t("Qiymat (so'm)")}</span>
              <input type="number" min={0} value={form.value} onChange={set('value')} />
            </label>
          )}
          <label className="field">
            <span>{t("Minimal summa (so'm)")}</span>
            <input type="number" min={0} value={form.minSum} onChange={set('minSum')} />
          </label>
          <label className="field">
            <span>{t("Ishlatish limiti")}</span>
            <input type="number" min={1} value={form.usageCap} onChange={set('usageCap')} />
          </label>
          <label className="field">
            <span>{t("Boshlanishi")}</span>
            <input type="date" value={form.startsAt} onChange={set('startsAt')} />
          </label>
          <label className="field">
            <span>{t("Tugashi")}</span>
            <input type="date" value={form.endsAt} onChange={set('endsAt')} />
          </label>
        </div>
        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t("Bekor qilish")}
          </button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? t("Saqlanmoqda...") : t("Saqlash")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
