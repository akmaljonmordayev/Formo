import { AlertCircle, AlertTriangle, FilePlus } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';

export default function StockAlerts({ onCreateDoc }) {
  const t = useT();

  const zeroItems = [
    { color: 'qora', size: 'XXL' },
    { color: 'qizil', size: 'XXL' },
  ];
  const lowItems = [
    { color: 'oq', size: 'XXL', qty: 3 },
    { color: 'qizil', size: 'L', qty: 3 },
    { color: 'kok', size: 'XXL', qty: 1 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Nol qoldiq Card */}
      <Card className="flex flex-col gap-3 bg-[#121829] p-5 border border-white/10">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-sm font-extrabold">{t('stock.alerts.zero')}</h3>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-200">
          {zeroItems.map((item) => (
            <p key={`${item.color}-${item.size}`}>
              {t(`color.${item.color}`)} · {item.size}
            </p>
          ))}
        </div>

        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          {t('stock.alerts.zeroHint')}
        </p>
      </Card>

      {/* Kam qoldiq Card */}
      <Card className="flex flex-col gap-3 bg-[#121829] p-5 border border-white/10">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-extrabold">{t('stock.alerts.low')}</h3>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-200">
          {lowItems.map((item) => (
            <p key={`${item.color}-${item.size}`}>
              {t(`color.${item.color}`)} {item.size} · {t('unit.donaCount', { n: item.qty })}
            </p>
          ))}
        </div>
      </Card>

      {/* Kirim Hujjatini Yaratish Button */}
      <button
        type="button"
        onClick={onCreateDoc}
        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121829] p-4 text-xs font-extrabold text-white transition hover:bg-white/10 active:scale-95 cursor-pointer"
      >
        <FilePlus className="h-4 w-4 text-teal-400" />
        <span>{t('stock.alerts.createDoc')}</span>
      </button>
    </div>
  );
}
