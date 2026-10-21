import { useMemo } from 'react';
import ChatPanel from '../../../features/chat/ChatPanel';
import { useT } from '../i18n';

export default function OperatorMessages() {
  const t = useT();
  const labels = useMemo(
    () => ({
      title: t('menu.messages'),
      search: t('msg.search'),
      pick: t('msg.pick'),
      pickHint: t('msg.pickHint'),
      noThreads: t('msg.noThreads'),
      noPreview: t('msg.noPreview'),
      noMessages: t('msg.noMessages'),
      empty: t('msg.noMessagesHint'),
      placeholder: t('msg.placeholder'),
      send: t('msg.send'),
      back: t('msg.back'),
      newChat: t('msg.newChat'),
      pickContact: t('msg.pickContact'),
      noContacts: t('msg.noContacts'),
      you: t('msg.you'),
      call: t('dash.call'),
      orderLabel: t('msg.order'),
      sendError: t('msg.sendError'),
      loadError: t('msg.loadError'),
      roles: {
        OPERATOR: t('role.OPERATOR'),
        SUPERADMIN: t('role.SUPERADMIN'),
        TAILOR: t('role.TAILOR'),
        USER: t('role.USER'),
      },
    }),
    [t],
  );

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.messages')}</h1>
          <p>{t('msg.subtitle')}</p>
        </div>
      </div>
      <ChatPanel labels={labels} canCall locale={t.locale} />
    </>
  );
}
