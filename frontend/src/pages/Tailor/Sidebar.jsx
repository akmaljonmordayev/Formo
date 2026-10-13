import { NavLink, useNavigate } from 'react-router-dom';
import { Boxes, ClipboardList, Layers, LogOut, Settings2, BarChart3, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import FormoLogo from './ui/FormoLogo';
import { cx, initialsOf } from './utils';

const NAV_ITEMS = [
  { to: '/tailor', label: 'Bugungi navbat', icon: ClipboardList, badge: 8, end: true },
  { to: '/tailor/partiyalar', label: 'Partiyalar', icon: Layers },
  { to: '/tailor/zaxira', label: 'Zaxira', icon: Boxes },
  { to: '/tailor/statistika', label: 'Statistika', icon: BarChart3 },
  { to: '/tailor/chat', label: 'Operator bilan chat', icon: MessageSquare, badge: 2 },
  { to: '/tailor/profil', label: 'Profil va sozlamalar', icon: Settings2 },
];

const SHIFT_DONE = 18;
const SHIFT_TOTAL = 24;

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // serverdagi sessiya yopilguncha kutamiz, aks holda /login dan qaytib sakraydi
    if (logout) await logout();
    navigate('/login', { replace: true });
  };

  const percent = Math.round((SHIFT_DONE / SHIFT_TOTAL) * 100);
  // Bazadagi tikuv sexi akkaunti: mas'ul shaxs va sex nomi
  const fullName = user?.fullName ?? 'Tikuv sexi';
  const roleName = user?.workshopName ?? "Mas'ul shaxs";

  return (
    <div className="flex h-full flex-col gap-4 border-r border-white/10 bg-[#0b0f19] p-4 text-slate-200">
      <div className="px-1 pt-1">
        <FormoLogo />
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition',
                isActive
                  ? 'bg-[#1e2b4d] text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-teal-400" />
              <span className="truncate">{label}</span>
            </div>
            {badge !== undefined && (
              <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-teal-400 px-1 text-[10px] font-black text-slate-950">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-[#121829] p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Bugungi smena</span>
        </div>
        <p className="mt-2 text-2xl font-black text-white">
          {SHIFT_DONE} <span className="text-base font-semibold text-slate-500">/ {SHIFT_TOTAL}</span>
        </p>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-400">6 ta buyurtma navbatda</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#121829] p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-300 ring-1 ring-inset ring-teal-500/40">
            {initialsOf(fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{fullName}</p>
            <p className="truncate text-[10px] text-slate-400">{roleName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Chiqish"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menyuni yopish"
            className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-fade-in overflow-y-auto">
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
