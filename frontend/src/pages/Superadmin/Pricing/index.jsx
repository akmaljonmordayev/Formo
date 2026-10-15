import { useEffect, useState } from 'react';
import { pricingApi, money } from '../../../features/platform/platformApi';

export default function SuperadminPricing() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    pricingApi
      .list()
      .then((d) => active && setItems(d))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const sections = Array.from(new Set(items.map((i) => i.section))).map((title) => ({
    title,
    step: items.find((i) => i.section === title)?.step ?? 1,
    items: items.filter((i) => i.section === title),
  }));

  const priced = (key) => items.find((i) => i.key === key)?.price ?? 0;
  const tshirt = priced('club.tshirt');
  const shorts = priced('club.shorts');
  const print = priced('club.print');
  const delivery = priced('delivery');
  const studioBase = priced('studio.custom');

  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Narxlar</h1>
          <p>Futbolka va bosma narxi. O'ng tomonda mijoz ko'radigan yakuniy narx.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="sa-table__sub" style={{ padding: 20 }}>Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="sa-panel">
          <div className="sa-table__sub">Hali narx jadvali kiritilmagan.</div>
        </div>
      ) : (
        <div className="sa-grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sections.map((sec) => (
              <div key={sec.title} className="sa-panel">
                <div className="sa-panel__head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="sa-kanban__step">{sec.step}</span>
                    <span className="sa-panel__title">{sec.title}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sec.items.map((it) => (
                    <div
                      key={it.key}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
                        padding: '12px 14px', borderRadius: 12, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.label}</div>
                        <div className="sa-table__sub">{it.sub}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{it.price.toLocaleString('uz-UZ')}</b>
                        <span className="sa-table__sub" style={{ marginTop: 0 }}>so'm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sa-panel">
            <div className="sa-panel__title" style={{ marginBottom: 6 }}>Mijoz ko'radigan narx</div>
            <p className="sa-table__sub" style={{ marginBottom: 14 }}>
              Ilovadagi narx bilan bir xil — yuqoridagi jadvaldan avtomatik hisoblanadi.
            </p>

            <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
                <span>Klub formasi</span>
              </div>
              {[['Futbolka', money(tshirt)], ['Shortik', `+ ${money(shorts)}`], ['Ism + raqam', `+ ${money(print)}`]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                  <span>{l}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sa-line)' }}>
                <div>
                  <div className="sa-table__sub">Jami</div>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{(tshirt + shorts + print).toLocaleString('uz-UZ')}</b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sa-table__sub">Yetkazish bilan</div>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--sa-accent)' }}>
                    {(tshirt + shorts + print + delivery).toLocaleString('uz-UZ')}
                  </b>
                </div>
              </div>
            </div>

            {studioBase > 0 && (
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
                  <span>Dizayn studiyasi</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                  <span>O'z dizayni</span>
                  <span>{money(studioBase)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
