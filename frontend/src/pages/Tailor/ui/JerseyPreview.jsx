const LIGHT_COLORS = ['#f8fafc', '#ffffff', '#facc15', '#fde68a'];

function readableInk(hex) {
  return LIGHT_COLORS.includes(String(hex).toLowerCase()) ? '#0f172a' : '#ffffff';
}

export default function JerseyPreview({ color = '#D72E3F', number = 7, name = 'DILSHOD' }) {
  const ink = readableInk(color);

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-[#0e1628] p-4 text-slate-200">
      <div className="relative my-2 aspect-square w-full max-w-[280px]">
        <svg
          viewBox="0 0 240 260"
          className="h-full w-full drop-shadow-2xl"
          role="img"
          aria-label={`${name} futbolka maketi`}
        >
          <defs>
            <linearGradient id="jerseyShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* T-Shirt Silhouette */}
          <g filter="url(#shadow)">
            <path
              d="M74 24 L36 40 L12 104 L50 120 L66 90 L66 230 Q120 242 174 230 L174 90 L190 120 L228 104 L204 40 L166 24 C164 48 76 48 74 24 Z"
              fill={color}
            />
            {/* Shading overlay */}
            <path
              d="M74 24 L36 40 L12 104 L50 120 L66 90 L66 230 Q120 242 174 230 L174 90 L190 120 L228 104 L204 40 L166 24 C164 48 76 48 74 24 Z"
              fill="url(#jerseyShade)"
            />

            {/* V-Neck / Collar Detail */}
            <path
              d="M86 24 C90 46 150 46 154 24"
              fill="none"
              stroke={ink}
              strokeOpacity="0.8"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Right Chest Crest Logo */}
            <g transform="translate(145, 60) scale(0.6)">
              <path
                d="M12 0 L24 8 L20 22 L12 28 L4 22 L0 8 Z"
                fill="none"
                stroke={ink}
                strokeWidth="2"
                opacity="0.9"
              />
              <path d="M12 4 L16 12 L12 18 L8 12 Z" fill={ink} opacity="0.9" />
            </g>

            {/* Front Print Text Name & Number */}
            <text
              x="120"
              y="110"
              textAnchor="middle"
              fontSize="18"
              fontWeight="900"
              fill={ink}
              letterSpacing="3"
            >
              {String(name).toUpperCase()}
            </text>
            <text
              x="120"
              y="175"
              textAnchor="middle"
              fontSize="60"
              fontWeight="900"
              fill={ink}
            >
              {number}
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Bar: Color dot + View Link */}
      <div className="flex w-full items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span
            className="h-3 w-3 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: color }}
          />
          <span>Qizil</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer">
          OLD KO'RINISH
        </span>
      </div>
    </div>
  );
}
