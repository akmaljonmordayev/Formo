import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { STOCK_COLORS, STOCK_SIZES, stockMatrix } from './mockData';

const STORAGE_KEY = 'formo_tailor_demo_stock';

function loadDemoStock() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return stockMatrix;
    return Object.fromEntries(
      STOCK_COLORS.map(({ name }) => [
        name,
        Object.fromEntries(STOCK_SIZES.map((size) => {
          const qty = Number(saved[name]?.[size]);
          return [size, Number.isInteger(qty) && qty >= 0 ? qty : stockMatrix[name]?.[size] ?? 0];
        })),
      ]),
    );
  } catch {
    return stockMatrix;
  }
}

export default function Zaxira() {
  const t = useT();
  const [matrix, setMatrix] = useState(loadDemoStock);
  const [color, setColor] = useState(STOCK_COLORS[0].name);
  const [size, setSize] = useState(STOCK_SIZES[0]);
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const summary = useMemo(() => {
    const values = STOCK_COLORS.flatMap(({ name }) => STOCK_SIZES.map((itemSize) => matrix[name]?.[itemSize] ?? 0));
    return {
      total: values.reduce((sum, value) => sum + value, 0),
      low: values.filter((value) => value > 0 && value < 5).length,
      zero: values.filter((value) => value === 0).length,
    };
  }, [matrix]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
      setError('');
    } catch {
      setError(t('stock.persistError'));
    }
  }, [matrix, t]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFormOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const addStock = (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1) {
      setError(t('stock.add.invalid'));
      setSaved('');
      return;
    }

    setMatrix((current) => ({
      ...current,
      [color]: { ...current[color], [size]: (current[color]?.[size] ?? 0) + amount },
    }));
    setError('');
    setSaved(t('stock.add.toast', {
      color: t(`color.${STOCK_COLORS.find((item) => item.name === color)?.key}`),
      size,
      qty: amount,
    }));
    setQuantity('1');
    setFormOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">{t('stock.title')}</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">{t('stock.updated')}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <Plus size={15} aria-hidden="true" />
          {t('stock.addBtn')}
        </button>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-100/80">
        {t('stock.backendMissing')}
      </div>

      {(error || saved) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-xs ${error ? 'border border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
          {error || saved}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['stock.total', summary.total, 'stock.totalHint', 'text-white'],
          ['stock.low', t('stock.cells', { n: summary.low }), 'stock.lowHint', 'text-amber-400'],
          ['stock.zero', t('stock.cells', { n: summary.zero }), 'stock.zeroHint', 'text-rose-400'],
        ].map(([label, value, hint, colorClass]) => (
          <Card key={label} className="p-5">
            <span className="text-xs font-semibold text-slate-400">{t(label)}</span>
            <p className={`mt-2 text-3xl font-black ${colorClass}`}>{typeof value === 'number' ? t('unit.donaCount', { n: value.toLocaleString(t.locale) }) : value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{t(hint)}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-4 text-left font-semibold">{t('stock.colorRow')}</th>
                  {STOCK_SIZES.map((itemSize) => <th key={itemSize} className="pb-4 text-center font-semibold">{itemSize}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {STOCK_COLORS.map((item) => (
                  <tr key={item.name}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="h-5 w-5 shrink-0 rounded-full ring-2 ring-white/20" style={{ backgroundColor: item.hex }} />
                        <span className="text-sm font-extrabold text-white">{t(`color.${item.key}`)}</span>
                      </div>
                    </td>
                    {STOCK_SIZES.map((itemSize) => {
                      const count = matrix[item.name]?.[itemSize] ?? 0;
                      const state = count === 0 ? 'nol' : count < 5 ? 'kam' : 'dona';
                      const style = count === 0
                        ? 'border border-rose-500/40 bg-rose-500/20 text-rose-400'
                        : count < 5
                          ? 'border border-amber-500/40 bg-amber-500/20 text-amber-400'
                          : 'border border-white/5 bg-[#0e1424] text-slate-300';
                      return (
                        <td key={itemSize} className="px-1.5 py-3 text-center">
                          <div className={`flex flex-col items-center justify-center rounded-xl p-3 text-center ${style}`}>
                            <span className="text-lg font-black leading-none">{count}</span>
                            <span className="mt-1 text-[9px] font-bold tracking-wider opacity-80">{t(`stock.cell.${state}`)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-400">{t('stock.legend.enough')}</span>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-400">{t('stock.legend.low')}</span>
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-extrabold text-rose-400">{t('stock.legend.zero')}</span>
          </div>
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label={t('stock.add.cancel')}
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setFormOpen(false)}
          />
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="tailor-stock-add-title"
            className="relative z-10 w-full max-w-md p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 id="tailor-stock-add-title" className="text-sm font-extrabold text-white">
                {t('stock.add.title')}
              </h3>
              <button
                type="button"
                aria-label={t('stock.add.cancel')}
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={addStock}>
              <label className="block text-xs font-bold text-slate-400">
                <span className="mb-1 block">{t('stock.add.color')}</span>
                <select value={color} onChange={(event) => setColor(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white">
                  {STOCK_COLORS.map((item) => <option key={item.name} value={item.name}>{t(`color.${item.key}`)}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-400">
                <span className="mb-1 block">{t('stock.add.size')}</span>
                <select value={size} onChange={(event) => setSize(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white">
                  {STOCK_SIZES.map((itemSize) => <option key={itemSize} value={itemSize}>{itemSize}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-400">
                <span className="mb-1 block">{t('stock.add.qty')}</span>
                <input type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white" />
              </label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300">
                <Plus size={15} aria-hidden="true" />
                {t('stock.add.submit')}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
