// Namuna narxlar — backend narx sozlamalari API'si ulanguncha
const SECTIONS = [
  {
    step: 1,
    title: 'Klub formasi',
    items: [
      { label: 'Futbolka', sub: "Barcha o'lchamlar: 2-13 yosh va S-3XL", price: 99000 },
      { label: 'Shortik', sub: "Klub formasida doim bor, studiyada ixtiyoriy", price: 60000 },
      { label: 'Ism + raqam bosmasi', sub: 'Orqa tomonga. Shortikdagi raqam bepul', price: 30000 },
    ],
  },
  {
    step: 2,
    title: 'Dizayn studiyasi',
    items: [
      { label: "O'z dizayni", sub: "Rang, gradient, old yozuv va logo — hammasi shu narxda", price: 30000 },
    ],
  },
];

export default function SuperadminPricing() {
  return (
    <>
      <div className="sa-head">
        <div>
          <h1>Narxlar</h1>
          <p>Futbolka va bosma narxi. O'ng tomonda mijoz ko'radigan yakuniy narx.</p>
        </div>
      </div>

      <div className="sa-grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SECTIONS.map((sec) => (
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
                    key={it.label}
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
            Ilovadagi narx bilan bir xil. Bolalar va kattalar o'lchami narxi teng, yetkazish alohida.
          </p>

          <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
              <span>Klub formasi</span>
              <span>masalan, Real Madrid · Uy</span>
            </div>
            {[['Futbolka', '99 000'], ['Shortik', '+ 60 000'], ['Ism + raqam', '+ 30 000']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                <span>{l}</span>
                <span>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--sa-line)' }}>
              <div>
                <div className="sa-table__sub">Jami</div>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>189 000</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sa-table__sub">Yetkazish bilan</div>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--sa-accent)' }}>204 000</b>
              </div>
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 14, background: 'var(--sa-surface-2)', border: '1px solid var(--sa-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sa-mu)', marginBottom: 10 }}>
              <span>O'z dizayni</span>
              <span>Dizayn studiyasi</span>
            </div>
            {[['Futbolka + ism va raqam', '129 000'], ['O\'z dizayni (ixtiyoriy)', '+ 30 000'], ['Shortik (ixtiyoriy)', '+ 60 000']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                <span>{l}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
