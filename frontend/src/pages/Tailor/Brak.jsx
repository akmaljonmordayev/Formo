import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, Image as ImageIcon, Move, RefreshCw, Ruler, Shirt, Upload, X } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';
import { cx } from './utils';
import { useTailor } from './prefs';

export default function Brak() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders = [], ordersError = '', ordersLoading = false } = useTailor() ?? {};
  const t = useT();
  const photoInputRef = useRef(null);
  const routedOrder = location.state?.order;
  const order = orders.find((item) => item.id === routedOrder?.id) ?? routedOrder ?? orders[0];
  const [reason, setReason] = useState('bosma-siljidi');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => () => {
    if (photo?.url) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setPhotoError(t('brak.photoTypeError'));
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError(t('brak.photoSizeError'));
      event.target.value = '';
      return;
    }

    setPhotoError('');
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const reasons = [
    { id: 'bosma-siljidi', label: t('brak.reason.shift'), icon: Move },
    { id: 'mato-nuqsoni', label: t('brak.reason.fabric'), icon: Eye },
    { id: 'notogri-olcham', label: t('brak.reason.size'), icon: Ruler },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const reports = JSON.parse(localStorage.getItem('formo_tailor_defect_reports') || '[]');
      if (!Array.isArray(reports)) throw new Error('Invalid defect report storage');
      reports.push({
        orderId: order.id,
        reason,
        note: note.trim(),
        photoName: photo?.file.name ?? null,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('formo_tailor_defect_reports', JSON.stringify(reports));
      setSubmitted(true);
    } catch {
      setSubmitError(t('brak.persistError'));
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
          <p className="mt-2 text-xs text-slate-500">{t('brak.localOnly')}</p>
          {photo?.url && (
            <img
              src={photo.url}
              alt={t('brak.photoPreviewAlt')}
              className="mt-5 max-h-56 rounded-xl border border-white/10 object-contain"
            />
          )}
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
                {order.jerseyColorName || (order.colorKey ? t(`color.${order.colorKey}`) : order.jerseyColor || '—')} · {order.size} · {t('unit.donaCount', { n: order.qty ?? 1 })}
              </p>
            </div>
          </div>

          {/* Warning banner: Loss info */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#281318] p-4 text-rose-200">
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">
              {t('brak.loss')}
            </span>
            <p className="mt-1 text-sm font-extrabold text-white">{t('brak.lossValue', { n: 1 })}</p>
          </div>

          <p className="border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">{t('brak.localOnly')}</p>
        </Card>

        {/* Right Column Card: Defect Selection & Form */}
        <Card className="flex flex-col justify-between bg-[#121829] p-6 border border-white/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white">{t('brak.reasonsTitle')}</h2>
              <p className="mt-1 text-xs text-slate-400">{t('brak.reasonsHint')}</p>

              {/* 3 Interactive Cards */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {reasons.map((item) => {
                  const Icon = item.icon;
                  const isSelected = reason === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReason(item.id)}
                      className={cx(
                        'flex flex-col items-start gap-3 rounded-2xl border p-4 transition text-left',
                        isSelected
                          ? 'border-blue-500 bg-[#17264a] ring-2 ring-blue-500/60'
                          : 'border-white/10 bg-[#0e1424] hover:bg-[#131b30]'
                      )}
                    >
                      <div
                        className={cx(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-white">{item.label}</span>
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
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {t('brak.photoLabel')}
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoChange}
                className="sr-only"
                aria-label={t('brak.photoLabel')}
              />
              {photo ? (
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0e1424] p-3">
                  <img src={photo.url} alt={t('brak.photoPreviewAlt')} className="h-20 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{photo.file.name}</p>
                    <button type="button" onClick={removePhoto} className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-300">
                      <X className="h-3.5 w-3.5" />
                      {t('brak.photoRemove')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0e1424] px-4 py-5 text-xs font-bold text-slate-300 transition hover:border-teal-400 hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  <ImageIcon className="h-4 w-4" />
                  {t('brak.photoUpload')}
                </button>
              )}
              <p className="mt-2 text-[10px] text-slate-500">{t('brak.photoHint')}</p>
              {photoError && <p role="alert" className="mt-2 text-xs text-rose-300">{photoError}</p>}
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
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{t('brak.confirm')}</span>
              </button>
            </div>
            {submitError && <p role="alert" className="text-right text-xs text-rose-300">{submitError}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
