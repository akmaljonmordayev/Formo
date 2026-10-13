import { useMemo, useState } from "react";

/* =========================================================
   Klublar va formalar sahifasi
   - Layout/spacing/typography: Tailwind core klasslari
   - Maxsus ranglar: inline style (har qanday Tailwind
     sozlamasida ham, preview'da ham to'g'ri chiqishi uchun)
   ========================================================= */

const C = {
  page: "#070b24",
  card: "#141a48",
  panel: "#1a2160",
  line: "#262e6e",
  muted: "#a3abdb",
  text: "#b4bbe6",
  teal: "#17a79b",
  navy: "#0b1030",
  white: "#ffffff",
};

/* ---------- Ma'lumotlar ---------- */
const kit = (key, bg, num, on = true, border = false) => ({ key, bg, num, on, border });

const INITIAL_CLUBS = [
  {
    id: 1, short: "RM", name: "Real Madrid", league: "LaLiga", season: "2026/27", sold: 212,
    badge: ["#ffffff", C.navy],
    kits: [kit("home", "#f4f5fa", C.navy), kit("away", "#10163f", "#ffffff", true, true), kit("third", "#2a2f3b", "#ffffff")],
  },
  {
    id: 2, short: "FB", name: "FC Barcelona", league: "LaLiga", season: "2026/27", sold: 184,
    badge: ["#8f213f", "#ffffff"],
    kits: [kit("home", "#8f213f", C.navy), kit("away", "#f2a53b", C.navy), kit("third", "#17a79b", C.navy)],
  },
  {
    id: 3, short: "MU", name: "Manchester United", league: "Premier League", season: "2026/27", sold: 131,
    badge: ["#d93f48", "#ffffff"],
    kits: [kit("home", "#d93f48", C.navy), kit("away", "#f4f5fa", C.navy), kit("third", "#12152b", "#ffffff")],
  },
  {
    id: 4, short: "L", name: "Liverpool", league: "Premier League", season: "2026/27", sold: 96,
    badge: ["#d0112b", "#ffffff"],
    kits: [kit("home", "#c8102e", C.navy), kit("away", "#f4f5fa", C.navy), kit("third", "#1f4e79", C.navy, false)],
  },
  {
    id: 5, short: "BM", name: "Bayern München", league: "Bundesliga", season: "2026/27", sold: 88,
    badge: ["#d93f48", "#ffffff"],
    kits: [kit("home", "#d93f48", C.navy), kit("away", "#f4f5fa", C.navy), kit("third", "#12152b", "#ffffff")],
  },
  {
    id: 6, short: "J", name: "Juventus", league: "Serie A", season: "2026/27", sold: 74,
    badge: ["#f4f5fa", C.navy],
    kits: [kit("home", "#f4f5fa", C.navy), kit("away", "#12152b", "#ffffff"), kit("third", "#f2a53b", C.navy)],
  },
];

const KIT_LABELS = { home: "Uy", away: "Mehmon", third: "Uchinchi" };
const LEAGUES = ["LaLiga", "Premier League", "Bundesliga", "Serie A", "Ligue 1"];
const ALL = "Barchasi";

const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
};

/* ---------- Toggle ---------- */
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 rounded-full transition-colors focus:outline-none"
      style={{ backgroundColor: checked ? C.teal : C.line }}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ---------- Forma ---------- */
function KitTile({ k, onToggle }) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-xl px-2 pb-3 pt-2"
      style={{ backgroundColor: C.panel }}
    >
      <div
        className={`flex h-16 w-full items-center justify-center rounded-lg font-bold transition-opacity ${
          k.on ? "opacity-100" : "opacity-40"
        }`}
        style={{
          backgroundColor: k.bg,
          color: k.num,
          fontSize: 26,
          lineHeight: 1,
          border: k.border ? "1px solid #2b3380" : "none",
        }}
      >
        10
      </div>
      <span className="mb-2 mt-2 text-xs font-semibold text-white">{KIT_LABELS[k.key]}</span>
      <Switch checked={k.on} onChange={onToggle} label={`${KIT_LABELS[k.key]} formasi`} />
    </div>
  );
}

/* ---------- Klub kartasi ---------- */
function ClubCard({ club, onToggleKit }) {
  return (
    <article className="rounded-2xl p-5" style={{ backgroundColor: C.card }}>
      <header className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          style={{ backgroundColor: club.badge[0], color: club.badge[1] }}
        >
          {club.short}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-white">{club.name}</h3>
          <p className="mt-0.5 truncate" style={{ fontSize: 11, color: C.muted }}>
            {club.league} · {club.season} mavsumi
          </p>
        </div>
        <span className="whitespace-nowrap" style={{ fontSize: 11, color: C.muted }}>
          {club.sold} ta sotildi
        </span>
      </header>
      <div className="flex gap-2">
        {club.kits.map((k) => (
          <KitTile key={k.key} k={k} onToggle={() => onToggleKit(club.id, k.key)} />
        ))}
      </div>
    </article>
  );
}

/* ---------- Klub qo'shish oynasi ---------- */
const emptyForm = { name: "", short: "", league: LEAGUES[0], home: "#d93f48", away: "#f4f5fa", third: "#12152b" };

