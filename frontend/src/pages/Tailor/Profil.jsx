import { useEffect, useId, useRef, useState } from 'react';
import {
  Camera, Check, Copy, Edit3, Factory, Gauge, Loader2, Lock, LogOut, MapPin, Moon, Phone, Sun, Trash2, User, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AvatarFace, Badge, Card, Toggle } from './ui';
import EmployeesPanel from './EmployeesPanel';
import { TAILOR_EMPLOYEES_ENABLED } from './tailorConstants';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { cx, prettyPhone } from './utils';
import { getWorkshopProfile, removeAvatar, setAvatar, updateWorkshopProfile } from './tailorApi';

// Server cheklovi bilan bir xil (POST /auth/me/avatar)
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const NOTIFICATIONS = [
  ['newOrders', 'profile.n.newOrders', 'profile.n.newOrdersHint'],
  ['deadline', 'profile.n.deadline', 'profile.n.deadlineHint'],
];

// Mavzu kartasidagi kichik namuna: [fon, karta, yozuv] — mavzuga bog'liq emas, doim shu ranglarda
const THEMES = [
  ['light', Sun, 'profile.themeLight', ['#f3f4f6', '#ffffff', '#111827']],
  ['dark', Moon, 'profile.themeDark', ['#0b0f19', '#121829', '#e2e8f0']],
];

const LANG_TOAST = { ru: 'profile.langToastRu', 'uz-Cyrl': 'profile.langToastCyrl' };

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

