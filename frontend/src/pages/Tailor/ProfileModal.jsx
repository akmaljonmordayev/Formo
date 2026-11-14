import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, User, Factory, MapPin, Phone, Check, Loader2, AlertCircle, Globe, Lock, Undo2, Camera, Trash2 } from 'lucide-react';
import { LANGS, useT } from './i18n';
import { useTailor } from './prefs';
import { removeAvatar, setAvatar, updateWorkshopProfile } from './tailorApi';
import { AvatarFace } from './ui';
import { cx, formatPhone } from './utils';

const EXIT_MS = 220;
// Server cheklovi bilan bir xil (POST /auth/me/avatar)
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const ADDRESS_MAX = 200;
const EMPTY = { fullName: '', phone: '', workshopName: '', address: '' };
const inputCls =
  'block w-full resize-none bg-transparent p-0 text-sm font-semibold text-white outline-none placeholder:text-slate-600 [color-scheme:dark]';

const fromProfile = (profile) => ({
  fullName: profile?.fullName ?? '',
  phone: formatPhone(profile?.phone ?? ''),
  workshopName: profile?.workshopName ?? '',
  address: profile?.address ?? '',
});

const clean = (value) => value.replace(/\s+/g, ' ').trim();

function SectionTitle({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      <Icon className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
    </p>
  );
}

/**
 * Sex profilini PATCH /workshop/profile orqali tahrirlash.
 * Faqat o'zgargan maydonlar yuboriladi.
 * dailyCapacity yuborilmaydi (faqat Superadmin belgilaydi).
 * Profil rasmi alohida: tanlanishi bilan yuklanadi (Saqlash tugmasini kutmaydi).
 */
