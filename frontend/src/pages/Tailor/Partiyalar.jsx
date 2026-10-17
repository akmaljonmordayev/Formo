import { Layers, Package, Timer } from 'lucide-react';
import { Badge, Card, StatCard } from './ui';
import { useT } from './i18n';
import { STATUS_VARIANTS, batches } from './mockData';
import { cx } from './utils';

export default function Partiyalar() {
  const t = useT();
  const active = batches.filter((b) => b.status === 'bosildi').length;
  const ready = batches.filter((b) => b.status === 'tayyor').length;
  const totalQty = batches.reduce((sum, b) => sum + b.qty, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('bat.total')}
          value={batches.length}
          hint={t('bat.ordersQty', { n: totalQty.toLocaleString(t.locale) })}
          icon={Layers}
          tone="teal"
        />
        <StatCard label={t('bat.inProgress')} value={active} hint={t('bat.inProgressHint')} icon={Timer} tone="amber" />
        <StatCard label={t('bat.ready')} value={ready} hint={t('bat.readyHint')} icon={Package} tone="teal" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
            {t('bat.list')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t('bat.listHint')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">{t('bat.col.batch')}</th>
                <th className="px-5 py-3.5">{t('bat.col.model')}</th>
                <th className="px-5 py-3.5">{t('bat.col.qty')}</th>
                <th className="px-5 py-3.5">{t('bat.col.progress')}</th>
                <th className="px-5 py-3.5">{t('bat.col.status')}</th>
                <th className="px-5 py-3.5">{t('bat.col.deadline')}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const percent = Math.min(100, Math.round((batch.done / batch.qty) * 100));
                return (
                  <tr
                    key={batch.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 font-mono font-semibold text-teal-400">{batch.id}</td>
                    <td className="px-5 py-4 font-medium text-white">{batch.model}</td>
                    <td className="px-5 py-4 text-slate-300">
                      {t('bat.qtyUnit', { n: batch.qty })}
                      <span className="ml-1 text-xs text-slate-600">
                        {t('bat.doneShort', { n: batch.done })}
                      </span>
                    </td>
                    <td className="w-[220px] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cx(
                              'h-full rounded-full',
                              percent === 100
                                ? 'bg-emerald-400'
                                : 'bg-gradient-to-r from-teal-500 to-cyan-400'
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-bold text-slate-400">
                          {percent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_VARIANTS[batch.status]}>
                        {t(`status.${batch.status}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{batch.deadline}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
