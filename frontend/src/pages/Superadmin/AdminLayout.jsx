import { useEffect, useMemo } from 'react';
import SuperadminLayout from '../../components/layout/SuperadminLayout';
import { LangProvider, useLang } from './i18n';

// Umumiy SuperadminLayout'ni o'zgartirmasdan: menyu tarjima qilinadi (til — Sozlamalar → Profil va til)
function TranslatedLayout({ menu }) {
  const { t, lang } = useLang();
  const translated = useMemo(
    () => menu.map((m) => ({ ...m, label: t(m.label), group: m.group ? t(m.group) : m.group })),
    [menu, t],
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
        lightMode: t("Yorug' mavzu"),
        darkMode: t("Qorong'i mavzu"),
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
