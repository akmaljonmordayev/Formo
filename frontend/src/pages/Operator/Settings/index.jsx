import { useState } from 'react';
import { Eye, EyeOff, Monitor, Moon, Save, Sun } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { DEFAULT_PREFS, useOperator } from '../prefs';
import { LANGS, translate, useT } from '../i18n';

const NOTIFY = ['newOrders', 'orderStatus', 'workshops', 'system', 'sound'];

const THEMES = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function OperatorSettings() {
  const { prefs, savePrefs, toast } = useOperator();
  const t = useT();
  const [draft, setDraft] = useState(prefs);
  const dirty = !same(draft, prefs);

  const setNotify = (key) => (e) =>
    setDraft((d) => ({ ...d, notify: { ...d.notify, [key]: e.target.checked } }));

  const save = () => {
    savePrefs(draft);
    // xabar yangi tanlangan tilda chiqadi
    toast(translate(draft.lang, 'set.saved'));
  };

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.settings')}</h1>
          <p>{t('set.subtitle')}</p>
        </div>
      </div>

      <div className="op-g2">
        <div className="op-stk">
          <PersonalCard />
          <PasswordCard />

          <section className="op-cd op-pd" aria-labelledby="set-notify">
            <h2 id="set-notify">{t('set.notify')}</h2>
            <p className="op-sub">{t('set.notifyHint')}</p>
            {NOTIFY.map((key) => (
              <label key={key} className="op-sw">
                <span>
                  {t(`set.n.${key}`)}
                  <small>{t(`set.n.${key}Hint`)}</small>
                </span>
                <span className="op-tg">
                  <input type="checkbox" role="switch" checked={draft.notify[key]} onChange={setNotify(key)} />
                  <i />
                </span>
              </label>
            ))}
          </section>
        </div>

        <div className="op-stk">
          <section className="op-cd op-pd" aria-labelledby="set-theme">
            <h2 id="set-theme">{t('set.theme')}</h2>
            <div className="op-seg" role="radiogroup" aria-labelledby="set-theme">
              {THEMES.map(({ value, icon: Icon }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="op-theme"
                    value={value}
                    checked={draft.theme === value}
                    onChange={() => setDraft((d) => ({ ...d, theme: value }))}
                  />
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  {t(`set.t.${value}`)}
                </label>
              ))}
            </div>
            <p className="op-sub" style={{ margin: '10px 0 0' }}>
              {t('set.themeHint')}
            </p>
          </section>

          <section className="op-cd op-pd" aria-labelledby="set-lang">
            <h2 id="set-lang">{t('set.lang')}</h2>
            <label className="op-fld" style={{ marginBottom: 0 }}>
              <span>{t('set.langLabel')}</span>
              <select value={draft.lang} onChange={(e) => setDraft((d) => ({ ...d, lang: e.target.value }))}>
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      </div>

      <div className={`op-save${dirty ? ' is-dirty' : ''}`}>
        <span className="op-sub" style={{ fontSize: 13 }}>
          {t(dirty ? 'set.dirty' : 'set.local')}
        </span>
        <div className="op-row">
          <button
            type="button"
            className="op-b"
            onClick={() => setDraft(dirty ? prefs : DEFAULT_PREFS)}
            disabled={!dirty && same(prefs, DEFAULT_PREFS)}
          >
            {t(dirty ? 'set.cancel' : 'set.reset')}
          </button>
          <button type="button" className="op-b is-p is-lg" onClick={save} disabled={!dirty}>
            <Save size={15} strokeWidth={1.8} aria-hidden="true" />
            {t('set.save')}
          </button>
        </div>
      </div>
    </>
  );
}

function PersonalCard() {
  const { user, role } = useAuth();
  const t = useT();
  return (
    <section className="op-cd op-pd" aria-labelledby="set-personal">
      <h2 id="set-personal">{t('set.personal')}</h2>
      <div className="op-fg">
        <label className="op-fld">
          <span>{t('set.fullName')}</span>
          <input value={user?.fullName ?? ''} readOnly />
        </label>
        <label className="op-fld">
          <span>{t('set.phone')}</span>
          <input value={user?.phone ? prettyPhone(user.phone) : ''} readOnly />
        </label>
        <label className="op-fld">
          <span>{t('profile.role')}</span>
          <input value={t(`role.${role}`)} readOnly />
        </label>
        <label className="op-fld">
          <span>{t('profile.team')}</span>
          <input value={t('team')} readOnly />
        </label>
      </div>
      <p className="op-sub" style={{ margin: 0 }}>
        {t('set.personalNote')}
      </p>
    </section>
  );
}

function PasswordInput({ value, onChange, autoComplete, label, hint }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <label className="op-fld">
      <span>{label}</span>
      <span className="op-pw">
        <input
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === 'new-password' ? 6 : undefined}
          maxLength={64}
        />
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={t(shown ? 'set.hide' : 'set.show')}>
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PasswordCard() {
  const { toast } = useOperator();
  const t = useT();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError(t('set.pwMismatch'));
    if (form.newPassword === form.currentPassword) return setError(t('set.pwSame'));
    setSaving(true);
    try {
      await api('/auth/password', {
        method: 'PATCH',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm(empty);
      toast(t('set.pwDone'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="op-cd op-pd" aria-labelledby="set-password">
      <h2 id="set-password">{t('set.pw')}</h2>
      <form onSubmit={submit}>
        {error && <div className="op-msg">{error}</div>}
        <PasswordInput
          label={t('set.pwCurrent')}
          value={form.currentPassword}
          onChange={set('currentPassword')}
          autoComplete="current-password"
        />
        <div className="op-fg">
          <PasswordInput
            label={t('set.pwNew')}
            value={form.newPassword}
            onChange={set('newPassword')}
            autoComplete="new-password"
            hint={t('set.pwNewHint')}
          />
          <PasswordInput
            label={t('set.pwConfirm')}
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
          />
        </div>
        <div className="op-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="op-sub">{t('set.pwNote')}</span>
          <button type="submit" className="op-b is-p" disabled={saving}>
            {t(saving ? 'set.saving' : 'set.pwSubmit')}
          </button>
        </div>
      </form>
    </section>
  );
}
