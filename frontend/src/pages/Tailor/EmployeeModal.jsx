import { useCallback, useEffect, useRef, useState } from 'react';
import { X, User, Phone, Briefcase, Check, Loader2, AlertCircle } from 'lucide-react';
import { useT } from './i18n';
import { createEmployee, updateEmployee } from './tailorApi';
import { cx, formatPhone, initialsOf, phoneForServer } from './utils';

const ROLE_KEYS = ['printer', 'lead', 'designer', 'admin', 'sewer'];
const EMPTY = { fullName: '', role: '', phone: '' };
const EXIT_MS = 220;
const inputCls =
  'w-full rounded-xl border bg-[#0e1424] pl-10 pr-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10';

/** Sex xodimini yaratish/tahrirlash (employee = null -> yangi). Server bilan o'zi gaplashadi. */
export default function EmployeeModal({ open, employee, onClose, onSaved }) {
  const t = useT();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [closing, setClosing] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      employee
        ? { fullName: employee.fullName ?? '', role: employee.role ?? '', phone: formatPhone(employee.phone ?? '') }
        : EMPTY
    );
    setError('');
    setTouched(false);
    setClosing(false);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [employee, open]);

  const requestClose = useCallback(() => {
    if (saving) return;
    setClosing(true);
    window.setTimeout(() => onClose?.(), EXIT_MS);
  }, [saving, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && requestClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, requestClose]);

  if (!open) return null;

  const nameInvalid = touched && !form.fullName.trim();
  const roleInvalid = touched && !form.role.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setTouched(true);
    const fullName = form.fullName.trim();
    const role = form.role.trim();
    if (!fullName || !role) return;

    const body = { fullName, role };
    // Telefon bo'sh bo'lsa ham tahrirda yuboramiz — shunda eski raqamni o'chirish mumkin
    const phone = phoneForServer(form.phone);
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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      style={{ animation: `${closing ? 'tl-fade-out' : 'tl-fade'} ${EXIT_MS}ms ease-out both` }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-title"
        className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[#101627] text-slate-200 shadow-2xl"
        style={{ animation: `${closing ? 'tl-slide-out' : 'tl-slide-in'} ${EXIT_MS + 100}ms cubic-bezier(0.22, 1, 0.36, 1) both` }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-base font-black text-slate-950 shadow-glow">
              {form.fullName.trim() ? initialsOf(form.fullName) : <User className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h2 id="emp-title" className="truncate text-lg font-black text-white">
                {employee ? t('emp.editTitle') : t('emp.addTitle')}
              </h2>
              <p className="truncate text-xs text-slate-400">{employee ? employee.fullName : t('emp.subtitle')}</p>
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

        <form id="employeeForm" onSubmit={handleSubmit} noValidate className="relative min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
          <div className="tl-pop" style={{ '--tl-delay': '80ms' }}>
            <label htmlFor="emp-name" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('emp.name')}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={nameRef}
                id="emp-name"
                type="text"
                required
                maxLength={120}
                autoComplete="off"
                aria-invalid={nameInvalid}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={cx(inputCls, nameInvalid ? 'border-rose-400/70' : 'border-white/10')}
              />
            </div>
          </div>

          <div className="tl-pop" style={{ '--tl-delay': '140ms' }}>
            <label htmlFor="emp-role" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('emp.role')}
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="emp-role"
                type="text"
                required
                maxLength={60}
                autoComplete="off"
                aria-invalid={roleInvalid}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={cx(inputCls, roleInvalid ? 'border-rose-400/70' : 'border-white/10')}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLE_KEYS.map((key) => {
                const label = t(`emp.role.${key}`);
                const active = form.role.trim() === label;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, role: label })}
                    className={cx(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition active:scale-95',
                      active
                        ? 'bg-teal-400 text-slate-950 ring-teal-300'
                        : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="tl-pop" style={{ '--tl-delay': '200ms' }}>
            <label htmlFor="emp-phone" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('emp.phone')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="emp-phone"
                type="tel"
                inputMode="tel"
                maxLength={30}
                autoComplete="off"
                placeholder="+998 90 123 45 67"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                className={cx(inputCls, 'border-white/10')}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="tl-pop flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </form>

        <div className="relative flex items-center justify-end gap-3 border-t border-white/10 bg-[#0d1322]/80 px-5 py-3">
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
            form="employeeForm"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[3]" />}
            <span>{saving ? t('emp.saving') : t('emp.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
