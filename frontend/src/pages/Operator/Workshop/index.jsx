import { Factory } from 'lucide-react';
import { useT } from '../i18n';
import StatusBoard from './StatusBoard';

// Sexga yuborilgan buyurtmalar: operator sex o'rniga "qabul qilindi" va "tayyor" qila oladi
const COLUMNS = [
  { key: 'sent', statuses: ['SENT_TO_WORKSHOP'] },
  { key: 'inWork', statuses: ['ACCEPTED', 'PRINTING', 'QUALITY_CHECK'] },
];

export default function OperatorWorkshopOrders() {
  const t = useT();
  return <StatusBoard title={t('menu.workshopOrders')} subtitle={t('board.workshopSub')} columns={COLUMNS} emptyIcon={Factory} />;
}
