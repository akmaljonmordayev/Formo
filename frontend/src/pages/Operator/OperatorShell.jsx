import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, PanelLeft, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';
import {
  OperatorContext,
  forgetLogin,
  initials,
  loadCollapsed,
  loadPrefs,
  rememberLogin,
  storeCollapsed,
  storePrefs,
} from './prefs';
import '../../components/ui/ui.css';
import './operator.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap';

// Operator uchun alohida layout: guruhlangan sidebar + faqat bildirishnoma va avatar bor header
export default function OperatorShell({ menu }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loginAt] = useState(() => rememberLogin(user?.id));
  const popRef = useRef(null);

  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Sahifa almashganda drawer va menyu yopiladi
  useEffect(() => {
    setDrawer(false);
    setProfileMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileMenu) return undefined;
    const onDown = (e) => !popRef.current?.contains(e.target) && setProfileMenu(false);
    const onKey = (e) => e.key === 'Escape' && setProfileMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileMenu]);

  const toast = useCallback((text, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const savePrefs = useCallback((next) => {
    setPrefs(next);
    storePrefs(next);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      storeCollapsed(!v);
      return !v;
    });
  };

  const handleLogout = async () => {
    setLeaving(true);
    forgetLogin();
    await logout();
    navigate('/login', { replace: true });
  };

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

  const context = useMemo(() => ({ prefs, savePrefs, loginAt, toast }), [prefs, savePrefs, loginAt, toast]);
  const name = user?.fullName || 'Operator';
  const roleLabel = ROLE_LABELS[role] ?? 'Operator';
  const theme = prefs.theme === 'system' ? undefined : prefs.theme;

  return (
    <OperatorContext.Provider value={context}>
      <div
        className={`op${collapsed ? ' is-col' : ''}${drawer ? ' is-open' : ''}`}
        data-theme={theme}
        lang={prefs.lang}
      >
        <aside className="op-sb" aria-label="Asosiy menyu">
          <div className="op-logo">
            <i aria-hidden="true">F</i>
            <span>
              FORMO
              <small>Operator paneli</small>
            </span>
          </div>

          {groups.map(({ title, items }) => (
            <div key={title ?? 'main'}>
              {title && <div className="op-gl">{title}</div>}
              {items.map(({ to, label, end, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={label}
                  className={({ isActive }) => `op-ni${isActive ? ' is-on' : ''}`}
                >
                  {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
                  <span className="op-lb">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          <div className="op-sp" />
          <button type="button" className="op-ni op-cmb" onClick={toggleCollapsed} title="Yig'ish">
            <PanelLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="op-lb">{collapsed ? 'Yoyish' : "Yig'ish"}</span>
          </button>
          <div className="op-me">
            <span className="op-av" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden="true">
              {initials(name)}
            </span>
            <div>
              <b>{name}</b>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button type="button" className="op-ni" onClick={handleLogout} disabled={leaving} title="Chiqish">
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="op-lb">{leaving ? 'Chiqilmoqda...' : 'Chiqish'}</span>
          </button>
        </aside>
        <div className="op-ov" onClick={() => setDrawer(false)} aria-hidden="true" />

        <div className="op-mn">
          <header className="op-hd">
            <button
              type="button"
              className="op-b is-ic op-mbtn"
              onClick={() => setDrawer(true)}
              aria-label="Menyuni ochish"
              aria-expanded={drawer}
            >
              <Menu size={16} strokeWidth={1.8} />
            </button>
            <div className="op-crumb">
              Operator / <b>{current?.label ?? 'Dashboard'}</b>
            </div>

            <Link to="/operator/notifications" className="op-b is-ic" aria-label="Bildirishnomalar">
              <Bell size={16} strokeWidth={1.8} />
            </Link>

            <div className="op-pp" ref={popRef}>
              <button
                type="button"
                className="op-avbtn"
                onClick={() => setProfileMenu((v) => !v)}
                aria-label="Profil menyusi"
                aria-expanded={profileMenu}
                aria-haspopup="menu"
              >
                <span className="op-av" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {initials(name)}
                </span>
              </button>
              {profileMenu && (
                <div className="op-pop" role="menu">
                  <div className="op-pop-who">
                    <b>{name}</b>
                    <div className="op-sub">{roleLabel} · Online</div>
                  </div>
                  <hr />
                  <Link to="/operator/profile" className="op-ni" role="menuitem">
                    <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
                    Profil
                  </Link>
                  <Link to="/operator/settings" className="op-ni" role="menuitem">
                    <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
                    Sozlamalar
                  </Link>
                  <hr />
                  <button type="button" className="op-ni" role="menuitem" onClick={handleLogout} disabled={leaving}>
                    <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
                    {leaving ? 'Chiqilmoqda...' : 'Chiqish'}
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="op-ct" key={pathname}>
            <Outlet />
          </main>
        </div>

        <div className="op-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`op-ts${t.error ? ' is-e' : ''}`}>
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </OperatorContext.Provider>
  );
}
