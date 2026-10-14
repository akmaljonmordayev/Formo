import { useMemo, useState } from 'react';

// Namuna ma'lumot — backend buyurtmalar API'si ulanguncha
const ORDERS = [
  { id: 'FRM-88424', name: 'Aziz Karimov', phone: '+998 90 511-20-33', sum: 204000, pay: 'Click', status: 'Qabul qilindi', color: 'blue', sex: 'Chilonzor-1', channel: 'app', date: '27-sen 14:10' },
  { id: 'FRM-88423', name: 'Madina Sobirova', phone: '+998 93 220-17-45', sum: 453000, pay: 'Payme', status: 'Bosilmoqda', color: 'violet', sex: 'Chilonzor-1', channel: 'app', date: '27-sen 13:52' },
  { id: 'FRM-88422', name: 'Timur Aliev', phone: '+998 97 404-88-10', sum: 204000, pay: "Naqd · kutilmoqda", status: "To'lov kutilmoqda", color: 'orange', sex: '—', channel: 'app', date: '27-sen 13:31' },
  { id: 'FRM-88421', name: 'Nigora Tursunova', phone: '+998 99 131-62-04', sum: 204000, pay: 'Click · xato', status: 'Bekor qilindi', color: 'red', sex: '—', channel: 'app', date: '27-sen 12:27' },
  { id: 'FRM-88419', name: 'Shoxrux Nazarov', phone: '+998 90 700-45-12', sum: 204000, pay: 'Payme', status: 'Bekor qilindi', color: 'red', sex: '—', channel: 'app', date: '26-sen 18:03' },
  { id: 'FRM-88417', name: 'Kamola Usmonova', phone: '+998 94 318-27-90', sum: 612000, pay: 'Click', status: 'Yetkazildi', color: 'green', sex: 'Yunusobod', channel: 'app', date: '26-sen 10:14' },
];

const TABS = [
  { label: 'Barchasi', count: 10 },
  { label: "To'lov kutilmoqda", count: 1 },
  { label: 'Tasdiqlangan', count: 1 },
  { label: 'Ishlab chiqarishda', count: 2 },
  { label: 'Yetkazishda', count: 2 },
  { label: 'Yetkazildi', count: 1 },
  { label: 'Bekor / qaytarilgan', count: 3 },
];

export default function SuperadminOrders() {
  const [tab, setTab] = useState('Barchasi');
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => ORDERS.filter((o) => `${o.name} ${o.phone} ${o.id}`.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Buyurtmalar</h1>
          <p>Barcha buyurtmalar. Qatorni bosib tafsilot va amallarni oching.</p>
        </div>
      </div>

      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t.label} type="button" className={`sa-tab${tab === t.label ? ' is-active' : ''}`} onClick={() => setTab(t.label)}>
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Raqam, telefon yoki ism"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="sa-btn sa-btn--ghost">CSV</button>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Mijoz</th>
              <th>Summa</th>
              <th>To'lov</th>
              <th>Status</th>
              <th>Sex</th>
              <th>Kanal</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td><b>{o.id}</b></td>
                <td>
                  {o.name}
                  <span className="sa-table__sub">{o.phone}</span>
                </td>
                <td>{o.sum.toLocaleString('uz-UZ')}</td>
                <td>{o.pay}</td>
                <td><span className={`sa-badge sa-badge--${o.color}`}>{o.status}</span></td>
                <td>{o.sex}</td>
                <td>{o.channel}</td>
                <td>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
