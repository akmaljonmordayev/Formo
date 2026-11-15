import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, CheckCircle2, Hourglass, PackageCheck, Printer, RefreshCw } from 'lucide-react';
import { productionApi } from '../../../features/platform/platformApi';
import { useT } from '../i18n';

// Buyurtma chapdan o'ngga shu uch bosqichdan o'tadi
const STEPS = [
  { key: 'ACCEPTED', icon: Hourglass, color: 'var(--sa-accent)', title: 'Navbatda', sub: 'Bosishni kutmoqda' },
  { key: 'PRINTING', icon: Printer, color: 'var(--sa-blue)', title: 'Bosilmoqda', sub: 'Hozir ishlanmoqda' },
  { key: 'READY', icon: PackageCheck, color: 'var(--sa-green)', title: 'Tayyor', sub: 'Yetkazishga tayyor' },
];
// Qabul qilinganiga shuncha vaqt o'tgan, hali tayyor bo'lmagan vazifa — kechikkan (server qoidasi bilan bir xil)
const LATE_AFTER_MS = 21 * 60 * 60 * 1000;

const PRODUCT_LABEL = { CLUB_KIT: 'Klub formasi', KIT_DESIGN: '3D dizayn' };

const loadColor = (pct) => (pct >= 100 ? 'var(--sa-red)' : pct >= 70 ? 'var(--sa-accent)' : 'var(--sa-green)');

export default function SuperadminProduction() {
  const t = useT();
  const navigate = useNavigate();
  const openOrder = (code) => navigate(`/superadmin/orders?search=${encodeURIComponent(code)}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return productionApi
      .get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** "25 daqiqa oldin" / "3 soat oldin" / "2 kun oldin" */
  const ago = (iso) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 60) return t('{n} daqiqa oldin', { n: minutes });
    if (minutes < 60 * 24) return t('{n} soat oldin', { n: Math.round(minutes / 60) });
    return t('{n} kun oldin', { n: Math.round(minutes / (60 * 24)) });
  };

  const workshops = data?.workshops ?? [];
  const columns = data?.columns ?? {};
  const late = data?.lateCount ?? 0;

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>{t('Ishlab chiqarish')}</h1>
          <p>{t("Har bir buyurtma 3 bosqichdan o'tadi: navbat → bosish → tayyor. Kartochkani bossangiz buyurtma ochiladi.")}</p>
        </div>
        <button type="button" className="sa-btn sa-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
          {loading ? t('Yuklanmoqda...') : t('Yangilash')}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {data && (
        <>
          <div className="sa-flow">
            {STEPS.map(({ key, icon: Icon, color, title }, i) => (
              <div key={key} className="sa-flow__step" style={{ '--step': color, '--sa-delay': `${i * 70}ms` }}>
                <span className="sa-flow__num">
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <b>{(columns[key] ?? []).length}</b>
                  <span>{i + 1}. {t(title)}</span>
                </div>
              </div>
            ))}
            <div className={`sa-flow__step${late > 0 ? ' is-alert' : ''}`} style={{ '--step': late > 0 ? 'var(--sa-red)' : 'var(--sa-green)', '--sa-delay': '210ms' }}>
              <span className="sa-flow__num">
                {late > 0 ? <AlarmClock size={20} strokeWidth={1.9} aria-hidden="true" /> : <CheckCircle2 size={20} strokeWidth={1.9} aria-hidden="true" />}
              </span>
              <div>
                <b>{late}</b>
                <span>{late > 0 ? t('Kechikmoqda — avval shularni bosing') : t("Kechikkan vazifa yo'q")}</span>
              </div>
            </div>
          </div>

          <div className="sa-panel" style={{ marginBottom: 16 }}>
            <div className="sa-panel__head">
              <div>
                <div className="sa-panel__title">{t('Sexlar yuki')}</div>
                <div className="sa-panel__sub">{t("Sexda hozir nechta vazifa bor va kunlik sig'imining qancha qismi band")}</div>
              </div>
            </div>
            {workshops.length === 0 ? (
              <div className="sa-chart-empty">{t("Hali faol tikuv sexi yo'q.")}</div>
            ) : (
              <div className="sa-rows">
                {workshops.map((w) => (
                  <div key={w.id}>
                    <div className="sa-row__top">
                      <b>{w.name}</b>
                      <b>
                        {w.capacity ? t('{a} / {b} dona', { a: w.activeCount, b: w.capacity }) : t('{n} faol vazifa', { n: w.activeCount })}
                        <span> · {w.capacity ? `${w.loadPct}%` : t("Kunlik sig'im kiritilmagan")}</span>
                      </b>
                    </div>
                    <div className="sa-meter">
                      <div className="sa-meter__fill" style={{ width: `${Math.min(w.loadPct ?? 0, 100)}%`, '--meter': loadColor(w.loadPct ?? 0) }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sa-board">
            {STEPS.map(({ key, color, title, sub }, i) => {
              const jobs = columns[key] ?? [];
              return (
                <section key={key} className="sa-board__col" style={{ '--step': color }}>
                  <div className="sa-board__head">
                    <div>
                      <b>{i + 1}. {t(title)}</b>
                      <small>{t(sub)}</small>
                    </div>
                    <span className="sa-board__count">{jobs.length}</span>
                  </div>
                  {jobs.length === 0 ? (
                    <div className="sa-chart-empty" style={{ padding: '18px 0' }}>{t("Bo'sh")}</div>
                  ) : (
                    <div className="sa-board__list">
                      {jobs.map((j) => {
                        const waiting = j.status === 'SENT_TO_WORKSHOP';
                        const isLate = key !== 'READY' && !waiting && Date.now() - new Date(j.createdAt).getTime() > LATE_AFTER_MS;
                        return (
                          <div
                            key={j.id}
                            className={`sa-job${isLate ? ' is-late' : ''}`}
                            role="link"
                            tabIndex={0}
                            onClick={() => openOrder(j.code)}
                            onKeyDown={(e) => e.key === 'Enter' && openOrder(j.code)}
                          >
                            <div className="sa-job__top">
                              <b>{j.code}</b>
                              {isLate ? (
                                <span className="sa-badge sa-badge--red">{t('Kechikmoqda')}</span>
                              ) : waiting ? (
                                <span className="sa-badge sa-badge--orange">{t('Sex hali qabul qilmagan')}</span>
                              ) : (
                                <span>{ago(j.createdAt)}</span>
                              )}
                            </div>
                            <div className="sa-job__print">
                              <b>{(j.printName || j.customerName || '').toUpperCase()}</b>
                              <span>{j.printNumber ?? ''}</span>
                            </div>
                            <div className="sa-job__meta">
                              {[j.club?.name ?? j.kitLabel, j.size, t(PRODUCT_LABEL[j.productType] ?? "O'z dizayni"), t('{n} dona', { n: j.quantity })]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {!data && loading && <div className="sa-chart-empty">{t('Yuklanmoqda...')}</div>}
    </>
  );
}
