import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import EmployeeModal from './EmployeeModal';
import { useT } from './i18n';
import { deleteEmployee, listEmployees } from './tailorApi';
import { initialsOf, prettyPhone } from './utils';

/**
 * Sex xodimlari: ro'yxat (GET), qo'shish (POST), tahrirlash (PATCH), o'chirish (DELETE) — /workshop/employees.
 * Profil sahifasida faqat TAILOR_EMPLOYEES_ENABLED yoqilganda ko'rinadi.
 */
export default function EmployeesPanel() {
  const t = useT();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await listEmployees();
      setEmployees(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err?.message || t('emp.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (employee = null) => {
    setEditing(employee);
    setModalOpen(true);
  };

  const onSaved = async () => {
    setModalOpen(false);
    await load();
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await deleteEmployee(id);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err?.message || t('emp.deleteError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="tl-pop rounded-3xl border border-white/10 bg-[#121829]/80 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          <Users className="h-4 w-4 text-teal-400" aria-hidden="true" />
          {t('emp.listTitle')}
        </h3>
        <button
          type="button"
          onClick={() => openModal(null)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t('emp.add')}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-xs text-slate-400">{t('api.loading')}</p>
      ) : employees.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">{t('emp.empty')}</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {employees.map((employee) => (
            <li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-xs font-black text-teal-300">
                  {initialsOf(employee.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{employee.fullName}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-400">
                    {employee.role}
                    {employee.phone ? ` · ${prettyPhone(employee.phone)}` : ''}
                  </p>
                </div>
              </div>
              {confirmId === employee.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-rose-300">{t('emp.deleteConfirm')}</span>
                  <button
                    type="button"
                    disabled={busyId === employee.id}
                    onClick={() => remove(employee.id)}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-rose-400 disabled:opacity-60"
                  >
                    {t('emp.delete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                  >
                    {t('emp.cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={t('emp.editTitle')}
                    onClick={() => openModal(employee)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('emp.delete')}
                    onClick={() => setConfirmId(employee.id)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <EmployeeModal open={modalOpen} employee={editing} onClose={() => setModalOpen(false)} onSaved={onSaved} />
    </section>
  );
}
