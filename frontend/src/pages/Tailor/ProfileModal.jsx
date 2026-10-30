import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, User, Factory, MapPin, Phone, Clock, Check, Loader2, AlertCircle, Globe } from 'lucide-react';
import { LANGS, useT } from './i18n';
import { useTailor } from './prefs';
import { updateWorkshopProfile } from './tailorApi';
import { cx, formatPhone, initialsOf, phoneForServer } from './utils';

const EXIT_MS = 220;
const ADDRESS_MAX = 200;
const EMPTY = { fullName: '', phone: '', workshopName: '', address: '', shiftStart: '', shiftEnd: '' };
const inputCls =
  'w-full rounded-xl border bg-[#0e1424] pl-10 pr-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10 [color-scheme:dark]';

/** Serverdan "09:00" yoki "09:00:00" kelishi mumkin — <input type="time"> uchun HH:MM */
const toTime = (value) => (value ? String(value).slice(0, 5) : '');

const fromProfile = (profile) => ({
  fullName: profile?.fullName ?? '',
  phone: formatPhone(profile?.phone ?? ''),
  workshopName: profile?.workshopName ?? '',
  address: profile?.address ?? '',
  shiftStart: toTime(profile?.shiftStart),
  shiftEnd: toTime(profile?.shiftEnd),
});

const clean = (value) => value.replace(/\s+/g, ' ').trim();

/**
 * Sex profilini PATCH /workshop/profile orqali tahrirlash.
 * Faqat o'zgargan maydonlar yuboriladi; smena vaqtini tozalash null yuboradi.
 * dailyCapacity yuborilmaydi (faqat Superadmin belgilaydi).
 */
