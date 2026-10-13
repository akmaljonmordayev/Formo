import { useState } from 'react'

const SOLID_COLORS = [
  { id: 'oq', label: 'Oq', value: '#eef1f6' },
  { id: 'qora', label: 'Qora', value: '#14161c' },
  { id: 'toqkok', label: "To'q ko'k", value: '#1b2550' },
  { id: 'lojuvard', label: 'Lojuvard', value: '#3c4fd6' },
  { id: 'firuza', label: 'Firuza', value: '#17a999' },
  { id: 'sariq', label: 'Sariq', value: '#eda234' },
  { id: 'qizil', label: 'Qizil', value: '#d9444f' },
  { id: 'yashil', label: 'Yashil', value: '#3fa457' },
]

const GRADIENTS = [
  { id: 'quyosh', label: 'Quyosh', from: '#f2994a', to: '#e9544f' },
  { id: 'dengiz', label: 'Dengiz', from: '#17a999', to: '#2f6fd6' },
  { id: 'olov', label: 'Olov', from: '#e04b4b', to: '#7a1f2b' },
  { id: 'tong', label: 'Tong', from: '#a7d2f2', to: '#8c6fe0' },
  { id: 'tun', label: 'Tun', from: '#1b2550', to: '#06070d' },
  { id: 'chempion', label: 'Chempion', from: '#2f9e6e', to: '#e0c23a' },
]

const CUSTOM_COLOR = { id: 'custom', label: "O'z rangingiz (paint)", value: '#7a4fd1', hex: '#7A4FD1' }

const STEPS = [
  { id: 1, title: 'Rang', subtitle: '15 / 15 faol' },
  { id: 2, title: 'Yozuv', subtitle: '3 / 3 shrift' },
  { id: 3, title: 'Yamoq va qadoq', subtitle: '5 / 5 faol' },
  { id: 4, title: 'Logo', subtitle: 'yoqilgan' },
]

const FONTS = [
  { id: 'sport', label: 'Sport', desc: 'Tor, futbolcha', fontFamily: "'Arial Black', Arial, sans-serif" },
  { id: 'klassik', label: 'Klassik', desc: 'Keng, qalin', fontFamily: "Georgia, 'Times New Roman', serif" },
  { id: 'oddiy', label: 'Oddiy', desc: 'Yumaloq, sodda', fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif" },
]

const TEXT_RULES = [
  { label: 'Ism', value: '12 belgigacha, lotin' },
  { label: 'Raqam', value: '0 dan 99 gacha' },
  { label: "Taqiqlangan so'zlar", value: '10 ta' },
]

const PATCHES = [
  { id: 'kapitan', label: 'Kapitan', icon: 'C', desc: "yengga, «C» belgisi", price: '+10 000' },
  { id: 'bayroq', label: 'Bayroq', icon: 'UZ', desc: "O'zbekiston bayrog'i", price: '+10 000' },
  { id: 'chempion', label: 'Chempion', icon: '★', desc: 'oltin yulduz', price: '+10 000' },
]

const PACKAGES = [
  { id: 'oddiy-paket', label: 'Oddiy paket', desc: 'Polietilen, Formo logotipi bilan', price: 'Bepul' },
  { id: 'sovga-qutisi', label: "Sovg'a qutisi", desc: 'Karton quti, lenta, tabriknoma', price: '+15 000' },
]

const LOGO_SPECS = [
  { label: 'Format', value: 'PNG yoki SVG' },
  { label: 'Hajm', value: '5 MB gacha' },
  { label: 'Fon', value: 'avtomatik olinadi' },
]

const LOGO_TOGGLES = [
  { id: 'upload', label: 'Logo yuklash', desc: "Mijoz o'z rasmini yuklaydi" },
  { id: 'ai', label: 'AI bilan logo yaratish', desc: "Matn bo'yicha logo chizib beradi · 2-versiya" },
]

function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round(255 * percent)
  let g = ((num >> 8) & 0xff) + Math.round(255 * percent)
  let b = (num & 0xff) + Math.round(255 * percent)
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`ds-toggle${checked ? ' is-on' : ''}`}
    >
      <span className="ds-toggle-knob" />
    </button>
  )
}

