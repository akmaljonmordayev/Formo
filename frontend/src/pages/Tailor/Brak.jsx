import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, Eye, HelpCircle, Minus, Move, Plus, RefreshCw, Ruler, Shirt } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { useTailor } from './prefs';
import { createDefect, listDefects } from './tailorApi';

const REASON_CODES = {
  'bosma-siljidi': 'PRINT_SHIFT',
  'mato-nuqsoni': 'FABRIC',
  'notogri-olcham': 'WRONG_SIZE',
  boshqa: 'OTHER',
};
const REASON_KEYS = { PRINT_SHIFT: 'brak.reason.shift', FABRIC: 'brak.reason.fabric', WRONG_SIZE: 'brak.reason.size', OTHER: 'brak.reason.other' };

export default function Brak() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders = [], ordersError = '', ordersLoading = false } = useTailor() ?? {};
  const t = useT();
  const routedOrder = location.state?.order;
  const [selectedId, setSelectedId] = useState(routedOrder?.id);
  const order = orders.find((item) => item.id === selectedId) ?? orders.find((item) => item.id === routedOrder?.id) ?? routedOrder ?? orders[0];
  const [reason, setReason] = useState('bosma-siljidi');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reports, setReports] = useState([]);

  const loadReports = useCallback(async () => {
    try {
      const data = await listDefects(10);
      setReports(data?.items ?? []);
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const reasons = [
    { id: 'bosma-siljidi', label: t('brak.reason.shift'), icon: Move },
    { id: 'mato-nuqsoni', label: t('brak.reason.fabric'), icon: Eye },
    { id: 'notogri-olcham', label: t('brak.reason.size'), icon: Ruler },
    { id: 'boshqa', label: t('brak.reason.other'), icon: HelpCircle },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const count = Number(qty);
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      setSubmitError(t('brak.qtyInvalid'));
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const body = { orderId: order.apiId, reason: REASON_CODES[reason], qty: count };
      if (note.trim()) body.note = note.trim();
      await createDefect(body);
      setSubmitted(true);
      loadReports();
    } catch (err) {
      setSubmitError(err?.message || t('brak.persistError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) {
    return (
      <Card className="mx-auto flex min-h-60 max-w-xl items-center justify-center p-8 text-center text-sm text-slate-400">
        {ordersLoading ? t('api.loading') : ordersError || t('api.empty')}
      </Card>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="flex flex-col items-center p-8 text-center bg-[#121829] border border-white/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-white">{t('brak.success.title')}</h2>
          <p className="mt-2 text-xs text-slate-400">{t('brak.success.desc', { id: order.id })}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/tailor')}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-glow hover:bg-teal-300"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('brak.back')}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column Card: Order Summary */}
        <Card className="flex flex-col gap-5 bg-[#121829] p-5 border border-white/10">
          {orders.length > 0 && (
            <div>
              <label htmlFor="brak-order" className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('brak.orderLabel')}
              </label>
              <div className="relative">
                <select
                  id="brak-order"
                  value={order.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[#0e1424] py-3 pl-3.5 pr-10 text-xs font-bold text-white outline-none transition [color-scheme:dark] hover:border-white/20 focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10"
                >
                  {orders.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} · {item.customer}{item.number !== '' && item.number != null ? ` · ${item.number}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </div>
            </div>
          )}
          <div>
            <span className="inline-block rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-extrabold uppercase text-rose-400 ring-1 ring-rose-500/40">
              {t('brak.qc')}
            </span>
            <h2 className="mt-3 text-2xl font-black text-white">#{order.id}</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{order.customer} · {order.number}</h3>
              <p className="text-xs font-semibold text-slate-400">
                {order.model || '—'} · {order.size} · {t('unit.donaCount', { n: order.qty ?? 1 })}
              </p>
            </div>
          </div>

          {/* Warning banner: Loss info */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#281318] p-4 text-rose-200">
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">
              {t('brak.loss')}
            </span>
            <p className="mt-1 text-sm font-extrabold text-white">{t('brak.lossValue', { n: Number(qty) || 1 })}</p>
          </div>
        </Card>

        {/* Right Column Card: Defect Selection & Form */}
        <Card className="flex flex-col justify-between bg-[#121829] p-6 border border-white/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white">{t('brak.reasonsTitle')}</h2>
              <p className="mt-1 text-xs text-slate-400">{t('brak.reasonsHint')}</p>

              <div role="radiogroup" aria-label={t('brak.reasonsTitle')} className="mt-4 grid gap-3 sm:grid-cols-2">
                {reasons.map((item) => {
                  const Icon = item.icon;
                  const isSelected = reason === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setReason(item.id)}
                      className={cx(
                        'relative flex items-center gap-3 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-rose-400/60',
                        isSelected
                          ? 'border-rose-400 bg-rose-500/10 shadow-[0_0_0_1px_rgba(251,113,133,0.4)]'
                          : 'border-white/10 bg-[#0e1424] hover:border-white/20 hover:bg-[#131b30]'
                      )}
                    >
                      <span
                        className={cx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
                          isSelected ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-xs font-bold text-white">{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={cx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                          isSelected ? 'border-rose-400 bg-rose-400 text-slate-950' : 'border-white/20 text-transparent'
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Izoh Textarea */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2">
                {t('brak.note')}
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label htmlFor="brak-qty" className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {t('brak.qty')}
              </label>
              <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-[#0e1424] focus-within:border-rose-400">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setQty(String(Math.max(1, (Number(qty) || 1) - 1)))}
                  className="px-3.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="brak-qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-16 bg-transparent py-3 text-center text-sm font-extrabold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setQty(String(Math.min(1000, (Number(qty) || 0) + 1)))}
                  className="px-3.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Auto Re-print Banner Notice */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-rose-500/30 bg-[#281318] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-rose-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-rose-300">{t('brak.auto.title')}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-200/80">{t('brak.auto.desc')}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/tailor')}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {t('brak.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 disabled:opacity-60 px-6 py-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{t('brak.confirm')}</span>
              </button>
            </div>
            {submitError && <p role="alert" className="text-right text-xs text-rose-300">{submitError}</p>}
          </form>
        </Card>
      </div>

      {reports.length > 0 && (
        <Card className="bg-[#121829] p-5 border border-white/10">
          <h3 className="text-sm font-extrabold text-white">{t('brak.history')}</h3>
          <ul className="mt-3 divide-y divide-white/10">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-white">#{r.order?.code ?? r.id}</span>
                  <span className="ml-2 text-slate-400">
                    {t(REASON_KEYS[r.reason] ?? 'brak.reason.other')} · {t('unit.donaCount', { n: r.qty })}
                  </span>
                  {r.note && <p className="mt-0.5 truncate text-slate-500">{r.note}</p>}
                  {r.resolvedNote && <p className="mt-0.5 text-emerald-300">{r.resolvedNote}</p>}
                </div>
                <span
                  className={cx(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                    r.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                  )}
                >
                  {t(r.status === 'RESOLVED' ? 'brak.status.resolved' : 'brak.status.open')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
