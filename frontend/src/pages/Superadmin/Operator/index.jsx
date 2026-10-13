import { useCallback, useEffect, useState } from 'react';
import Modal, { ConfirmModal } from '../../../components/ui/Modal';
import PhoneInput, { phoneDigits } from '../../../components/ui/PhoneInput';
import { formatDate, operatorApi, prettyPhone } from '../../../features/accounts/accountsApi';

// Operator — yagona akkaunt: yo'q bo'lsa yaratish, bor bo'lsa tahrirlash/bloklash/o'chirish
export default function SuperadminOperator() {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'form' | 'delete'
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOperator(await operatorApi.get());
    } catch (err) {
      if (err.status === 404) setOperator(null);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    setBusy(true);
    try {
      setOperator(await operatorApi.update({ isActive: !operator.isActive }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await operatorApi.remove();
      setOperator(null);
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Operator</h2>
          <p>Tizimda faqat bitta operator akkaunti bo‘ladi</p>
        </div>
        {!loading && !operator && (
          <button type="button" className="btn btn--accent" onClick={() => setModal('form')}>
            + Operator yaratish
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p className="muted">Yuklanmoqda...</p>
      ) : operator ? (
        <div className="card operator-card">
          <div className="operator-card__avatar">{operator.fullName.slice(0, 1).toUpperCase()}</div>
          <div className="operator-card__info">
            <h3>{operator.fullName}</h3>
            <div className="mono">{prettyPhone(operator.phone)}</div>
            <div className="operator-card__meta">
              <span className={`badge ${operator.isActive ? 'badge--on' : 'badge--off'}`}>
                {operator.isActive ? 'Faol' : 'Bloklangan'}
              </span>
              <span className="muted">Yaratilgan: {formatDate(operator.createdAt)}</span>
            </div>
          </div>
          <div className="operator-card__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal('form')}>
              Tahrirlash
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={toggleActive} disabled={busy}>
              {operator.isActive ? 'Bloklash' : 'Faollashtirish'}
            </button>
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setModal('delete')}>
              O‘chirish
            </button>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <p className="muted">Operator akkaunti hali yaratilmagan.</p>
        </div>
      )}

      {modal === 'form' && (
        <OperatorForm
          operator={operator}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setOperator(saved);
            setModal(null);
          }}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Operatorni o‘chirish"
          text={`${operator.fullName} akkaunti o‘chiriladi va u barcha qurilmalardan chiqarib yuboriladi.`}
          busy={busy}
          onConfirm={remove}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function OperatorForm({ operator, onClose, onSaved }) {
  const isEdit = !!operator;
  const [form, setForm] = useState({
    fullName: operator?.fullName ?? '',
    phone: phoneDigits(operator?.phone),
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.phone.length !== 9) return setError("Telefon raqamni to'liq kiriting");
    setSaving(true);
    setError('');
    try {
      const body = { fullName: form.fullName.trim(), phone: `+998${form.phone}` };
      if (form.password) body.password = form.password;
      onSaved(isEdit ? await operatorApi.update(body) : await operatorApi.create(body));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Operatorni tahrirlash' : 'Operator yaratish'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label className="field">
          <span>F.I.Sh.</span>
          <input
            value={form.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          <span>Telefon raqam (login)</span>
          <PhoneInput value={form.phone} onChange={set('phone')} required />
        </label>
        <label className="field">
          <span>{isEdit ? 'Yangi parol' : 'Parol'}</span>
          <input
            type="text"
            value={form.password}
            onChange={(e) => set('password')(e.target.value)}
            required={!isEdit}
            minLength={6}
            maxLength={64}
            autoComplete="new-password"
          />
          <small>
            {isEdit ? "Bo'sh qoldirilsa o'zgarmaydi. O'zgarsa operator barcha qurilmalardan chiqariladi." : 'Kamida 6 belgi'}
          </small>
        </label>
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
