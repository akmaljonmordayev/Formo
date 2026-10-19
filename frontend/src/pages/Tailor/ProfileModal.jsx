import { useEffect, useState } from 'react';
import { X, User, Factory, MapPin, Clock, Check } from 'lucide-react';
import { useT } from './i18n';
import { updateWorkshopProfile } from './tailorApi';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500';

/** Sex profilini PATCH /workshop/profile orqali tahrirlash. dailyCapacity yuborilmaydi (faqat Superadmin). */
export default function ProfileModal({ open, profile, onClose, onSaved }) {
  const t = useT();
  const [form, setForm] = useState({ fullName: '', workshopName: '', address: '', shiftStart: '', shiftEnd: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      workshopName: profile.workshopName ?? '',
      address: profile.address ?? '',
      shiftStart: profile.shiftStart ?? '',
      shiftEnd: profile.shiftEnd ?? '',
    });
    setError('');
  }, [open, profile]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const body = {
      fullName: form.fullName.trim(),
      workshopName: form.workshopName.trim(),
      address: form.address.trim(),
    };
    if (form.shiftStart) body.shiftStart = form.shiftStart;
    if (form.shiftEnd) body.shiftEnd = form.shiftEnd;
    setSaving(true);
    setError('');
    try {
      const saved = await updateWorkshopProfile(body);
      await onSaved?.(saved);
    } catch (err) {
      setError(err?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const field = (id, label, Icon, key, extra = {}) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold text-slate-400">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          id={id}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={inputCls}
          {...extra}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full w-full max-w-lg flex-col justify-between border-l border-white/10 bg-[#121829] p-6 text-slate-200 shadow-2xl">
        <div>
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-black text-white">{t('profile.edit')}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('modal.close')}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form id="profileForm" onSubmit={handleSubmit} className="mt-5 space-y-4">
            {field('pf-name', t('profile.nameLabel'), User, 'fullName', { type: 'text', required: true, maxLength: 120 })}
            {field('pf-workshop', t('profile.workshopLabel'), Factory, 'workshopName', { type: 'text', required: true, maxLength: 120 })}
            {field('pf-address', t('profile.addressLabel'), MapPin, 'address', { type: 'text', maxLength: 255 })}
            <div className="grid grid-cols-2 gap-3">
              {field('pf-start', t('emp.shiftStart'), Clock, 'shiftStart', { type: 'time' })}
              {field('pf-end', t('emp.shiftEnd'), Clock, 'shiftEnd', { type: 'time' })}
            </div>
            {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          </form>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            {t('emp.cancel')}
          </button>
          <button
            type="submit"
            form="profileForm"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow hover:bg-teal-300 disabled:opacity-60"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{saving ? t('emp.saving') : t('emp.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
