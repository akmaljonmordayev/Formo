// Login sahifasidagi forma: orqa tomonida ism + raqam, old tomonida Formo gerbi.
// `flipped` bo'lsa forma old tomoniga buriladi (parol kiritilayotganda raqam "yashirinadi").

const SHIRT =
  'M96 22 Q150 46 204 22 L268 50 L294 122 L248 140 L240 112 L240 318 Q150 334 60 318 L60 112 L52 140 L6 122 L32 50 Z';

export const KITS = [
  { id: 'tun', name: 'Tun', from: '#0E1A3F', to: '#1D2F8C', trim: '#F2A33A', ink: '#F3F5F9' },
  { id: 'afrosiyob', name: 'Afrosiyob', from: '#19A7A1', to: '#9184D9', trim: '#F3F5F9', ink: '#080C24' },
  { id: 'anor', name: 'Anor', from: '#B8323F', to: '#5B1530', trim: '#F2A33A', ink: '#F3F5F9' },
  { id: 'qum', name: 'Qum', from: '#F2A33A', to: '#E0662E', trim: '#0E1A3F', ink: '#0E1A3F' },
];

function Side({ kit, children, id }) {
  return (
    <svg viewBox="0 0 300 340" className="jersey__svg" aria-hidden="true">
      <defs>
        <linearGradient id={`kit-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={{ stopColor: kit.from }} />
          <stop offset="1" style={{ stopColor: kit.to }} />
        </linearGradient>
        <pattern id={`weave-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </pattern>
        <clipPath id={`clip-${id}`}>
          <path d={SHIRT} />
        </clipPath>
      </defs>

      <path d={SHIRT} fill={`url(#kit-${id})`} />
      <path d={SHIRT} fill={`url(#weave-${id})`} />

      <g clipPath={`url(#clip-${id})`}>
        {/* yeng manjetlari */}
        <path d="M6 122 L52 140 L56 126 L11 108 Z" fill={kit.trim} />
        <path d="M294 122 L248 140 L244 126 L289 108 Z" fill={kit.trim} />
        {/* yon chiziqlar */}
        <rect x="60" y="112" width="7" height="220" fill={kit.trim} opacity="0.85" />
        <rect x="233" y="112" width="7" height="220" fill={kit.trim} opacity="0.85" />
        {children}
      </g>

      {/* tikuv choklari */}
      <g fill="none" stroke={kit.ink} strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="4 4">
        <path d="M66 304 Q150 318 234 304" />
        <path d="M60 112 L68 60" />
        <path d="M240 112 L232 60" />
        <path d="M16 112 L54 128" />
        <path d="M284 112 L246 128" />
      </g>
      <path d={SHIRT} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    </svg>
  );
}

export default function Jersey({ kit, name, number, flipped, error }) {
  const shown = error ? '!!' : number;

  return (
    <div className={`jersey${flipped ? ' jersey--flipped' : ''}${error ? ' jersey--error' : ''}`}>
      <div className="jersey__hanger" aria-hidden="true" />
      <div className="jersey__card">
        <div className="jersey__face jersey__face--back">
          <Side kit={kit} id="back">
            <path d="M96 22 Q150 46 204 22 Q150 58 96 22 Z" fill={kit.trim} />
            <text x="150" y="104" textAnchor="middle" className="jersey__name" fill={kit.ink}>
              {name}
            </text>
            <text
              x="150"
              y="250"
              textAnchor="middle"
              className="jersey__number"
              fill={error ? '#FF5A67' : kit.ink}
              stroke={kit.trim}
              strokeWidth="3"
              paintOrder="stroke"
            >
              {shown}
            </text>
          </Side>
        </div>

        <div className="jersey__face jersey__face--front">
          <Side kit={kit} id="front">
            <path d="M118 22 L150 70 L182 22 Q150 40 118 22 Z" fill={kit.trim} />
            {/* gerb */}
            <g transform="translate(196 92)">
              <path d="M0 0 H30 V22 Q30 36 15 42 Q0 36 0 22 Z" fill={kit.trim} />
              <text x="15" y="27" textAnchor="middle" className="jersey__crest" fill={kit.from}>
                F
              </text>
            </g>
            <text x="150" y="196" textAnchor="middle" className="jersey__brand" fill={kit.ink}>
              FORMO
            </text>
            <text x="150" y="222" textAnchor="middle" className="jersey__motto" fill={kit.ink}>
              JAMOANGIZ RANGIDA
            </text>
          </Side>
        </div>
      </div>
    </div>
  );
}
