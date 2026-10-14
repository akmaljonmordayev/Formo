import { useEffect, useState } from 'react';
import { auditLogApi } from '../../../features/platform/platformApi';
import { useDebounced } from '../../../hooks/useDebounced';

const CATEGORY_LABEL = {
  ORDER: 'Buyurtma',
  PAYMENT: "To'lov",
  USER: 'Foydalanuvchi',
  SETTING: 'Sozlama',
  CATALOG: 'Katalog',
  SYSTEM: 'Tizim',
};
const TABS = [['', 'Barchasi'], ...Object.entries(CATEGORY_LABEL)];

export default function SuperadminAuditLog() {
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    auditLogApi
      .list({ search: debouncedSearch, category: tab || undefined, limit: 100 })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, tab]);

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
        {TABS.map(([value, label]) => (
          <button key={value || 'all'} type="button" className={`sa-tab${tab === value ? ' is-active' : ''}`} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Vaqt</th>
              <th>Kim</th>
              <th>Amal</th>
              <th>Obyekt</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={5} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>Yuklanmoqda...</td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={5} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>Yozuv topilmadi</td>
              </tr>
            ) : (
              data.items.map((l) => {
                const d = new Date(l.createdAt);
                return (
                  <tr key={l.id}>
                    <td>
                      {d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      <span className="sa-table__sub">{d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}</span>
                    </td>
                    <td>
                      <b>{l.actorName}</b>
                      <span className="sa-table__sub">{l.actorRole}</span>
                    </td>
                    <td>{l.action}</td>
                    <td style={{ color: 'var(--sa-mu)' }}>{l.context || '—'}</td>
                    <td style={{ color: 'var(--sa-mu)' }}>{l.ip || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
