import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Clock, Edit3, Factory, Gauge, Globe, MapPin, Phone, Plus, ShieldCheck, Trash2, User, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Toggle } from './ui';
import EmployeeModal from './EmployeeModal';
import ProfileModal from './ProfileModal';
import { useTailor } from './prefs';
import { LANGS, translate, useT } from './i18n';
import { initialsOf, prettyPhone } from './utils';
import { deleteEmployee, getWorkshopProfile, listEmployees } from './tailorApi';

export default function Profile() {
  const { user } = useAuth();
  const { prefs, savePrefs } = useTailor();
  const t = useT();
  const [notice, setNotice] = useState(null);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesError, setEmployeesError] = useState('');
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeModal, setEmployeeModal] = useState({ open: false, employee: null });
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const name = profile?.fullName || user?.fullName || '';

  const loadEmployees = useCallback(async () => {
    try {
      const data = await listEmployees();
      setEmployees(Array.isArray(data) ? data : data?.items ?? []);
      setEmployeesError('');
    } catch (err) {
      setEmployeesError(err?.message || t('profile.employeesError'));
    } finally {
      setEmployeesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    getWorkshopProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setProfileError(err?.message || t('profile.loadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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

  const onEmployeeSaved = async () => {
    setEmployeeModal({ open: false, employee: null });
    await loadEmployees();
    setNotice({ text: t('profile.employeeSaved'), error: false });
  };

  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await deleteEmployee(deleting.id);
      setDeleting(null);
      await loadEmployees();
      setNotice({ text: t('profile.employeeDeleted'), error: false });
    } catch (err) {
      setDeleting(null);
      setNotice({ text: err?.message || t('profile.employeesError'), error: true });
    } finally {
      setDeleteBusy(false);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
            disabled={!profile}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:bg-teal-300 active:scale-95 disabled:opacity-50"
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
              { label: t('profile.phoneLabel'), value: prettyPhone(profile?.phone || user?.phone || ''), Icon: Phone },
              { label: t('profile.workshopLabel'), value: profile?.workshopName || user?.workshopName || t('profile.workshopMissing'), Icon: Factory },
              { label: t('profile.addressLabel'), value: profile?.address || '—', Icon: MapPin },
              { label: t('profile.capacityLabel'), value: profile?.dailyCapacity != null ? t('profile.capacityUnit', { n: profile.dailyCapacity }) : '—', Icon: Gauge },
              { label: t('profile.shiftLabel'), value: profile?.shiftStart || profile?.shiftEnd ? `${profile.shiftStart || '—'} — ${profile.shiftEnd || '—'}` : '—', Icon: Clock },
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
          {profileError && <p role="alert" className="mt-2 text-xs text-rose-300">{profileError}</p>}
        </section>

        <section className="border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{t('profile.employees')}</h3>
            <button
              type="button"
              onClick={() => setEmployeeModal({ open: true, employee: null })}
              className="flex items-center gap-1.5 rounded-xl bg-teal-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-teal-300"
            >
              <Plus className="h-4 w-4" />
              {t('profile.employeeAdd')}
            </button>
          </div>
          {employeesLoading && <p className="text-xs text-slate-400">{t('api.loading')}</p>}
          {employeesError && <p role="alert" className="text-xs text-rose-300">{employeesError}</p>}
          {!employeesLoading && !employeesError && employees.length === 0 && (
            <p className="text-xs text-slate-400">{t('profile.employeesEmpty')}</p>
          )}
          <ul className="flex flex-col gap-2">
            {employees.map((emp) => (
              <li key={emp.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0e1424] px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-300">
                    {initialsOf(emp.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-white">{emp.fullName}</p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                      <Briefcase className="h-3 w-3" aria-hidden="true" />
                      {emp.role}{emp.phone ? ` · ${prettyPhone(emp.phone)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEmployeeModal({ open: true, employee: emp })}
                    aria-label={t('profile.edit')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(emp)}
                    aria-label={t('profile.employeeDelete')}
                    className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
                  disabled={preferenceSaving}
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
      <ProfileModal open={modalOpen} profile={profile} onClose={() => setModalOpen(false)} onSaved={onProfileSaved} />
      <EmployeeModal
        open={employeeModal.open}
        employee={employeeModal.employee}
        onClose={() => setEmployeeModal({ open: false, employee: null })}
        onSaved={onEmployeeSaved}
      />
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121829] p-6">
            <h3 className="text-base font-black text-white">{t('profile.employeeDelete')}</h3>
            <p className="mt-2 text-xs text-slate-400">{t('profile.employeeDeleteConfirm', { name: deleting.fullName })}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                {t('emp.cancel')}
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={confirmDelete}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {t('profile.employeeDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
