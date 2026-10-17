import { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Clock, Factory, Globe, ShieldCheck, Check, Upload } from 'lucide-react';
import { useT, LANGS } from './i18n';

const ROLE_KEYS = ['printer', 'lead', 'designer', 'admin', 'sewer'];
export default function EmployeeModal({ open, employee, onClose, onSave, title, showRole = true }) {
  const t = useT();
  const photoRef = useRef(null);
  const [photoName, setPhotoName] = useState('');
  const [form, setForm] = useState({
    id: null,
    name: '',
    initials: '',
    phone: '',
    roleKey: 'printer',
    factory: 'Chilonzor',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lang: 'uz',
  });

  useEffect(() => {
    if (employee) {
      setForm((prev) => ({
        ...prev,
        ...employee,
        roleKey: employee.roleKey ?? prev.roleKey,
        lang: employee.lang ?? prev.lang,
      }));
    }
  }, [employee, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const initials = form.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    onSave({ ...form, initials: initials || 'AK' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full w-full max-w-lg flex-col justify-between border-l border-white/10 bg-[#121829] p-6 text-slate-200 shadow-2xl">
        {/* Drawer Header */}
        <div>
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">{title || t('emp.title')}</h2>
              <p className="text-xs text-slate-400">{t('emp.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form id="employeeForm" onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20 text-base font-black text-teal-400 ring-2 ring-teal-500/40">
                {form.initials || 'AK'}
              </div>
              <div>
                <span className="block text-xs font-extrabold text-white">{t('emp.photo')}</span>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? '')}
                />
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="mt-1 flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:underline"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {photoName || t('emp.upload')}
                </button>
              </div>
            </div>

            {/* Ism va familiya */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {t('emp.name')}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('emp.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('emp.factory')}</label>
              <div className="relative">
                <Factory className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={form.factory}
                  onChange={(e) => setForm({ ...form, factory: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {showRole && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('emp.role')}</label>
                  <select
                    value={form.roleKey}
                    onChange={(e) => setForm({ ...form, roleKey: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0e1424] px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                  >
                    {ROLE_KEYS.map((r) => (
                      <option key={r} value={r} className="bg-[#121829]">
                        {t(`emp.role.${r}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Ish boshlanishi & Ish tugashi */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {t('emp.shiftStart')}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.shiftStart}
                    onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {t('emp.shiftEnd')}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.shiftEnd}
                    onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Interfeys tili */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {t('emp.lang')}
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={form.lang}
                  onChange={(e) => setForm({ ...form, lang: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                >
                  {LANGS.map((l) => (
                    <option key={l.value} value={l.value} className="bg-[#121829]">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showRole && (
              <div className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-[#0e1d24] p-3.5 text-teal-200">
                <ShieldCheck className="h-5 w-5 shrink-0 text-teal-400" />
                <p className="text-[11px] leading-relaxed">{t('emp.perm')}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
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
            form="employeeForm"
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow hover:bg-teal-300"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{t('emp.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
