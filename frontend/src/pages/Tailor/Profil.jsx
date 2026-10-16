import { useEffect, useState } from 'react';
import { Clock, Edit3, Factory, Globe, Phone, ShieldCheck, User, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Toggle } from './ui';
import EmployeeModal from './EmployeeModal';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { initialsOf, prettyPhone } from './utils';

const profileKey = (userId) => `formo_tailor_profile_${userId ?? 'current'}`;

function loadProfile(user, language = 'uz') {
  const fallback = {
    id: user?.id ?? null,
    name: user?.fullName ?? '',
    initials: initialsOf(user?.fullName),
    phone: user?.phone ?? '',
    roleKey: 'lead',
    factory: user?.workshopName ?? '',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lang: language,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(user?.id)) || 'null');
    return saved ? { ...fallback, ...saved, id: fallback.id, lang: language } : fallback;
  } catch {
    return fallback;
  }
}

export default function Profile() {
  const { user } = useAuth();
  const { prefs, savePrefs } = useTailor();
  const t = useT();
  const [notice, setNotice] = useState(null);
  const [profile, setProfile] = useState(() => loadProfile(user, prefs.lang));
  const [modalOpen, setModalOpen] = useState(false);
  const name = profile.name || user?.fullName || '';

  useEffect(() => {
    setProfile(loadProfile(user, prefs.lang));
  }, [user, prefs.lang]);

  const saveProfile = (updated) => {
    try {
      localStorage.setItem(profileKey(user?.id), JSON.stringify(updated));
      setProfile(updated);
      if (updated.lang !== prefs.lang) savePrefs({ ...prefs, lang: updated.lang });
      window.dispatchEvent(new CustomEvent('formo:tailor-profile-updated', { detail: updated }));
      setModalOpen(false);
      setNotice({ text: t('profile.savedToast'), error: false });
    } catch {
      setNotice({ text: t('profile.persistError'), error: true });
    }
  };

  const changeLanguage = (lang) => {
    try {
      savePrefs({ ...prefs, lang });
      setProfile((current) => ({ ...current, lang }));
      setNotice({ text: translate(lang, lang === 'ru' ? 'profile.langToastRu' : 'profile.langToast'), error: false });
    } catch {
      setNotice({ text: translate(lang, 'profile.persistError'), error: true });
    }
  };

  const togglePreference = (key) => {
    try {
      savePrefs({
        ...prefs,
        notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] },
      });
      setNotice({ text: t('profile.notifToast'), error: false });
    } catch {
      setNotice({ text: t('profile.persistError'), error: true });
    }
  };

  return (
    <div className="relative mx-auto max-w-4xl space-y-5">
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={`fixed right-6 top-20 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black shadow-2xl ${
            notice.error ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'
          }`}
        >
          <Check className="h-4 w-4 stroke-[3]" />
          {notice.text}
        </div>
      )}

      <Card className="flex flex-col gap-6 border border-white/10 bg-[#121829] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20 text-lg font-black text-teal-400 ring-2 ring-teal-500/40">
              {initialsOf(name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-white">{name || '—'}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${user?.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}>
                  {t(user?.isActive ? 'profile.active' : 'profile.inactive')}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">{t('profile.rolePerson')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:bg-teal-300 active:scale-95"
          >
            <Edit3 className="h-4 w-4" />
            <span>{t('profile.edit')}</span>
          </button>
        </div>

        <section>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('profile.data')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: t('profile.nameLabel'), value: name, Icon: User },
              { label: t('profile.phoneLabel'), value: prettyPhone(profile.phone || user?.phone), Icon: Phone },
              { label: t('profile.workshopLabel'), value: profile.factory || user?.workshopName || t('profile.workshopMissing'), Icon: Factory },
              { label: t('profile.shiftLabel'), value: `${profile.shiftStart} — ${profile.shiftEnd}`, Icon: Clock },
            ].map(({ label, value, Icon }) => (
              <label key={label} className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">{label}</span>
                <span className="relative block">
                  <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    type="text"
                    readOnly
                    value={value}
                    className="w-full rounded-xl border border-white/10 bg-[#0e1424] py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none"
                  />
                </span>
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-400">{t('profile.langLabel')}</span>
              <span className="relative block">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <select
                  value={prefs.lang}
                  onChange={(event) => changeLanguage(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none"
                >
                  {LANGS.map((language) => (
                    <option key={language.value} value={language.value}>{language.label}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{t('profile.accountReadOnly')}</p>
        </section>

        <section className="border-t border-white/10 pt-5">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('profile.notifications')}</h3>
          <div className="flex flex-col gap-2">
            {[
              ['newOrders', 'profile.n.newOrders', 'profile.n.newOrdersHint'],
              ['deadline', 'profile.n.deadline', 'profile.n.deadlineHint'],
              ['summary', 'profile.n.summary', 'profile.n.summaryHint'],
            ].map(([key, labelKey, hintKey]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-xl bg-[#0e1424] px-3.5">
                <div className="py-3">
                  <h4 className="text-xs font-extrabold text-white">{t(labelKey)}</h4>
                  <p className="text-[10px] text-slate-400">{t(hintKey)}</p>
                </div>
                <Toggle
                  checked={prefs.notifications[key]}
                  onChange={() => togglePreference(key)}
                  ariaLabel={t(labelKey)}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('profile.localNotifications')}</p>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-[#0e1d24] p-4 text-teal-200">
          <ShieldCheck className="h-5 w-5 shrink-0 text-teal-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed font-medium">{t('profile.backendNote')}</p>
        </div>
      </Card>
      <EmployeeModal
        open={modalOpen}
        employee={profile}
        title={t('profile.edit')}
        showRole={false}
        onClose={() => setModalOpen(false)}
        onSave={saveProfile}
      />
    </div>
  );
}
