import { useEffect, useId, useRef, useState } from 'react';
import { Camera, Loader2, Lock, Trash2, X } from 'lucide-react';
import { AvatarFace } from './ui';
import { useT } from './i18n';
import { cx } from './utils';

// Server cheklovi bilan bir xil (POST /auth/me/avatar)
export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const FIELDS = [
  { key: 'fullName', label: 'profile.nameLabel', maxLength: 120, required: true, autoComplete: 'name' },
  { key: 'workshopName', label: 'profile.workshopLabel', maxLength: 120, required: true, autoComplete: 'organization' },
  { key: 'address', label: 'profile.addressLabel', maxLength: 200, placeholder: 'profile.addressPlaceholder', autoComplete: 'street-address' },
];

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-400';
const INPUT = 'w-full rounded-xl border bg-[#0e1424] px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400 [color-scheme:dark]';

/**
 * Profilni tahrirlash — o'ng tomondan ochiladigan panel. Tepada sarlavha, o'rtada rasm va maydonlar,
 * pastda Bekor qilish / Saqlash. Rasm tanlanishi bilan saqlanadi; matn maydonlari — "Saqlash" bosilganda (faqat o'zgarganlari).
 */
export default function ProfileEditDrawer({ values, phone, avatarUrl, photoBusy, onPickPhoto, onRemovePhoto, onSave, onClose }) {
  const t = useT();
  const id = useId();
  const fileRef = useRef(null);
  const [form, setForm] = useState(values);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const change = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    // Xuddi shu faylni qayta tanlaganda ham onChange ishlashi uchun
    e.target.value = '';
    if (file) onPickPhoto(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = Object.fromEntries(FIELDS.map(({ key }) => [key, clean(form[key])]));
    const missing = Object.fromEntries(FIELDS.filter(({ key, required }) => required && !next[key]).map(({ key }) => [key, t('profile.required')]));
    if (Object.keys(missing).length) return setErrors(missing);
    // PATCH /workshop/profile — faqat o'zgargan maydonlar yuboriladi
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== clean(values[key])));
    if (!Object.keys(patch).length) return onClose();
    setSaving(true);
    setSaveError('');
    try {
      await onSave(patch);
      onClose();
    } catch (err) {
      setSaveError(err?.message || t('profile.saveError'));
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t('q.close')}
        onClick={() => !saving && onClose()}
        className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-sm"
        style={{ animation: 'tl-fade 0.2s ease-out both' }}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        noValidate
        onSubmit={submit}
        className="absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col border-l border-white/10 bg-[#121829] shadow-2xl"
        style={{ animation: 'tl-slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-base font-extrabold text-white">{t('profile.editTitle')}</h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label={t('q.close')}
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <p className={LABEL}>{t('profile.photoLabel')}</p>
            <div className="flex items-center gap-4">
              <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0e1424] text-2xl font-extrabold text-teal-300 ring-1 ring-inset ring-white/10">
                <AvatarFace url={avatarUrl} name={form.fullName} />
                {photoBusy && (
                  // Rasm ustidagi qora parda — mavzudan qat'i nazar
                  <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(2, 6, 23, 0.65)', color: '#fff' }}>
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
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {t(avatarUrl ? 'profile.changePhoto' : 'emp.upload')}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={onRemovePhoto}
                      className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t('brak.photoRemove')}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">{t('profile.photoHint')}</p>
              </div>
              <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} onChange={pickFile} className="hidden" aria-label={t('emp.upload')} />
            </div>
          </section>

          <section className="space-y-4">
            {FIELDS.map(({ key, label, maxLength, required, placeholder, autoComplete }, index) => (
              <div key={key}>
                <label htmlFor={`${id}-${key}`} className={LABEL}>
                  {t(label)}
                  {required && <span className="text-rose-400"> *</span>}
                </label>
                <input
                  id={`${id}-${key}`}
                  autoFocus={index === 0}
                  value={form[key]}
                  maxLength={maxLength}
                  autoComplete={autoComplete}
                  placeholder={placeholder ? t(placeholder) : undefined}
                  aria-invalid={Boolean(errors[key])}
                  onChange={change(key)}
                  className={cx(INPUT, errors[key] ? 'border-rose-500/40' : 'border-white/10')}
                />
                {errors[key] && <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">{errors[key]}</p>}
              </div>
            ))}

            <div>
              <label htmlFor={`${id}-phone`} className={LABEL}>{t('profile.phoneLabel')}</label>
              <div className="relative">
                <input id={`${id}-phone`} value={phone} readOnly disabled className={cx(INPUT, 'border-white/10 pr-10 opacity-60')} />
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">{t('profile.accountReadOnly')}</p>
            </div>
          </section>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {saveError && <p role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-200">{saveError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {t('emp.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-300 active:scale-[0.99] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t('emp.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
