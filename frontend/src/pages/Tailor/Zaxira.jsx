import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, X } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { STOCK_COLORS, STOCK_SIZES } from './tailorConstants';
import { tailorInventoryApi } from './tailorApi';

const emptyMatrix = () => Object.fromEntries(
  STOCK_COLORS.map(({ name }) => [name, Object.fromEntries(STOCK_SIZES.map((itemSize) => [itemSize, 0]))]),
);

const inventoryToMatrix = (items) => {
  const matrix = emptyMatrix();
  for (const item of items) {
    if (matrix[item.color] && STOCK_SIZES.includes(item.size) && Number.isInteger(item.qty) && item.qty >= 0) {
      matrix[item.color][item.size] = item.qty;
    }
  }
  return matrix;
};

const matrixToInventory = (matrix) => STOCK_COLORS.flatMap(({ name }) => STOCK_SIZES.map((itemSize) => ({
  productType: 'TSHIRT',
  color: name,
  size: itemSize,
  qty: matrix[name]?.[itemSize] ?? 0,
})));

export default function Zaxira() {
  const t = useT();
  const [matrix, setMatrix] = useState(emptyMatrix);
  const [color, setColor] = useState(STOCK_COLORS[0].name);
  const [size, setSize] = useState(STOCK_SIZES[0]);
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tailorInventoryApi.list()
      .then((items) => {
        if (!cancelled) {
          setMatrix(inventoryToMatrix(items));
          setInventoryLoaded(true);
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

  const currentQty = matrix[color]?.[size] ?? 0;

  const summary = useMemo(() => {
    const values = STOCK_COLORS.flatMap(({ name }) => STOCK_SIZES.map((itemSize) => matrix[name]?.[itemSize] ?? 0));
    return {
      total: values.reduce((sum, value) => sum + value, 0),
      low: values.filter((value) => value > 0 && value < 5).length,
      zero: values.filter((value) => value === 0).length,
    };
  }, [matrix]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFormOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const addStock = async (event) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1) {
      setError(t('stock.add.invalid'));
      setSaved('');
      return;
    }

    const nextMatrix = {
      ...matrix,
      [color]: { ...matrix[color], [size]: (matrix[color]?.[size] ?? 0) + amount },
    };
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const items = await tailorInventoryApi.save(matrixToInventory(nextMatrix));
      setMatrix(inventoryToMatrix(items));
      setSaved(t('stock.add.toast', {
        color: t(`color.${STOCK_COLORS.find((item) => item.name === color)?.key}`),
        size,
        qty: amount,
      }));
      setQuantity('1');
      setFormOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
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
          disabled={loading || !inventoryLoaded}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} aria-hidden="true" />
          {t('stock.addBtn')}
        </button>
      </div>

      {loading && <div role="status" className="text-xs text-slate-400">{t('api.loading')}</div>}

      {(error || saved) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-xs ${error ? 'border border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
          {error || saved}
        </div>
      )}

      {inventoryLoaded && (
        <>
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
        </>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          style={{ animation: 'tl-fade 0.2s ease-out both' }}
        >
          <button
            type="button"
            aria-label={t('stock.add.cancel')}
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setFormOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tailor-stock-add-title"
            className="tl-pop relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#101627] p-5 shadow-2xl"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <h3 id="tailor-stock-add-title" className="text-base font-black text-white">
                {t('stock.add.title')}
              </h3>
              <button
                type="button"
                aria-label={t('stock.add.cancel')}
                onClick={() => setFormOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <form className="relative mt-3.5 space-y-3.5" onSubmit={addStock}>
              <fieldset>
                <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('stock.add.color')}</legend>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('stock.add.color')}>
                  {STOCK_COLORS.map((item) => {
                    const active = item.name === color;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setColor(item.name)}
                        className={`group flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition active:scale-95 ${
                          active
                            ? 'border-teal-400/60 bg-teal-400/10 shadow-[0_0_0_3px_rgba(45,212,191,0.12)]'
                            : 'border-white/10 bg-[#0e1424] hover:border-white/25'
                        }`}
                      >
                        <span className="relative flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white/20 transition group-hover:scale-110" style={{ backgroundColor: item.hex }}>
                          {active && <Check size={16} strokeWidth={3} className="text-teal-300 mix-blend-difference" aria-hidden="true" />}
                        </span>
                        <span className={`max-w-full truncate text-[10px] font-bold ${active ? 'text-white' : 'text-slate-400'}`}>
                          {t(`color.${item.key}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('stock.add.size')}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('stock.add.size')}>
                  {STOCK_SIZES.map((itemSize) => {
                    const active = itemSize === size;
                    return (
                      <button
                        key={itemSize}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSize(itemSize)}
                        className={`min-w-[2.75rem] rounded-lg border px-3 py-1.5 text-sm font-black transition active:scale-95 ${
                          active
                            ? 'border-teal-300 bg-teal-400 text-slate-950 shadow-glow'
                            : 'border-white/10 bg-[#0e1424] text-slate-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {itemSize}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="tailor-stock-qty" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('stock.add.qty')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="-1"
                    onClick={() => setQuantity(String(Math.max(1, (Number(quantity) || 1) - 1)))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0e1424] text-slate-300 transition hover:border-teal-400/40 hover:text-white active:scale-95"
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    id="tailor-stock-qty"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#0e1424] px-3 text-center text-lg font-black text-white outline-none transition [appearance:textfield] focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label="+1"
                    onClick={() => setQuantity(String((Number(quantity) || 0) + 1))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0e1424] text-slate-300 transition hover:border-teal-400/40 hover:text-white active:scale-95"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-1.5 flex gap-2">
                  {[5, 10, 20, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(String((Number(quantity) || 0) + preset))}
                      className="flex-1 rounded-lg bg-white/5 py-1 text-[11px] font-bold text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-teal-400/10 hover:text-teal-200 active:scale-95"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e1424] px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t(`color.${STOCK_COLORS.find((item) => item.name === color)?.key}`)} · {size}</span>
                <span className="flex items-center gap-2 text-sm font-black">
                  <span className="text-slate-400">{currentQty}</span>
                  <ArrowRight size={14} className="text-slate-500" aria-hidden="true" />
                  <span className="text-teal-300">{currentQty + (Number(quantity) > 0 ? Math.floor(Number(quantity)) : 0)}</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={saving || loading || !inventoryLoaded}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={15} aria-hidden="true" />
                {saving ? t('api.saving') : t('stock.add.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
