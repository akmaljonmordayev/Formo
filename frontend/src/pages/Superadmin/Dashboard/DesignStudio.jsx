import { useState, useEffect } from 'react'
import { pricingApi, settingsApi } from '../../../features/platform/platformApi'
import { DEFAULT_ORDER_RULES, PRICE_KEYS, SETTING_KEYS, priceOf } from '../adminApi'
import { useT } from '../i18n'

const JERSEY_CLIP =
  'polygon(22% 0,38% 0,42% 5%,58% 5%,62% 0,78% 0,100% 16%,90% 32%,80% 26%,80% 100%,20% 100%,20% 26%,10% 32%,0 16%)'

// Narxlar API'dan (GET /admin/pricing) olinadi; jadvalda kalit bo'lmasa shu qiymatlar ishlatiladi
const DEFAULT_PRICE = { shirt: 99000, print: 30000, base: 0, design: 30000, patch: 10000, gift: 15000 }

const SOLID_COLORS = [
  { id: 'oq', label: 'Oq', hex: '#F3F5F9' },
  { id: 'qora', label: 'Qora', hex: '#151827' },
  { id: 'toqkok', label: "To'q ko'k", hex: '#16204F' },
  { id: 'lojuvard', label: 'Lojuvard', hex: '#2A3FB0' },
  { id: 'firuza', label: 'Firuza', hex: '#19A7A1' },
  { id: 'sariq', label: 'Sariq', hex: '#F2A33A' },
  { id: 'qizil', label: 'Qizil', hex: '#D63A45' },
  { id: 'yashil', label: 'Yashil', hex: '#3FAE5A' },
]

const GRADIENTS = [
  { id: 'quyosh', label: 'Quyosh', from: '#F2A33A', to: '#D63A45' },
  { id: 'dengiz', label: 'Dengiz', from: '#19A7A1', to: '#2A3FB0' },
  { id: 'olov', label: 'Olov', from: '#D63A45', to: '#8E1F3F' },
  { id: 'tong', label: 'Tong', from: '#8FD3F4', to: '#7A4FD1' },
  { id: 'tun', label: 'Tun', from: '#2A3FB0', to: '#151827' },
  { id: 'chempion', label: 'Chempion', from: '#19A7A1', to: '#F2A33A' },
]

const CUSTOM_COLOR_DEFAULT = '#7A4FD1'

const FONTS = [
  { id: 'sport', label: 'Sport', desc: 'Tor, futbolcha', fontFamily: "'Saira Extra Condensed', sans-serif" },
  { id: 'klassik', label: 'Klassik', desc: 'Keng, qalin', fontFamily: "'Unbounded', sans-serif" },
  { id: 'oddiy', label: 'Oddiy', desc: 'Yumaloq, sodda', fontFamily: "'Onest', sans-serif" },
]


const PATCHES = [
  { id: 'kapitan', label: 'Kapitan', sym: 'C', desc: "yengga, «C» belgisi" },
  { id: 'bayroq', label: 'Bayroq', sym: 'UZ', desc: "O'zbekiston bayrog'i" },
  { id: 'chempion', label: 'Chempion', sym: '★', desc: 'oltin yulduz' },
]

