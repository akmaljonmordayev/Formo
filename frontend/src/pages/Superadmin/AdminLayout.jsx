import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Globe, HandCoins, MessagesSquare, ShoppingBag, X } from 'lucide-react';
import { chatApi, ordersApi, supportApi } from '../../features/platform/platformApi';
import SuperadminLayout from '../../components/layout/SuperadminLayout';
import { LANGS, LangProvider, useLang } from './i18n';
import { CHAT_READ_EVENT, COUNTS_EVENT, usePolling } from './ui';
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

// Menyudagi sonlar: sizdan ish kutayotgan narsalar. Ish bajarilmaguncha son turaveradi;
// son oshsa (yangi buyurtma / chek / xabar keldi) — o'ng pastda bildirishnoma chiqadi
const COUNTS_REFRESH_MS = 15_000;
const TOAST_MS = 8000;
const ALERTS = {
  orders: { path: '/orders', to: '/superadmin/orders?status=NEW', icon: ShoppingBag, title: 'Yangi buyurtma keldi', text: '{n} ta yangi buyurtma kutmoqda' },
  cardPayments: {
    path: '/card-payments',
    to: '/superadmin/card-payments',
    icon: HandCoins,
    title: "Kartadan to'lov so'rovi keldi",
    // Navbatda qo'ng'iroq kutayotganlar ham, to'langan-u sex tanlanmaganlar ham bor
    text: "{n} ta kartadan to'lov buyurtmasi kutmoqda",
  },
  messages: { path: '/messages', to: '/superadmin/messages', icon: MessagesSquare, title: 'Yangi xabar keldi', text: "{n} ta o'qilmagan xabar" },
};

// Umumiy SuperadminLayout'ni o'zgartirmasdan: menyu va tugma matnlari tarjima qilinadi, til tanlovi yuqori panelda
function TranslatedLayout({ menu }) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  // { orders, cardPayments, messages } — har biri alohida yuklanadi; hali kelmagani undefined
  const [counts, setCounts] = useState({});
  const [toasts, setToasts] = useState([]);
  const known = useRef({});

  const dismiss = useCallback((key) => setToasts((list) => list.filter((x) => x.key !== key)), []);
  // Birinchi yuklanishda bildirishnoma yo'q — faqat panel ochiq turganda son oshsa
  const setCount = useCallback(
    (key, n) => {
      const before = known.current[key];
      known.current[key] = n;
      setCounts((c) => (c[key] === n ? c : { ...c, [key]: n }));
      // O'sha sahifaning o'zida turgan bo'lsa bildirishnoma shart emas — ro'yxat ko'z oldida
      if (before === undefined || n <= before || window.location.pathname.endsWith(ALERTS[key].path)) return;
      setToasts((list) => [...list.filter((x) => x.key !== key), { key, n }]);
      window.setTimeout(() => dismiss(key), TOAST_MS);
    },
    [dismiss],
  );

  // Mijozlar va tikuv sexlaridan kelgan o'qilmagan xabarlar — Telegram kabi «Xabarlar» belgisi ustida
  const loadUnread = useCallback(
    () =>
      Promise.all([supportApi.unread(), chatApi.threads()])
        .then(([support, workshops]) => setCount('messages', (support.unread ?? 0) + workshops.reduce((s, th) => s + (th.unread ?? 0), 0)))
        .catch(() => {}), // xato bo'lsa keyingi poll
    [setCount],
  );
  // Yangi buyurtmalar va kartadan to'lov navbati
  const loadCounts = useCallback(() => {
    // Shu so'rovning o'zi kartadan to'lov navbatini ham qaytaradi (cardQueue)
    ordersApi
      .list({ status: 'NEW', limit: 1 })
      .then((d) => {
        setCount('orders', d.byStatus?.NEW ?? 0);
        setCount('cardPayments', d.cardQueue ?? 0);
      })
      .catch(() => {});
  }, [setCount]);
  useEffect(() => {
    loadCounts();
    const id = setInterval(() => document.visibilityState === 'visible' && loadCounts(), COUNTS_REFRESH_MS);
    window.addEventListener(COUNTS_EVENT, loadCounts);
    return () => {
      clearInterval(id);
      window.removeEventListener(COUNTS_EVENT, loadCounts);
    };
  }, [loadCounts]);
  useEffect(() => {
    loadUnread();
    window.addEventListener(CHAT_READ_EVENT, loadUnread);
    return () => window.removeEventListener(CHAT_READ_EVENT, loadUnread);
  }, [loadUnread]);
  usePolling(loadUnread);

  const badgeFor = useCallback(
    (to) => {
      const key = Object.keys(ALERTS).find((k) => to.endsWith(ALERTS[k].path));
      const n = key ? counts[key] : 0;
      return n > 0 ? (n > 99 ? '99+' : n) : undefined;
    },
    [counts],
  );

  const translated = useMemo(
    () =>
      menu.map((m) => ({
        ...m,
        label: t(m.label),
        group: m.group ? t(m.group) : m.group,
        badge: badgeFor(m.to),
      })),
    [menu, t, badgeFor],
  );

  useEffect(() => {
    document.documentElement.lang = lang === 'oz' ? 'uz-Cyrl' : lang;
  }, [lang]);

  return (
    <SuperadminLayout
      menu={translated}
      actions={<LangMenu />}
      overlay={
        toasts.length > 0 && (
          <div className="sa-toasts" role="status" aria-live="polite">
            {toasts.map(({ key, n }) => {
              const { icon: Icon, title, text, to } = ALERTS[key];
              return (
                <div key={key} className="sa-toast">
                  <span className="sa-toast__icon">
                    <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <button
                    type="button"
                    className="sa-toast__body"
                    onClick={() => {
                      dismiss(key);
                      navigate(to);
                    }}
                  >
                    <b>{t(title)}</b>
                    <span>{t(text, { n })}</span>
                  </button>
                  <button type="button" className="sa-toast__close" aria-label={t('Yopish')} onClick={() => dismiss(key)}>
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      }
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
