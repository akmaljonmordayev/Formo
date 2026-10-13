import { useNavigate } from 'react-router-dom';
import { Shirt, Clock, FileText, Image as ImageIcon, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from './ui/Card';
import JerseyPreview from './ui/JerseyPreview';
import WorkflowTracker from './WorkflowTracker';
import { cx } from './utils';

const BADGE_STYLES = {
  YANGI: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  BOSMADA: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40',
  TAYYOR: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

export default function OrderDetail({ order, onStartPress, onToast }) {
  const navigate = useNavigate();

  if (!order) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-8 text-center text-sm text-slate-400 bg-[#121829] border border-white/10">
        Buyurtmani tanlang
      </Card>
    );
  }

  const badgeText = order.status.toUpperCase();
  const badgeStyle = BADGE_STYLES[badgeText] ?? BADGE_STYLES.YANGI;

  const specs = [
    { label: 'ISM', value: order.customer },
    { label: 'RAQAM', value: order.number, isHighlight: true },
    { label: "O'LCHAM", value: order.size },
    { label: 'MODEL', value: order.model },
    { label: 'FUTBOLKA RANGI', value: `${order.jerseyColorName} ${order.jerseyColor}` },
    { label: 'MATO TURI', value: order.fabric },
    { label: 'TARKIBI', value: order.composition },
    { label: 'SONI', value: `${order.qty} dona` },
    { label: 'BOSMA RANGI', value: order.printColor },
    { label: 'JOYLASHUVI', value: order.location },
  ];

  const handleDownload = (type) => {
    const ext = type.toLowerCase();
    const blob = new Blob(
      [`Formo tikuv sex\nBuyurtma: ${order.id}\nMijoz: ${order.customer}\nFormat: ${type}\n`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.id}.${ext === 'png' ? 'txt' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    if (onToast) onToast(`#${order.id} buyurtma ${type} fayli yuklab olindi`);
  };

  return (
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
              #{order.id} · {order.qty} dona
            </p>
          </div>
        </div>

        <span className={cx('rounded-full px-3 py-1 text-xs font-extrabold uppercase', badgeStyle)}>
          {badgeText}
        </span>
      </div>

      {/* Grid: Preview (Left) + Specifications (Right) */}
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: Jersey Visual Preview */}
        <JerseyPreview
          color={order.jerseyColor}
          number={order.number}
          name={order.customer}
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
            MUDDAT
          </span>
          <p className="text-sm font-extrabold text-amber-200">
            {order.deadlineText}
          </p>
        </div>
      </div>

      {/* Ish Jarayoni (Workflow Tracker) */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1424] p-4">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Ish jarayoni
          </h3>
          <span className="text-xs font-bold text-teal-400">
            {order.status === 'yangi' ? 'Bosmaga tayyor' : order.status === 'bosmada' ? 'Bosilmoqda' : 'Tayyor bo\'ldi'}
          </span>
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
            <span>PDF yuklash</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('PNG')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ImageIcon className="h-4 w-4" />
            <span>PNG yuklash</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/tailor/brak')}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Brak</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onStartPress(order.id)}
          className={cx(
            'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-slate-950 shadow-glow transition active:scale-95',
            order.status === 'bosmada'
              ? 'bg-amber-400 hover:bg-amber-300'
              : order.status === 'tayyor'
              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              : 'bg-teal-400 hover:bg-teal-300'
          )}
        >
          {order.status === 'yangi' ? (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>Bosishni boshlash</span>
            </>
          ) : order.status === 'bosmada' ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Tayyor deb belgilash</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Bajarildi</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
