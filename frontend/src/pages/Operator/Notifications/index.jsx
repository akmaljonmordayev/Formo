import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { useT } from '../i18n';

const TABS = ['notif.all', 'notif.unread'];

// Bildirishnomalar API hali yo'q — bo'sh holat va sozlamalarga havola
export default function OperatorNotifications() {
  const t = useT();
  const [tab, setTab] = useState(TABS[0]);

  return (
    <>
      <div className="op-ph">
        <div>
          <h1>{t('menu.notifications')}</h1>
          <p>{t('notif.subtitle')}</p>
        </div>
        <Link to="/operator/settings" className="op-b">
          {t('notif.configure')}
        </Link>
      </div>

      <div className="op-tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`op-tab${tab === key ? ' is-on' : ''}`}
            onClick={() => setTab(key)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <section className="op-cd">
        <div className="op-em">
          <BellOff size={28} aria-hidden="true" />
          <h3>{t(tab === TABS[0] ? 'notif.none' : 'notif.allRead')}</h3>
          <p>{t('notif.hint')}</p>
        </div>
      </section>
    </>
  );
}