function AddClubModal({ onClose, onAdd }) {
  const [form, setForm] = useState(emptyForm);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length > 1;

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none";
  const inputStyle = { backgroundColor: "#0a0e2b", border: `1px solid ${C.line}` };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onAdd(form);
        }}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: C.card }}
      >
        <h2 className="mb-5 text-lg font-bold text-white">Yangi klub qo'shish</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs" style={{ color: C.muted }}>Klub nomi</span>
            <input
              autoFocus
              className={inputCls}
              style={inputStyle}
              placeholder="Masalan, Inter Milan"
              value={form.name}
              onChange={set("name")}
            />
          </label>

          <div className="flex gap-3">
            <label className="block w-24">
              <span className="mb-1 block text-xs" style={{ color: C.muted }}>Qisqa nom</span>
              <input
                className={inputCls}
                style={inputStyle}
                maxLength={3}
                placeholder="IM"
                value={form.short}
                onChange={set("short")}
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-xs" style={{ color: C.muted }}>Liga</span>
              <select className={inputCls} style={inputStyle} value={form.league} onChange={set("league")}>
                {LEAGUES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="mb-2 block text-xs" style={{ color: C.muted }}>Forma ranglari</span>
            <div className="flex gap-3">
              {["home", "away", "third"].map((k) => (
                <label
                  key={k}
                  className="flex flex-1 flex-col items-center gap-2 rounded-lg p-2"
                  style={{ backgroundColor: C.panel }}
                >
                  <input
                    type="color"
                    value={form[k]}
                    onChange={set(k)}
                    className="h-10 w-full cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-semibold text-white">{KIT_LABELS[k]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm" style={{ color: C.muted }}>
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: C.teal }}
          >
            Qo'shish
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Sahifa ---------- */
export default function ClubAndFormats() {
  const [clubs, setClubs] = useState(INITIAL_CLUBS);
  const [tab, setTab] = useState(ALL);
  const [modal, setModal] = useState(false);

  const leagues = useMemo(() => {
    const m = new Map();
    clubs.forEach((c) => m.set(c.league, (m.get(c.league) || 0) + 1));
    return [...m.entries()];
  }, [clubs]);

  const visible = tab === ALL ? clubs : clubs.filter((c) => c.league === tab);

  const toggleKit = (id, key) =>
    setClubs((prev) =>
      prev.map((c) =>
        c.id !== id ? c : { ...c, kits: c.kits.map((k) => (k.key === key ? { ...k, on: !k.on } : k)) }
      )
    );

  const addClub = (f) => {
    const name = f.name.trim();
    const mk = (key) => kit(key, f[key], isLight(f[key]) ? C.navy : "#ffffff");
    setClubs((prev) => [
      ...prev,
      {
        id: Date.now(),
        short: (f.short.trim() || name.slice(0, 2)).toUpperCase(),
        name,
        league: f.league,
        season: "2026/27",
        sold: 0,
        badge: [f.home, isLight(f.home) ? C.navy : "#ffffff"],
        kits: [mk("home"), mk("away"), mk("third")],
      },
    ]);
    setTab(f.league);
    setModal(false);
  };

  const pillStyle = (active) => ({
    fontSize: 13,
    lineHeight: 1,
    backgroundColor: active ? C.white : "transparent",
    color: active ? C.navy : C.white,
    border: `1px solid ${active ? C.white : C.line}`,
  });

  return (
    <div
      className="min-h-screen px-6 pb-16 pt-10 text-white"
      style={{
        backgroundColor: C.page,
        fontFamily: "'Outfit', 'Lexend', system-ui, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Sarlavha */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-bold tracking-tight text-white" style={{ fontSize: 32, lineHeight: 1.2 }}>
            Klublar va formalar
          </h1>
          <p className="mt-2 max-w-xl text-sm" style={{ color: C.text, lineHeight: "20px", fontSize: 13 }}>
            Ilovadagi «Klub formalari» katalogi. Har bir klubda uy, mehmon va uchinchi forma. O'chirilgan forma
            ilovada ko'rinmaydi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="mt-8 flex-shrink-0 rounded-lg px-5 py-3 font-medium text-white hover:opacity-90"
          style={{ backgroundColor: C.teal, fontSize: 13 }}
        >
          + Klub qo'shish
        </button>
      </div>

      {/* Filtrlar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full px-4 py-2 transition-colors"
          style={pillStyle(tab === ALL)}
          onClick={() => setTab(ALL)}
        >
          {ALL} · {clubs.length}
        </button>
        {leagues.map(([name, count]) => (
          <button
            key={name}
            type="button"
            className="rounded-full px-4 py-2 transition-colors"
            style={pillStyle(tab === name)}
            onClick={() => setTab(name)}
          >
            {name} · {count}
          </button>
        ))}
        <span className="ml-auto" style={{ fontSize: 11, color: C.muted }}>
          Har bir forma: 189 000 so'm · futbolka + shortik + ism va raqam
        </span>
      </div>

      {/* Klublar */}
      <div
        className="grid gap-4"
        style={{
          /* kompyuterda doim 4 ustun, ekran torayganda o'zi 3/2/1 ga tushadi */
          gridTemplateColumns:
            "repeat(auto-fill, minmax(max(300px, calc((100% - 48px) / 4)), 1fr))",
        }}
      >
        {visible.map((c) => (
          <ClubCard key={c.id} club={c} onToggleKit={toggleKit} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: C.muted }}>
          Bu ligada hozircha klub yo'q.
        </p>
      )}

      {modal && <AddClubModal onClose={() => setModal(false)} onAdd={addClub} />}
    </div>
  );
}