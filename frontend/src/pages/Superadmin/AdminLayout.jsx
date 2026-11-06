import { useEffect, useMemo } from 'react';
import SuperadminLayout from '../../components/layout/SuperadminLayout';
import { LangProvider, LangSwitch, useLang } from './i18n';

// Umumiy SuperadminLayout'ni o'zgartirmasdan: menyu tarjima qilinadi va til almashtirgich qo'shiladi
function TranslatedLayout({ menu }) {
  const { t, lang } = useLang();
  const translated = useMemo(
    () => menu.map((m) => ({ ...m, label: t(m.label), group: m.group ? t(m.group) : m.group })),
    [menu, t],
  );

  useEffect(() => {
    document.documentElement.lang = lang === 'oz' ? 'uz-Cyrl' : lang;
  }, [lang]);

  return (
    <>
      <SuperadminLayout
        menu={translated}
        labels={{ logout: t('Chiqish'), leaving: t('Chiqilmoqda...'), openMenu: t('Menyuni ochish') }}
      />
      <div
        className="sa"
        style={{
          position: 'fixed', right: 16, bottom: 16, zIndex: 30, minHeight: 0, display: 'block',
          background: 'transparent', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto', padding: 4, borderRadius: 999, background: 'var(--sa-surface)',
            border: '1px solid var(--sa-line)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <LangSwitch />
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ menu }) {
  return (
    <LangProvider>
      <TranslatedLayout menu={menu} />
    </LangProvider>
  );
}
