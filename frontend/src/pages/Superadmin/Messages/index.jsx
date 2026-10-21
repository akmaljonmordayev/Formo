import { useMemo } from 'react';
import ChatPanel from '../../../features/chat/ChatPanel';
import { useLang } from '../i18n';

export default function SuperadminMessages() {
  const { t, locale } = useLang();
  const labels = useMemo(
    () => ({
      title: t('Xabarlar'),
      search: t('Suhbatdosh qidirish'),
      pick: t('Suhbatni tanlang'),
      pickHint: t("Chapdagi ro'yxatdan suhbatni tanlang yoki yangisini boshlang."),
      noThreads: t("Suhbatlar yo'q"),
      noPreview: t("Xabarlar yo'q"),
      noMessages: t("Xabarlar yo'q"),
      empty: t('Birinchi xabarni yozing.'),
      placeholder: t('Xabar yozing...'),
      send: t('Yuborish'),
      back: t("Suhbatlar ro'yxatiga qaytish"),
      newChat: t('Yangi suhbat'),
      pickContact: t('Suhbatdoshni tanlang'),
      noContacts: t('Hech kim topilmadi'),
      you: t('Siz: '),
      call: t("Qo'ng'iroq"),
      orderLabel: t('Buyurtma'),
      sendError: t("Xabarni yuborib bo'lmadi."),
      loadError: t("Xabarlarni yuklab bo'lmadi."),
      roles: {
        OPERATOR: t('Operator'),
        SUPERADMIN: t('Superadmin'),
        TAILOR: t('Tikuv sexi'),
        USER: t('Mijoz'),
      },
    }),
    [t],
  );

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Xabarlar')}</h1>
          <p>{t('Operatorlar, sexlar va mijozlar bilan yozishmalar')}</p>
        </div>
      </div>
      <ChatPanel labels={labels} canCall locale={locale} />
    </>
  );
}