function SectionHead({ title, hint }) {
  return (
    <div className="border-b border-white/10 px-5 py-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const ROW_LABEL = 'w-28 shrink-0 text-sm text-slate-400 sm:w-40';
const ICON_BTN = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-50';

/** Joyida tahrirlanadigan qator: bosilganda maydon ochiladi, Enter — saqlash, Esc — bekor qilish */
function EditableRow({ icon: Icon, label, value, required = false, maxLength = 120, disabled = false, onSave }) {
  const t = useT();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = window.setTimeout(() => setFlash(false), 1800);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const start = () => {
    setDraft(value);
    setError('');
    setEditing(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = clean(draft);
    if (required && !next) return setError(t('profile.required'));
    // O'zgarish yo'q — serverga bormaymiz
    if (next === clean(value)) return setEditing(false);
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
      setFlash(true);
    } catch (err) {
      setError(err?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        title={t('profile.clickToEdit')}
        className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/5 disabled:cursor-wait"
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <span className={ROW_LABEL}>{label}</span>
        <span className={cx('min-w-0 flex-1 break-words text-sm font-semibold', value ? 'text-white' : 'text-slate-500')}>
          {value || t('profile.empty')}
        </span>
        {flash
          ? <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label={t('profile.fieldSaved')} />
          : <Edit3 className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-teal-300" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="tl-pop flex items-start gap-3 bg-white/5 px-5 py-3.5">
      <Icon className="mt-8 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-xs font-semibold text-slate-400">{label}</label>
        <input
          id={id}
          autoFocus
          value={draft}
          maxLength={maxLength}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && !saving && setEditing(false)}
          className="mt-1 w-full rounded-xl border border-teal-400 bg-[#0e1424] px-3 py-2 text-sm font-semibold text-white outline-none [color-scheme:dark]"
        />
        {error
          ? <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">{error}</p>
          : <p className="mt-1.5 text-[11px] text-slate-500">{t('profile.editHint')}</p>}
      </div>
      <button type="submit" disabled={saving} aria-label={t('emp.save')} title={t('emp.save')} className={cx(ICON_BTN, 'mt-6 bg-teal-400 text-slate-950 hover:bg-teal-300')}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => setEditing(false)}
        aria-label={t('emp.cancel')}
        title={t('emp.cancel')}
        className={cx(ICON_BTN, 'mt-6 border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

/** O'zgartirib bo'lmaydigan qator (telefon, kunlik quvvat): qulf belgisi, kerak bo'lsa nusxa olish */
function LockedRow({ icon: Icon, label, value, hint, copyable = false }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {});
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className={ROW_LABEL}>{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold text-white">{value || '—'}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}
      </span>
      {copyable && value ? (
        <button
          type="button"
          onClick={copy}
          title={t(copied ? 'profile.copied' : 'profile.copy')}
          aria-label={`${t('profile.copy')}: ${label}`}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </button>
      ) : (
        <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { prefs, savePrefs, askLogout } = useTailor();
  const t = useT();
  const [notice, setNotice] = useState(null);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  const name = profile?.fullName || user?.fullName || '';
  const workshop = profile?.workshopName || user?.workshopName || '';
  const address = profile?.address ?? '';
  const phone = prettyPhone(profile?.phone || user?.phone || '');
  // Profil javobida rasm maydoni bo'lmasa (eski server) — kirishdagi user ma'lumotidan
  const avatarUrl = profile && 'avatarUrl' in profile ? profile.avatarUrl : user?.avatarUrl;

  useEffect(() => {
    let cancelled = false;
    getWorkshopProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setProfileError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setProfileError(err?.message || t('profile.loadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Profil o'zgarishi: sahifa va yon menyu (ism, sex, rasm) birga yangilanadi
  const applyProfile = (patch) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    window.dispatchEvent(
      new CustomEvent('formo:tailor-profile-updated', {
        detail: { ...next, name: next.fullName, factory: next.workshopName },
      })
    );
  };

  // PATCH /workshop/profile — faqat o'zgargan bitta maydon yuboriladi
  const saveField = (key) => async (value) => {
    applyProfile(await updateWorkshopProfile({ [key]: value }));
    setNotice({ text: t('profile.savedToast'), error: false });
  };

  // Rasm tanlanishi bilan yuklanadi; xato bo'lsa bildirishnomada ko'rinadi
  const changePhoto = async (request) => {
    setPhotoBusy(true);
    try {
      const updated = await request();
      applyProfile({ avatarUrl: updated?.avatarUrl ?? null });
    } catch (err) {
      setNotice({ text: err?.message || t('profile.saveError'), error: true });
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    // Xuddi shu faylni qayta tanlaganda ham onChange ishlashi uchun
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) setNotice({ text: t('brak.photoTypeError'), error: true });
    else if (file.size > PHOTO_MAX_BYTES) setNotice({ text: t('profile.photoSizeError'), error: true });
    else changePhoto(() => setAvatar(file));
  };

  const changeLanguage = async (lang) => {
    try {
      await savePrefs({ ...prefs, lang });
      setNotice({ text: translate(lang, LANG_TOAST[lang] ?? 'profile.langToast'), error: false });
    } catch {
      setNotice({ text: translate(lang, 'profile.persistError'), error: true });
    }
  };

  const changeTheme = async (theme) => {
    try {
      await savePrefs({ ...prefs, theme });
    } catch {
      setNotice({ text: t('profile.persistError'), error: true });
    }
  };

  const togglePreference = async (key) => {
    if (preferenceSaving) return;
    setPreferenceSaving(true);
    try {
      await savePrefs({
        ...prefs,
        notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] },
      });
      setNotice({ text: t('profile.notifToast'), error: false });
    } catch {
      setNotice({ text: t('profile.preferenceError'), error: true });
    } finally {
      setPreferenceSaving(false);
    }
  };

  // Profil to'liqligi: ism, sex, manzil va rasm
  const filled = [name, workshop, address, avatarUrl].filter(Boolean).length;
  const completeness = Math.round((filled / 4) * 100);
  const photoLocked = !profile || photoBusy;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={cx(
            'tl-drop fixed right-6 top-20 z-[60] flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-2xl',
            notice.error ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'
          )}
        >
          {!notice.error && <Check className="h-4 w-4 stroke-[3]" />}
          <span>{notice.text}</span>
        </div>
      )}

      {profileError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {profileError}
        </p>
      )}

      {/* Kim va qaysi sex: rasm ustiga bosib almashtiriladi */}
      <Card className="tl-pop overflow-hidden">
        <div aria-hidden="true" className="h-24 bg-teal-400/10 sm:h-28" />
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-6 sm:px-6">
          <div className="relative -mt-14 shrink-0">
            <button
              type="button"
              disabled={photoLocked}
              onClick={() => fileRef.current?.click()}
              aria-label={t('profile.changePhoto')}
              className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#0e1424] text-3xl font-extrabold text-teal-300 ring-4 ring-[#121829] transition hover:scale-[1.03] disabled:cursor-wait"
            >
              <AvatarFace url={avatarUrl} name={name} />
              {/* Rasm ustidagi qora parda va oq yozuv — mavzudan qat'i nazar */}
              <span
                className={cx(
                  'absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center text-[11px] font-bold leading-tight transition-opacity',
                  photoBusy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                )}
                style={{ background: 'rgba(2, 6, 23, 0.65)', color: '#fff' }}
              >
                {photoBusy ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Camera className="h-5 w-5" aria-hidden="true" />}
                {!photoBusy && t('profile.changePhoto')}
              </span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={photoLocked}
                onClick={() => changePhoto(removeAvatar)}
                title={t('brak.photoRemove')}
                aria-label={t('brak.photoRemove')}
                className="absolute -right-1 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0e1424] text-rose-300 ring-2 ring-[#121829] transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} onChange={pickPhoto} className="hidden" aria-label={t('emp.upload')} />
          </div>

          <div className="min-w-0 flex-1 basis-56">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="break-words text-2xl font-extrabold leading-tight text-white">{name || '—'}</h2>
              <Badge variant={user?.isActive ? 'emerald' : 'red'}>{t(user?.isActive ? 'profile.active' : 'profile.inactive')}</Badge>
            </div>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-400">
              <Factory className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{workshop || t('profile.workshopMissing')}</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{t('profile.photoHint')}</p>
          </div>

          <div className="w-full sm:w-60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>{t('profile.complete')}</span>
              <span className="tabular-nums text-white">{completeness}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${t('profile.complete')}: ${completeness}%`}>
              <div className="h-full rounded-full bg-teal-400 transition-all duration-700 ease-out" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{t(completeness === 100 ? 'profile.completeDone' : 'profile.completeHint')}</p>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card className="tl-pop overflow-hidden">
            <SectionHead title={t('profile.data')} hint={t('profile.clickToEdit')} />
            <div className="divide-y divide-white/5">
              <EditableRow icon={User} label={t('profile.nameLabel')} value={name} required disabled={!profile} onSave={saveField('fullName')} />
              <EditableRow icon={Factory} label={t('profile.workshopLabel')} value={workshop} required disabled={!profile} onSave={saveField('workshopName')} />
              <EditableRow icon={MapPin} label={t('profile.addressLabel')} value={address} maxLength={200} disabled={!profile} onSave={saveField('address')} />
              <LockedRow icon={Phone} label={t('profile.phoneLabel')} value={phone} hint={t('profile.accountReadOnly')} copyable />
              <LockedRow
                icon={Gauge}
                label={t('profile.capacityLabel')}
                value={profile?.dailyCapacity ? t('profile.capacityUnit', { n: profile.dailyCapacity }) : ''}
                hint={t('profile.capacityHint')}
              />
            </div>
          </Card>

          <Card className="tl-pop">
            <SectionHead title={t('profile.notifications')} hint={t('profile.localNotifications')} />
            <div className="divide-y divide-white/5 px-5">
              {NOTIFICATIONS.map(([key, labelKey, hintKey]) => (
                <Toggle
                  key={key}
                  label={t(labelKey)}
                  description={t(hintKey)}
                  checked={prefs.notifications[key]}
                  onChange={() => togglePreference(key)}
                  disabled={preferenceSaving}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card className="tl-pop">
            <SectionHead title={t('profile.appearance')} />
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">{t('profile.themeLabel')}</p>
                <div role="group" aria-label={t('profile.themeLabel')} className="grid grid-cols-2 gap-3">
                  {THEMES.map(([value, Icon, labelKey, [bg, surface, ink]]) => {
                    const active = prefs.theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => !active && changeTheme(value)}
                        className={cx(
                          'rounded-xl border p-2 text-left transition active:scale-95',
                          active ? 'border-teal-400 ring-2 ring-teal-400/30' : 'border-white/10 hover:border-white/20'
                        )}
                      >
                        <span aria-hidden="true" className="block rounded-lg p-2.5" style={{ background: bg }}>
                          <span className="block h-1.5 w-10 rounded-full" style={{ background: ink }} />
                          <span className="mt-2 block h-7 rounded-md" style={{ background: surface, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)' }} />
                        </span>
                        <span className="mt-2 flex items-center gap-2 px-1 text-xs font-bold text-white">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                          {active && <Check className="h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-300">{t('profile.langLabel')}</p>
                <div role="group" aria-label={t('profile.langLabel')} className="grid gap-2">
                  {LANGS.map((language) => {
                    const active = prefs.lang === language.value;
                    return (
                      <button
                        key={language.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => !active && changeLanguage(language.value)}
                        className={cx(
                          'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition active:scale-[0.98]',
                          active ? 'border-teal-400 bg-teal-400/10 text-white' : 'border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
                        )}
                      >
                        <span className={cx('flex h-8 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black', active ? 'bg-teal-400 text-slate-950' : 'bg-white/10')}>
                          {language.shortLabel}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{language.label}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Chiqish: tasdiq oynasi orqali */}
          <Card className="tl-pop">
            <SectionHead title={t('logout.title')} />
            <div className="p-5">
              <p className="text-sm leading-6 text-slate-400">{t('logout.hint')}</p>
              <button
                type="button"
                onClick={askLogout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {TAILOR_EMPLOYEES_ENABLED && <EmployeesPanel />}
    </div>
  );
}
