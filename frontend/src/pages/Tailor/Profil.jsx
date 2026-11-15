import { useEffect, useState } from 'react';
import { Check, Edit3, Factory, LogOut, MapPin, Moon, Phone, Sun, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AvatarFace, Badge, Card, Toggle } from './ui';
import EmployeesPanel from './EmployeesPanel';
import ProfileEditDrawer, { PHOTO_TYPES } from './ProfileEditDrawer';
import { TAILOR_EMPLOYEES_ENABLED } from './tailorConstants';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { cx, prettyPhone } from './utils';
import { getWorkshopProfile, removeAvatar, setAvatar, updateWorkshopProfile } from './tailorApi';

// Server cheklovi bilan bir xil (POST /auth/me/avatar)
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

function SectionHead({ title, hint }) {
  return (
    <div className="border-b border-white/10 px-5 py-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Profil ma'lumoti qatori: belgi — nom — qiymat. Tahrirlash alohida panelda (ProfileEditDrawer) */
function InfoRow({ icon: Icon, label, value }) {
  const t = useT();
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="w-28 shrink-0 text-sm text-slate-400 sm:w-40">{label}</span>
      <span className={cx('min-w-0 flex-1 break-words text-sm font-semibold', value ? 'text-white' : 'text-slate-500')}>{value || t('profile.empty')}</span>
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
  const [editing, setEditing] = useState(false);

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

  // Xato tahrirlash panelida ko'rsatiladi (panel ochiq qoladi)
  const saveProfile = async (patch) => {
    applyProfile(await updateWorkshopProfile(patch));
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

  const pickPhoto = (file) => {
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

      {/* Kim va qaysi sex; tahrirlash o'ng tomondagi panelda ochiladi */}
      <Card className="tl-pop flex flex-wrap items-center gap-x-5 gap-y-4 p-5 sm:p-6">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0e1424] text-2xl font-extrabold text-teal-300 ring-1 ring-inset ring-white/10">
          <AvatarFace url={avatarUrl} name={name} />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="break-words text-2xl font-extrabold leading-tight text-white">{name || '—'}</h2>
            <Badge variant={user?.isActive ? 'emerald' : 'red'}>{t(user?.isActive ? 'profile.active' : 'profile.inactive')}</Badge>
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-400">
            <Factory className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{workshop || t('profile.workshopMissing')}</span>
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
          <button
            type="button"
            disabled={!profile}
            onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-teal-300 active:scale-95 disabled:cursor-wait disabled:opacity-50"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            {t('profile.edit')}
          </button>
          {/* Chiqish: tasdiq oynasi orqali */}
          <button
            type="button"
            onClick={askLogout}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20 active:scale-95"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card className="tl-pop overflow-hidden">
            <SectionHead title={t('profile.data')} />
            <div className="divide-y divide-white/5">
              <InfoRow icon={User} label={t('profile.nameLabel')} value={name} />
              <InfoRow icon={Factory} label={t('profile.workshopLabel')} value={workshop} />
              <InfoRow icon={MapPin} label={t('profile.addressLabel')} value={address} />
              <InfoRow icon={Phone} label={t('profile.phoneLabel')} value={phone} />
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

        </div>
      </div>

      {TAILOR_EMPLOYEES_ENABLED && <EmployeesPanel />}

      {/* Kartalardan tashqarida: .tl-pop animatsiyasi ichidagi fixed panelni siljitib yubormasin */}
      {editing && (
        <ProfileEditDrawer
          values={{ fullName: name, workshopName: workshop, address }}
          phone={phone}
          avatarUrl={avatarUrl}
          photoBusy={photoBusy}
          onPickPhoto={pickPhoto}
          onRemovePhoto={() => changePhoto(removeAvatar)}
          onSave={saveProfile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
