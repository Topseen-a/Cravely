import { Danfo, Okada } from './Vehicles';

// Golden-hour Lagos: Lagos Island towers, the Lekki–Ikoyi Link Bridge,
// fishermen on the lagoon, and danfos + an okada crossing Third Mainland
// Bridge. Everything is SVG + CSS animation, so it is crisp at any size and
// weighs a few KB instead of a video.

const W = 1200;

// One wave period is 120 units; the path is drawn 1.5 screens wide and
// slides left by exactly one period, so the loop is seamless.
function wavePath(y, amp) {
  let d = `M0 ${y}`;
  for (let x = 0; x < W + 360; x += 120) d += ` q30 ${-amp} 60 0 t60 0`;
  return d;
}

// Back skyline: Lagos Island / Marina. [x, width, height]
const FAR = [
  [0, 60, 70], [55, 40, 110], [92, 55, 85], [150, 38, 140], [186, 70, 95],
  [300, 46, 120], [342, 60, 160], [400, 34, 105], [432, 64, 130], [494, 40, 90],
  [600, 50, 115], [646, 36, 150], [760, 48, 100], [804, 40, 128], [900, 60, 80],
];

// Front skyline with lit windows. [x, width, height]
const NEAR = [
  [20, 70, 60], [96, 52, 88], [150, 64, 70], [380, 58, 74], [520, 72, 64],
  [592, 44, 96], [700, 66, 70], [846, 54, 58],
];

function Windows({ x, w, h, base }) {
  const out = [];
  for (let row = base - h + 10; row < base - 8; row += 12) {
    for (let col = x + 7; col < x + w - 8; col += 12) {
      const lit = (col * 7 + row * 13) % 5 === 0;
      out.push(<rect key={`${col}-${row}`} x={col} y={row} width="5" height="6" rx="1" fill={lit ? '#ffd88a' : '#b4563a'} className={lit && (col + row) % 3 === 0 ? 'blink' : undefined} />);
    }
  }
  return out;
}

export default function LagosScene({ className = '', sky = true }) {
  const base = 372; // waterline
  return (
    <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label="Illustration of Lagos at sunset with danfo buses crossing Third Mainland Bridge">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9b5a" />
          <stop offset=".5" stopColor="#ffc277" />
          <stop offset="1" stopColor="#ffe3a8" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f8f90" />
          <stop offset="1" stopColor="#0a4f55" />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {sky && <rect width="1200" height="560" fill="url(#sky)" />}

      {/* sun */}
      <circle cx="905" cy="300" r="150" fill="url(#sunGlow)" className="sun-glow" />
      <circle cx="905" cy="300" r="62" fill="#fff1c9" />

      {/* clouds + birds */}
      <g className="drift" fill="#fff" opacity=".45">
        <ellipse cx="200" cy="120" rx="80" ry="14" />
        <ellipse cx="250" cy="108" rx="46" ry="14" />
        <ellipse cx="640" cy="80" rx="70" ry="10" />
      </g>
      <g className="birds" fill="none" stroke="#5b2d1c" strokeWidth="2.2" strokeLinecap="round">
        <path d="M100 170q6-7 12 0q6-7 12 0" />
        <path d="M130 150q5-6 10 0q5-6 10 0" />
        <path d="M80 140q4-5 8 0q4-5 8 0" />
      </g>

      {/* far skyline */}
      <g fill="#ec9a64">
        {FAR.map(([x, w, h]) => <rect key={x} x={x} y={base - h} width={w} height={h} />)}
        {/* NECOM House style mast tower */}
        <rect x="246" y={base - 196} width="38" height="196" />
        <path d={`M265 ${base - 196}v-46`} stroke="#ec9a64" strokeWidth="4" />
        <circle cx="265" cy={base - 244} r="4" fill="#e2492b" className="blink" />
        {/* Civic Centre style tower with angled crown */}
        <path d={`M520 ${base}V${base - 150}l40-34 22 16V${base}z`} />
        {/* Eko Atlantic towers */}
        <rect x="700" y={base - 175} width="30" height="175" />
        <rect x="736" y={base - 140} width="26" height="140" />
      </g>

      {/* Lekki–Ikoyi Link Bridge: single pylon with fanned cables */}
      <g stroke="#a54a2c" fill="none">
        {[-120, -90, -60, -30, 30, 60, 90, 120].map((dx, i) => (
          <path key={dx} d={`M1075 ${base - 160 + Math.abs(i - 3.5) * 9}L${1075 + dx} ${base - 18}`} strokeWidth="1.4" />
        ))}
        <path d={`M1060 ${base - 10}L1072 ${base - 182}h6L1090 ${base - 10}`} fill="#a54a2c" stroke="none" />
      </g>
      <rect x="930" y={base - 20} width="270" height="7" fill="#a54a2c" />

      {/* near skyline */}
      <g fill="#c8633f">
        {NEAR.map(([x, w, h]) => (
          <g key={x}>
            <rect x={x} y={base - h} width={w} height={h} />
            <Windows x={x} w={w} h={h} base={base} />
          </g>
        ))}
      </g>

      {/* lagoon */}
      <rect y={base} width="1200" height={560 - base} fill="url(#water)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={905 - (70 - i * 12)} y={base + 8 + i * 14} width={(70 - i * 12) * 2} height="4" rx="2" fill="#ffe0a3" opacity={0.75 - i * 0.12} />
      ))}
      <g className="wave" fill="none" stroke="#7fd0cb" strokeOpacity=".5" strokeWidth="2">
        <path d={wavePath(base + 22, 4)} />
        <path d={wavePath(base + 60, 5)} />
      </g>
      <g className="wave-slow" fill="none" stroke="#bfe8e4" strokeOpacity=".35" strokeWidth="2">
        <path d={wavePath(base + 40, 3)} />
      </g>

      {/* fisherman's canoe */}
      <g className="drift">
        <g transform={`translate(260 ${base + 28})`}>
          <path d="M0 10q60 14 120 0l-10 10H10z" fill="#3b2418" />
          <circle cx="58" cy="-20" r="5" fill="#2a1a12" />
          <path d="M58-15v20M58-8l14 6" stroke="#2a1a12" strokeWidth="4" strokeLinecap="round" />
          <path d="M78-30L66 22" stroke="#2a1a12" strokeWidth="2" />
          <path d="M20 6h70" stroke="#e2492b" strokeWidth="3" />
        </g>
      </g>

      {/* Third Mainland Bridge */}
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={i * 90 + 20} y="478" width="12" height="82" fill="#2b211c" />
      ))}
      <rect y="456" width="1200" height="24" fill="#2b211c" />
      <rect y="448" width="1200" height="3" fill="#2b211c" />
      {Array.from({ length: 60 }, (_, i) => (
        <rect key={i} x={i * 20} y="448" width="2" height="10" fill="#2b211c" />
      ))}
      <path d="M0 468h1200" stroke="#ffc72c" strokeWidth="2" strokeDasharray="18 16" opacity=".8" />

      {/* traffic */}
      <g transform="translate(0 378)">
        <g className="animate-drive" style={{ animationDelay: '-4s' }}>
          <Danfo />
        </g>
      </g>
      <g transform="translate(0 382)">
        <g className="animate-drive-slow" style={{ animationDelay: '-15s' }}>
          <Okada />
        </g>
      </g>
      <g transform="translate(0 378)">
        <g className="animate-drive" style={{ animationDelay: '-12s' }}>
          <Danfo route="CMS" slogan="GOD'S TIME IS THE BEST" />
        </g>
      </g>
    </svg>
  );
}
