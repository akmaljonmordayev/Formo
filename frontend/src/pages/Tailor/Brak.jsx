import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Move, Eye, Ruler, RefreshCw, Shirt, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Card from './ui/Card';
import { cx } from './utils';

export default function Brak() {
  const navigate = useNavigate();
  const [reason, setReason] = useState('bosma-siljidi');
  const [note, setNote] = useState('Bosma chap tomonga 12 mm siljigan. Markazlash belgisini tekshirish kerak.');
  const [submitted, setSubmitted] = useState(false);

  const reasons = [
    { id: 'bosma-siljidi', label: 'Bosma siljidi', icon: Move },
    { id: 'mato-nuqsoni', label: 'Mato nuqsoni', icon: Eye },
    { id: 'notogri-olcham', label: "Noto'g'ri o'lcham", icon: Ruler },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="flex flex-col items-center p-8 text-center bg-[#121829] border border-white/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-white">Brak muvaffaqiyatli qayd etildi</h2>
          <p className="mt-2 text-xs text-slate-400">
            #F-24822 buyurtma uchun brak saqlandi va yangi qayta bosish vazifasi navbatga qo'shildi.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/tailor')}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-glow hover:bg-teal-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Navbatga qaytish
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
              ✕ QC DAN QAYTDI
            </span>
            <h2 className="mt-3 text-2xl font-black text-white">#F-24822</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/30">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">DILSHOD · 7</h3>
              <p className="text-xs font-semibold text-slate-400">Qizil · XL · 1 dona</p>
            </div>
          </div>

          {/* Warning banner: Loss info */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#281318] p-4 text-rose-200">
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">
              Kutilayotgan yo'qotish
            </span>
            <p className="mt-1 text-sm font-extrabold text-white">
              1 futbolka · 42 000 so'm
            </p>
          </div>

          {/* Qayd tarixi timeline */}
          <div className="mt-2 border-t border-white/10 pt-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Qayd tarixi
            </h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span>09:14 qabul qilindi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span>09:31 bosildi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-rose-400 font-bold">09:36 QC foto yuklandi</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column Card: Defect Selection & Form */}
        <Card className="flex flex-col justify-between bg-[#121829] p-6 border border-white/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-white">Brak sababini tanlang</h2>
              <p className="mt-1 text-xs text-slate-400">
                Aniq sabab keyingi bosmada xatoni takrorlamaslikka yordam beradi.
              </p>

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
                Izoh
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Auto Re-print Banner Notice */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-rose-500/30 bg-[#281318] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-rose-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-rose-300">
                  Tasdiqlansa, qayta bosish vazifasi avtomatik yaratiladi
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-200/80">
                  Zaxiradan 1 ta qizil XL futbolka ajratiladi va yangi vazifa navbat boshiga qo'yiladi.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/tailor')}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Brakni tasdiqlash</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
