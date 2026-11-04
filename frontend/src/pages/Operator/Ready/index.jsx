import { PackageCheck } from 'lucide-react';
import { useT } from '../i18n';
import StatusBoard from '../Workshop/StatusBoard';

// Sex "tayyor" degan buyurtmalar → operator yetkazishga chiqaradi → yetkazildi
const COLUMNS = [
  { key: 'ready', statuses: ['READY'] },
  { key: 'delivering', statuses: ['DELIVERING'] },
];

export default function OperatorReadyOrders() {
  const t = useT();
  return <StatusBoard title={t('menu.readyOrders')} subtitle={t('board.readySub')} columns={COLUMNS} emptyIcon={PackageCheck} />;
}
