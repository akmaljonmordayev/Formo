import { useEffect, useState } from 'react';
import {
  BellRing, Check, Clock, Edit3, Factory, Gauge, Globe, MapPin, Phone, User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Toggle } from './ui';
import ProfileModal from './ProfileModal';
import EmployeesPanel from './EmployeesPanel';
import { TAILOR_EMPLOYEES_ENABLED } from './tailorConstants';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { cx, initialsOf, prettyPhone } from './utils';
import { getWorkshopProfile } from './tailorApi';

const NOTIFICATIONS = [
  ['newOrders', 'profile.n.newOrders', 'profile.n.newOrdersHint'],
  ['deadline', 'profile.n.deadline', 'profile.n.deadlineHint'],
  ['summary', 'profile.n.summary', 'profile.n.summaryHint'],
];

function Panel({ icon: Icon, title, action, delay = 0, className, children }) {
  return (
    <section
      className={cx('tl-pop rounded-3xl border border-white/10 bg-[#121829]/80 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl', className)}
      style={{ '--tl-delay': `${delay}ms` }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          {Icon && <Icon className="h-4 w-4 text-teal-400" aria-hidden="true" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#0e1424] px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-white">{value || '—'}</p>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, delay }) {
  return (
    <div
      className="tl-pop flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-teal-400/30"
      style={{ '--tl-delay': `${delay}ms` }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/25 to-indigo-500/20 text-teal-300 ring-1 ring-inset ring-teal-400/25">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-lg font-black leading-tight text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { prefs, savePrefs } = useTailor();
  const t = useT();
  const [notice, setNotice] = useState(null);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const name = profile?.fullName || user?.fullName || '';
  const workshop = profile?.workshopName || user?.workshopName || '';
  const phone = prettyPhone(profile?.phone || user?.phone || '');
  const shift = profile?.shiftStart || profile?.shiftEnd ? `${profile.shiftStart || '—'} — ${profile.shiftEnd || '—'}` : '—';
  const capacity = profile?.dailyCapacity != null ? t('profile.capacityUnit', { n: profile.dailyCapacity }) : '—';

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

  const onProfileSaved = (saved) => {
    setProfile(saved);
    window.dispatchEvent(
      new CustomEvent('formo:tailor-profile-updated', {
        detail: { ...saved, name: saved.fullName, factory: saved.workshopName },
      })
    );
    setModalOpen(false);
    setNotice({ text: t('profile.savedToast'), error: false });
  };

  const changeLanguage = async (lang) => {
    try {
      await savePrefs({ ...prefs, lang });
      setNotice({ text: translate(lang, lang === 'ru' ? 'profile.langToastRu' : 'profile.langToast'), error: false });
    } catch {
      setNotice({ text: translate(lang, 'profile.persistError'), error: true });
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

  const langIndex = Math.max(0, LANGS.findIndex((l) => l.value === prefs.lang));

  return (
    <div className="relative mx-auto max-w-5xl space-y-5">
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={cx(
            'tl-drop fixed right-6 top-20 z-[60] flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black shadow-2xl',
            notice.error ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'
          )}
        >
          <Check className="h-4 w-4 stroke-[3]" />
          {notice.text}
        </div>
      )}

      {/* Hero */}
      <section className="tl-pop relative overflow-hidden rounded-3xl border border-white/10 bg-[#121829]/80 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        <div aria-hidden="true" className="h-24 bg-gradient-to-r from-teal-500/40 via-emerald-500/20 to-indigo-500/30 sm:h-28">
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex min-w-0 items-end gap-4 sm:-mt-12">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl font-black text-slate-950 shadow-glow ring-4 ring-[#121829] sm:h-24 sm:w-24 sm:text-3xl">
              {initialsOf(name)}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-white sm:text-2xl">{name || '—'}</h2>
                <span
                  className={cx(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                    user?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                  )}
                >
                  {t(user?.isActive ? 'profile.active' : 'profile.inactive')}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                {workshop || t('profile.workshopMissing')}
                {phone ? ` · ${phone}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!profile}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Edit3 className="h-4 w-4" />
            <span>{t('profile.edit')}</span>
          </button>
        </div>
      </section>

      {profileError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {profileError}
        </p>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile icon={Gauge} label={t('profile.capacityLabel')} value={capacity} delay={60} />
        <StatTile icon={Clock} label={t('profile.shiftLabel')} value={shift} delay={110} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Ma'lumotlar */}
        <Panel icon={User} title={t('profile.data')} delay={120}>
          <div className="grid gap-2.5">
            <InfoRow icon={User} label={t('profile.nameLabel')} value={name} />
            <InfoRow icon={Phone} label={t('profile.phoneLabel')} value={phone} />
            <InfoRow icon={Factory} label={t('profile.workshopLabel')} value={workshop || t('profile.workshopMissing')} />
            <InfoRow icon={MapPin} label={t('profile.addressLabel')} value={profile?.address} />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">{t('profile.accountReadOnly')}</p>
        </Panel>

        {/* Sozlamalar */}
        <Panel icon={BellRing} title={t('profile.notifications')} delay={170}>
          <div role="group" aria-label={t('profile.langLabel')}>
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {t('profile.langLabel')}
            </span>
            <div
              className="relative grid rounded-xl border border-white/10 bg-[#0e1424] p-1"
              style={{ gridTemplateColumns: `repeat(${LANGS.length}, minmax(0, 1fr))` }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 shadow-glow transition-transform duration-300 ease-out"
                style={{ width: `calc((100% - 0.5rem) / ${LANGS.length})`, transform: `translateX(${langIndex * 100}%)` }}
              />
              {LANGS.map((language) => {
                const active = language.value === prefs.lang;
                return (
                  <button
                    key={language.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => !active && changeLanguage(language.value)}
                    className={cx(
                      'relative z-10 rounded-lg py-2 text-xs font-extrabold transition-colors duration-300',
                      active ? 'text-slate-950' : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {language.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {NOTIFICATIONS.map(([key, labelKey, hintKey]) => (
              <div key={key} className="rounded-2xl bg-[#0e1424] px-3.5">
                <Toggle
                  label={t(labelKey)}
                  description={t(hintKey)}
                  checked={prefs.notifications[key]}
                  onChange={() => togglePreference(key)}
                  disabled={preferenceSaving}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">{t('profile.localNotifications')}</p>
        </Panel>
      </div>
      {TAILOR_EMPLOYEES_ENABLED && <EmployeesPanel />}
      <ProfileModal open={modalOpen} profile={profile} onClose={() => setModalOpen(false)} onSaved={onProfileSaved} />
    </div>
  );
}
