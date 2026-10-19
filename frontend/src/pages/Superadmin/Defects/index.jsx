import { useEffect, useState } from 'react';
import { defectsApi, formatDateTime } from '../../../features/platform/platformApi';
import Modal from '../../../components/ui/Modal';
import { useT } from '../i18n';

const LIMIT = 20;
const REASON_LABEL = {
  PRINT_SHIFT: "Bosma siljigan",
  FABRIC: 'Mato nuqsoni',
  WRONG_SIZE: "O'lcham xato",
  OTHER: 'Boshqa',
};
const STATUS = {
  OPEN: { label: 'Ochiq', color: 'orange' },
  RESOLVED: { label: 'Hal qilingan', color: 'green' },
};

export default function SuperadminDefects() {
  const t = useT();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, openCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    defectsApi
      .list({ status: status || undefined, page, limit: LIMIT })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, page, reload]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));
  const tabs = [
    { label: 'Barchasi', value: '' },
    { label: 'Ochiq', value: 'OPEN', count: data.openCount },
    { label: 'Hal qilingan', value: 'RESOLVED' },
  ];

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Nuqsonlar (brak)')}</h1>
          <p>{t("Sexlar xabar bergan nuqsonlar. Muammo hal bo'lgach «Hal qilindi» deb belgilang.")}</p>
        </div>
      </div>

      <div className="sa-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.value}
            type="button"
            className={`sa-tab${status === tb.value ? ' is-active' : ''}`}
            onClick={() => {
              setStatus(tb.value);
              setPage(1);
            }}
          >
            {t(tb.label)}
            {tb.count != null ? ` · ${tb.count}` : ''}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t('Buyurtma')}</th>
              <th>{t('Sex')}</th>
              <th>{t('Sabab')}</th>
              <th>{t('Soni')}</th>
              <th>{t('Izoh')}</th>
              <th>{t('Holat')}</th>
              <th>{t('Sana')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>{t('Yuklanmoqda...')}</td>
              </tr>
            ) : !data.items.length ? (
              <tr>
                <td colSpan={8} className="sa-table__sub" style={{ textAlign: 'center', padding: 20 }}>{t('Nuqson topilmadi')}</td>
              </tr>
            ) : (
              data.items.map((d) => {
                const st = STATUS[d.status] ?? { label: d.status, color: 'blue' };
                return (
                  <tr key={d.id}>
                    <td>
                      <b>{d.order?.code}</b>
                      <span className="sa-table__sub">{d.order?.customerName}</span>
                    </td>
                    <td>{d.workshop?.workshopName || d.workshop?.fullName || '—'}</td>
                    <td>{t(REASON_LABEL[d.reason] ?? d.reason)}</td>
                    <td>{d.qty}</td>
                    <td>
                      {d.note || '—'}
                      {d.resolvedNote && <span className="sa-table__sub">{d.resolvedNote}</span>}
                    </td>
                    <td><span className={`sa-badge sa-badge--${st.color}`}>{t(st.label)}</span></td>
                    <td>{formatDateTime(d.createdAt)}</td>
                    <td>
                      {d.status === 'OPEN' && (
                        <button type="button" className="sa-btn sa-btn--ghost" onClick={() => setResolving(d)}>
                          {t('Hal qilindi')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="sa-table__sub" style={{ marginTop: 0 }}>{t('Jami')}: {data.total}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="sa-btn sa-btn--ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            <span className="sa-table__sub" style={{ marginTop: 0 }}>{page} / {pages}</span>
            <button type="button" className="sa-btn sa-btn--ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>→</button>
          </div>
        </div>
      )}

      {resolving && (
        <ResolveModal
          defect={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

function ResolveModal({ defect, onClose, onDone }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await defectsApi.resolve(defect.id, note.trim() || undefined);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={t('Nuqsonni hal qilish · {code}', { code: defect.order?.code ?? '' })} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label className="field field--full">
          <span>{t('Izoh (ixtiyoriy)')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
        </label>
        <div className="modal__foot" style={{ padding: '14px 0 0' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" className="btn btn--accent" disabled={saving}>
            {saving ? t('Saqlanmoqda...') : t('Hal qilindi')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
