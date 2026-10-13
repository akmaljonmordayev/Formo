import { useMemo, useState } from 'react';
import { Plus, X, Check, PackagePlus } from 'lucide-react';
import StockMatrix from './StockMatrix';
import StockAlerts from './StockAlerts';
import { STOCK_COLORS, STOCK_SIZES, stockMatrix as initialMatrix } from './mockData';

export default function Zaxira() {
  const [modalOpen, setModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [matrixState, setMatrixState] = useState(initialMatrix);
  const [selectedColor, setSelectedColor] = useState('Oq');
  const [selectedSize, setSelectedSize] = useState('XL');
  const [addQty, setAddQty] = useState('10');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Dynamically calculate stock statistics from live matrix state
  const stats = useMemo(() => {
    let total = 0;
    let low = 0;
    let zero = 0;

    STOCK_COLORS.forEach((color) => {
      STOCK_SIZES.forEach((size) => {
        const qty = matrixState[color.name]?.[size] ?? 0;
        total += qty;
        if (qty === 0) zero += 1;
        else if (qty < 5) low += 1;
      });
    });

    return { total, low, zero };
  }, [matrixState]);

  const handleAddStock = (e) => {
    e.preventDefault();
    const qtyNum = parseInt(addQty, 10) || 0;
    if (qtyNum <= 0) return;

    setMatrixState((prev) => {
      const currentColorMap = prev[selectedColor] ?? {};
      const currentVal = currentColorMap[selectedSize] ?? 0;
      return {
        ...prev,
        [selectedColor]: {
          ...currentColorMap,
          [selectedSize]: currentVal + qtyNum,
        },
      };
    });

    setModalOpen(false);
    showToast(`${selectedColor} · ${selectedSize} uchun +${qtyNum} dona qoldiq muvaffaqiyatli kiritildi!`);
  };

  return (
    <div className="relative space-y-5">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 rounded-2xl bg-teal-400 px-5 py-3 text-xs font-black text-slate-950 shadow-2xl animate-fade-in flex items-center gap-2">
          <Check className="h-4 w-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Bo'sh futbolkalar (Zaxira)</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Rang × o'lcham bo'yicha real qoldiq. Oxirgi yangilanish 10:42.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-glow transition hover:bg-teal-300 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Qoldiq kiritish</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#121829] p-5">
          <span className="text-xs font-semibold text-slate-400">Jami qoldiq</span>
          <p className="mt-2 text-3xl font-black text-white">{stats.total} dona</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Bo'sh futbolka</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121829] p-5">
          <span className="text-xs font-semibold text-slate-400">Kam qoldiq</span>
          <p className="mt-2 text-3xl font-black text-amber-400">{stats.low} katak</p>
          <p className="mt-1 text-xs font-medium text-slate-500">5 donadan kam</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121829] p-5">
          <span className="text-xs font-semibold text-slate-400">Nol qoldiq</span>
          <p className="mt-2 text-3xl font-black text-rose-400">{stats.zero} katak</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Buyurtma qabul qilinmaydi</p>
        </div>
      </div>

      {/* Main Grid & Alerts */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <StockMatrix matrix={matrixState} />
        <StockAlerts onCreateDoc={() => setDocModalOpen(true)} />
      </div>

      {/* Add Stock Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121829] p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-teal-400" />
                <h3 className="text-base font-black text-white">Yangi qoldiq / mato kiritish</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mato rangi</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs font-bold text-white outline-none focus:border-teal-500"
                >
                  {STOCK_COLORS.map((c) => (
                    <option key={c.name} value={c.name} className="bg-[#121829]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Futbolka o'lchami</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs font-bold text-white outline-none focus:border-teal-500"
                >
                  {STOCK_SIZES.map((s) => (
                    <option key={s} value={s} className="bg-[#121829]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Qo'shiladigan miqdor (dona)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0e1424] p-3 text-xs font-bold text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-glow transition hover:bg-teal-300 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Qoldiqni qo'shish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doc Creator Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121829] p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white">Kirim hujjatini yaratish</h3>
              <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Kirim hujjati avtomatik rasmiylashtirildi va OMBOR tizimiga yuborildi.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDocModalOpen(false);
                  showToast('Kirim hujjati muvaffaqiyatli yaratildi!');
                }}
                className="rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-glow"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
