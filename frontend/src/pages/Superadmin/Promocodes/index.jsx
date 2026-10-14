// Namuna promokodlar — backend aksiyalar API'si ulanguncha
const CODES = [
  { code: 'FORMO10', type: 'Foiz', value: '10%', min: '—', used: 318, cap: 1000, period: 'doimiy', on: true },
  { code: 'MAKTAB26', type: 'Foiz', value: '15%', min: '150 000', used: 212, cap: 500, period: '1-sen – 15-okt', on: true },
  { code: 'DUO15', type: 'Foiz', value: '15%', min: '500 000', used: 64, cap: 200, period: 'doimiy', on: true },
  { code: 'BEPUL', type: 'Bepul yetkazish', value: '—', min: '250 000', used: 388, cap: 1000, period: '1-sen – 30-sen', on: true },
  { code: 'FUTBOL10', type: 'Foiz', value: '10%', min: '—', used: 120, cap: 120, period: 'tugagan', on: false },
  { code: 'JAMOA20', type: 'Foiz', value: '20%', min: '1 500 000', used: 9, cap: 50, period: 'doimiy', on: true },
  { code: 'SENTABR', type: "Qat'iy", value: '20 000', min: '180 000', used: 143, cap: 300, period: '1-sen – 30-sen', on: true },
];

export default function SuperadminPromocodes() {
  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Promokodlar</h1>
          <p>Chegirma kodlari. O'chirilgan kod to'lovda qabul qilinmaydi.</p>
        </div>
        <button type="button" className="sa-btn">+ Promokod</button>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Turi</th>
              <th>Qiymat</th>
              <th>Min. summa</th>
              <th>Ishlatildi</th>
              <th>Amal qilish</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {CODES.map((c) => (
              <tr key={c.code}>
                <td><b>{c.code}</b></td>
                <td>{c.type}</td>
                <td>{c.value}</td>
                <td>{c.min}</td>
                <td style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 12.5, marginBottom: 4 }}>{c.used} / {c.cap}</div>
                  <div className="sa-progress">
                    <div className="sa-progress__fill" style={{ width: `${Math.min(100, (c.used / c.cap) * 100)}%` }} />
                  </div>
                </td>
                <td>{c.period}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block', width: 36, height: 20, borderRadius: 999,
                      background: c.on ? 'var(--sa-teal)' : 'rgba(255,255,255,0.12)', position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute', top: 2, left: c.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
