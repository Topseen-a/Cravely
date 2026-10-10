// Lagos road icons drawn as SVG <g> groups so they can be dropped into any
// scene. Both face right. Wheels spin via the .wheel class.

function Wheel({ cx, cy, r = 11 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#17120e" />
      <g className="wheel">
        <circle cx={cx} cy={cy} r={r * 0.45} fill="#b9b2a8" />
        <path d={`M${cx - r * 0.45} ${cy}h${r * 0.9}M${cx} ${cy - r * 0.45}v${r * 0.9}`} stroke="#17120e" strokeWidth="1.5" />
      </g>
    </g>
  );
}

// The iconic yellow Lagos minibus, complete with a route sign and the
// classic slogan painted on the side. Occupies roughly 170 x 82 units.
export function Danfo({ route = 'OBALENDE', slogan = 'NO CONDITION IS PERMANENT' }) {
  return (
    <g>
      <g className="animate-bob">
        {/* roof rack */}
        <rect x="20" y="4" width="96" height="4" rx="2" fill="#17120e" />
        <path d="M30 8v3M60 8v3M90 8v3" stroke="#17120e" strokeWidth="2" />
        {/* body */}
        <path d="M6 18q0-8 8-8h132q8 0 12 8l8 22v26H6z" fill="#ffc72c" stroke="#17120e" strokeWidth="2.5" strokeLinejoin="round" />
        {/* windows */}
        {[14, 42, 70, 98].map((x) => (
          <g key={x}>
            <rect x={x} y="17" width="24" height="17" rx="3" fill="#2b3a44" />
            <path d={`M${x + 4} ${31}l10-11`} stroke="#ffffff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        {/* open door with a conductor hanging out — very Lagos */}
        <rect x="126" y="17" width="14" height="44" rx="2" fill="#1e2a33" />
        <circle cx="136" cy="22" r="4" fill="#5b3a29" />
        <path d="M136 26v14M136 30l9-5" stroke="#e2492b" strokeWidth="4" strokeLinecap="round" />
        {/* windscreen */}
        <path d="M144 17h4q5 0 7 5l5 12h-16z" fill="#2b3a44" />
        {/* stripes + slogan */}
        <text x="14" y="44" fontSize="6.5" fontWeight="800" fill="#17120e" fontFamily="DM Sans Variable, sans-serif" letterSpacing=".3">
          {slogan}
        </text>
        <rect x="6" y="48" width="160" height="5" fill="#17120e" />
        <rect x="6" y="56" width="160" height="2.5" fill="#17120e" />
        {/* lights */}
        <circle cx="163" cy="46" r="3" fill="#fff6c9" />
        <rect x="6" y="40" width="4" height="6" fill="#e2492b" />
        {/* route sign */}
        <rect x="112" y="0" width="52" height="11" rx="2" fill="#17120e" />
        <text x="138" y="8.3" fontSize="6.5" fontWeight="800" fill="#ffc72c" textAnchor="middle" fontFamily="DM Sans Variable, sans-serif">
          {route}
        </text>
      </g>
      <Wheel cx={38} cy={68} />
      <Wheel cx={134} cy={68} />
    </g>
  );
}

// A dispatch rider on an okada with a Cravely delivery box. ~95 x 80 units.
export function Okada({ box = '#e2492b' }) {
  return (
    <g>
      <g className="animate-bob">
        {/* delivery box */}
        <rect x="2" y="14" width="34" height="28" rx="4" fill={box} stroke="#17120e" strokeWidth="2" />
        <rect x="2" y="22" width="34" height="4" fill="#ffc72c" />
        <text x="19" y="37" fontSize="7" fontWeight="800" fill="#fff8ec" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif">C</text>
        {/* bike body */}
        <path d="M16 60l14-16h30l12 16" fill="none" stroke="#17120e" strokeWidth="4" strokeLinejoin="round" />
        <path d="M30 44h28l6-8" fill="none" stroke="#23307a" strokeWidth="7" strokeLinecap="round" />
        <path d="M66 36l8 24" stroke="#17120e" strokeWidth="3.5" />
        <path d="M64 30h10" stroke="#17120e" strokeWidth="3" strokeLinecap="round" />
        {/* rider */}
        <path d="M44 42l6-18" stroke="#0a8754" strokeWidth="10" strokeLinecap="round" />
        <path d="M50 28l14 3" stroke="#0a8754" strokeWidth="5" strokeLinecap="round" />
        <path d="M44 42l12 4 2 12" fill="none" stroke="#2b3a44" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="52" cy="14" r="8" fill="#e2492b" stroke="#17120e" strokeWidth="2" />
        <path d="M54 12h7" stroke="#2b3a44" strokeWidth="4" strokeLinecap="round" />
      </g>
      <Wheel cx={16} cy={62} r={12} />
      <Wheel cx={76} cy={62} r={12} />
    </g>
  );
}

// Standalone SVGs for use outside a scene.
export function DanfoIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 172 82" className={className} aria-hidden="true">
      <Danfo />
    </svg>
  );
}

export function OkadaIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 92 76" className={className} aria-hidden="true">
      <Okada />
    </svg>
  );
}
