import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

const STATUSES = ['Barchasi', 'Yangi', 'Jarayonda', 'Tikilmoqda', 'Yetkazildi', 'Bekor qilingan'];

// Buyurtmalar API hali yo'q: tuzilma tayyor, ma'lumot ulanganda jadval to'ladi
export default function OperatorOrders() {
  const [status, setStatus] = useState(STATUSES[0]);
  const [query, setQuery] = useState('');

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>Buyurtmalar</h1>
          <p>Mijozlar buyurtmalarini kuzatish va tikuv sexlariga yo‘naltirish</p>
        </div>
      </div>

      <section className="op-cd">
        <div className="op-fl">
          <input
            type="search"
            className="op-in"
            style={{ flex: '1 1 220px', width: 'auto' }}
            placeholder="Buyurtma raqami yoki mijoz bo‘yicha"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buyurtmalarni qidirish"
          />
          <div className="op-row is-w" style={{ gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`op-chip${status === s ? ' is-on' : ''}`}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="op-sc">
          <table className="op-tb">
            <thead>
              <tr>
                <th>Buyurtma</th>
                <th>Mijoz</th>
                <th>Tikuv sexi</th>
                <th>Holat</th>
                <th>Sana</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="op-em">
          <ShoppingBag size={28} aria-hidden="true" />
          <h3>Buyurtmalar hali yo‘q</h3>
          <p>Buyurtmalar moduli backendga ulanganda ro‘yxat shu yerda paydo bo‘ladi.</p>
        </div>
      </section>
    </>
  );
}
