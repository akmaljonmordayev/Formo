import { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Clock, Globe, ShieldCheck, Check, Upload } from 'lucide-react';

const ROLES = ['Bosma operatori', 'Smena boshlig\'i', 'Dizayner', 'Administrator', 'Tikuvchi'];
const FACTORIES = ['Chilonzor', 'Yakkasaroy', 'Sergeli'];
const LANGUAGES = ["O'zbekcha", 'Русский'];

export default function EmployeeModal({ open, employee, onClose, onSave }) {
  const photoRef = useRef(null);
  const [photoName, setPhotoName] = useState('');
  const [form, setForm] = useState({
    id: null,
    name: '',
    initials: '',
    phone: '',
    role: 'Bosma operatori',
    factory: 'Chilonzor',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    language: "O'zbekcha",
  });

  useEffect(() => {
    if (employee) {
      setForm(employee);
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
              <h2 className="text-lg font-black text-white">Profilni tahrirlash</h2>
              <p className="text-xs text-slate-400">Xodim ma'lumotlari va ruxsatlarini o'zgartiring</p>
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
                <span className="block text-xs font-extrabold text-white">Profil rasmi</span>
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
                  {photoName || 'Rasm yuklash'}
                </button>
              </div>
            </div>

            {/* Ism va familiya */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Ism va familiya
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
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Telefon</label>
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

            {/* Rol & Sex */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-[#121829]">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Sex</label>
                <select
                  value={form.factory}
                  onChange={(e) => setForm({ ...form, factory: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                >
                  {FACTORIES.map((f) => (
                    <option key={f} value={f} className="bg-[#121829]">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ish boshlanishi & Ish tugashi */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Ish boshlanishi
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
                  Ish tugashi
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
                Interfeys tili
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l} className="bg-[#121829]">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permission Info Banner */}
            <div className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-[#0e1d24] p-3.5 text-teal-200">
              <ShieldCheck className="h-5 w-5 shrink-0 text-teal-400" />
              <p className="text-[11px] leading-relaxed">
                Operator navbatni ko'radi, fayllarni yuklaydi va bosma holatini yangilaydi.
              </p>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            form="employeeForm"
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow hover:bg-teal-300"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Saqlash</span>
          </button>
        </div>
      </div>
    </div>
  );
}
