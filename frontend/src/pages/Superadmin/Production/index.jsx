// Namuna ma'lumot — backend ishlab chiqarish/bosma API'si ulanguncha
const SEXES = [
  { name: 'Chilonzor-1', active: 6, load: '86 / 120 dona', pct: 72 },
  { name: 'Yunusobod', active: 2, load: '12 / 60 dona', pct: 20 },
];

const COLUMNS = [
  {
    step: 1,
    title: 'Navbatda',
    sub: 'Bosishni kutmoqda',
    count: 4,
    jobs: [
      { id: 'FRM-88424', name: 'AZIZ', num: 10, bg: '#f3f5f9', text: '#0e1a3f', rang: 'Klub ranglari', size: 'L', turi: 'Real Madrid · Uy', soni: '1 dona', late: false },
    ],
  },
  {
    step: 2,
    title: 'Bosilmoqda',
    sub: 'Pressda',
    count: 2,
    jobs: [
      { id: 'FRM-88408', name: 'ANVAR', num: 2, bg: '#8a1f2b', text: '#fff', rang: 'Klub ranglari', size: '10-11 yosh', turi: 'FC Barcelona · Uy', soni: '1 dona', late: true },
    ],
  },
  {
    step: 3,
    title: 'Sifat nazorati',
    sub: 'Tekshirish va foto',
    count: 2,
    jobs: [
      { id: 'FRM-88418', name: 'OMAR', num: 11, bg: '#f3f5f9', text: '#0e1a3f', rang: 'Oq', size: '8-9 yosh', turi: "O'z dizayni", soni: '3 dona', late: true },
    ],
  },
  {
    step: 4,
    title: 'Tayyor',
    sub: 'Ilovada: «Bosildi va tekshirildi»',
    count: 2,
    jobs: [
      { id: 'FRM-88415', name: 'BOBUR', num: 14, bg: '#f2a33a', text: '#1a1200', rang: 'Sariq', size: 'L', turi: '—', soni: '1 dona', late: false },
    ],
  },
];

export default function SuperadminProduction() {
  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Ishlab chiqarish</h1>
          <p>Bugungi bosma vazifalari: chapdan o'ngga 4 qadam. Kartochkani bosib bosma ma'lumotlarini oching.</p>
        </div>
      </div>

      <div className="sa-grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {SEXES.map((s) => (
          <div key={s.name} className="sa-stat">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <b>{s.name}</b>
              <span className="sa-table__sub" style={{ marginTop: 0 }}>{s.active} faol vazifa</span>
            </div>
            <div className="sa-progress" style={{ marginBottom: 8 }}>
              <div className="sa-progress__fill" style={{ width: `${s.pct}%` }} />
            </div>
            <div className="sa-table__sub">Bugungi yuk: {s.load}</div>
          </div>
        ))}
        <div className="sa-stat" style={{ borderColor: 'rgba(229,89,107,0.4)', background: 'rgba(229,89,107,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>2</span>
            <div>
              <b style={{ fontSize: 13.5 }}>ta vazifa kechikmoqda</b>
              <div className="sa-table__sub">Muddatga 3 soatdan kam qolgan. Avval shularni bosing.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sa-kanban">
        {COLUMNS.map((col) => (
          <div key={col.title} className="sa-kanban__col">
            <div className="sa-kanban__head">
              <span className="sa-kanban__step">{col.step}</span>
              <span className="sa-kanban__title">
                {col.title}
                <small>{col.sub}</small>
              </span>
              <span className="sa-kanban__count">{col.count}</span>
            </div>
            {col.jobs.map((j) => (
              <div key={j.id} className="sa-kjob">
                <div className="sa-kjob__tag">
                  <span>{j.id}</span>
                  {j.late && <span className="sa-badge sa-badge--red">Kechikmoqda</span>}
                </div>
                <div className="sa-kjob__hero" style={{ background: j.bg, color: j.text }}>
                  <b>{j.name}</b>
                  <span>{j.num}</span>
                </div>
                <div className="sa-kjob__meta">
                  <div><span>Rang</span><b>{j.rang}</b></div>
                  <div><span>O'lcham</span><b>{j.size}</b></div>
                  <div><span>Turi</span><b>{j.turi}</b></div>
                  <div><span>Soni</span><b>{j.soni}</b></div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
