import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';
import '../ui/ui.css';
import './SuperadminLayout.css';

const THEME_KEY = 'formo_sa_theme';
// Mavzu almashganda yuboriladi (detail: 'light' | 'dark') — Profil sahifasi ham shu orqali almashtiradi
export const THEME_EVENT = 'formo-sa-theme';

export function readStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'S';
}

// Superadmin uchun alohida (quyuq) layout: guruhlangan sidebar + til/mavzu/profil bilan yuqori panel
// labels — tarjima qilingan tugma matnlari (AdminLayout beradi); berilmasa o'zbekcha
// actions — yuqori panelga qo'shimcha tugmalar (til tanlovi): til konteksti AdminLayout'da
// overlay — sahifa ustida turadigan element (bildirishnomalar); .sa ichida — mavzu ranglarini oladi
const DEFAULT_LABELS = {
  logout: 'Chiqish',
  leaving: 'Chiqilmoqda...',
  openMenu: 'Menyuni ochish',
  themeLight: "Yorug' mavzu",
  themeDark: "Qorong'i mavzu",
  logoutTitle: 'Akkauntdan chiqasizmi?',
  logoutText: "Qayta kirish uchun telefon raqam va parol kerak bo'ladi.",
  logoutConfirm: 'Ha, chiqish',
  cancel: 'Bekor qilish',
};

export default function SuperadminLayout({ menu, labels: customLabels, actions, overlay }) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);
  const popRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Xotira bloklangan (maxfiy oyna va h.k.) — tema shu sessiyada ishlayveradi, saqlanmaydi
    }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail === 'light' ? 'light' : 'dark');
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

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

  // Chiqish tasdig'i: Escape bilan yopiladi (chiqish ketayotgan bo'lsa — yo'q)
  useEffect(() => {
    if (!confirmOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && !leaving && setConfirmOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmOpen, leaving]);

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

  const askLogout = () => {
    setProfileOpen(false);
    setConfirmOpen(true);
  };

  const handleLogout = async () => {
    setLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLeaving(false);
    }
  };

  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const themeLabel = nextTheme === 'light' ? labels.themeLight : labels.themeDark;

  const name = user?.fullName || 'Super admin';
  const roleLabel = ROLE_LABELS[role] ?? 'Superadmin';

  return (
    <div className={`sa${drawer ? ' is-open' : ''}`} data-theme={theme}>
      <aside className="sa-sb" aria-label="Asosiy menyu">
        <div className="sa-brand">
          <svg className="sa-brand__mark" viewBox="0 0 345 332" aria-hidden="true">
            <path d="M70,0 L310,0 L242,70 L70,70 L70,120 L250,120 L180,192 L70,192 L70,260 L0,332 L0,70 Z" />
            <path className="sa-brand__mark-sliver" d="M310,0 L345,0 L277,70 L242,70 Z" />
          </svg>
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
            aria-label={labels.openMenu}
            aria-expanded={drawer}
          >
            <Menu size={18} strokeWidth={1.8} />
          </button>

          <div className="sa-crumb">
            {current?.group ?? 'Asosiy'} <span>/</span> <b>{current?.label ?? 'Dashboard'}</b>
          </div>

          <div className="sa-top__right">
            {actions}
            <button type="button" className="sa-iconbtn" onClick={() => setTheme(nextTheme)} aria-label={themeLabel} title={themeLabel}>
              {nextTheme === 'light' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            </button>

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
                  <button type="button" className="sa-pop__item sa-pop__item--danger" role="menuitem" onClick={askLogout}>
                    <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                    {labels.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="sa-content" key={pathname}>
          <Outlet />
        </main>
      </div>

      {overlay}

      {confirmOpen && (
        <div
          className="sa-dialog"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && !leaving && setConfirmOpen(false)}
        >
          <div className="sa-dialog__box" role="alertdialog" aria-modal="true" aria-labelledby="sa-logout-title" aria-describedby="sa-logout-text">
            <span className="sa-dialog__icon">
              <LogOut size={24} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <h2 id="sa-logout-title">{labels.logoutTitle}</h2>
            <p id="sa-logout-text">{labels.logoutText}</p>
            <div className="sa-dialog__actions">
              <button type="button" className="sa-btn sa-btn--ghost" autoFocus disabled={leaving} onClick={() => setConfirmOpen(false)}>
                {labels.cancel}
              </button>
              <button type="button" className="sa-btn sa-btn--danger" disabled={leaving} onClick={handleLogout}>
                {leaving ? labels.leaving : labels.logoutConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
