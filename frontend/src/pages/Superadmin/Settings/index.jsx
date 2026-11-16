import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Globe, KeyRound, Moon, Palette, Sun, X } from 'lucide-react';
import { securityApi } from '../../../features/platform/platformApi';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { useAuth } from '../../../hooks/useAuth';
import { THEME_EVENT, readStoredTheme } from '../../../components/layout/SuperadminLayout';
import { LANGS, useLang } from '../i18n';

const THEMES = [
  ['light', "Yorug'", Sun],
  ['dark', "Qorong'i", Moon],
];

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'S';

/** Profil: kim kirgani, til va mavzu, parolni yangilash */
export default function SuperadminSettings() {
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  // Mavzu holati layoutda — yuqori paneldagi tugma bilan bir xil ko'rsatadi
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail);
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

  const pickTheme = (value) => window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: value }));
  const name = user?.fullName || 'Super admin';

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Profil')}</h1>
          <p>{t('Til, mavzu va parol.')}</p>
        </div>
      </div>

      <div className="sa-profile">
        <div className="sa-profile__side">
          <div className="sa-panel sa-profile__card">
            <span className="sa-profile__avatar" aria-hidden="true">{initials(name)}</span>
            <div className="sa-profile__who">
              <b>{name}</b>
              <span>Super admin</span>
              {user?.phone && <small>{prettyPhone(user.phone)}</small>}
            </div>
          </div>

          <div className="sa-panel">
            <div className="sa-profile__title">
              <Globe size={16} strokeWidth={1.9} aria-hidden="true" />
              {t('Til')}
            </div>
            <div className="sa-seg" role="radiogroup" aria-label={t('Til')}>
              {LANGS.map((l) => (
                <button key={l.value} type="button" role="radio" aria-checked={lang === l.value} className={lang === l.value ? 'is-active' : undefined} onClick={() => setLang(l.value)}>
                  {l.label}
                </button>
              ))}
            </div>

            <div className="sa-profile__title" style={{ marginTop: 20 }}>
              <Palette size={16} strokeWidth={1.9} aria-hidden="true" />
              {t('Mavzu')}
            </div>
            <div className="sa-seg" role="radiogroup" aria-label={t('Mavzu')}>
              {THEMES.map(([value, label, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={theme === value} className={theme === value ? 'is-active' : undefined} onClick={() => pickTheme(value)}>
                  <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sa-panel">
          <div className="sa-profile__title">
            <KeyRound size={16} strokeWidth={1.9} aria-hidden="true" />
            {t('Parolni yangilash')}
          </div>
          <PasswordSection />
        </div>
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

/* ---------- Profil: faqat parolni yangilash (til va mavzu yuqori panelda) ---------- */
const STRENGTH = [
  null,
  ['Kuchsiz', 'var(--sa-red)'],
  ["O'rtacha", 'var(--sa-accent)'],
  ['Kuchli', 'var(--sa-green)'],
];

/** 1 — kuchsiz, 2 — harf va raqam aralash (8+ belgi), 3 — uzun, katta harf yoki belgi ham bor */
function passwordStrength(password) {
  if (!password) return 0;
  if (password.length < 8 || !/\d/.test(password) || !/\D/.test(password)) return 1;
  return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]|[^\w\s]/.test(password) ? 3 : 2;
}

/** Parol maydoni: o'ngdagi ko'z tugmasi shu maydonning o'zini ko'rsatadi / yashiradi */
function PasswordField({ label, value, onChange, autoComplete, minLength, children }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const eyeLabel = t(show ? 'Parolni yashirish' : "Parolni ko'rsatish");
  return (
    <div style={fieldStyle}>
      <label style={fieldStyle}>
        {label}
        <span className="sa-pass">
          <input
            className="sa-input"
            type={show ? 'text' : 'password'}
            autoComplete={autoComplete}
            minLength={minLength}
            value={value}
            onChange={onChange}
            required
          />
          <button type="button" className="sa-pass__eye" onClick={() => setShow((v) => !v)} aria-label={eyeLabel} title={eyeLabel} aria-pressed={show}>
            {show ? <EyeOff size={17} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={17} strokeWidth={1.9} aria-hidden="true" />}
          </button>
        </span>
      </label>
      {children}
    </div>
  );
}

function PasswordSection() {
  const { t } = useLang();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const strength = passwordStrength(form.newPassword);
  const matches = form.confirm !== '' && form.confirm === form.newPassword;

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

  return (
    <>
      <p className="sa-table__sub" style={{ marginBottom: 18 }}>
        {t('Parol almashtirilganda boshqa qurilmalardagi sessiyalar yopiladi, joriy sessiya qoladi.')}
      </p>
      <Messages error={error} notice={notice} />

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 380 }}>
        <PasswordField label={t('Joriy parol')} autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
        <PasswordField label={t('Yangi parol')} autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set('newPassword')}>
          {strength > 0 && (
            <div className="sa-strength" style={{ '--strength': STRENGTH[strength][1] }}>
              <span className="sa-strength__bars" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <i key={n} className={n <= strength ? 'is-on' : undefined} />
                ))}
              </span>
              {t(STRENGTH[strength][0])}
            </div>
          )}
        </PasswordField>
        <PasswordField label={t('Yangi parolni takrorlang')} autoComplete="new-password" minLength={6} value={form.confirm} onChange={set('confirm')}>
          {form.confirm !== '' && (
            <div className={`sa-pass-note${matches ? '' : ' is-bad'}`}>
              {matches ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : <X size={14} strokeWidth={2.6} aria-hidden="true" />}
              {t(matches ? 'Parollar mos keldi' : 'Yangi parollar mos kelmadi')}
            </div>
          )}
        </PasswordField>
        <div>
          <button type="submit" className="sa-btn" disabled={saving || !form.currentPassword || !matches}>
            <KeyRound size={15} strokeWidth={2} aria-hidden="true" />
            {saving ? t('Saqlanmoqda...') : t('Parolni yangilash')}
          </button>
        </div>
      </form>
    </>
  );
}
