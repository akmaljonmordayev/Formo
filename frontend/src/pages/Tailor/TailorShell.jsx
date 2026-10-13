import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const OUTER_CHROME_CSS = `
  body.tailor-shell .layout__sidebar,
  body.tailor-shell .layout__header { display: none !important; }
  body.tailor-shell .layout__content { padding: 0 !important; }
  body.tailor-shell .layout__main { background: #0b0f19 !important; }
  body.tailor-shell { background: #0b0f19 !important; }
`;

const INITIAL_NOTES = [
  {
    id: 1,
    title: 'Yangi buyurtma',
    text: '#F-24822 Dilshod — qizil XL navbatga tushdi',
    time: '2 daqiqa oldin',
    unread: true,
    to: '/tailor',
  },
  {
    id: 2,
    title: 'Zaxira ogohlantirishi',
    text: 'Qizil XXL va Qora XXL qoldiq nol',
    time: '18 daqiqa oldin',
    unread: true,
    to: '/tailor/zaxira',
  },
  {
    id: 3,
    title: 'Chat xabari',
    text: "Dilshod: Qizil bo'yoq qoldig'i tugamoqda",
    time: '32 daqiqa oldin',
    unread: true,
    to: '/tailor/chat',
  },
  {
    id: 4,
    title: 'Partiya yakunlandi',
    text: 'P-1043 Oversize Street tayyor',
    time: 'Bugun, 11:20',
    unread: false,
    to: '/tailor/partiyalar',
  },
];

export default function TailorShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const notesRef = useRef(null);
  const calRef = useRef(null);

  const unreadCount = notes.filter((n) => n.unread).length;
  const todayLabel = new Date().toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    document.body.classList.add('tailor-shell');
    return () => document.body.classList.remove('tailor-shell');
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (notesRef.current && !notesRef.current.contains(e.target)) setNotesOpen(false);
      if (calRef.current && !calRef.current.contains(e.target)) setCalOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const openNote = (note) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, unread: false } : n)));
    setNotesOpen(false);
    navigate(note.to);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200">
      <style>{OUTER_CHROME_CSS}</style>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Menyuni ochish"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-extrabold text-white">{title}</h1>
              {subtitle && <p className="truncate text-xs font-medium text-slate-400">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block" ref={calRef}>
                <button
                  type="button"
                  onClick={() => {
                    setCalOpen((v) => !v);
                    setNotesOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#121829] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  <Calendar className="h-4 w-4 text-teal-400" />
                  <span className="capitalize">{todayLabel}</span>
                </button>
                {calOpen && (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-[#121829] p-4 shadow-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bugungi sana</p>
                    <p className="mt-1 text-sm font-black capitalize text-white">{todayLabel}</p>
                    <p className="mt-2 text-xs text-slate-400">Smena: 09:00 — 18:00</p>
                  </div>
                )}
              </div>

              <div className="relative" ref={notesRef}>
                <button
                  type="button"
                  aria-label="Bildirishnomalar"
                  onClick={() => {
                    setNotesOpen((v) => !v);
                    setCalOpen(false);
                  }}
                  className="relative rounded-xl border border-white/10 bg-[#121829] p-2 text-slate-300 transition hover:bg-white/10"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-400 ring-2 ring-[#0b0f19]" />
                  )}
                </button>

                {notesOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#121829] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <p className="text-xs font-extrabold text-white">Bildirishnomalar</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setNotes((prev) => prev.map((n) => ({ ...n, unread: false })))}
                          className="text-[10px] font-bold text-teal-400 hover:text-teal-300"
                        >
                          Barchasini o‘qilgan qilish
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notes.map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => openNote(note)}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-0"
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-white">{note.title}</span>
                            {note.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />}
                          </div>
                          <span className="text-[11px] text-slate-400">{note.text}</span>
                          <span className="text-[10px] text-slate-500">{note.time}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
