import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, PanelLeft, Scissors, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defectsApi } from '../../features/platform/platformApi';
import { LANGS, LOCALES, translate } from './i18n';
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

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@700;800&display=swap';

// Operator uchun alohida layout: guruhlangan sidebar + faqat bildirishnoma va avatar bor header
export default function OperatorShell({ menu }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [openDefects, setOpenDefects] = useState(0);

  // Ochiq nuqsonlar soni (menyudagi belgi) — 30s da yangilanadi
  useEffect(() => {
    let cancelled = false;
    const poll = () =>
      defectsApi
        .list({ status: 'OPEN', page: 1, limit: 1 })
        .then((d) => !cancelled && setOpenDefects(d.openCount ?? 0))
        .catch(() => {});
    poll();
    const timer = setInterval(() => !document.hidden && poll(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
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
  const t = (key) => translate(prefs.lang, key);
  const name = user?.fullName || t('role.OPERATOR');
  const roleLabel = t(`role.${role}`);
  const theme = prefs.theme === 'system' ? undefined : prefs.theme;
  const today = new Date().toLocaleDateString(LOCALES[prefs.lang] ?? LOCALES.uz, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // Til darhol qo'llanadi va saqlanadi — Sozlamalarda "Saqlash"ni kutmaydi
  const setLang = (lang) => savePrefs({ ...prefs, lang });

  return (
    <OperatorContext.Provider value={context}>
      <div
        className={`op${collapsed ? ' is-col' : ''}${drawer ? ' is-open' : ''}`}
        data-theme={theme}
        lang={prefs.lang}
      >
        <aside className="op-sb" aria-label={t('shell.mainMenu')}>
          <div className="op-logo">
            <i aria-hidden="true">
              <Scissors size={16} strokeWidth={2.2} />
            </i>
            <span>
              FORMO
              <small>{t('shell.panel')}</small>
            </span>
          </div>

          {groups.map(({ title, items }) => (
            <div key={title ?? 'main'}>
              {title && <div className="op-gl">{t(title)}</div>}
              {items.map(({ to, label, end, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={t(label)}
                  className={({ isActive }) => `op-ni${isActive ? ' is-on' : ''}`}
                >
                  {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
                  <span className="op-lb">{t(label)}</span>
                  {to.endsWith('/defects') && openDefects > 0 && <span className="op-bd is-ok">{openDefects}</span>}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="op-sp" />
          <button type="button" className="op-ni op-cmb" onClick={toggleCollapsed} title={t(collapsed ? 'shell.expand' : 'shell.collapse')}>
            <PanelLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="op-lb">{t(collapsed ? 'shell.expand' : 'shell.collapse')}</span>
          </button>
          <div className="op-mecd">
            <div className="op-me">
              <span className="op-av" style={{ width: 34, height: 34, fontSize: 12 }} aria-hidden="true">
                {initials(name)}
              </span>
              <div>
                <b>{name}</b>
                <span>{roleLabel}</span>
              </div>
            </div>
            <button type="button" className="op-ni op-out" onClick={handleLogout} disabled={leaving} title={t('shell.logout')}>
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="op-lb">{t(leaving ? 'shell.loggingOut' : 'shell.logout')}</span>
            </button>
          </div>
        </aside>
        <div className="op-ov" onClick={() => setDrawer(false)} aria-hidden="true" />

        <div className="op-mn">
          <header className="op-hd">
            <button
              type="button"
              className="op-b is-ic op-mbtn"
              onClick={() => setDrawer(true)}
              aria-label={t('shell.openMenu')}
              aria-expanded={drawer}
            >
              <Menu size={16} strokeWidth={1.8} />
            </button>
            <div className="op-crumb">
              <small>{today}</small>
              <b>{t(current?.label ?? 'menu.dashboard')}</b>
            </div>

            <div className="op-lang" role="radiogroup" aria-label={t('shell.lang')}>
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.lang === l.value}
                  title={l.label}
                  className={prefs.lang === l.value ? 'is-on' : undefined}
                  onClick={() => setLang(l.value)}
                >
                  {l.value.toUpperCase()}
                </button>
              ))}
            </div>

            <Link to="/operator/notifications" className="op-b is-ic is-rd" aria-label={t('menu.notifications')}>
              <Bell size={16} strokeWidth={1.8} />
            </Link>

            <div className="op-pp" ref={popRef}>
              <button
                type="button"
                className="op-avbtn"
                onClick={() => setProfileMenu((v) => !v)}
                aria-label={t('shell.profileMenu')}
                aria-expanded={profileMenu}
                aria-haspopup="menu"
              >
                <span className="op-av" style={{ width: 38, height: 38, fontSize: 12 }}>
                  {initials(name)}
                </span>
              </button>
              {profileMenu && (
                <div className="op-pop" role="menu">
                  <div className="op-pop-who">
                    <b>{name}</b>
                    <div className="op-sub">{roleLabel} · {t('online')}</div>
                  </div>
                  <hr />
                  <Link to="/operator/profile" className="op-ni" role="menuitem">
                    <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
                    {t('menu.profile')}
                  </Link>
                  <Link to="/operator/settings" className="op-ni" role="menuitem">
                    <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
                    {t('menu.settings')}
                  </Link>
                  <hr />
                  <button type="button" className="op-ni" role="menuitem" onClick={handleLogout} disabled={leaving}>
                    <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
                    {t(leaving ? 'shell.loggingOut' : 'shell.logout')}
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
