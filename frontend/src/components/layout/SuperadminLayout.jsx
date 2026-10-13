import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';
import '../ui/ui.css';
import './SuperadminLayout.css';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'S';
}

// Superadmin uchun alohida (quyuq) layout: guruhlangan sidebar + qidiruv/profil bilan yuqori panel
export default function SuperadminLayout({ menu }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    setDrawer(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const onDown = (e) => !popRef.current?.contains(e.target) && setProfileOpen(false);
    const onKey = (e) => e.key === 'Escape' && setProfileOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const groups = useMemo(() => {
    const out = [];
    menu.forEach((item) => {
      const last = out[out.length - 1];
      if (last && last.title === item.group) last.items.push(item);
      else out.push({ title: item.group, items: [item] });
    });
    return out;
  }, [menu]);

  const current = useMemo(
    () =>
      [...menu]
        .sort((a, b) => b.to.length - a.to.length)
        .find((m) => (m.end ? pathname === m.to : pathname.startsWith(m.to))),
    [menu, pathname],
  );

  const handleLogout = async () => {
    setLeaving(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const name = user?.fullName || 'Super admin';
  const roleLabel = ROLE_LABELS[role] ?? 'Superadmin';

  return (
    <div className={`sa${drawer ? ' is-open' : ''}`}>
      <aside className="sa-sb" aria-label="Asosiy menyu">
        <div className="sa-brand">
          <span className="sa-brand__mark">F</span>
          <span className="sa-brand__text">
            Formo
            <small>Admin · {roleLabel}</small>
          </span>
        </div>

        <nav className="sa-nav">
          {groups.map(({ title, items }) => (
            <div key={title ?? 'main'} className="sa-group">
              {title && <div className="sa-group__title">{title}</div>}
              {items.map(({ to, label, end, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `sa-link${isActive ? ' is-active' : ''}`}
                >
                  {Icon && <Icon size={17} strokeWidth={1.8} aria-hidden="true" />}
                  <span className="sa-link__label">{label}</span>
                  {badge ? <span className="sa-link__badge">{badge}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="sa-ov" onClick={() => setDrawer(false)} aria-hidden="true" />

      <div className="sa-main">
        <header className="sa-top">
          <button
            type="button"
            className="sa-iconbtn sa-mbtn"
            onClick={() => setDrawer(true)}
            aria-label="Menyuni ochish"
            aria-expanded={drawer}
          >
            <Menu size={18} strokeWidth={1.8} />
          </button>

          <div className="sa-crumb">
            {current?.group ?? 'Asosiy'} <span>/</span> <b>{current?.label ?? 'Dashboard'}</b>
          </div>

          <div className="sa-search">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input type="search" placeholder="Buyurtma raqami yoki telefon + Enter" maxLength={120} />
          </div>

          <div className="sa-pp" ref={popRef}>
            <button
              type="button"
              className="sa-user"
              onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="sa-avatar">{initials(name)}</span>
              <span className="sa-user__who">
                <b>{name}</b>
                <small>{roleLabel}</small>
              </span>
              <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="sa-pop" role="menu">
                <button type="button" className="sa-pop__item" role="menuitem" onClick={handleLogout} disabled={leaving}>
                  <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                  {leaving ? 'Chiqilmoqda...' : 'Chiqish'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="sa-content" key={pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
