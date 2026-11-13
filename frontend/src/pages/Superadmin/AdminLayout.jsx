import { useCallback, useEffect, useMemo, useState } from 'react';
import { supportApi } from '../../features/platform/platformApi';
import SuperadminLayout from '../../components/layout/SuperadminLayout';
import { LANGS, LangProvider, useLang } from './i18n';
import { CHAT_READ_EVENT, usePolling } from './ui';

// Umumiy SuperadminLayout'ni o'zgartirmasdan: menyu tarjima qilinadi (til — yuqori header'da)
function TranslatedLayout({ menu }) {
  const { t, lang, setLang } = useLang();
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
    document.documentElement.lang = lang === 'oz' ? 'uz-Cyrl' : lang === 'uzn' ? 'uz' : lang;
  }, [lang]);

  return (
    <SuperadminLayout
      menu={translated}
      labels={{
        logout: t('Chiqish'),
        leaving: t('Chiqilmoqda...'),
        openMenu: t('Menyuni ochish'),
      }}
      lang={lang}
      setLang={setLang}
      langs={LANGS}
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
