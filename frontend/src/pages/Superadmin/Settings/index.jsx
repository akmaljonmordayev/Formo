import { useState } from 'react';
import { securityApi } from '../../../features/platform/platformApi';
import { useAuth } from '../../../hooks/useAuth';
import { useLang } from '../i18n';

export default function SuperadminSettings() {
  const { t } = useLang();

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Parol va sessiyalar')}</h1>
          <p>{t('Hisobingiz xavfsizligi: parolni almashtirish va boshqa qurilmalardagi sessiyalarni yopish.')}</p>
        </div>
      </div>

      <div className="sa-panel" style={{ maxWidth: 480 }}>
        <SecuritySection />
      </div>
    </>
  );
}

function Messages({ error, notice }) {
  return (
    <>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="sa-table__sub" style={{ marginBottom: 12, color: 'var(--sa-teal)' }}>{notice}</div>}
    </>
  );
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 };

/* ---------- Hisob: parol ---------- */
function SecuritySection() {
  const { t } = useLang();
  const { logout } = useAuth();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (form.newPassword !== form.confirm) return setError(t('Yangi parollar mos kelmadi'));
    if (form.newPassword === form.currentPassword) return setError(t('Yangi parol eskisidan farq qilishi kerak'));
    setSaving(true);
    try {
      const res = await securityApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      setNotice(res?.message ?? t('Parol yangilandi'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  // Joriy sessiya ham bekor bo'ladi — shuning uchun darhol login sahifasiga qaytiladi
  const logoutAll = async () => {
    setLeaving(true);
    setError('');
    try {
      await securityApi.logoutAll();
      await logout();
    } catch (err) {
      setError(err.message);
      setLeaving(false);
    }
  };

  const input = { className: 'sa-input', style: { width: '100%', maxWidth: 320 }, required: true };

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Parol almashtirilganda boshqa qurilmalardagi sessiyalar yopiladi, joriy sessiya qoladi.')}
      </p>
      <Messages error={error} notice={notice} />

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        <label style={fieldStyle}>
          {t('Joriy parol')}
          <input {...input} type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
        </label>
        <label style={fieldStyle}>
          {t('Yangi parol')}
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set('newPassword')} />
        </label>
        <label style={fieldStyle}>
          {t('Yangi parolni takrorlang')}
          <input {...input} type="password" autoComplete="new-password" minLength={6} value={form.confirm} onChange={set('confirm')} />
        </label>
        <div>
          <button type="submit" className="sa-btn" disabled={saving}>
            {saving ? t('Saqlanmoqda...') : t('Parolni almashtirish')}
          </button>
        </div>
      </form>

      <div className="sa-panel__title" style={{ marginBottom: 4, fontSize: 14 }}>{t('Barcha qurilmalardan chiqish')}</div>
      <p className="sa-table__sub" style={{ marginBottom: 12 }}>
        {t('Akkauntga kirilgan hamma qurilmalar, shu jumladan bu brauzer ham chiqariladi.')}
      </p>
      <button type="button" className="sa-btn sa-btn--ghost" disabled={leaving} onClick={logoutAll}>
        {leaving ? t('Chiqilmoqda...') : t('Hamma joydan chiqish')}
      </button>
    </>
  );
}