export default function ProfileModal({ open, profile, avatarUrl, onAvatarChange, onClose, onSaved }) {
  const t = useT();
  const { prefs, savePrefs } = useTailor();
  const [lang, setLang] = useState(prefs.lang);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [closing, setClosing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);
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
      workshopName: clean(form.workshopName),
      address: clean(form.address),
    };
    const base = {
      fullName: clean(initial.fullName),
      workshopName: clean(initial.workshopName),
      address: clean(initial.address),
    };
    const diff = {};
    for (const key of Object.keys(next)) {
      if (next[key] === base[key]) continue;
      diff[key] = next[key];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setTouched(true);
    if (nameMissing || workshopMissing) {
      (nameMissing ? nameRef.current : document.getElementById('pf-workshop'))?.focus();
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
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError('');
  };

  const revert = (key) => setForm((prev) => ({ ...prev, [key]: initial[key] }));

  const changePhoto = async (request) => {
    setPhotoBusy(true);
    setError('');
    try {
      const user = await request();
      onAvatarChange?.(user?.avatarUrl ?? null);
    } catch (err) {
      setError(err?.message || t('profile.saveError'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    // Xuddi shu faylni qayta tanlaganda ham onChange ishlashi uchun
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setError(t('brak.photoTypeError'));
    if (file.size > PHOTO_MAX_BYTES) return setError(t('profile.photoSizeError'));
    return changePhoto(() => setAvatar(file));
  };

  // Maydon: belgi + ichki yorliq + kiritish; o'zgargan bo'lsa ajralib turadi va bir bosishda asliga qaytadi
  const field = (id, label, Icon, key, { delay = 0, missing = false, inputRef, locked = false, multiline = false, note, counter, ...extra } = {}) => {
    const invalid = touched && missing;
    const changed = key in changes;
    const Input = multiline ? 'textarea' : 'input';
    return (
      <div className="tl-pop" style={{ '--tl-delay': `${delay}ms` }}>
        <div
          className={cx(
            'group flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition duration-200',
            locked
              ? 'border-dashed border-white/10 bg-white/5'
              : 'bg-[#0e1424] focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/10',
            !locked && (invalid ? 'border-rose-400/70' : changed ? 'border-teal-400/40' : 'border-white/10 hover:border-white/20')
          )}
        >
          <span
            className={cx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
              changed
                ? 'bg-teal-400/15 text-teal-300'
                : 'bg-white/5 text-slate-400 group-focus-within:bg-teal-400/15 group-focus-within:text-teal-300'
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
              </label>
              {counter}
            </div>
            <Input
              id={id}
              ref={inputRef}
              value={form[key]}
              readOnly={locked}
              tabIndex={locked ? -1 : undefined}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${id}-err` : note ? `${id}-note` : undefined}
              autoComplete="off"
              onChange={update(key)}
              className={cx(inputCls, 'mt-0.5', locked && 'cursor-not-allowed text-slate-400')}
              {...extra}
            />
          </div>
          {locked ? (
            <Lock className="mt-3 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          ) : changed && (
            <button
              type="button"
              onClick={() => revert(key)}
              title={t('profile.revert')}
              aria-label={`${t('profile.revert')}: ${label}`}
              className="mt-1.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {invalid ? (
          <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 pl-1 text-[11px] font-semibold text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('profile.required')}
          </p>
        ) : note && (
          <p id={`${id}-note`} className="mt-1.5 pl-1 text-[11px] text-slate-500">{note}</p>
        )}
      </div>
    );
  };

  const previewName = clean(form.fullName);
  const previewWorkshop = clean(form.workshopName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6"
      style={{ animation: `${closing ? 'tl-fade-out' : 'tl-fade'} ${EXIT_MS}ms ease-out both` }}
      // O'zgarish bo'lsa, tasodifan fonni bosib yozganni yo'qotib qo'ymaslik uchun yopilmaydi
      onMouseDown={(e) => e.target === e.currentTarget && !dirty && requestClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-title"
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101627] text-slate-200 shadow-2xl md:max-w-xl md:rounded-2xl"
        style={{ animation: `${closing ? 'tl-sheet-out' : 'tl-sheet-in'} ${EXIT_MS + 100}ms cubic-bezier(0.22, 1, 0.36, 1) both` }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h2 id="pf-title" className="truncate text-xl font-black text-white">{t('emp.title')}</h2>
                <p className="truncate text-xs text-slate-400">{previewWorkshop || t('profile.workshopMissing')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t('modal.close')}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="profileForm" onSubmit={handleSubmit} noValidate className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
            <SectionTitle icon={Camera}>{t('emp.photo')}</SectionTitle>
            <div className="tl-pop flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0e1424] p-3.5">
              <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-400/15 text-2xl font-black text-teal-300 ring-2 ring-teal-400/40">
                {avatarUrl || previewName ? <AvatarFace url={avatarUrl} name={previewName} /> : <User className="h-8 w-8" aria-hidden="true" />}
                {photoBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300 active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {t('emp.upload')}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => changePhoto(removeAvatar)}
                      className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t('brak.photoRemove')}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">{t('profile.photoHint')}</p>
              </div>
              <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} onChange={pickPhoto} className="hidden" aria-label={t('emp.upload')} />
            </div>

            <SectionTitle icon={User}>{t('profile.data')}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {field('pf-name', t('profile.nameLabel'), User, 'fullName', {
                type: 'text', maxLength: 120, delay: 40, inputRef: nameRef, missing: nameMissing,
              })}
              {field('pf-workshop', t('profile.workshopLabel'), Factory, 'workshopName', {
                type: 'text', maxLength: 120, delay: 80, missing: workshopMissing,
              })}
            </div>
            {field('pf-address', t('profile.addressLabel'), MapPin, 'address', {
              multiline: true,
              rows: 2,
              maxLength: ADDRESS_MAX,
              delay: 120,
              counter: (
                <span className={cx('text-[10px] font-semibold tabular-nums', form.address.length > ADDRESS_MAX - 20 ? 'text-amber-300' : 'text-slate-500')}>
                  {form.address.length}/{ADDRESS_MAX}
                </span>
              ),
            })}
            {/* Telefon — login raqami: PATCH /workshop/profile uni qabul qilmaydi, shuning uchun faqat ko'rsatiladi */}
            {field('pf-phone', t('profile.phoneLabel'), Phone, 'phone', {
              type: 'tel', locked: true, delay: 160, note: t('profile.accountReadOnly'),
            })}

            <div className="tl-pop pt-2" style={{ '--tl-delay': '200ms' }} role="group" aria-label={t('profile.langLabel')}>
              <SectionTitle icon={Globe}>{t('profile.langLabel')}</SectionTitle>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {LANGS.map((language) => {
                  const active = lang === language.value;
                  return (
                    <button
                      key={language.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLang(language.value)}
                      className={cx(
                        'relative rounded-2xl border px-1 py-3 text-center transition duration-200 active:scale-95',
                        active
                          ? 'border-teal-400 bg-teal-400 text-slate-950'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/20'
                      )}
                    >
                      <span className="block text-lg font-black leading-none">{language.shortLabel}</span>
                      <span className="mt-1.5 block truncate text-[11px] font-semibold">{language.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p role="alert" className="tl-pop flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </form>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#0d1322]/80 px-5 py-3.5 sm:px-6">
            <span
              className={cx(
                'hidden min-w-0 items-center gap-2 text-[11px] font-semibold text-amber-300 transition-opacity sm:flex',
                dirty && !saving ? 'opacity-100' : 'opacity-0'
              )}
            >
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-300" aria-hidden="true" />
              <span className="truncate">{t('profile.unsaved')}</span>
            </span>
            <div className="flex flex-1 items-center gap-3 sm:flex-none">
              <button
                type="button"
                onClick={requestClose}
                disabled={saving}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-50 sm:flex-none"
              >
                {t('emp.cancel')}
              </button>
              <button
                type="submit"
                form="profileForm"
                disabled={saving || !dirty}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-7 py-3 text-sm font-extrabold text-slate-950 shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:shadow-none sm:flex-none"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[3]" />}
                <span>{saving ? t('emp.saving') : t('emp.save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
