import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { supportApi } from '../../features/platform/platformApi';
import SuperadminLayout from '../../components/layout/SuperadminLayout';
import { LANGS, LangProvider, useLang } from './i18n';
import { CHAT_READ_EVENT, usePolling } from './ui';
import './admin.css';

/** Yuqori paneldagi til tanlovi: joriy til qisqa nomi, bosilganda ro'yxat ochiladi */
function LangMenu() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (value) => {
    setLang(value);
    setOpen(false);
  };

  return (
    <div className="sa-pp" ref={ref}>
      <button
        type="button"
        className="sa-langbtn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Panel tili')}
        title={t('Panel tili')}
      >
        <Globe size={16} strokeWidth={1.8} aria-hidden="true" />
        {LANGS.find((l) => l.value === lang)?.short}
      </button>
      {open && (
        <div className="sa-pop" role="menu" style={{ minWidth: 210 }}>
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l.value}
              className={`sa-pop__item${lang === l.value ? ' is-active' : ''}`}
              onClick={() => pick(l.value)}
            >
              <span style={{ flex: 1 }}>{l.label}</span>
              {lang === l.value && <Check size={15} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Umumiy SuperadminLayout'ni o'zgartirmasdan: menyu va tugma matnlari tarjima qilinadi, til tanlovi yuqori panelda
function TranslatedLayout({ menu }) {
  const { t, lang } = useLang();
  // Mijozlardan kelgan o'qilmagan xabarlar — Telegram kabi «Xabarlar» belgisi ustida
  const [unread, setUnread] = useState(0);
  const loadUnread = useCallback(
    () => supportApi.unread().then((r) => setUnread(r.unread ?? 0)).catch(() => {}), // xato bo'lsa keyingi poll
    [],
  );
  useEffect(() => {
    loadUnread();
    window.addEventListener(CHAT_READ_EVENT, loadUnread);
    return () => window.removeEventListener(CHAT_READ_EVENT, loadUnread);
  }, [loadUnread]);
  usePolling(loadUnread);

  const translated = useMemo(
    () =>
      menu.map((m) => ({
        ...m,
        label: t(m.label),
        group: m.group ? t(m.group) : m.group,
        badge: m.to.endsWith('/messages') && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
      })),
    [menu, t, unread],
  );

  useEffect(() => {
    document.documentElement.lang = lang === 'oz' ? 'uz-Cyrl' : lang;
  }, [lang]);

  return (
    <SuperadminLayout
      menu={translated}
      actions={<LangMenu />}
      labels={{
        logout: t('Chiqish'),
        leaving: t('Chiqilmoqda...'),
        openMenu: t('Menyuni ochish'),
        themeLight: t("Yorug' mavzu"),
        themeDark: t("Qorong'i mavzu"),
        logoutTitle: t('Akkauntdan chiqasizmi?'),
        logoutText: t("Qayta kirish uchun telefon raqam va parol kerak bo'ladi."),
        logoutConfirm: t('Ha, chiqish'),
        cancel: t('Bekor qilish'),
      }}
    />
  );
}

export default function AdminLayout({ menu }) {
  return (
    <LangProvider>
      <TranslatedLayout menu={menu} />
    </LangProvider>
  );
}
