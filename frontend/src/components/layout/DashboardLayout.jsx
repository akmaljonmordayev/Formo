import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';
import '../ui/ui.css';
import './DashboardLayout.css';

// Uchala rol uchun umumiy layout: sidebar menyusi rolga qarab beriladi
export default function DashboardLayout({ menu }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLeaving(true);
    await logout(); // serverdagi sessiya yopiladi, keyin lokal tokenlar o'chadi
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <aside className={`layout__sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="layout__brand">
          FORMO
          <span>{ROLE_LABELS[role]}</span>
        </div>
        <nav className="layout__nav">
          {menu.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `layout__link${isActive ? ' layout__link--active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="layout__stitch" aria-hidden="true" />
      </aside>

      <div className="layout__main">
        <header className="layout__header">
          <button
            type="button"
            className="layout__burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menyu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          <div className="layout__who">
            <div className="layout__avatar">{user?.fullName?.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="layout__user">{user?.fullName}</div>
              <div className="layout__role">{ROLE_LABELS[role]}</div>
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout} disabled={leaving}>
            {leaving ? 'Chiqilmoqda...' : 'Chiqish'}
          </button>
        </header>
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
