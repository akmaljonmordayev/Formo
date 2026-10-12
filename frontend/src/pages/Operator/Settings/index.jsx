import { useState } from 'react';
import { Eye, EyeOff, Monitor, Moon, Save, Sun } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { ROLE_LABELS } from '../../../constants/roles';
import { prettyPhone } from '../../../features/accounts/accountsApi';
import { DEFAULT_PREFS, useOperator } from '../prefs';

const NOTIFY = [
  { key: 'newOrders', label: 'Yangi buyurtmalar', hint: 'Mijoz yangi buyurtma berganda' },
  { key: 'orderStatus', label: 'Buyurtma holati', hint: 'Tikuv sexi holatni o‘zgartirganda' },
  { key: 'workshops', label: 'Tikuv sexlari', hint: 'Yangi sex qo‘shilganda yoki bloklanganda' },
  { key: 'system', label: 'Tizim xabarlari', hint: 'Texnik ishlar va yangilanishlar' },
  { key: 'sound', label: 'Ovozli signal', hint: 'Yangi bildirishnomada qisqa ovoz' },
];

const THEMES = [
  { value: 'system', label: 'Tizim', icon: Monitor },
  { value: 'light', label: 'Yorug‘', icon: Sun },
  { value: 'dark', label: 'Qorong‘i', icon: Moon },
];

const LANGS = [
  { value: 'uz', label: 'O‘zbekcha' },
  { value: 'ru', label: 'Русский (tez orada)', disabled: true },
  { value: 'en', label: 'English (tez orada)', disabled: true },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function OperatorSettings() {
  const { prefs, savePrefs, toast } = useOperator();
  const [draft, setDraft] = useState(prefs);
  const dirty = !same(draft, prefs);

  const setNotify = (key) => (e) =>
    setDraft((d) => ({ ...d, notify: { ...d.notify, [key]: e.target.checked } }));

  const save = () => {
    savePrefs(draft);
    toast('Sozlamalar saqlandi');
  };

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>Sozlamalar</h1>
          <p>Hisob, xavfsizlik va panel ko‘rinishi</p>
        </div>
      </div>

      <div className="op-g2">
        <div className="op-stk">
          <PersonalCard />
          <PasswordCard />

          <section className="op-cd op-pd" aria-labelledby="set-notify">
            <h2 id="set-notify">Bildirishnomalar</h2>
            <p className="op-sub">Qaysi hodisalar haqida xabar olishni tanlang</p>
            {NOTIFY.map(({ key, label, hint }) => (
              <label key={key} className="op-sw">
                <span>
                  {label}
                  <small>{hint}</small>
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
            <h2 id="set-theme">Mavzu</h2>
            <div className="op-seg" role="radiogroup" aria-labelledby="set-theme">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="op-theme"
                    value={value}
                    checked={draft.theme === value}
                    onChange={() => setDraft((d) => ({ ...d, theme: value }))}
                  />
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
            <p className="op-sub" style={{ margin: '10px 0 0' }}>
              “Tizim” — qurilmangiz sozlamasiga qarab avtomatik almashadi.
            </p>
          </section>

          <section className="op-cd op-pd" aria-labelledby="set-lang">
            <h2 id="set-lang">Til</h2>
            <label className="op-fld" style={{ marginBottom: 0 }}>
              <span>Interfeys tili</span>
              <select value={draft.lang} onChange={(e) => setDraft((d) => ({ ...d, lang: e.target.value }))}>
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value} disabled={l.disabled}>
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
          {dirty ? 'Saqlanmagan o‘zgarishlar bor' : 'Sozlamalar shu qurilmada saqlanadi'}
        </span>
        <div className="op-row">
          <button
            type="button"
            className="op-b"
            onClick={() => setDraft(dirty ? prefs : DEFAULT_PREFS)}
            disabled={!dirty && same(prefs, DEFAULT_PREFS)}
          >
            {dirty ? 'Bekor qilish' : 'Standartga qaytarish'}
          </button>
          <button type="button" className="op-b is-p is-lg" onClick={save} disabled={!dirty}>
            <Save size={15} strokeWidth={1.8} aria-hidden="true" />
            Saqlash
          </button>
        </div>
      </div>
    </>
  );
}

function PersonalCard() {
  const { user, role } = useAuth();
  return (
    <section className="op-cd op-pd" aria-labelledby="set-personal">
      <h2 id="set-personal">Shaxsiy ma’lumotlar</h2>
      <div className="op-fg">
        <label className="op-fld">
          <span>To‘liq ism</span>
          <input value={user?.fullName ?? ''} readOnly />
        </label>
        <label className="op-fld">
          <span>Telefon (login)</span>
          <input value={user?.phone ? prettyPhone(user.phone) : ''} readOnly />
        </label>
        <label className="op-fld">
          <span>Rol</span>
          <input value={ROLE_LABELS[role] ?? 'Operator'} readOnly />
        </label>
        <label className="op-fld">
          <span>Jamoa</span>
          <input value="Formo operatorlari" readOnly />
        </label>
      </div>
      <p className="op-sub" style={{ margin: 0 }}>
        Ism va telefon raqamini faqat superadmin o‘zgartira oladi.
      </p>
    </section>
  );
}

function PasswordInput({ value, onChange, autoComplete, label, hint }) {
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
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Yashirish' : 'Ko‘rsatish'}>
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PasswordCard() {
  const { toast } = useOperator();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('Yangi parollar bir xil emas');
    if (form.newPassword === form.currentPassword) return setError('Yangi parol eskisidan farq qilishi kerak');
    setSaving(true);
    try {
      await api('/auth/password', {
        method: 'PATCH',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm(empty);
      toast('Parol yangilandi. Boshqa qurilmalardan chiqarildingiz');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="op-cd op-pd" aria-labelledby="set-password">
      <h2 id="set-password">Parolni o‘zgartirish</h2>
      <form onSubmit={submit}>
        {error && <div className="op-msg">{error}</div>}
        <PasswordInput
          label="Joriy parol"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          autoComplete="current-password"
        />
        <div className="op-fg">
          <PasswordInput
            label="Yangi parol"
            value={form.newPassword}
            onChange={set('newPassword')}
            autoComplete="new-password"
            hint="Kamida 6 belgi"
          />
          <PasswordInput
            label="Yangi parolni tasdiqlang"
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
          />
        </div>
        <div className="op-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="op-sub">Parol o‘zgargach, boshqa qurilmalardagi sessiyalar yopiladi.</span>
          <button type="submit" className="op-b is-p" disabled={saving}>
            {saving ? 'Saqlanmoqda...' : 'Parolni yangilash'}
          </button>
        </div>
      </form>
    </section>
  );
}
