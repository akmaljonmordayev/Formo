import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
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

function StyledSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const controlId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  const openOptions = () => {
    setOpen(true);
    window.requestAnimationFrame(() => {
      const menuOptions = [...(rootRef.current?.querySelectorAll('[role="option"]') ?? [])];
      const selectedOption = menuOptions.find((option) => option.getAttribute('aria-selected') === 'true');
      (selectedOption ?? menuOptions[0])?.focus();
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectOption = (option) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={controlId}
        onClick={() => {
          if (open) setOpen(false);
          else openOptions();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openOptions();
          }
        }}
        className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#172238] to-[#0e1424] px-3.5 py-3 text-left shadow-inner shadow-black/20 transition hover:border-teal-400/40 hover:from-[#1a2941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70"
      >
        {selected?.hex ? (
          <span className="h-9 w-9 shrink-0 rounded-xl border border-white/10 p-1">
            <span className="block h-full w-full rounded-lg shadow-inner" style={{ backgroundColor: selected.hex }} />
          </span>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-400/15 bg-teal-400/10 text-xs font-black text-teal-300">
            {selected?.label}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
          <span className="mt-0.5 block truncate text-sm font-extrabold text-white">{selected?.label}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition group-hover:bg-teal-400/10 group-hover:text-teal-300">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div
          id={controlId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#111a2c] p-1.5 shadow-2xl shadow-black/50 ring-1 ring-black/20"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const optionsInMenu = [...event.currentTarget.querySelectorAll('[role="option"]')];
            const currentIndex = optionsInMenu.indexOf(document.activeElement);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            optionsInMenu[(currentIndex + direction + optionsInMenu.length) % optionsInMenu.length]?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => selectOption(option)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                option.value === value
                  ? 'bg-teal-400/10 text-white ring-1 ring-inset ring-teal-400/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {option.hex ? (
                <span className="h-8 w-8 shrink-0 rounded-lg border border-white/10 p-1">
                  <span className="block h-full w-full rounded-md" style={{ backgroundColor: option.hex }} />
                </span>
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-black text-slate-300">
                  {option.label}
                </span>
              )}
              <span className="flex-1 text-sm font-bold">{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 text-teal-300" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
              <StyledSelect
                label={t('stock.add.color')}
                value={color}
                options={STOCK_COLORS.map((item) => ({
                  value: item.name,
                  label: t(`color.${item.key}`),
                  hex: item.hex,
                }))}
                onChange={setColor}
              />
              <StyledSelect
                label={t('stock.add.size')}
                value={size}
                options={STOCK_SIZES.map((itemSize) => ({ value: itemSize, label: itemSize }))}
                onChange={setSize}
              />
              <label className="block text-xs font-bold text-slate-400">
                <span className="mb-1.5 block">{t('stock.add.qty')}</span>
                <input type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0e1424] px-3.5 py-3 text-sm font-semibold text-white outline-none transition focus:border-teal-400/70 focus:ring-4 focus:ring-teal-400/10" />
              </label>
              <button type="submit" disabled={saving || loading || !inventoryLoaded} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={15} aria-hidden="true" />
                {saving ? t('api.saving') : t('stock.add.submit')}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
