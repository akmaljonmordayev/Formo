import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff } from 'lucide-react';

const TABS = ['Barchasi', 'O‘qilmagan'];

// Bildirishnomalar API hali yo'q — bo'sh holat va sozlamalarga havola
export default function OperatorNotifications() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>Bildirishnomalar</h1>
          <p>Buyurtmalar va tikuv sexlari bo‘yicha xabarlar</p>
        </div>
        <Link to="/operator/settings" className="op-b">
          Sozlash
        </Link>
      </div>

      <div className="op-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`op-tab${tab === t ? ' is-on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="op-cd">
        <div className="op-em">
          <BellOff size={28} aria-hidden="true" />
          <h3>{tab === TABS[0] ? 'Bildirishnomalar yo‘q' : 'Hammasi o‘qilgan'}</h3>
          <p>Yangi buyurtma yoki sex holati o‘zgarganda xabar shu yerda paydo bo‘ladi.</p>
        </div>
      </section>
    </>
  );
}
