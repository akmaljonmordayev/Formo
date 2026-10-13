import { AlertCircle, AlertTriangle, FilePlus } from 'lucide-react';
import Card from './ui/Card';

export default function StockAlerts({ onCreateDoc }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Nol qoldiq Card */}
      <Card className="flex flex-col gap-3 bg-[#121829] p-5 border border-white/10">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-sm font-extrabold">Nol qoldiq</h3>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-200">
          <p>Qora · XXL</p>
          <p>Qizil · XXL</p>
        </div>

        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Bu variantlar uchun yangi bosma vazifasi bloklanadi.
        </p>
      </Card>

      {/* Kam qoldiq Card */}
      <Card className="flex flex-col gap-3 bg-[#121829] p-5 border border-white/10">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-extrabold">Kam qoldiq</h3>
        </div>

        <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-200">
          <p>Oq XXL · 3 dona</p>
          <p>Qizil L · 3 dona</p>
          <p>Ko'k XXL · 1 dona</p>
        </div>
      </Card>

      {/* Kirim Hujjatini Yaratish Button */}
      <button
        type="button"
        onClick={onCreateDoc}
        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121829] p-4 text-xs font-extrabold text-white transition hover:bg-white/10 active:scale-95 cursor-pointer"
      >
        <FilePlus className="h-4 w-4 text-teal-400" />
        <span>Kirim hujjatini yaratish</span>
      </button>
    </div>
  );
}