function DesignStudio() {
  const [view, setView] = useState('orqa')
  const [activeStep, setActiveStep] = useState(1)
  const [colorSelection, setColorSelection] = useState({ type: 'solid', id: 'lojuvard' })
  const [name, setName] = useState('SAMIR')
  const [number, setNumber] = useState('7')

  const [solidToggles, setSolidToggles] = useState(
    Object.fromEntries(SOLID_COLORS.map((c) => [c.id, true]))
  )
  const [gradientToggles, setGradientToggles] = useState(
    Object.fromEntries(GRADIENTS.map((g) => [g.id, true]))
  )
  const [customColorToggle, setCustomColorToggle] = useState(true)

  const [selectedFont, setSelectedFont] = useState('sport')
  const [fontToggles, setFontToggles] = useState(
    Object.fromEntries(FONTS.map((f) => [f.id, true]))
  )

  const [selectedPatch, setSelectedPatch] = useState(null)
  const [patchToggles, setPatchToggles] = useState(
    Object.fromEntries(PATCHES.map((p) => [p.id, true]))
  )
  const [packageToggles, setPackageToggles] = useState(
    Object.fromEntries(PACKAGES.map((p) => [p.id, true]))
  )

  const [logoToggles, setLogoToggles] = useState(
    Object.fromEntries(LOGO_TOGGLES.map((t) => [t.id, true]))
  )

  const activeFont = FONTS.find((f) => f.id === selectedFont)
  const activePatch = PATCHES.find((p) => p.id === selectedPatch)

  let jerseyTop
  let jerseyBottom
  let colorLabel
  let typeLabel

  if (colorSelection.type === 'gradient') {
    const g = GRADIENTS.find((x) => x.id === colorSelection.id)
    jerseyTop = g.from
    jerseyBottom = g.to
    colorLabel = g.label
    typeLabel = 'Gradient'
  } else if (colorSelection.type === 'custom') {
    jerseyTop = shade(CUSTOM_COLOR.value, 0.12)
    jerseyBottom = shade(CUSTOM_COLOR.value, -0.18)
    colorLabel = CUSTOM_COLOR.label
    typeLabel = 'Boshqa'
  } else {
    const c = SOLID_COLORS.find((x) => x.id === colorSelection.id)
    jerseyTop = shade(c.value, 0.12)
    jerseyBottom = shade(c.value, -0.18)
    colorLabel = c.label
    typeLabel = 'Bir rang'
  }

  const patchLabel = activePatch ? activePatch.label : "yo'q"

  return (
    <div className="ds-page">
      <style>{`
        .ds-page {
          min-height: 100vh;
          background: #060913;
          color: #f1f4fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 20px;
          box-sizing: border-box;
        }
        .ds-page * { box-sizing: border-box; }

        .ds-page-head { margin-bottom: 20px; }
        .ds-breadcrumb { font-size: 13px; color: #828aa3; margin-bottom: 14px; }
        .ds-breadcrumb strong { color: #fff; font-weight: 600; }
        .ds-page-title { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .ds-page-sub { font-size: 13.5px; color: #828aa3; }

        .ds-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        /* ---------- Sidebar ---------- */
        .ds-sidebar {
          width: 360px;
          flex-shrink: 0;
          background: #0b1020;
          border: 1px solid #1b2240;
          border-radius: 18px;
          padding: 18px;
        }
        .ds-sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .ds-sidebar-title {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        .ds-segment {
          display: flex;
          background: #121831;
          border: 1px solid #232c4d;
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        .ds-segment button {
          border: none;
          background: transparent;
          color: #8992ac;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
        }
        .ds-segment button.is-active {
          background: #fff;
          color: #121831;
        }

        .ds-preview {
          background: #0e1326;
          border: 1px solid #1b2240;
          border-radius: 14px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 280px;
        }

        .ds-fields {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .ds-field {
          background: #0e1326;
          border: 1px solid #232c4d;
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.5px;
          outline: none;
          width: 100%;
        }
        .ds-field.ds-field-number {
          width: 70px;
          text-align: center;
          flex-shrink: 0;
        }

        .ds-info {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ds-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .ds-info-row span:first-child { color: #828aa3; }
        .ds-info-row span:last-child { color: #fff; font-weight: 600; }

        .ds-divider {
          height: 1px;
          background: #1b2240;
          margin: 16px 0;
        }

        .ds-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ds-price-label { font-size: 13px; color: #828aa3; }
        .ds-price-value { font-size: 20px; font-weight: 800; color: #f5a623; }

        /* ---------- Main content ---------- */
        .ds-main { flex: 1; min-width: 0; }

        .ds-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .ds-step {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0b1020;
          border: 1px solid #1b2240;
          border-radius: 14px;
          padding: 12px 14px;
          cursor: pointer;
          text-align: left;
        }
        .ds-step.is-active {
          border-color: #f5a623;
          background: #14172a;
        }
        .ds-step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #1b2240;
          color: #aeb4ca;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ds-step.is-active .ds-step-num {
          background: #f5a623;
          color: #1a1300;
        }
        .ds-step-text { display: flex; flex-direction: column; min-width: 0; }
        .ds-step-text strong { font-size: 13.5px; color: #fff; white-space: nowrap; }
        .ds-step-text small { font-size: 11.5px; color: #828aa3; margin-top: 2px; }

        .ds-section {
          background: #0b1020;
          border: 1px solid #1b2240;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .ds-section-title { font-size: 15px; font-weight: 700; color: #fff; }
        .ds-section-sub { font-size: 12.5px; color: #828aa3; margin-top: 4px; margin-bottom: 18px; }

        .ds-grid-solid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .ds-grid-gradient {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .ds-swatch-card {
          background: #0e1326;
          border: 2px solid #1b2240;
          border-radius: 14px;
          padding: 10px;
        }
        .ds-swatch-card.is-active {
          border-color: #f5a623;
        }
        .ds-swatch-btn {
          width: 100%;
          height: 70px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          padding: 0;
        }
        .ds-swatch-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
        }
        .ds-swatch-label { font-size: 13px; font-weight: 600; color: #fff; }

        .ds-toggle {
          width: 38px;
          height: 21px;
          border-radius: 999px;
          background: #232c4d;
          border: none;
          cursor: pointer;
          position: relative;
          padding: 0;
          flex-shrink: 0;
        }
        .ds-toggle.is-on { background: #1aa987; }
        .ds-toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.15s ease;
        }
        .ds-toggle.is-on .ds-toggle-knob {
          transform: translateX(17px);
        }

        .ds-color-row {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #0e1326;
          border: 1px solid #1b2240;
          border-radius: 14px;
          padding: 16px;
          margin-top: 16px;
        }
        .ds-color-row-swatch {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .ds-color-row-text { flex: 1; min-width: 0; }
        .ds-color-row-text strong { font-size: 14px; color: #fff; display: block; }
        .ds-color-row-text div { font-size: 12px; color: #828aa3; margin-top: 4px; }
        .ds-color-row-text code { color: #aeb4ca; }

        .ds-spec-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ds-spec-card {
          background: #0e1326;
          border: 1px solid #1b2240;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ds-spec-label { font-size: 12px; color: #828aa3; margin-bottom: 6px; }
        .ds-spec-value { font-size: 14px; font-weight: 700; color: #fff; }

        .ds-list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0e1326;
          border: 1px solid #1b2240;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ds-list-row + .ds-list-row { margin-top: 12px; }
        .ds-list-row-text strong { font-size: 13.5px; color: #fff; display: block; }
        .ds-list-row-text div { font-size: 12px; color: #828aa3; margin-top: 3px; }
        .ds-list-row-right { display: flex; align-items: center; gap: 16px; }
        .ds-list-price { font-size: 13px; font-weight: 700; color: #f5a623; }

        .ds-badge-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ds-badge-card {
          background: #0e1326;
          border: 2px solid #1b2240;
          border-radius: 14px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
        }
        .ds-badge-card.is-active { border-color: #f5a623; }
        .ds-badge-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f7b955, #e0861f);
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 17px;
          color: #2a1800;
        }
        .ds-badge-title { font-size: 14px; font-weight: 700; color: #fff; }
        .ds-badge-desc { font-size: 12px; color: #828aa3; margin-top: 4px; }
        .ds-badge-price { font-size: 12.5px; font-weight: 700; color: #f5a623; margin-top: 8px; }
        .ds-badge-footer { margin-top: 14px; display: flex; justify-content: center; }

        .ds-font-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .ds-font-card {
          background: #0e1326;
          border: 2px solid #1b2240;
          border-radius: 14px;
          padding: 12px;
        }
        .ds-font-card.is-active { border-color: #f5a623; }
        .ds-font-preview {
          width: 100%;
          min-height: 104px;
          background: #121831;
          border: 1px solid #232c4d;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-align: center;
          cursor: pointer;
        }
        .ds-font-preview .ds-font-name {
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 1px;
          display: block;
        }
        .ds-font-preview .ds-font-num {
          font-size: 34px;
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          display: block;
        }
        .ds-font-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }
        .ds-font-footer-text strong { font-size: 13px; color: #fff; display: block; }
        .ds-font-footer-text div { font-size: 11.5px; color: #828aa3; margin-top: 2px; }

        @media (max-width: 960px) {
          .ds-layout { flex-direction: column; }
          .ds-sidebar { width: 100%; }
          .ds-grid-solid { grid-template-columns: repeat(2, 1fr); }
          .ds-grid-gradient { grid-template-columns: repeat(2, 1fr); }
          .ds-steps { grid-template-columns: repeat(2, 1fr); }
          .ds-spec-grid { grid-template-columns: repeat(1, 1fr); }
          .ds-badge-grid { grid-template-columns: repeat(1, 1fr); }
          .ds-font-grid { grid-template-columns: repeat(1, 1fr); }
        }
      `}</style>

      <div className="ds-page-head">
        <div className="ds-breadcrumb">
          Katalog <span>/</span> <strong>Dizayn studiyasi</strong>
        </div>
        <div className="ds-page-title">Dizayn studiyasi</div>
        <div className="ds-page-sub">
          Mijoz ilovadagi «Dizayn studiyasi»da ko'radigan tanlovlar. O'chirilgani ilovada ko'rinmaydi.
        </div>
      </div>

      <div className="ds-layout">
        {/* ---------- Sidebar ---------- */}
        <aside className="ds-sidebar">
          <div className="ds-sidebar-head">
            <span className="ds-sidebar-title">Mijoz ko'radigan forma</span>
            <div className="ds-segment">
              <button
                className={view === 'orqa' ? 'is-active' : ''}
                onClick={() => setView('orqa')}
              >
                Orqa
              </button>
              <button
                className={view === 'old' ? 'is-active' : ''}
                onClick={() => setView('old')}
              >
                Old
              </button>
            </div>
          </div>

          <div className="ds-preview">
            <svg width="220" height="260" viewBox="0 0 280 280">
              <defs>
                <linearGradient id="jerseyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={jerseyTop} />
                  <stop offset="100%" stopColor={jerseyBottom} />
                </linearGradient>
              </defs>
              <path
                d="M95,20 L60,20 L10,65 L35,100 L60,85 L60,260 L220,260 L220,85 L245,100 L270,65 L220,20 L185,20 C185,45 165,60 140,60 C115,60 95,45 95,20 Z"
                fill="url(#jerseyGrad)"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1"
              />
              <text
                x="140"
                y="152"
                textAnchor="middle"
                fontSize="20"
                fontWeight="800"
                fill="#ffffff"
                letterSpacing="1.5"
                fontFamily={activeFont.fontFamily}
              >
                {name || 'SAMIR'}
              </text>
              <text
                x="140"
                y="228"
                textAnchor="middle"
                fontSize="68"
                fontWeight="800"
                fill="#ffffff"
                fontFamily={activeFont.fontFamily}
              >
                {number || '7'}
              </text>
              {activePatch && (
                <g>
                  <circle cx="195" cy="108" r="13" fill="#0e1326" stroke="#f5a623" strokeWidth="2" />
                  <text x="195" y="113" textAnchor="middle" fontSize="11" fontWeight="800" fill="#f5a623">
                    {activePatch.icon}
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="ds-fields">
            <input
              className="ds-field"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              maxLength={12}
            />
            <input
              className="ds-field ds-field-number"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </div>

          <div className="ds-info">
            <div className="ds-info-row">
              <span>Rang</span>
              <span>{colorLabel}</span>
            </div>
            <div className="ds-info-row">
              <span>Shrift</span>
              <span>{activeFont.label}</span>
            </div>
            <div className="ds-info-row">
              <span>Yamoq</span>
              <span>{patchLabel}</span>
            </div>
            <div className="ds-info-row">
              <span>Turi</span>
              <span>{typeLabel}</span>
            </div>
          </div>

          <div className="ds-divider" />

          <div className="ds-price-row">
            <span className="ds-price-label">Shu forma narxi</span>
            <span className="ds-price-value">129 000 so'm</span>
          </div>
        </aside>

        {/* ---------- Main content ---------- */}
        <main className="ds-main">
          <div className="ds-steps">
            {STEPS.map((s) => (
              <button
                key={s.id}
                className={`ds-step${activeStep === s.id ? ' is-active' : ''}`}
                onClick={() => setActiveStep(s.id)}
              >
                <span className="ds-step-num">{s.id}</span>
                <span className="ds-step-text">
                  <strong>{s.title}</strong>
                  <small>{s.subtitle}</small>
                </span>
              </button>
            ))}
          </div>

          {activeStep === 1 && (
            <>
              <section className="ds-section">
                <div className="ds-section-title">Bir rang</div>
                <div className="ds-section-sub">
                  Rangni bosing — chapdagi ko'rinadi. O'ngdagi tugma ilovada ko'rsatish yoki yashirish.
                </div>
                <div className="ds-grid-solid">
                  {SOLID_COLORS.map((c) => (
                    <div
                      key={c.id}
                      className={`ds-swatch-card${
                        colorSelection.type === 'solid' && colorSelection.id === c.id ? ' is-active' : ''
                      }`}
                    >
                      <button
                        className="ds-swatch-btn"
                        style={{ background: c.value }}
                        onClick={() => setColorSelection({ type: 'solid', id: c.id })}
                      />
                      <div className="ds-swatch-footer">
                        <span className="ds-swatch-label">{c.label}</span>
                        <Toggle
                          checked={solidToggles[c.id]}
                          onChange={() =>
                            setSolidToggles((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-title">Gradient</div>
                <div className="ds-section-sub">
                  Ikki rangli o'tish. Bosma doim oq yoki to'q rangda.
                </div>
                <div className="ds-grid-gradient">
                  {GRADIENTS.map((g) => (
                    <div
                      key={g.id}
                      className={`ds-swatch-card${
                        colorSelection.type === 'gradient' && colorSelection.id === g.id ? ' is-active' : ''
                      }`}
                    >
                      <button
                        className="ds-swatch-btn"
                        style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
                        onClick={() => setColorSelection({ type: 'gradient', id: g.id })}
                      />
                      <div className="ds-swatch-footer">
                        <span className="ds-swatch-label">{g.label}</span>
                        <Toggle
                          checked={gradientToggles[g.id]}
                          onChange={() =>
                            setGradientToggles((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ds-color-row">
                  <button
                    className="ds-color-row-swatch"
                    style={{ background: CUSTOM_COLOR.value }}
                    onClick={() => setColorSelection({ type: 'custom', id: 'custom' })}
                  />
                  <div className="ds-color-row-text">
                    <strong>{CUSTOM_COLOR.label}</strong>
                    <div>
                      Mijoz istalgan rangni yasaydi. Kvadratni bosib sinab ko'ring: <code>{CUSTOM_COLOR.hex}</code>.
                      Zaxirada «Boshqalar» qatoridan olinadi.
                    </div>
                  </div>
                  <Toggle checked={customColorToggle} onChange={() => setCustomColorToggle((v) => !v)} />
                </div>
              </section>
            </>
          )}

          {activeStep === 2 && (
            <>
              <section className="ds-section">
                <div className="ds-section-title">Orqa yozuv shrifti</div>
                <div className="ds-section-sub">
                  Ism va raqam uchun. Bosing — chapdagi formada ko'rinadi.
                </div>
                <div className="ds-font-grid">
                  {FONTS.map((f) => (
                    <div
                      key={f.id}
                      className={`ds-font-card${selectedFont === f.id ? ' is-active' : ''}`}
                    >
                      <button
                        className="ds-font-preview"
                        style={{ fontFamily: f.fontFamily }}
                        onClick={() => setSelectedFont(f.id)}
                      >
                        <span className="ds-font-name">SAMIR</span>
                        <span className="ds-font-num">7</span>
                      </button>
                      <div className="ds-font-footer">
                        <div className="ds-font-footer-text">
                          <strong>{f.label}</strong>
                          <div>{f.desc}</div>
                        </div>
                        <Toggle
                          checked={fontToggles[f.id]}
                          onChange={() =>
                            setFontToggles((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-title">Yozuv qoidalari</div>
                <div className="ds-section-sub">
                  Server tomonda tekshiriladi. O'zgartirish: Sozlamalar › Buyurtma qoidalari
                </div>
                <div className="ds-spec-grid">
                  {TEXT_RULES.map((r) => (
                    <div key={r.label} className="ds-spec-card">
                      <div className="ds-spec-label">{r.label}</div>
                      <div className="ds-spec-value">{r.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeStep === 3 && (
            <>
              <section className="ds-section">
                <div className="ds-section-title">Yamoqlar</div>
                <div className="ds-section-sub">
                  Yengga tikiladi. Bosing — formaning old tomonida ko'rinadi.
                </div>
                <div className="ds-badge-grid">
                  {PATCHES.map((p) => (
                    <div
                      key={p.id}
                      className={`ds-badge-card${selectedPatch === p.id ? ' is-active' : ''}`}
                      onClick={() => setSelectedPatch((prev) => (prev === p.id ? null : p.id))}
                    >
                      <div className="ds-badge-circle">{p.icon}</div>
                      <div className="ds-badge-title">{p.label}</div>
                      <div className="ds-badge-desc">{p.desc}</div>
                      <div className="ds-badge-price">{p.price}</div>
                      <div className="ds-badge-footer" onClick={(e) => e.stopPropagation()}>
                        <Toggle
                          checked={patchToggles[p.id]}
                          onChange={() =>
                            setPatchToggles((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-title">Qadoq</div>
                <div className="ds-section-sub">Mijoz rasmiylashtirishda tanlaydi.</div>
                {PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="ds-list-row">
                    <div className="ds-list-row-text">
                      <strong>{pkg.label}</strong>
                      <div>{pkg.desc}</div>
                    </div>
                    <div className="ds-list-row-right">
                      <span className="ds-list-price">{pkg.price}</span>
                      <Toggle
                        checked={packageToggles[pkg.id]}
                        onChange={() =>
                          setPackageToggles((prev) => ({ ...prev, [pkg.id]: !prev[pkg.id] }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

          {activeStep === 4 && (
            <section className="ds-section">
              <div className="ds-section-title">Logo</div>
              <div className="ds-section-sub">
                Mijoz o'z logosini ko'krakka qo'yadi. Old tomonda belgilangan joy.
              </div>
              <div className="ds-spec-grid" style={{ marginBottom: 16 }}>
                {LOGO_SPECS.map((s) => (
                  <div key={s.label} className="ds-spec-card">
                    <div className="ds-spec-label">{s.label}</div>
                    <div className="ds-spec-value">{s.value}</div>
                  </div>
                ))}
              </div>
              {LOGO_TOGGLES.map((t) => (
                <div key={t.id} className="ds-list-row">
                  <div className="ds-list-row-text">
                    <strong>{t.label}</strong>
                    <div>{t.desc}</div>
                  </div>
                  <Toggle
                    checked={logoToggles[t.id]}
                    onChange={() =>
                      setLogoToggles((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                    }
                  />
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default DesignStudio
