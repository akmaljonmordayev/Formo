import { useEffect, useState } from 'react';
import { auditLogApi } from '../../../features/platform/platformApi';
import { useDebounced } from '../../../hooks/useDebounced';
import { downloadCsv } from '../../../utils/csvExport';
import { useLang } from '../i18n';

const CATEGORY_LABEL = {
  ORDER: 'Buyurtma',
  PAYMENT: "To'lov",
  USER: 'Foydalanuvchi',
  SETTING: 'Sozlama',
  CATALOG: 'Katalog',
  SYSTEM: 'Tizim',
};
const TABS = [['', 'Barchasi'], ...Object.entries(CATEGORY_LABEL)];
// Mijozlar sahifasi bilan bir xil o'lcham — ko'p amal bo'lsa sahifalarga bo'linadi
const LIMIT = 15;

export default function SuperadminAuditLog() {
  const { t, locale } = useLang();
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => setPage(1), [debouncedSearch, tab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    auditLogApi
      .list({ search: debouncedSearch, category: tab || undefined, page, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, tab, page]);

  const exportCsv = () => {
    downloadCsv(
      `audit-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [t('Vaqt'), (l) => new Date(l.createdAt).toLocaleString(locale)],
        [t('Kim'), (l) => l.actorName],
        [t('Roli'), (l) => l.actorRole],
        [t('Amal'), (l) => t(l.action)],
        [t('Obyekt'), (l) => l.context || ''],
        ['IP', (l) => l.ip || ''],
      ],
      data.items,
    );
  };

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t("Audit jurnali")}</h1>
          <p>{t("Kim, qachon va nimani o'zgartirgani. Yozuvlarni o'zgartirib ham, o'chirib ham bo'lmaydi.")}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={exportCsv} disabled={!data.items.length}>{t("CSV eksport")}</button>
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder={t("Kim, obyekt yoki FRM-raqam")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="sa-tabs">
        {TABS.map(([value, label]) => (
          <button key={value || 'all'} type="button" className={`sa-tab${tab === value ? ' is-active' : ''}`} onClick={() => setTab(value)}>
            {t(label)}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>№</th>
              <th>{t("Vaqt")}</th>
              <th>{t("Kim")}</th>
              <th>{t("Amal")}</th>
              <th>{t("Obyekt")}</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={6} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>{t("Yuklanmoqda...")}</td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={6} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>{t("Yozuv topilmadi")}</td>
              </tr>
            ) : (
              data.items.map((l, i) => {
                const d = new Date(l.createdAt);
                return (
                  <tr key={l.id}>
                    <td className="sa-table__sub">{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      <span className="sa-table__sub">{d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
                    </td>
                    <td>
                      <b>{l.actorName}</b>
                      <span className="sa-table__sub">{l.actorRole}</span>
                    </td>
                    <td>{t(l.action)}</td>
                    <td style={{ color: 'var(--sa-mu)' }}>{l.context || '—'}</td>
                    <td style={{ color: 'var(--sa-mu)' }}>{l.ip || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Mijozlar sahifasidagi kabi — bitta sahifa bo'lsa ham doim ko'rinadi */}
      <div className="pager">
        <span>{t('Jami')}: {data.total}</span>
        <div>
          <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </button>
          <span className="btn btn--ghost btn--sm">
            {page} / {Math.max(1, Math.ceil(data.total / LIMIT))}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={page >= Math.ceil(data.total / LIMIT)}
            onClick={() => setPage(page + 1)}
          >
            →
          </button>
        </div>
      </div>
    </>
  );
}
