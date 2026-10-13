import Card from './ui/Card';
import { STOCK_COLORS, STOCK_SIZES, stockMatrix as defaultMatrix } from './mockData';
import { cx } from './utils';

export function stockCellState(qty) {
  if (qty === 0) return { label: 'NOL', status: 'nol', bg: 'bg-rose-500/20 text-rose-400 border border-rose-500/40' };
  if (qty < 5) return { label: 'KAM', status: 'kam', bg: 'bg-amber-500/20 text-amber-400 border border-amber-500/40' };
  return { label: 'DONA', status: 'normal', bg: 'bg-[#0e1424] text-slate-300 border border-white/5' };
}

export default function StockMatrix({ matrix = defaultMatrix }) {
  return (
    <Card className="flex flex-col justify-between overflow-hidden bg-[#121829] p-5 border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <th className="pb-4 text-left font-semibold">Rang</th>
              {STOCK_SIZES.map((size) => (
                <th key={size} className="pb-4 text-center font-semibold">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {STOCK_COLORS.map((color) => (
              <tr key={color.name}>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-5 w-5 rounded-full ring-2 ring-white/20 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm font-extrabold text-white">{color.name}</span>
                  </div>
                </td>
                {STOCK_SIZES.map((size) => {
                  const qty = matrix[color.name]?.[size] ?? 0;
                  const cell = stockCellState(qty);

                  return (
                    <td key={size} className="py-3 px-1.5 text-center">
                      <div
                        className={cx(
                          'flex flex-col items-center justify-center rounded-xl p-3 text-center transition',
                          cell.bg
                        )}
                      >
                        <span className="text-lg font-black leading-none">{qty}</span>
                        <span className="mt-1 text-[9px] font-bold tracking-wider opacity-80">
                          {cell.label}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-400 ring-1 ring-emerald-500/40">
          YETARLI · 5+
        </span>
        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-400 ring-1 ring-amber-500/40">
          KAM · 1-4
        </span>
        <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-extrabold text-rose-400 ring-1 ring-rose-500/40">
          NOL QOLDIQ
        </span>
      </div>
    </Card>
  );
}
