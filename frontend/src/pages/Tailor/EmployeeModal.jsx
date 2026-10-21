import { useEffect, useState } from 'react';
import { X, User, Phone, Briefcase, Check } from 'lucide-react';
import { useT } from './i18n';
import { createEmployee, updateEmployee } from './tailorApi';

const ROLE_KEYS = ['printer', 'lead', 'designer', 'admin', 'sewer'];
const EMPTY = { fullName: '', role: '', phone: '' };
const inputCls =
  'w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-teal-500';

/** Sex xodimini yaratish/tahrirlash (employee = null -> yangi). Server bilan o'zi gaplashadi. */
export default function EmployeeModal({ open, employee, onClose, onSaved }) {
  const t = useT();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(employee ? { fullName: employee.fullName ?? '', role: employee.role ?? '', phone: employee.phone ?? '' } : EMPTY);
    setError('');
  }, [employee, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const body = { fullName: form.fullName.trim(), role: form.role.trim() };
    const phone = form.phone.trim();
    if (phone || employee) body.phone = phone;
    setSaving(true);
    setError('');
    try {
      if (employee) await updateEmployee(employee.id, body);
      else await createEmployee(body);
      await onSaved?.();
    } catch (err) {
      setError(err?.message || t('emp.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full w-full max-w-lg flex-col justify-between border-l border-white/10 bg-[#121829] p-6 text-slate-200 shadow-2xl">
        <div>
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">{employee ? t('emp.editTitle') : t('emp.addTitle')}</h2>
              <p className="text-xs text-slate-400">{t('emp.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('modal.close')}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="employeeForm" onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="emp-name" className="mb-1 block text-[11px] font-bold text-slate-400">{t('emp.name')}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="emp-name"
                  type="text"
                  required
                  maxLength={120}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="emp-role" className="mb-1 block text-[11px] font-bold text-slate-400">{t('emp.role')}</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="emp-role"
                  type="text"
                  required
                  maxLength={60}
                  list="emp-role-options"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputCls}
                />
                <datalist id="emp-role-options">
                  {ROLE_KEYS.map((r) => (
                    <option key={r} value={t(`emp.role.${r}`)} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label htmlFor="emp-phone" className="mb-1 block text-[11px] font-bold text-slate-400">{t('emp.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="emp-phone"
                  type="text"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                />
              </div>
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
            form="employeeForm"
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
