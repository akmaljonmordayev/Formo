import { useRef, useState } from 'react';
import { Send, Paperclip, Search, Shirt, CheckCheck } from 'lucide-react';
import Card from './ui/Card';
import { cx } from './utils';

const INITIAL_CHANNELS = [
  {
    id: 1,
    name: 'Smena boshlig\'i (Aziz K.)',
    role: 'Smena boshlig\'i',
    initials: 'AK',
    online: true,
    unread: 0,
    lastMsg: '#F-24822 buyurtma bosmaga topshirildi',
    time: '14:28',
  },
  {
    id: 2,
    name: 'Dilshod Nurmatov',
    role: 'Bosma operatori',
    initials: 'DN',
    online: true,
    unread: 2,
    lastMsg: 'Qizil bo\'yoq qoldig\'i tugamoqda',
    time: '14:15',
  },
  {
    id: 3,
    name: 'Malika Saidova',
    role: 'Dizayner',
    initials: 'MS',
    online: false,
    unread: 0,
    lastMsg: 'Formo Pro 24 vektori yangilandi',
    time: '12:40',
  },
  {
    id: 4,
    name: 'Chilonzor Sex Guruhi',
    role: 'Umumiy kanal',
    initials: 'CS',
    online: true,
    unread: 0,
    lastMsg: 'Bugungi smena rejasi: 24 ta buyurtma',
    time: '09:00',
  },
];

const INITIAL_MESSAGES = {
  1: [
    { id: 1, sender: 'Aziz Karimov', isMe: false, text: 'Salom Dilshod! #F-24822 buyurtma tayyor bo\'ldimi?', time: '14:20' },
    {
      id: 2,
      sender: 'Men',
      isMe: true,
      text: 'Salom Aziz aka! Hozir bosishni boshlayman. Mato tayyorlandi.',
      time: '14:22',
      order: { id: 'F-24822', customer: 'DILSHOD', summary: 'Futbolka · 7 · qizil XL · 1 dona' },
    },
    { id: 3, sender: 'Aziz Karimov', isMe: false, text: '#F-24822 buyurtma bosmaga topshirildi, shoshiling.', time: '14:28' },
  ],
  2: [
    { id: 1, sender: 'Dilshod Nurmatov', isMe: false, text: 'Salom, zaxirada qizil bo\'yoq qoldig\'i tugamoqda.', time: '14:10' },
    { id: 2, sender: 'Dilshod Nurmatov', isMe: false, text: 'Yangi kirim hujjatini yaratish kerak.', time: '14:15' },
  ],
  3: [
    { id: 1, sender: 'Malika Saidova', isMe: false, text: 'Formo Pro 24 vektori yangilandi, yuklab oling.', time: '12:40' },
  ],
  4: [
    { id: 1, sender: 'Smena', isMe: false, text: 'Bugungi smena rejasi: 24 ta buyurtma. Hammaga omad!', time: '09:00' },
  ],
};

export default function Chat() {
  const [channels] = useState(INITIAL_CHANNELS);
  const [activeId, setActiveId] = useState(1);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const fileRef = useRef(null);

  const activeChannel = channels.find((c) => c.id === activeId) ?? channels[0];
  const activeMsgs = messages[activeId] ?? [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'Men',
      isMe: true,
      text: input.trim(),
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), newMsg],
    }));

    setInput('');
  };

  const filteredChannels = channels.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Operator bilan Chat</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">
          Sex boshlig'i, dizayner va operatorlar o'rtasida real-vaqt muloqoti
        </p>
      </div>

      {/* Main Chat Interface Grid */}
      <Card className="grid h-[calc(100vh-210px)] overflow-hidden bg-[#121829] border border-white/10 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left Column: Channels List */}
        <div className="flex flex-col border-r border-white/10 bg-[#0e1424]">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suhbat qidirish..."
                className="w-full rounded-xl border border-white/10 bg-[#121829] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredChannels.map((c) => {
              const isSelected = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cx(
                    'flex cursor-pointer items-center justify-between p-3.5 transition',
                    isSelected ? 'bg-[#172238] border-l-4 border-teal-400' : 'hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-400">
                        {c.initials}
                      </span>
                      {c.online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0e1424]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-xs font-bold text-white">{c.name}</h4>
                        <span className="text-[10px] text-slate-500">{c.time}</span>
                      </div>
                      <p className="truncate text-[11px] text-slate-400 mt-0.5">{c.lastMsg}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Chat Stream */}
        <div className="flex flex-col h-full bg-[#121829]">
          {/* Chat Room Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4 bg-[#0e1424]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-400">
                {activeChannel.initials}
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">{activeChannel.name}</h3>
                <span className="text-[10px] font-semibold text-emerald-400">
                  {activeChannel.online ? 'Tarmoqda (Online)' : 'Oflayn'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeMsgs.map((m) => (
              <div
                key={m.id}
                className={cx('flex flex-col max-w-[80%]', m.isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
              >
                <div
                  className={cx(
                    'rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md',
                    m.isMe
                      ? 'bg-teal-500 text-slate-950 font-semibold rounded-br-none'
                      : 'bg-[#1a233b] text-slate-200 rounded-bl-none border border-white/10'
                  )}
                >
                  <p>{m.text}</p>

                  {/* Attached Order Card Preview */}
                  {m.order && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-950/20 bg-slate-950/20 p-2.5 text-slate-900">
                      <Shirt className="h-5 w-5 shrink-0 text-slate-900" />
                      <div>
                        <span className="block text-[11px] font-black">#{m.order.id} · {m.order.customer}</span>
                        <span className="block text-[10px] opacity-80">{m.order.summary}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                  <span>{m.time}</span>
                  {m.isMe && <CheckCheck className="h-3 w-3 text-teal-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3 bg-[#0e1424]">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const time = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                setMessages((prev) => ({
                  ...prev,
                  [activeId]: [
                    ...(prev[activeId] ?? []),
                    { id: Date.now(), sender: 'Men', isMe: true, text: `Fayl: ${file.name}`, time },
                  ],
                }));
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Xabar yozing..."
              className="flex-1 rounded-xl border border-white/10 bg-[#121829] px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500"
            />

            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-glow hover:bg-teal-300 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
