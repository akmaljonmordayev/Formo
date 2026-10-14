import { useState } from 'react';

const LOG = [
  { time: '14:32', date: '27-sen', actor: 'Sardor Rahimov', role: 'Super admin', action: "Rol o'zgartirildi", ctx: 'user · Dilnoza K.', ip: '185.139.136.14' },
  { time: '14:05', date: '27-sen', actor: 'Bekzod Aliyev', role: 'Moliyachi', action: 'Qaytarish tasdiqlandi', ctx: 'FRM-88412', ip: '185.139.136.22' },
  { time: '13:48', date: '27-sen', actor: 'Dilnoza Karimova', role: 'Operator', action: 'Buyurtma bekor qilindi', ctx: 'FRM-88419', ip: '185.139.136.31' },
  { time: '13:20', date: '27-sen', actor: 'Malika Yusupova', role: 'Kontent-menejer', action: "Narx o'zgartirildi", ctx: 'product · tshirt', ip: '185.139.136.40' },
  { time: '12:57', date: '27-sen', actor: 'Tizim (BullMQ)', role: 'Tizim', action: "Zaxira bo'shatildi", ctx: 'FRM-88421', ip: 'job · —' },
];

const TABS = ['Barchasi', 'Buyurtma', "To'lov", 'Foydalanuvchi', 'Sozlama', 'Katalog'];

export default function SuperadminAuditLog() {
  const [tab, setTab] = useState('Barchasi');
  const [search, setSearch] = useState('');

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Audit jurnali</h1>
          <p>Kim, qachon va nimani o'zgartirgani. Yozuvlarni o'zgartirib ham, o'chirib ham bo'lmaydi.</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost">CSV eksport</button>
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Kim, obyekt yoki FRM-raqam"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`sa-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Kim</th>
              <th>Amal</th>
              <th>Obyekt</th>
              <th>Kanal · IP</th>
            </tr>
          </thead>
          <tbody>
            {LOG.filter((l) => `${l.actor} ${l.ctx}`.toLowerCase().includes(search.toLowerCase())).map((l, i) => (
              <tr key={i}>
                <td>
                  {l.time}
                  <span className="sa-table__sub">{l.date}</span>
                </td>
                <td>
                  <b>{l.actor}</b>
                  <span className="sa-table__sub">{l.role}</span>
                </td>
                <td>{l.action}</td>
                <td style={{ color: 'var(--sa-mu)' }}>{l.ctx}</td>
                <td style={{ color: 'var(--sa-mu)' }}>{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
