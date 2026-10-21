import { useMemo } from 'react';
import ChatPanel from '../../features/chat/ChatPanel';
import { useT } from './i18n';

export default function Chat() {
  const t = useT();
  const labels = useMemo(
    () => ({
      title: t('chat.title'),
      search: t('chat.search'),
      pick: t('chat.pick'),
      pickHint: t('chat.pickHint'),
      noThreads: t('chat.noThreads'),
      noPreview: t('chat.noPreview'),
      noMessages: t('chat.empty'),
      empty: '',
      placeholder: t('chat.placeholder'),
      send: t('chat.send'),
      back: t('chat.back'),
      newChat: t('chat.newChat'),
      pickContact: t('chat.pickContact'),
      noContacts: t('chat.noContacts'),
      you: t('chat.you'),
      call: '',
      orderLabel: t('chat.order'),
      sendError: t('chat.sendError'),
      loadError: t('chat.loadError'),
      roles: {
        OPERATOR: t('chat.role.OPERATOR'),
        SUPERADMIN: t('chat.role.SUPERADMIN'),
        TAILOR: t('chat.role.TAILOR'),
        USER: t('chat.role.USER'),
      },
    }),
    [t],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-white">{t('chat.title')}</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">{t('chat.subtitle')}</p>
      </div>
      {/* Sex bo'sh bo'lsa ham darhol operatorga yozishi uchun suhbat avtomatik ochiladi */}
      <ChatPanel labels={labels} autoOpenRole="OPERATOR" />
    </div>
  );
}
