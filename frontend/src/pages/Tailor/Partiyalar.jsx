import { useEffect, useMemo, useState } from 'react';
import { Layers, Package, Timer } from 'lucide-react';
import { Badge, Card, StatCard } from './ui';
import { useT } from './i18n';
import { STATUS_VARIANTS } from './tailorConstants';
import { cx } from './utils';
import { getTailorProduction } from './tailorApi';

export default function Partiyalar() {
  const t = useT();
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getTailorProduction()
      .then((data) => {
        if (!cancelled) {
          setProduction(data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const batches = useMemo(() => Object.entries(production?.columns ?? {}).flatMap(([apiStatus, orders]) => {
    const status = {
      ACCEPTED: 'qabul',
      PRINTING: 'bosildi',
      QUALITY_CHECK: 'bosildi',
      READY: 'tayyor',
    }[apiStatus];
    return (Array.isArray(orders) ? orders : []).map((order) => {
      const qty = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? order.quantity ?? 0;
      const progress = { ACCEPTED: 25, PRINTING: 50, QUALITY_CHECK: 75, READY: 100 }[apiStatus] ?? 0;
      return {
        id: order.code,
        model: order.items?.map((item) => item.clubName || item.kitLabel).filter(Boolean).join(', ')
          || order.club?.name
          || '—',
        qty,
        done: Math.round((qty * progress) / 100),
        progress,
        status,
        deadline: order.deliveryDate
          ? new Date(order.deliveryDate).toLocaleDateString(t.locale, { timeZone: 'UTC' })
          : '—',
      };
    });
  }), [production, t.locale]);

  const active = batches.filter((b) => b.status === 'bosildi').length;
  const ready = batches.filter((b) => b.status === 'tayyor').length;
  const totalQty = batches.reduce((sum, b) => sum + b.qty, 0);

  return (
    <div className="space-y-4">
      {loading && <div role="status" className="text-xs text-slate-400">{t('api.loading')}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

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
                const percent = batch.progress;
                return (
                  <tr
                    key={batch.id}
                    className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 font-mono font-semibold text-teal-400">{batch.id}</td>
                    <td className="px-5 py-4 font-medium text-white">{batch.model}</td>
                    <td className="px-5 py-4 text-slate-300">{t('bat.qtyUnit', { n: batch.qty })}</td>
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
              {!loading && !error && batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">{t('api.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
