import { Layers, Package, Timer } from 'lucide-react';
import Badge from './ui/Badge';
import Card from './ui/Card';
import StatCard from './ui/StatCard';
import { STATUS_LABELS, STATUS_VARIANTS, batches } from './mockData';
import { cx } from './utils';

export default function Partiyalar() {
  const active = batches.filter((b) => b.status === 'bosmada').length;
  const ready = batches.filter((b) => b.status === 'tayyor').length;
  const totalQty = batches.reduce((sum, b) => sum + b.qty, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Jami partiyalar"
          value={batches.length}
          hint={`${totalQty.toLocaleString('uz-UZ')} dona buyurtma`}
          icon={Layers}
          tone="teal"
        />
        <StatCard label="Bosmada" value={active} hint="jarayonda" icon={Timer} tone="amber" />
        <StatCard label="Tayyor" value={ready} hint="pickapga tayyor" icon={Package} tone="teal" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
            Partiyalar ro'yxati
          </h2>
          <p className="mt-1 text-xs text-slate-500">Model bo'yicha bosma jarayoni</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Partiya</th>
                <th className="px-5 py-3.5">Model</th>
                <th className="px-5 py-3.5">Miqdor</th>
                <th className="px-5 py-3.5">Jarayon</th>
                <th className="px-5 py-3.5">Holat</th>
                <th className="px-5 py-3.5">Muddat</th>
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
                      {batch.qty} dona
                      <span className="ml-1 text-xs text-slate-600">
                        ({batch.done} bajarildi)
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
                        {STATUS_LABELS[batch.status]}
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
