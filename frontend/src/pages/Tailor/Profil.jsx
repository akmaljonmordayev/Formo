import { useEffect, useState } from 'react';
import { Camera, Check, Copy, Edit3, Factory, Gauge, LogOut, MapPin, Moon, Phone, Sun, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AvatarFace, Badge, Card, Toggle } from './ui';
import ProfileModal from './ProfileModal';
import EmployeesPanel from './EmployeesPanel';
import { TAILOR_EMPLOYEES_ENABLED } from './tailorConstants';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { cx, prettyPhone } from './utils';
import { getWorkshopProfile } from './tailorApi';

const NOTIFICATIONS = [
  ['newOrders', 'profile.n.newOrders', 'profile.n.newOrdersHint'],
  ['deadline', 'profile.n.deadline', 'profile.n.deadlineHint'],
];

const THEMES = [
  ['light', Sun, 'profile.themeLight'],
  ['dark', Moon, 'profile.themeDark'],
];

function SectionHead({ title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {action}
    </div>
  );
}

/** Tanlov tugmalari qatori (mavzu, til): bittasi tanlangan */
function Segmented({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-300">{label}</p>
      <div role="group" aria-label={label} className="flex gap-1 rounded-xl border border-white/10 bg-[#0e1424] p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => !active && onChange(option.value)}
              className={cx(
                'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition',
                active ? 'bg-teal-400 text-slate-950' : 'text-slate-400 hover:text-white'
              )}
            >
              {option.icon && <option.icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
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
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const name = profile?.fullName || user?.fullName || '';
  const workshop = profile?.workshopName || user?.workshopName || '';
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

  useEffect(() => {
    if (!copiedKey) return undefined;
    const timer = window.setTimeout(() => setCopiedKey(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

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

  const onProfileSaved = (saved) => {
    applyProfile(saved);
    setModalOpen(false);
    setNotice({ text: t('profile.savedToast'), error: false });
  };

  const changeLanguage = async (lang) => {
    try {
      await savePrefs({ ...prefs, lang });
      setNotice({ text: translate(lang, lang === 'ru' ? 'profile.langToastRu' : lang === 'uz-Cyrl' ? 'profile.langToastCyrl' : 'profile.langToast'), error: false });
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

  const copy = (key, value) => {
    navigator.clipboard?.writeText(value).then(() => setCopiedKey(key)).catch(() => {});
  };

  // [kalit, belgi, yorliq, qiymat, nusxalash mumkinmi]
  const rows = [
    ['name', User, 'profile.nameLabel', name, true],
    ['phone', Phone, 'profile.phoneLabel', phone, true],
    ['workshop', Factory, 'profile.workshopLabel', workshop, true],
    ['address', MapPin, 'profile.addressLabel', profile?.address ?? '', true],
    ['capacity', Gauge, 'profile.capacityLabel', profile?.dailyCapacity ? t('profile.capacityUnit', { n: profile.dailyCapacity }) : '', false],
  ];

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
          <Check className="h-4 w-4 stroke-[3]" />
          {notice.text}
        </div>
      )}

      {profileError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {profileError}
        </p>
      )}

      {/* Kim va qaysi sex */}
      <Card className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <span className="relative shrink-0">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-teal-400/15 text-2xl font-extrabold text-teal-300 ring-1 ring-inset ring-teal-400/40">
            <AvatarFace url={avatarUrl} name={name} />
          </span>
          <button
            type="button"
            disabled={!profile}
            onClick={() => setModalOpen(true)}
            title={t('emp.upload')}
            aria-label={t('emp.upload')}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0e1424] text-slate-300 ring-2 ring-[#121829] transition hover:text-white disabled:opacity-50"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="break-words text-2xl font-extrabold leading-tight text-white">{name || '—'}</h2>
            <Badge variant={user?.isActive ? 'emerald' : 'red'}>{t(user?.isActive ? 'profile.active' : 'profile.inactive')}</Badge>
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-400">
            <Factory className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{workshop || t('profile.workshopMissing')}</span>
          </p>
        </div>
        <button
          type="button"
          disabled={!profile}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          {t('profile.edit')}
        </button>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card>
            <SectionHead title={t('profile.data')} />
            <dl className="divide-y divide-white/5">
              {rows.map(([key, Icon, labelKey, value, copyable]) => (
                <div key={key} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <dt className="w-32 shrink-0 text-sm text-slate-400 sm:w-40">{t(labelKey)}</dt>
                  <dd className="min-w-0 flex-1 break-words text-sm font-semibold text-white">{value || '—'}</dd>
                  {copyable && value && (
                    <button
                      type="button"
                      onClick={() => copy(key, value)}
                      title={t(copiedKey === key ? 'profile.copied' : 'profile.copy')}
                      aria-label={`${t('profile.copy')}: ${t(labelKey)}`}
                      className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
                    >
                      {copiedKey === key
                        ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        : <Copy className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  )}
                </div>
              ))}
            </dl>
            <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">{t('profile.accountReadOnly')}</p>
          </Card>

          <Card>
            <SectionHead title={t('profile.notifications')} />
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
            <p className="border-t border-white/10 px-5 py-3 text-xs leading-5 text-slate-500">{t('profile.localNotifications')}</p>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <SectionHead title={t('profile.appearance')} />
            <div className="space-y-5 p-5">
              <Segmented
                label={t('profile.themeLabel')}
                value={prefs.theme}
                onChange={changeTheme}
                options={THEMES.map(([value, icon, labelKey]) => ({ value, icon, label: t(labelKey) }))}
              />
              <Segmented
                label={t('profile.langLabel')}
                value={prefs.lang}
                onChange={changeLanguage}
                options={LANGS.map((language) => ({ value: language.value, label: language.label }))}
              />
            </div>
          </Card>

          {/* Chiqish: tasdiq oynasi orqali */}
          <Card>
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
      <ProfileModal
        open={modalOpen}
        profile={profile}
        avatarUrl={avatarUrl}
        onAvatarChange={(url) => applyProfile({ avatarUrl: url })}
        onClose={() => setModalOpen(false)}
        onSaved={onProfileSaved}
      />
    </div>
  );
}
