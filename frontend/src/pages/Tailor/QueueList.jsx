import { SlidersHorizontal, Clock, Search } from 'lucide-react';
import { useState } from 'react';
import Card from './ui/Card';
import { cx } from './utils';

const BADGE_STYLES = {
  YANGI: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  BOSMADA: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40',
  TAYYOR: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

export default function QueueList({
  orders,
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  className,
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  const tabs = [
    { key: 'barchasi', label: 'Barchasi' },
    { key: 'yangi', label: 'Yangi' },
    { key: 'bosmada', label: 'Bosmada' },
    { key: 'tayyor', label: 'Tayyor' },
  ];

  return (
    <Card className={cx('flex flex-col overflow-hidden bg-[#121829] border border-white/10', className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white">Navbat</h2>
            <p className="text-xs text-slate-400">8 ta buyurtma</p>
          </div>
          <button
            type="button"
            aria-label="Filtr"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {filterOpen && (
          <div className="mt-3 rounded-xl border border-white/10 bg-[#0e1424] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Holat bo‘yicha</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={`f-${tab.key}`}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={cx(
                    'rounded-lg px-2.5 py-1 text-[10px] font-bold',
                    activeTab === tab.key ? 'bg-teal-400 text-slate-950' : 'bg-white/5 text-slate-400'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ism yoki buyurtma raqami"
            className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500/60"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cx(
                'flex-1 rounded-xl px-3 py-2 text-xs font-bold transition text-center',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#0e1424] text-slate-400 border border-white/5 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order Cards List */}
      <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {orders.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-slate-500">
            Buyurtmalar topilmadi
          </div>
        )}
        {orders.map((order) => {
          const isSelected = order.id === selectedId;
          const badgeText = order.status.toUpperCase();
          const badgeStyle = BADGE_STYLES[badgeText] ?? BADGE_STYLES.YANGI;

          return (
            <div
              key={order.id}
              onClick={() => onSelect(order.id)}
              className={cx(
                'group relative cursor-pointer rounded-2xl border p-4 transition-all',
                isSelected
                  ? 'border-teal-400 bg-[#172238] shadow-lg ring-1 ring-teal-400/50'
                  : 'border-white/10 bg-[#0e1424] hover:border-white/20 hover:bg-[#12192e]'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">{order.customer}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">#{order.id}</p>
                </div>
                <span className={cx('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', badgeStyle)}>
                  {badgeText}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-slate-300">
                {order.summaryText}
              </p>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-teal-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{order.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
