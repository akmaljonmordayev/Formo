import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, LogOut, Settings2, BarChart3, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { FormoLogo } from './ui';
import { useT } from './i18n';
import { useTailor } from './prefs';
import { groupActiveOrders } from './orderBuckets';
import { cx, initialsOf } from './utils';
import { getChatUnread, getWorkshopProfile } from './tailorApi';

const NAV_ITEMS = [
  { to: '/tailor', key: 'orders.title', icon: ClipboardList, count: 'active', end: true },
  { to: '/tailor/tayyor', key: 'prod.ready', icon: CheckCircle2, count: 'ready' },
  { to: '/tailor/statistika', key: 'nav.stats', icon: BarChart3 },
  { to: '/tailor/chat', key: 'nav.chat', icon: MessageSquare, chatBadge: true },
  { to: '/tailor/profil', key: 'nav.profile', icon: Settings2 },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { orders } = useTailor() ?? {};
  const { pathname } = useLocation();
  const [profile, setProfile] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getWorkshopProfile()
      .then((data) => {
        if (!cancelled && data) setProfile({ name: data.fullName, factory: data.workshopName });
      })
      .catch(() => {});
    const onProfileUpdated = (event) => setProfile(event.detail);
    window.addEventListener('formo:tailor-profile-updated', onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('formo:tailor-profile-updated', onProfileUpdated);
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      getChatUnread()
        .then((data) => {
          if (!cancelled) setUnread(Number(data?.unread) || 0);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  const counts = useMemo(() => {
    const list = orders ?? [];
    const late = groupActiveOrders(list).late.length;
    return { active: list.filter((o) => o.status !== 'tayyor').length, late, ready: list.filter((o) => o.status === 'tayyor').length };
  }, [orders]);

  const handleLogout = async () => {
    // serverdagi sessiya yopilguncha kutamiz, aks holda /login dan qaytib sakraydi
    if (logout) await logout();
    navigate('/login', { replace: true });
  };

  // Bazadagi tikuv sexi akkaunti: mas'ul shaxs va sex nomi
  const fullName = profile?.name || user?.fullName || t('nav.workshopFallback');
  const roleName = profile?.factory || user?.workshopName || t('nav.roleFallback');

  return (
    <div className="flex h-full flex-col gap-4 border-r border-white/10 bg-gradient-to-b from-[#0d1322] to-[#0b0f19] p-4 text-slate-200">
      <div className="px-1 pt-1">
        <FormoLogo />
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, key, icon: Icon, count, chatBadge, end }, index) => {
          const badge = count ? counts[count] : chatBadge ? unread : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              style={{ '--tl-delay': `${index * 45}ms` }}
              className={({ isActive }) =>
                cx(
                  'tl-pop group relative flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/10 text-white shadow-md ring-1 ring-inset ring-teal-400/20'
                    : 'text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
              {isActive && (
                <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
              )}
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className={'h-4 w-4 shrink-0 text-teal-400 transition-transform duration-200 group-hover:scale-110'} />
                <span className="truncate">{t(key)}</span>
              </div>
              {badge !== undefined && badge > 0 && (
                <span className={cx('flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-black', count === 'active' && counts.late > 0 ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950')}>
                  {badge}
                </span>
              )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between rounded-2xl border border-white/10 bg-[#121829] p-3">
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
          aria-label={t('nav.logout')}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const t = useT();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('shell.closeMenu')}
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