export default function ProfileModal({ open, profile, onClose, onSaved }) {
  const t = useT();
  const { prefs, savePrefs } = useTailor();
  const [lang, setLang] = useState(prefs.lang);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [closing, setClosing] = useState(false);
  const nameRef = useRef(null);
  const closeTimer = useRef(null);

  const initial = useMemo(() => fromProfile(profile), [profile]);

  // Faqat oyna ochilganda to'ldiramiz: til almashganda profil qayta yuklansa, yozilayotgan matn o'chib ketmasin
  useEffect(() => {
    if (!open || !profile) return undefined;
    setForm(fromProfile(profile));
    setLang(prefs.lang);
    setError('');
    setTouched(false);
    setClosing(false);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const changes = useMemo(() => {
    const next = {
      fullName: clean(form.fullName),
      phone: phoneForServer(form.phone),
      workshopName: clean(form.workshopName),
      address: clean(form.address),
      shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd,
    };
    const base = {
      fullName: clean(initial.fullName),
      phone: phoneForServer(initial.phone),
      workshopName: clean(initial.workshopName),
      address: clean(initial.address),
      shiftStart: initial.shiftStart,
      shiftEnd: initial.shiftEnd,
    };
    const diff = {};
    for (const key of Object.keys(next)) {
      if (next[key] === base[key]) continue;
      // Smena vaqtini bo'shatish — serverda null (bo'sh qator HH:MM tekshiruvidan o'tmaydi)
      diff[key] = (key === 'shiftStart' || key === 'shiftEnd') && !next[key] ? null : next[key];
    }
    return diff;
  }, [form, initial]);

  const prefsDirty = lang !== prefs.lang;
  const dirty = Object.keys(changes).length > 0 || prefsDirty;

  const requestClose = useCallback(() => {
    if (saving) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => onClose?.(), EXIT_MS);
  }, [saving, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && requestClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, requestClose]);

  if (!open) return null;

  const nameMissing = !clean(form.fullName);
  const workshopMissing = !clean(form.workshopName);
  // Telefon login raqami: bo'sh bo'lmasin, kamida 9 raqam (+998 dan keyin) yoki chet el raqami uchun 7+
  const phoneDigits = form.phone.replace(/\D/g, '');
  const phoneInvalid = phoneDigits.length < (phoneDigits.startsWith('998') ? 12 : 7);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setTouched(true);
    if (nameMissing || workshopMissing || phoneInvalid) {
      (nameMissing ? nameRef.current : document.getElementById(phoneInvalid && !workshopMissing ? 'pf-phone' : 'pf-workshop'))?.focus();
      return;
    }
    // O'zgarish yo'q — serverga bormaymiz
    if (!dirty) {
      requestClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = Object.keys(changes).length ? await updateWorkshopProfile(changes) : profile;
      // Til brauzerda saqlanadi — profil bilan birga bir tugma bilan
      if (prefsDirty) await savePrefs({ ...prefs, lang });
      await onSaved?.(saved);
    } catch (err) {
      setError(/phone/i.test(err?.message || '') && /should not exist|not allowed/i.test(err?.message || '')
        ? t('profile.phoneUnsupported')
        : err?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const update = (key) => (e) => {
    const value = key === 'phone' ? formatPhone(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const field = (id, label, Icon, key, { delay = 0, missing = false, inputRef, hint, errorText, ...extra } = {}) => {
    const invalid = touched && missing;
    return (
      <div className="tl-pop" style={{ '--tl-delay': `${delay}ms` }}>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </label>
          {hint}
        </div>
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id={id}
            ref={inputRef}
            value={form[key]}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-err` : undefined}
            autoComplete="off"
            onChange={update(key)}
            className={cx(inputCls, invalid ? 'border-rose-400/70' : 'border-white/10')}
            {...extra}
          />
        </div>
        {invalid && (
          <p id={`${id}-err`} className="mt-1 text-[11px] font-semibold text-rose-300">
            {errorText ?? t('profile.required')}
          </p>
        )}
      </div>
    );
  };

  const clearBtn = (key) =>
    form[key] ? (
      <button
        type="button"
        onClick={() => setForm((prev) => ({ ...prev, [key]: '' }))}
        className="text-[10px] font-bold text-slate-500 transition hover:text-teal-300"
      >
        {t('profile.shiftClear')}
      </button>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      style={{ animation: `${closing ? 'tl-fade-out' : 'tl-fade'} ${EXIT_MS}ms ease-out both` }}
      // O'zgarish bo'lsa, tasodifan fonni bosib yozganni yo'qotib qo'ymaslik uchun yopilmaydi
      onMouseDown={(e) => e.target === e.currentTarget && !dirty && requestClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-title"
        className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[#101627] text-slate-200 shadow-2xl"
        style={{ animation: `${closing ? 'tl-slide-out' : 'tl-slide-in'} ${EXIT_MS + 100}ms cubic-bezier(0.22, 1, 0.36, 1) both` }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-base font-black text-slate-950 shadow-glow">
              {clean(form.fullName) ? initialsOf(clean(form.fullName)) : <User className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h2 id="pf-title" className="truncate text-lg font-black text-white">{t('profile.edit')}</h2>
              <p className="truncate text-xs text-slate-400">{clean(form.workshopName) || t('profile.data')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('modal.close')}
            className="rounded-xl p-1.5 text-slate-400 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="profileForm" onSubmit={handleSubmit} noValidate className="relative min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
          {field('pf-name', t('profile.nameLabel'), User, 'fullName', {
            type: 'text', maxLength: 120, delay: 60, inputRef: nameRef, missing: nameMissing,
          })}
          {field('pf-phone', t('profile.phoneLabel'), Phone, 'phone', {
            type: 'tel', inputMode: 'tel', maxLength: 30, delay: 90, missing: phoneInvalid, errorText: t('profile.phoneInvalid'), placeholder: '+998 90 123 45 67',
          })}
          {field('pf-workshop', t('profile.workshopLabel'), Factory, 'workshopName', {
            type: 'text', maxLength: 120, delay: 120, missing: workshopMissing,
          })}
          {field('pf-address', t('profile.addressLabel'), MapPin, 'address', {
            type: 'text',
            maxLength: ADDRESS_MAX,
            delay: 180,
            hint: (
              <span className={cx('text-[10px] font-semibold tabular-nums', form.address.length > ADDRESS_MAX - 20 ? 'text-amber-300' : 'text-slate-500')}>
                {form.address.length}/{ADDRESS_MAX}
              </span>
            ),
          })}
          <div className="grid grid-cols-2 gap-3">
            {field('pf-start', t('emp.shiftStart'), Clock, 'shiftStart', { type: 'time', delay: 240, hint: clearBtn('shiftStart') })}
            {field('pf-end', t('emp.shiftEnd'), Clock, 'shiftEnd', { type: 'time', delay: 280, hint: clearBtn('shiftEnd') })}
          </div>
          <div className="tl-pop border-t border-white/10 pt-3.5" style={{ '--tl-delay': '320ms' }} role="group" aria-label={t('profile.langLabel')}>
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {t('profile.langLabel')}
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#0e1424] p-1">
              {LANGS.map((language) => (
                <button
                  key={language.value}
                  type="button"
                  aria-pressed={lang === language.value}
                  onClick={() => setLang(language.value)}
                  className={cx(
                    'rounded-lg py-1.5 text-xs font-extrabold transition',
                    lang === language.value ? 'bg-teal-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  )}
                >
                  {language.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p role="alert" className="tl-pop flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </form>

        <div className="relative flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d1322]/80 px-5 py-3">
          <span className={cx('flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 transition-opacity', dirty && !saving ? 'opacity-100' : 'opacity-0')}>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />
            {t('profile.unsaved')}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              {t('emp.cancel')}
            </button>
            <button
              type="submit"
              form="profileForm"
              disabled={saving || !dirty}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[3]" />}
              <span>{saving ? t('emp.saving') : t('emp.save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