const PACKAGES = [
  { id: 'oddiy-paket', label: 'Oddiy paket', desc: 'Polietilen, Formo logotipi bilan' },
  { id: 'sovga-qutisi', label: "Sovg'a qutisi", desc: 'Karton quti, lenta, tabriknoma', priceKey: 'gift' },
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

function formatPrice(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function inkFor(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0E1A3F' : '#F3F5F9'
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
  const t = useT()
  const [PRICE, setPRICE] = useState(DEFAULT_PRICE)
  const [rules, setRules] = useState(DEFAULT_ORDER_RULES)
  const [bannedCount, setBannedCount] = useState(0)
  const [saveError, setSaveError] = useState('')
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
  const [customColorValue, setCustomColorValue] = useState(CUSTOM_COLOR_DEFAULT)

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

  const [savedAt, setSavedAt] = useState(null)

  // Narxlar, buyurtma qoidalari va saqlangan studiya sozlamasi — API'dan
  useEffect(() => {
    let active = true
    pricingApi
      .list()
      .then((items) => {
        if (!active) return
        setPRICE({
          shirt: priceOf(items, PRICE_KEYS.shirt, DEFAULT_PRICE.shirt),
          print: priceOf(items, PRICE_KEYS.print, DEFAULT_PRICE.print),
          base: priceOf(items, PRICE_KEYS.studio, 0),
          design: priceOf(items, PRICE_KEYS.studioGradient, DEFAULT_PRICE.design),
          patch: priceOf(items, PRICE_KEYS.studioPatch, DEFAULT_PRICE.patch),
          gift: priceOf(items, PRICE_KEYS.studioGift, DEFAULT_PRICE.gift),
        })
      })
      .catch(() => {})
    settingsApi
      .all()
      .then((all) => {
        if (!active) return
        setRules({ ...DEFAULT_ORDER_RULES, ...(all?.[SETTING_KEYS.orderRules] ?? {}) })
        const words = all?.[SETTING_KEYS.bannedWords]
        setBannedCount(Array.isArray(words) ? words.length : 0)
        if (all?.[SETTING_KEYS.studio]) applyConfig(all[SETTING_KEYS.studio])
        else applyLocal()
      })
      .catch(() => active && applyLocal())
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyLocal() {
    let raw
    try {
      raw = localStorage.getItem('formo-design-studio-config')
    } catch {
      return
    }
    if (!raw) return
    try {
      applyConfig(JSON.parse(raw))
    } catch {
      /* ignore corrupt saved config */
    }
  }

  function applyConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return
    {
      if (cfg.colorSelection) setColorSelection(cfg.colorSelection)
      if (cfg.customColorValue) setCustomColorValue(cfg.customColorValue)
      if (cfg.name) setName(cfg.name)
      if (cfg.number) setNumber(cfg.number)
      if (cfg.selectedFont) setSelectedFont(cfg.selectedFont)
      if (cfg.selectedPatch !== undefined) setSelectedPatch(cfg.selectedPatch)
      if (cfg.solidToggles) setSolidToggles(cfg.solidToggles)
      if (cfg.gradientToggles) setGradientToggles(cfg.gradientToggles)
      if (cfg.customColorToggle !== undefined) setCustomColorToggle(cfg.customColorToggle)
      if (cfg.fontToggles) setFontToggles(cfg.fontToggles)
      if (cfg.patchToggles) setPatchToggles(cfg.patchToggles)
      if (cfg.packageToggles) setPackageToggles(cfg.packageToggles)
      if (cfg.logoToggles) setLogoToggles(cfg.logoToggles)
    }
  }

  async function handleSave() {
    const config = {
      colorSelection,
      customColorValue,
      name,
      number,
      selectedFont,
      selectedPatch,
      solidToggles,
      gradientToggles,
      customColorToggle,
      fontToggles,
      patchToggles,
      packageToggles,
      logoToggles,
    }
    try {
      localStorage.setItem('formo-design-studio-config', JSON.stringify(config))
    } catch {
      /* storage unavailable */
    }
    setSaveError('')
    try {
      await settingsApi.update(SETTING_KEYS.studio, config)
      setSavedAt(Date.now())
    } catch (e) {
      setSaveError(e.message)
    }
  }

  useEffect(() => {
    if (!savedAt) return
    const timer = setTimeout(() => setSavedAt(null), 2000)
    return () => clearTimeout(timer)
  }, [savedAt])

  const activeFont = FONTS.find((f) => f.id === selectedFont)
  const activePatch = PATCHES.find((p) => p.id === selectedPatch)

  const totalPrice =
    (PRICE.base || PRICE.shirt + PRICE.print) +
    (colorSelection.type === 'solid' ? 0 : PRICE.design) +
    (activePatch ? PRICE.patch : 0)

  const TEXT_RULES = [
    { label: t('Ism'), value: t('{n} belgigacha, lotin', { n: rules.printNameMaxLength }) },
    { label: t('Raqam'), value: t('{min} dan {max} gacha', { min: rules.printNumberMin, max: rules.printNumberMax }) },
    { label: t("Taqiqlangan so'zlar"), value: t('{n} ta', { n: bannedCount }) },
  ]

  const colorActiveCount =
    Object.values(solidToggles).filter(Boolean).length +
    Object.values(gradientToggles).filter(Boolean).length +
    (customColorToggle ? 1 : 0)
  const colorTotalCount = SOLID_COLORS.length + GRADIENTS.length + 1

  const fontActiveCount = Object.values(fontToggles).filter(Boolean).length
  const fontTotalCount = FONTS.length

  const extraActiveCount =
    Object.values(patchToggles).filter(Boolean).length + Object.values(packageToggles).filter(Boolean).length
  const extraTotalCount = PATCHES.length + PACKAGES.length

  const logoActiveCount = Object.values(logoToggles).filter(Boolean).length

  const steps = [
    { id: 1, title: t("Rang"), subtitle: t('{a} / {b} faol', { a: colorActiveCount, b: colorTotalCount }) },
    { id: 2, title: 'Yozuv', subtitle: t('{a} / {b} shrift', { a: fontActiveCount, b: fontTotalCount }) },
    { id: 3, title: 'Yamoq va qadoq', subtitle: t('{a} / {b} faol', { a: extraActiveCount, b: extraTotalCount }) },
    { id: 4, title: t("Logo"), subtitle: logoActiveCount > 0 ? t('yoqilgan') : t("o'chirilgan") },
  ]

  let jerseyBg
  let jerseyInk
  let colorLabel
  let typeLabel
  let colorIsOff

  if (colorSelection.type === 'gradient') {
    const g = GRADIENTS.find((x) => x.id === colorSelection.id)
    jerseyBg = `linear-gradient(160deg, ${g.from}, ${g.to})`
    jerseyInk = inkFor(g.from)
    colorLabel = g.label
    typeLabel = t("Gradient")
    colorIsOff = !gradientToggles[colorSelection.id]
  } else if (colorSelection.type === 'custom') {
    jerseyBg = customColorValue
    jerseyInk = inkFor(customColorValue)
    colorLabel = "O'z rangi · " + customColorValue
    typeLabel = 'Boshqa'
    colorIsOff = !customColorToggle
  } else {
    const c = SOLID_COLORS.find((x) => x.id === colorSelection.id)
    jerseyBg = c.hex
    jerseyInk = inkFor(c.hex)
    colorLabel = c.label
    typeLabel = t("Bir rang")
    colorIsOff = !solidToggles[colorSelection.id]
  }

  const fontIsOff = !fontToggles[selectedFont]
  const patchIsOff = selectedPatch ? !patchToggles[selectedPatch] : false
  const previewIsOff = colorIsOff || fontIsOff || patchIsOff

  const patchLabel = activePatch ? activePatch.label : "yo'q"

  return (
    <div className="ds-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700&family=Saira+Extra+Condensed:wght@700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .ds-page {
          min-height: 100vh;
          background: #080C24;
          color: #F3F5F9;
          font-family: 'Onest', sans-serif;
          padding: 28px;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }
        .ds-page * { box-sizing: border-box; }

        .ds-page-head { margin-bottom: 22px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .ds-breadcrumb { font-size: 13px; color: #A3ABCC; margin-bottom: 14px; display: flex; gap: 8px; align-items: center; }
        .ds-breadcrumb .sep { color: #4A5380; }
        .ds-breadcrumb .current { color: #F3F5F9; }
        .ds-page-title { font-family: 'Unbounded', sans-serif; font-weight: 600; font-size: 28px; color: #F3F5F9; margin: 0; }
        .ds-page-sub { margin: 6px 0 0; font-size: 14px; color: #A3ABCC; max-width: 680px; }

        .ds-layout {
          display: grid;
          grid-template-columns: 380px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        /* ---------- Sidebar ---------- */
        .ds-sidebar {
          background: #121A42;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: sticky;
          top: 20px;
        }
        .ds-sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .ds-sidebar-title {
          font-family: 'Unbounded', sans-serif;
          font-weight: 500;
          font-size: 15px;
          color: #F3F5F9;
        }
        .ds-segment {
          display: flex;
          gap: 2px;
          background: #0B1030;
          border-radius: 10px;
          padding: 3px;
        }
        .ds-segment button {
          border: none;
          background: transparent;
          color: #A3ABCC;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
        }
        .ds-segment button.is-active {
          background: #F3F5F9;
          color: #080C24;
        }

        .ds-preview {
          height: 340px;
          border-radius: 16px;
          background: radial-gradient(circle at 50% 40%, #1B2560, #0B1030 70%);
          display: grid;
          place-items: center;
          position: relative;
        }
        .ds-jersey-wrap {
          position: relative;
          width: 270px;
          height: 290px;
          filter: drop-shadow(0 18px 24px rgba(0,0,0,0.45));
        }
        .ds-jersey-base { position: absolute; inset: 0; clip-path: ${JERSEY_CLIP}; }
        .ds-jersey-shade {
          position: absolute;
          inset: 0;
          clip-path: ${JERSEY_CLIP};
          background: linear-gradient(90deg, rgba(0,0,0,0.18), transparent 30%, transparent 70%, rgba(0,0,0,0.18));
        }
        .ds-jersey-back {
          position: absolute;
          left: 20%;
          right: 20%;
          top: 22%;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 0.95;
          font-weight: 700;
        }
        .ds-jersey-back .nm { font-size: 22px; letter-spacing: 0.06em; }
        .ds-jersey-back .num { font-size: 118px; }
        .ds-jersey-logo {
          position: absolute;
          left: 58%;
          top: 16%;
          width: 34px;
          height: 34px;
          border-radius: 17px;
          border-width: 2px;
          border-style: dashed;
          display: grid;
          place-items: center;
          font-size: 9px;
          font-weight: 600;
          opacity: 0.8;
        }
        .ds-jersey-front-num {
          position: absolute;
          left: 0;
          right: 0;
          top: 40%;
          text-align: center;
          font-weight: 700;
          font-size: 56px;
          line-height: 1;
        }
        .ds-jersey-patch {
          position: absolute;
          left: 6%;
          top: 12%;
          width: 26px;
          height: 26px;
          border-radius: 13px;
          background: #F2A33A;
          color: #0E1A3F;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          border: 2px solid #F3F5F9;
        }
        .ds-off-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          height: 24px;
          padding: 0 10px;
          border-radius: 12px;
          background: #B8323F;
          color: #F3F5F9;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .ds-fields {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 80px;
          gap: 8px;
        }
        .ds-field {
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(243,245,249,0.1);
          background: #1B2560;
          color: #F3F5F9;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.04em;
          outline: none;
          text-transform: uppercase;
          min-width: 0;
        }
        .ds-field.ds-field-number {
          text-align: center;
          text-transform: none;
          letter-spacing: normal;
        }

        .ds-info { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
        .ds-info-row { display: flex; justify-content: space-between; gap: 8px; }
        .ds-info-row span:first-child { color: #A3ABCC; }
        .ds-info-row span:last-child { font-weight: 500; }

        .ds-price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 12px;
          border-top: 1px solid rgba(243,245,249,0.08);
        }
        .ds-price-label { font-size: 13px; color: #A3ABCC; }
        .ds-price-value { font-family: 'Unbounded', sans-serif; font-weight: 600; font-size: 20px; color: #F2A33A; }

        .ds-save-btn {
          height: 44px;
          border-radius: 12px;
          border: none;
          background: #19A7A1;
          color: #080C24;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .ds-save-btn:hover { opacity: 0.92; }

        /* ---------- Main content ---------- */
        .ds-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

        .ds-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .ds-step {
          text-align: left;
          cursor: pointer;
          padding: 12px 14px;
          border-radius: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          color: #F3F5F9;
          background: #121A42;
          border: 1.5px solid transparent;
        }
        .ds-step.is-active { background: #1B2560; border-color: #F2A33A; }
        .ds-step-num {
          width: 26px;
          height: 26px;
          border-radius: 13px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
          background: #1B2560;
          color: #D6DAEC;
        }
        .ds-step.is-active .ds-step-num { background: #F2A33A; color: #0E1A3F; }
        .ds-step-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
        .ds-step-text strong { font-weight: 600; font-size: 14px; }
        .ds-step-text small { font-size: 11px; color: #A3ABCC; white-space: nowrap; }

        .ds-section {
          background: #121A42;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ds-section-head { display: flex; flex-direction: column; gap: 2px; }
        .ds-section-title { font-weight: 600; font-size: 15px; }
        .ds-section-sub { font-size: 12px; color: #A3ABCC; }

        .ds-grid-solid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .ds-grid-gradient { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .ds-grid-font { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .ds-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .ds-grid-patch { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }

        .ds-swatch-card {
          cursor: pointer;
          border-radius: 14px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #1B2560;
          border: 1.5px solid transparent;
          transition: background 0.12s ease;
        }
        .ds-swatch-card:hover { background: #202C6E; }
        .ds-swatch-card.is-active { border-color: #F2A33A; }
        .ds-swatch-box {
          height: 56px;
          border-radius: 10px;
          border: 1px solid rgba(243,245,249,0.15);
        }
        .ds-grid-gradient .ds-swatch-box { height: 48px; }
        .ds-swatch-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .ds-swatch-label { font-size: 13px; font-weight: 500; }

        .ds-toggle {
          width: 40px;
          height: 24px;
          border-radius: 12px;
          border: none;
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          background: #2E3875;
        }
        .ds-toggle.is-on { background: #19A7A1; }
        .ds-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 9px;
          background: #F3F5F9;
          transition: left 0.15s ease;
        }
        .ds-toggle.is-on .ds-toggle-knob { left: 19px; }

        .ds-paint-row {
          background: #121A42;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          border: 1.5px solid transparent;
        }
        .ds-paint-row.is-active { border-color: #F2A33A; }
        .ds-paint-swatch {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          flex-shrink: 0;
          cursor: pointer;
          border: 2px solid rgba(243,245,249,0.25);
          overflow: hidden;
        }
        .ds-paint-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
          border: none;
          padding: 0;
        }
        .ds-paint-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ds-paint-text strong { font-weight: 600; font-size: 15px; }
        .ds-paint-text div { font-size: 12px; color: #A3ABCC; }
        .ds-paint-text code { font-family: ui-monospace, monospace; color: #F3F5F9; }

        .ds-spec-card { background: #1B2560; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
        .ds-spec-label { font-size: 11px; color: #A3ABCC; }
        .ds-spec-value { font-weight: 600; }

        .ds-font-card {
          cursor: pointer;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #1B2560;
          border: 1.5px solid transparent;
        }
        .ds-font-card:hover { background: #202C6E; }
        .ds-font-card.is-active { border-color: #F2A33A; }
        .ds-font-preview {
          height: 120px;
          border-radius: 12px;
          background: #16204F;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 0.95;
          font-weight: 700;
          cursor: pointer;
          border: none;
          color: #F3F5F9;
        }
        .ds-font-preview .nm { font-size: 15px; letter-spacing: 0.06em; }
        .ds-font-preview .num { font-size: 60px; }
        .ds-font-footer { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .ds-font-footer-text { display: flex; flex-direction: column; }
        .ds-font-footer-text strong { font-weight: 600; font-size: 13px; }
        .ds-font-footer-text div { font-size: 11px; color: #A3ABCC; }

        .ds-patch-card {
          cursor: pointer;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          background: #1B2560;
          border: 1.5px solid transparent;
          text-align: center;
        }
        .ds-patch-card:hover { background: #202C6E; }
        .ds-patch-card.is-active { border-color: #F2A33A; }
        .ds-patch-circle {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: #F2A33A;
          color: #0E1A3F;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-weight: 700;
          border: 3px solid #F3F5F9;
        }
        .ds-patch-text { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .ds-patch-text strong { font-weight: 600; }
        .ds-patch-text .desc { font-size: 12px; color: #A3ABCC; }
        .ds-patch-text .price { font-size: 12px; color: #F2A33A; }

        .ds-list-row {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 12px;
          background: #1B2560;
        }
        .ds-list-row + .ds-list-row { margin-top: 10px; }
        .ds-list-row-text { flex: 1; display: flex; flex-direction: column; }
        .ds-list-row-text strong { font-weight: 600; }
        .ds-list-row-text div { font-size: 12px; color: #A3ABCC; }
        .ds-list-price { font-size: 13px; color: #F2A33A; white-space: nowrap; }

        .is-disabled { opacity: 0.45; }

        @media (max-width: 960px) {
          .ds-layout { grid-template-columns: 1fr; }
          .ds-grid-solid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ds-grid-gradient { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ds-grid-font { grid-template-columns: repeat(1, minmax(0, 1fr)); }
          .ds-grid-patch { grid-template-columns: repeat(1, minmax(0, 1fr)); }
          .ds-grid-3 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
          .ds-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="ds-page-head">
        <div>
          <div className="ds-breadcrumb">
            <span>{t("Katalog")}</span>
            <span className="sep">/</span>
            <span className="current">{t("Dizayn studiyasi")}</span>
          </div>
          <h1 className="ds-page-title">{t("Dizayn studiyasi")}</h1>
          <p className="ds-page-sub">
            {t("Mijoz ilovadagi «Dizayn studiyasi»da ko'radigan tanlovlar. O'chirilgani ilovada ko'rinmaydi.")}
          </p>
        </div>
      </div>

      <div className="ds-layout">
        {/* ---------- Sidebar ---------- */}
        <aside className="ds-sidebar">
          <div className="ds-sidebar-head">
            <span className="ds-sidebar-title">{t("Mijoz ko'radigan forma")}</span>
            <div className="ds-segment">
              <button
                className={view === 'orqa' ? 'is-active' : ''}
                onClick={() => setView('orqa')}
              >
                {t("Orqa")}
              </button>
              <button
                className={view === 'old' ? 'is-active' : ''}
                onClick={() => setView('old')}
              >
                {t("Old")}
              </button>
            </div>
          </div>

          <div className="ds-preview">
            <div className="ds-jersey-wrap">
              <div className="ds-jersey-base" style={{ background: jerseyBg }} />
              <div className="ds-jersey-shade" />
              {view === 'orqa' && (
                <div className="ds-jersey-back" style={{ color: jerseyInk, fontFamily: activeFont.fontFamily }}>
                  <span className="nm">{name || 'ISM'}</span>
                  <span className="num">{number || '0'}</span>
                </div>
              )}
              {view === 'old' && (
                <>
                  <div className="ds-jersey-logo" style={{ borderColor: jerseyInk, color: jerseyInk }}>
                    LOGO
                  </div>
                  <span
                    className="ds-jersey-front-num"
                    style={{ fontFamily: activeFont.fontFamily, color: jerseyInk }}
                  >
                    {number || '0'}
                  </span>
                  {activePatch && <span className="ds-jersey-patch">{activePatch.sym}</span>}
                </>
              )}
            </div>
            {previewIsOff && <span className="ds-off-badge">{t("Ilovada o'chirilgan")}</span>}
          </div>

          <div className="ds-fields">
            <input
              className="ds-field"
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^A-Za-z -]/g, '').toUpperCase().slice(0, rules.printNameMaxLength || 12))
              }
              placeholder="Ism"
              maxLength={rules.printNameMaxLength || 12}
            />
            <input
              className="ds-field ds-field-number"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="№"
            />
          </div>

          <div className="ds-info">
            <div className="ds-info-row">
              <span>{t("Rang")}</span>
              <span>{t(colorLabel)}</span>
            </div>
            <div className="ds-info-row">
              <span>{t("Shrift")}</span>
              <span>{t(activeFont.label)}</span>
            </div>
            <div className="ds-info-row">
              <span>{t("Yamoq")}</span>
              <span>{t(patchLabel)}</span>
            </div>
            <div className="ds-info-row">
              <span>{t("Turi")}</span>
              <span>{t(typeLabel)}</span>
            </div>
          </div>

          <div className="ds-price-row">
            <span className="ds-price-label">{t("Shu forma narxi")}</span>
            <span className="ds-price-value">{formatPrice(totalPrice)} {t("so'm")}</span>
          </div>

          <button type="button" className="ds-save-btn" onClick={handleSave}>
            {savedAt ? t('Saqlandi ✓') : t('Saqlash')}
          </button>
          {saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#E5596B' }}>{saveError}</div>
          )}
        </aside>

        {/* ---------- Main content ---------- */}
        <main className="ds-main">
          <div className="ds-steps">
            {steps.map((s) => (
              <button
                key={s.id}
                className={`ds-step${activeStep === s.id ? ' is-active' : ''}`}
                onClick={() => setActiveStep(s.id)}
              >
                <span className="ds-step-num">{s.id}</span>
                <span className="ds-step-text">
                  <strong>{t(s.title)}</strong>
                  <small>{s.subtitle}</small>
                </span>
              </button>
            ))}
          </div>

          {activeStep === 1 && (
            <>
              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Bir rang")}</span>
                  <span className="ds-section-sub">
                    {t("Rangni bosing — chapda ko'rinadi. O'ngdagi tugma ilovada ko'rsatish yoki yashirish.")}
                  </span>
                </div>
                <div className="ds-grid-solid">
                  {SOLID_COLORS.map((c) => (
                    <div
                      key={c.id}
                      className={`ds-swatch-card${
                        colorSelection.type === 'solid' && colorSelection.id === c.id ? ' is-active' : ''
                      }${solidToggles[c.id] ? '' : ' is-disabled'}`}
                      onClick={() => setColorSelection({ type: 'solid', id: c.id })}
                    >
                      <div className="ds-swatch-box" style={{ background: c.hex }} />
                      <div className="ds-swatch-footer">
                        <span className="ds-swatch-label">{t(c.label)}</span>
                        <Toggle
                          checked={solidToggles[c.id]}
                          onChange={(e) => {
                            e.stopPropagation()
                            setSolidToggles((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Gradient")}</span>
                  <span className="ds-section-sub">{t("Ikki rangli o'tish. Bosma doim oq yoki to'q rangda.")}</span>
                </div>
                <div className="ds-grid-gradient">
                  {GRADIENTS.map((g) => (
                    <div
                      key={g.id}
                      className={`ds-swatch-card${
                        colorSelection.type === 'gradient' && colorSelection.id === g.id ? ' is-active' : ''
                      }${gradientToggles[g.id] ? '' : ' is-disabled'}`}
                      onClick={() => setColorSelection({ type: 'gradient', id: g.id })}
                    >
                      <div
                        className="ds-swatch-box"
                        style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                      />
                      <div className="ds-swatch-footer">
                        <span className="ds-swatch-label">{t(g.label)}</span>
                        <Toggle
                          checked={gradientToggles[g.id]}
                          onChange={(e) => {
                            e.stopPropagation()
                            setGradientToggles((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div
                className={`ds-paint-row${colorSelection.type === 'custom' ? ' is-active' : ''}${
                  customColorToggle ? '' : ' is-disabled'
                }`}
                onClick={() => setColorSelection({ type: 'custom', id: 'custom' })}
              >
                <label className="ds-paint-swatch" style={{ background: customColorValue }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="color"
                    className="ds-paint-input"
                    value={customColorValue}
                    onChange={(e) => {
                      setCustomColorValue(e.target.value)
                      setColorSelection({ type: 'custom', id: 'custom' })
                    }}
                  />
                </label>
                <div className="ds-paint-text">
                  <strong>{t("O'z rangingiz (paint)")}</strong>
                  <div>
                    Mijoz istalgan rangni yasaydi. Kvadratni bosib sinab ko'ring: <code>{customColorValue.toUpperCase()}</code>.
                    Zaxirada «Boshqalar» qatoridan olinadi.
                  </div>
                </div>
                <Toggle
                  checked={customColorToggle}
                  onChange={(e) => {
                    e.stopPropagation()
                    setCustomColorToggle((v) => !v)
                  }}
                />
              </div>
            </>
          )}

          {activeStep === 2 && (
            <>
              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Orqa yozuv shrifti")}</span>
                  <span className="ds-section-sub">{t("Ism va raqam uchun. Bosing — chapdagi formada ko'rinadi.")}</span>
                </div>
                <div className="ds-grid-font">
                  {FONTS.map((f) => (
                    <div
                      key={f.id}
                      className={`ds-font-card${selectedFont === f.id ? ' is-active' : ''}${
                        fontToggles[f.id] ? '' : ' is-disabled'
                      }`}
                      onClick={() => setSelectedFont(f.id)}
                    >
                      <div className="ds-font-preview" style={{ fontFamily: f.fontFamily }}>
                        <span className="nm">SAMIR</span>
                        <span className="num">7</span>
                      </div>
                      <div className="ds-font-footer">
                        <div className="ds-font-footer-text">
                          <strong>{t(f.label)}</strong>
                          <div>{t(f.desc)}</div>
                        </div>
                        <Toggle
                          checked={fontToggles[f.id]}
                          onChange={(e) => {
                            e.stopPropagation()
                            setFontToggles((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Yozuv qoidalari")}</span>
                  <span className="ds-section-sub">
                    {t("Server tomonda tekshiriladi. O'zgartirish: Sozlamalar › Buyurtma qoidalari")}
                  </span>
                </div>
                <div className="ds-grid-3">
                  {TEXT_RULES.map((r) => (
                    <div key={r.label} className="ds-spec-card">
                      <span className="ds-spec-label">{r.label}</span>
                      <span className="ds-spec-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeStep === 3 && (
            <>
              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Yamoqlar")}</span>
                  <span className="ds-section-sub">{t("Yengga tikiladi. Bosing — formaning old tomonida ko'rinadi.")}</span>
                </div>
                <div className="ds-grid-patch">
                  {PATCHES.map((p) => (
                    <div
                      key={p.id}
                      className={`ds-patch-card${selectedPatch === p.id ? ' is-active' : ''}${
                        patchToggles[p.id] ? '' : ' is-disabled'
                      }`}
                      onClick={() => setSelectedPatch((prev) => (prev === p.id ? null : p.id))}
                    >
                      <span className="ds-patch-circle">{p.sym}</span>
                      <div className="ds-patch-text">
                        <strong>{t(p.label)}</strong>
                        <span className="desc">{t(p.desc)}</span>
                        <span className="price">+{formatPrice(PRICE.patch)}</span>
                      </div>
                      <Toggle
                        checked={patchToggles[p.id]}
                        onChange={(e) => {
                          e.stopPropagation()
                          setPatchToggles((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="ds-section">
                <div className="ds-section-head">
                  <span className="ds-section-title">{t("Qadoq")}</span>
                  <span className="ds-section-sub">{t("Mijoz rasmiylashtirishda tanlaydi.")}</span>
                </div>
                {PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`ds-list-row${packageToggles[pkg.id] ? '' : ' is-disabled'}`}
                  >
                    <div className="ds-list-row-text">
                      <strong>{t(pkg.label)}</strong>
                      <div>{t(pkg.desc)}</div>
                    </div>
                    <span className="ds-list-price">{pkg.priceKey ? '+' + formatPrice(PRICE[pkg.priceKey]) : t('Bepul')}</span>
                    <Toggle
                      checked={packageToggles[pkg.id]}
                      onChange={() =>
                        setPackageToggles((prev) => ({ ...prev, [pkg.id]: !prev[pkg.id] }))
                      }
                    />
                  </div>
                ))}
              </section>
            </>
          )}

          {activeStep === 4 && (
            <section className="ds-section">
              <div className="ds-section-head">
                <span className="ds-section-title">{t("Logo")}</span>
                <span className="ds-section-sub">
                  {t("Mijoz o'z logosini ko'krakka qo'yadi. Old tomonda belgilangan joy.")}
                </span>
              </div>
              <div className="ds-grid-3">
                {LOGO_SPECS.map((s) => (
                  <div key={s.label} className="ds-spec-card">
                    <span className="ds-spec-label">{t(s.label)}</span>
                    <span className="ds-spec-value">{t(s.value)}</span>
                  </div>
                ))}
              </div>
              {LOGO_TOGGLES.map((lt) => (
                <div key={lt.id} className="ds-list-row">
                  <div className="ds-list-row-text">
                    <strong>{t(lt.label)}</strong>
                    <div>{t(lt.desc)}</div>
                  </div>
                  <Toggle
                    checked={logoToggles[lt.id]}
                    onChange={() =>
                      setLogoToggles((prev) => ({ ...prev, [lt.id]: !prev[lt.id] }))
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
