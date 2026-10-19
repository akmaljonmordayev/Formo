import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Clock, FileText, Image as ImageIcon, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, JerseyPreview } from './ui';
import WorkflowTracker from './WorkflowTracker';
import { useT, orderDeadline } from './i18n';
import { cx } from './utils';

const BADGE_STYLES = {
  qabul: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  bosildi: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40',
  tayyor: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

export default function OrderDetail({ order, onStartPress, onToast }) {
  const navigate = useNavigate();
  const t = useT();
  const detailRef = useRef(null);

  if (!order) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-8 text-center text-sm text-slate-400 bg-[#121829] border border-white/10">
        {t('order.select')}
      </Card>
    );
  }

  const badgeStyle = BADGE_STYLES[order.status] ?? BADGE_STYLES.qabul;

  const specs = [
    { label: t('order.spec.name'), value: order.customer },
    { label: t('order.spec.number'), value: order.number, isHighlight: true },
    { label: t('order.spec.size'), value: order.size },
    { label: t('order.spec.model'), value: order.model },
    { label: t('order.spec.jerseyColor'), value: `${order.jerseyColorName} ${order.jerseyColor}` },
    { label: t('order.spec.fabric'), value: order.fabric },
    { label: t('order.spec.composition'), value: order.composition },
    { label: t('order.spec.qty'), value: t('order.qtyUnit', { n: order.qty }) },
    { label: t('order.spec.printColor'), value: order.printColor },
    { label: t('order.spec.location'), value: order.location },
  ];

  const workflowLabel =
    order.status === 'qabul'
      ? t('order.wfReady')
      : order.status === 'bosildi'
        ? t('order.wfPrinting')
        : t('order.wfDone');

  const handleDownload = async (type) => {
    if (type === 'PNG') {
      const svg = detailRef.current?.querySelector('[data-jersey-preview]');
      if (!svg) {
        onToast?.(t('order.downloadError'), true);
        return;
      }

      const exportSvg = svg.cloneNode(true);
      exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      exportSvg.setAttribute('width', '960');
      exportSvg.setAttribute('height', '1040');
      const svgBlob = new Blob([new XMLSerializer().serializeToString(exportSvg)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      try {
        const image = new Image();
        image.src = svgUrl;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('Futbolka rasmini tayyorlab bo‘lmadi'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = 960;
        canvas.height = 1040;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('PNG eksporti bu brauzerda ishlamaydi');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!pngBlob) throw new Error('PNG faylini yaratib bo‘lmadi');

        const pngUrl = URL.createObjectURL(pngBlob);
        const anchor = document.createElement('a');
        anchor.href = pngUrl;
        anchor.download = `${order.id}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        onToast?.(t('order.downloadToast', { id: order.id, type }));
      } catch {
        onToast?.(t('order.downloadError'), true);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
      return;
    }

    const blob = new Blob(
      [`Formo tikuv sex\nBuyurtma: ${order.id}\nMijoz: ${order.customer}\nFormat: ${type}\n`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (onToast) onToast(t('order.downloadToast', { id: order.id, type }));
  };

  return (
    <div ref={detailRef}>
    <Card className="flex flex-col gap-5 overflow-hidden bg-[#121829] p-5 border border-white/10">
      {/* Top Header inside Detail Card */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
            <Shirt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wide text-white">{order.customer}</h2>
            <p className="text-xs font-semibold text-slate-400">
              #{order.id} · {t('order.qtyUnit', { n: order.qty })}
            </p>
          </div>
        </div>

        <span className={cx('rounded-full px-3 py-1 text-xs font-extrabold uppercase', badgeStyle)}>
          {t(`status.${order.status}`)}
        </span>
      </div>

      {/* Grid: Preview (Left) + Specifications (Right) */}
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: Jersey Visual Preview */}
        <JerseyPreview
          color={order.jerseyColor}
          number={order.number}
          name={order.customer}
          colorKey={order.colorKey}
        />

        {/* Right: Key-Value Spec Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {specs.map((item) => (
            <div key={item.label} className="flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {item.label}
              </span>
              <span
                className={cx(
                  'mt-0.5 text-sm font-extrabold truncate',
                  item.isHighlight ? 'text-cyan-400 text-lg' : 'text-white'
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Countdown Timer Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-[#281b10] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
            {t('order.deadline')}
          </span>
          <p className="text-sm font-extrabold text-amber-200">
            {orderDeadline(t, order)}
          </p>
        </div>
      </div>

      {/* Ish Jarayoni (Workflow Tracker) */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1424] p-4">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            {t('order.workflow')}
          </h3>
          <span className="text-xs font-bold text-teal-400">{workflowLabel}</span>
        </div>
        <WorkflowTracker stage={order.stage} status={order.status} />
      </div>

      {/* Action Buttons Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownload('PDF')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <FileText className="h-4 w-4" />
            <span>{t('order.downloadPdf')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('PNG')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{t('order.downloadPng')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/tailor/brak', { state: { order } })}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{t('order.defect')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onStartPress(order)}
          className={cx(
            'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-slate-950 shadow-glow transition active:scale-95',
            order.status === 'bosildi'
              ? 'bg-amber-400 hover:bg-amber-300'
              : order.status === 'tayyor'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                : 'bg-teal-400 hover:bg-teal-300'
          )}
        >
          {order.status === 'qabul' ? (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>{t('order.startPrint')}</span>
            </>
          ) : order.status === 'bosildi' ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>{t('order.markReady')}</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>{t('order.completed')}</span>
            </>
          )}
        </button>
      </div>
    </Card>
    </div>
  );
}
