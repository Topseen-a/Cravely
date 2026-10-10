import { useId } from 'react';
import { foodKind } from '../../lib/food';

// Detailed Nigerian dish illustrations (viewBox 200 x 150, light from the
// top-left). Textures such as rice grains are generated with a seeded random
// generator, so each dish always renders identically. Real photos
// (image_url) take priority wherever they exist.

// ---------- helpers ----------

function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random points inside an ellipse, sorted back-to-front.
function scatter(r, n, cx, cy, rx, ry) {
  const pts = [];
  while (pts.length < n) {
    const u = r() * 2 - 1;
    const v = r() * 2 - 1;
    if (u * u + v * v <= 1) pts.push({ x: cx + u * rx, y: cy + v * ry, u, v });
  }
  return pts.sort((a, b) => a.y - b.y);
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// Irregular rounded shape (meat chunks etc.): jittered points joined with
// smooth quadratic curves through their midpoints.
function blobPath(r, cx, cy, rx, ry, jitter = 0.25, n = 9) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 - jitter / 2 + r() * jitter;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).map((v) => v.toFixed(1)).join(' ')}`;
  pts.forEach((pt, i) => {
    const m = mid(pt, pts[(i + 1) % n]);
    d += `Q${pt[0].toFixed(1)} ${pt[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  });
  return d + 'Z';
}

// A glossy chunk of peppered meat.
function MeatChunk({ p, r, x, y, rx, ry, color = '#76301a' }) {
  const d = blobPath(r, x, y, rx, ry);
  return (
    <g>
      <path d={d} fill="#000" opacity=".14" transform="translate(1.5 3)" />
      <path d={d} fill={color} />
      <path d={d} fill={`url(#${p}vol)`} />
      <path d={`M${x - rx * 0.5} ${y - ry * 0.35}q${rx * 0.4} ${-ry * 0.35} ${rx * 0.8} ${-ry * 0.05}`} fill="none" stroke="#c94a24" strokeWidth={Math.max(1.4, ry * 0.25)} strokeLinecap="round" opacity=".85" />
      <path d={`M${x - rx * 0.3} ${y - ry * 0.55}q${rx * 0.2} ${-ry * 0.15} ${rx * 0.4} 0`} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".35" />
    </g>
  );
}

function Defs({ p }) {
  return (
    <defs>
      <radialGradient id={`${p}shadow`}>
        <stop offset="0.55" stopColor="#3b2a1e" stopOpacity=".28" />
        <stop offset="1" stopColor="#3b2a1e" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${p}rim`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e4ddd2" />
      </linearGradient>
      <radialGradient id={`${p}well`} cx=".45" cy=".4" r=".7">
        <stop offset="0" stopColor="#fdfbf7" />
        <stop offset="1" stopColor="#e8e0d3" />
      </radialGradient>
      <radialGradient id={`${p}vol`} cx=".35" cy=".25" r=".85">
        <stop offset="0" stopColor="#fff" stopOpacity=".35" />
        <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        <stop offset=".8" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".28" />
      </radialGradient>
      <radialGradient id={`${p}skin`} cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#e9a04c" />
        <stop offset=".55" stopColor="#bf6424" />
        <stop offset="1" stopColor="#7c3410" />
      </radialGradient>
      <radialGradient id={`${p}dodo`} cx=".45" cy=".4" r=".65">
        <stop offset="0" stopColor="#ffd77a" />
        <stop offset=".6" stopColor="#f2a93b" />
        <stop offset="1" stopColor="#b85e14" />
      </radialGradient>
      <linearGradient id={`${p}glass`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".55" />
        <stop offset=".25" stopColor="#fff" stopOpacity=".1" />
        <stop offset=".8" stopColor="#fff" stopOpacity=".05" />
        <stop offset="1" stopColor="#fff" stopOpacity=".4" />
      </linearGradient>
    </defs>
  );
}

// White ceramic plate in 3/4 view.
function Plate({ p, cx = 100, cy = 98, rx = 86, ry = 38, well = 0.72 }) {
  return (
    <g>
      <ellipse cx={cx + 4} cy={cy + 9} rx={rx + 6} ry={ry + 6} fill={`url(#${p}shadow)`} />
      <ellipse cx={cx} cy={cy + 3} rx={rx} ry={ry} fill="#d9d1c4" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${p}rim)`} />
      <ellipse cx={cx} cy={cy + 1.5} rx={rx * well} ry={ry * well} fill={`url(#${p}well)`} />
      <ellipse cx={cx} cy={cy + 1.5} rx={rx * well} ry={ry * well} fill="none" stroke="#ddd5c8" strokeWidth=".8" />
      <path d={`M${cx - rx * 0.82} ${cy - ry * 0.35}A${rx} ${ry} 0 0 1 ${cx - rx * 0.2} ${cy - ry * 0.97}`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".9" />
    </g>
  );
}

// A mound of individually drawn grains (palette ordered dark -> light).
function RiceMound({ p, r, cx, cy, rx, ry, palette, n = 190, base, extra }) {
  const pts = scatter(r, n, cx, cy, rx * 0.94, ry * 0.9);
  return (
    <g>
      <ellipse cx={cx + 2} cy={cy + ry * 0.55} rx={rx * 0.95} ry={ry * 0.5} fill="#000" opacity=".1" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={base} />
      {pts.map((g, i) => {
        const light = Math.min(0.999, Math.max(0, 0.55 - (g.u + g.v) * 0.3 + (r() - 0.5) * 0.55));
        return (
          <ellipse
            key={i}
            cx={g.x.toFixed(1)}
            cy={g.y.toFixed(1)}
            rx="2.6"
            ry="1.15"
            fill={palette[Math.floor(light * palette.length)]}
            transform={`rotate(${Math.floor(r() * 180)} ${g.x.toFixed(1)} ${g.y.toFixed(1)})`}
          />
        );
      })}
      {extra}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${p}vol)`} />
    </g>
  );
}

function Drumstick({ p, x, y, s = 1, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="22" cy="24" rx="22" ry="5" fill="#000" opacity=".12" />
      {/* bone */}
      <path d="M38 12.5l12-1.5v7l-12-.5z" fill="#efe3c8" stroke="#c9b48c" strokeWidth=".8" />
      <circle cx="51" cy="11" r="3.6" fill="#f6ecd6" stroke="#c9b48c" strokeWidth=".8" />
      <circle cx="51.5" cy="18" r="3.4" fill="#efe3c8" stroke="#c9b48c" strokeWidth=".8" />
      {/* meat */}
      <path d="M1 15C1 4 12-1 23 2c7 2 12 6 17 9v8c-5 3-10 6-17 7C11 28 1 25 1 15z" fill={`url(#${p}skin)`} stroke="#6b2b0c" strokeWidth=".8" />
      <path d="M8 8c5-4 12-4 18-1" fill="none" stroke="#f5c27a" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      {[[10, 14], [16, 19], [22, 12], [28, 17], [14, 9], [31, 12], [20, 22]].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r=".9" fill="#5c2208" opacity=".55" />
      ))}
    </g>
  );
}

// Diagonally cut fried plantain slice.
function Dodo({ p, x, y, rot = -20, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="1" cy="2.5" rx="13" ry="6.5" fill="#000" opacity=".12" />
      <ellipse rx="13" ry="7" fill="#9a4a10" />
      <ellipse cy="-0.6" rx="12" ry="6" fill={`url(#${p}dodo)`} />
      <ellipse cx="-3" cy="-2" rx="4" ry="1.4" fill="#fff3c4" opacity=".6" />
      <circle cx="5" cy="1" r=".9" fill="#a5521a" />
      <circle cx="2" cy="2.5" r=".7" fill="#a5521a" />
    </g>
  );
}

function OnionRing({ x, y, rx = 7, ry = 4, rot = 0 }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke="#f3e3f0" strokeWidth="2" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke="#a7568f" strokeWidth=".7" />
    </g>
  );
}

function TomatoSlice({ x, y, rr = 7 }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rr} ry={rr * 0.55} fill="#d9301c" />
      <ellipse cx={x} cy={y - 0.4} rx={rr - 1.4} ry={rr * 0.55 - 1} fill="#f0563a" />
      {[[-2.5, 0], [2.5, 0], [0, -1.5]].map(([dx, dy]) => (
        <ellipse key={`${dx}${dy}`} cx={x + dx} cy={y + dy} rx="1.4" ry=".8" fill="#ffd3a0" />
      ))}
    </g>
  );
}

// ---------- rice ----------

const RICE = {
  jollof: { base: '#c94320', palette: ['#a8361a', '#c9441f', '#d9522a', '#e2602f', '#ec7440', '#f38a55'] },
  fried: { base: '#c9a03c', palette: ['#b88d2c', '#cfa53f', '#dbb44d', '#e5c262', '#efd27c', '#f6e0a0'] },
  coconut: { base: '#d8bf93', palette: ['#c9ab7c', '#d6bb8e', '#e2cba2', '#ead8b5', '#f2e5cb', '#f9f0df'] },
  white: { base: '#e9e2d2', palette: ['#ded6c4', '#e9e3d5', '#f3efe5', '#f8f5ee', '#fffdf8', '#ffffff'] },
  ofada: { base: '#b28c64', palette: ['#8e6440', '#a57a52', '#b98f66', '#c9a47c', '#d8b994', '#e6cfae'] },
};

function Rice({ p, r, variant }) {
  const c = RICE[variant] || RICE.jollof;
  const sides = variant === 'jollof' || variant === 'fried' || variant === 'coconut';
  let extra = null;

  if (variant === 'fried') {
    const bits = scatter(r, 26, 92, 82, 34, 13);
    extra = bits.map((b, i) =>
      i % 3 === 0 ? <rect key={i} x={b.x} y={b.y} width="3.2" height="3.2" rx=".6" fill="#ef7f22" stroke="#b9561a" strokeWidth=".4" />
        : i % 3 === 1 ? <circle key={i} cx={b.x} cy={b.y} r="1.8" fill="#5aa13a" stroke="#3b7424" strokeWidth=".4" />
          : <rect key={i} x={b.x} y={b.y} width="4" height="1.8" rx=".8" fill="#4f8f2f" transform={`rotate(${i * 30} ${b.x} ${b.y})`} />,
    );
  }
  if (variant === 'jollof') {
    const char = scatter(r, 10, 92, 84, 34, 12);
    extra = (
      <>
        {char.map((b, i) => <ellipse key={i} cx={b.x} cy={b.y} rx="2.6" ry="1.2" fill="#7e2810" transform={`rotate(${i * 47} ${b.x} ${b.y})`} />)}
        <path d="M78 72q6-4 12 1" fill="none" stroke="#3f7d3a" strokeWidth="2.4" strokeLinecap="round" />
        <OnionRing x={104} y={76} rx={6} ry={3} rot={-10} />
      </>
    );
  }
  if (variant === 'coconut') {
    const shreds = scatter(r, 16, 92, 82, 32, 12);
    extra = shreds.map((b, i) => (
      <path key={i} d={`M${b.x} ${b.y}q3 -2 6 0`} fill="none" stroke={i % 4 ? '#fffaf0' : '#d9472b'} strokeWidth={i % 4 ? 1.3 : 1.6} strokeLinecap="round" />
    ));
  }

  if (variant === 'ofada') {
    return (
      <g>
        <Plate p={p} />
        {/* uma leaf */}
        <path d="M34 98C40 70 90 62 128 68c26 4 40 14 42 28-14 14-58 18-96 14C52 108 34 106 34 98z" fill="#3e7a34" />
        <path d="M36 98c40-8 90-10 132-2" fill="none" stroke="#6aa858" strokeWidth="1.2" />
        {[50, 70, 92, 114, 136].map((x) => <path key={x} d={`M${x} ${96 - (x - 34) * 0.03}l8 -10M${x} ${96}l7 8`} stroke="#5d9a4c" strokeWidth=".8" />)}
        <RiceMound p={p} r={r} cx={78} cy={86} rx={32} ry={14} palette={c.palette} base={c.base} n={150} />
        {/* ayamase: green pepper stew with assorted meat and egg */}
        <path d="M108 86c2-14 44-16 50-2 4 10-8 16-26 16-16 0-26-5-24-14z" fill="#4f5a1e" />
        <path d="M110 86c4-10 40-12 46-1" fill="none" stroke="#a3a33a" strokeWidth="1.5" opacity=".7" />
        <rect x="118" y="80" width="12" height="9" rx="3" fill="#6b3218" />
        <rect x="134" y="84" width="11" height="8" rx="3" fill="#7a3c1c" />
        <ellipse cx="142" cy="78" rx="8" ry="6" fill="#fbf7ee" stroke="#d9cfbd" strokeWidth=".6" />
        <ellipse cx="142.5" cy="78.5" rx="3.6" ry="3" fill="#f2b425" />
        <ellipse cx="132" cy="92" rx="10" ry="3" fill="#c7a83a" opacity=".35" />
      </g>
    );
  }

  if (variant === 'white') {
    return (
      <g>
        <Plate p={p} />
        <RiceMound p={p} r={r} cx={96} cy={88} rx={46} ry={19} palette={c.palette} base={c.base} n={230} />
        {/* stew ladled over */}
        <path d="M84 76c6-10 34-12 44-2 8 8 2 18-14 20-14 2-34 0-32-8 0-4 0-7 2-10z" fill="#b8301a" />
        <path d="M88 76c6-8 30-9 38-1" fill="none" stroke="#f0703a" strokeWidth="2" opacity=".6" />
        <ellipse cx="102" cy="88" rx="16" ry="3" fill="#e2581f" opacity=".45" />
        <rect x="94" y="77" width="13" height="10" rx="3.5" fill="#6e2d14" />
        <rect x="110" y="80" width="11" height="9" rx="3.5" fill="#7d3519" />
        <path d="M97 79h6" stroke="#a5583a" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <Plate p={p} />
      <RiceMound p={p} r={r} cx={92} cy={86} rx={44} ry={18} palette={c.palette} base={c.base} extra={extra} />
      {variant === 'coconut' && (
        <g>
          <ellipse cx="150" cy="76" rx="15" ry="9" fill="#5b3a22" />
          <ellipse cx="150" cy="74.5" rx="13" ry="7.2" fill="#fbf6ea" />
          <ellipse cx="150" cy="74.5" rx="9.5" ry="4.8" fill="#f1ead9" />
          <path d="M138 80q12 6 24 0" fill="none" stroke="#3b2414" strokeWidth=".8" strokeDasharray="1.5 1.5" />
        </g>
      )}
      {sides && (
        <>
          <Drumstick p={p} x={34} y={84} s={0.85} rot={-12} />
          <Dodo p={p} x={140} y={94} rot={-25} />
          {variant !== 'coconut' && <Dodo p={p} x={152} y={84} rot={-35} s={0.9} />}
          <Dodo p={p} x={130} y={103} rot={-15} s={0.9} />
        </>
      )}
    </g>
  );
}

// ---------- swallow & soup ----------

const SWALLOW = {
  pounded: ['#e9e1cd', '#f6f1e4', '#fffdf6'],
  amala: ['#3f2c23', '#5e4537', '#7d6253'],
  eba: ['#d9ae4a', '#efcf73', '#f8e3a2'],
  semo: ['#e6dcc4', '#f3ecda', '#fffaee'],
  fufu: ['#e8e2d6', '#f5f1e8', '#fffdf9'],
};

function Swallow({ p, x, y, kind }) {
  const [dark, mid, light] = SWALLOW[kind] || SWALLOW.pounded;
  const id = `${p}sw`;
  return (
    <g>
      <defs>
        <radialGradient id={id} cx=".38" cy=".3" r=".75">
          <stop offset="0" stopColor={light} />
          <stop offset=".6" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      <ellipse cx={x + 2} cy={y + 12} rx="30" ry="8" fill="#000" opacity=".14" />
      <path d={`M${x - 29} ${y + 8}c0-22 14-32 29-32s29 10 29 32c0 6-13 10-29 10s-29-4-29-10z`} fill={`url(#${id})`} />
      <ellipse cx={x - 9} cy={y - 12} rx="8" ry="4" fill="#fff" opacity={kind === 'amala' ? 0.15 : 0.45} />
      {kind === 'eba' && [[-10, 0], [6, -6], [12, 4], [-2, 8], [-16, 6]].map(([dx, dy]) => <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r=".8" fill="#c8932f" />)}
    </g>
  );
}

function SoupBowl({ p, r, x, y, soup }) {
  const pts = scatter(r, 40, x, y - 2, 25, 9);
  let fill = '#d58d26';
  let texture = null;
  if (soup === 'egusi') {
    fill = '#d48a25';
    texture = (
      <>
        {pts.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={1.4 + r() * 1.8} fill={pick(r, ['#f2c25e', '#e8a93c', '#f7d27c'])} />)}
        {pts.slice(0, 14).map((b, i) => <path key={`l${i}`} d={`M${b.x} ${b.y}l3 -1.5`} stroke="#2f6a26" strokeWidth="1.8" strokeLinecap="round" />)}
        <ellipse cx={x + 8} cy={y + 2} rx="9" ry="2.5" fill="#c9431b" opacity=".35" />
      </>
    );
  } else if (soup === 'abula') {
    fill = '#2d5a21';
    texture = (
      <>
        <path d={`M${x} ${y - 11}c-4 6-4 14 0 20 9 0 24-4 25-10 0-5-12-10-25-10z`} fill="#e0ad45" />
        {pts.filter((b) => b.x < x).map((b, i) => <circle key={i} cx={b.x} cy={b.y} r="1" fill="#4c8a34" />)}
        <path d={`M${x - 10} ${y - 4}c8-4 14 2 22-2`} fill="none" stroke="#c0321a" strokeWidth="4" strokeLinecap="round" />
        <circle cx={x - 6} cy={y - 4} r="1.4" fill="#f06a3a" />
      </>
    );
  } else if (soup === 'okra') {
    fill = '#6f9a2e';
    texture = pts.slice(0, 18).map((b, i) => (
      <g key={i}>
        <circle cx={b.x} cy={b.y} r="2.6" fill="#9cc24f" stroke="#4e7a1f" strokeWidth=".6" />
        <circle cx={b.x} cy={b.y} r=".8" fill="#f2f0c8" />
      </g>
    ));
  } else if (soup === 'efo') {
    fill = '#a63a17';
    texture = pts.slice(0, 26).map((b, i) => <path key={i} d={`M${b.x} ${b.y}q3 -4 6 0q-3 3 -6 0z`} fill={pick(r, ['#2c5a1d', '#3a7026', '#234a17'])} />);
  } else if (soup === 'banga') {
    fill = '#7c2911';
    texture = (
      <>
        {pts.slice(0, 12).map((b, i) => <circle key={i} cx={b.x} cy={b.y} r="1.6" fill="#b84a1e" opacity=".7" />)}
        <path d={`M${x - 16} ${y - 6}q10 -4 24 0`} fill="none" stroke="#e0752c" strokeWidth="1.6" opacity=".6" />
      </>
    );
  } else if (soup === 'ogbono') {
    fill = '#6e5a2a';
  }
  return (
    <g>
      <ellipse cx={x + 3} cy={y + 15} rx="36" ry="9" fill="#000" opacity=".15" />
      <path d={`M${x - 34} ${y - 2}c0 14 14 24 34 24s34-10 34-24z`} fill="#2f6e74" />
      <path d={`M${x - 34} ${y - 2}c0 14 14 24 34 24s34-10 34-24z`} fill={`url(#${p}vol)`} />
      <ellipse cx={x} cy={y - 2} rx="34" ry="12" fill="#e9e3d8" />
      <ellipse cx={x} cy={y - 1.5} rx="30" ry="10.5" fill={fill} />
      {texture}
      {soup !== 'abula' && <rect x={x + 6} y={y - 9} width="11" height="8" rx="3" fill="#6b2f17" />}
      {soup === 'egusi' && <path d={`M${x - 14} ${y - 6}l9 -1 2 5-9 2z`} fill="#c9873a" stroke="#7d4a19" strokeWidth=".6" />}
    </g>
  );
}

function SwallowDish({ p, r, k }) {
  return (
    <g transform="translate(-10 -12) scale(1.1)">
      <Plate p={p} cx={74} cy={104} rx={62} ry={28} />
      <Swallow p={p} x={72} y={92} kind={k.swallow} />
      <SoupBowl p={p} r={r} x={146} y={92} soup={k.soup} />
    </g>
  );
}

// ---------- proteins ----------

function Meat({ p, r, variant }) {
  const big = variant === 'turkey';
  const pieces = big
    ? [[78, 82, 24, 13], [114, 86, 22, 12], [96, 74, 18, 10]]
    : scatter(r, 11, 98, 84, 32, 10).map((b) => [b.x, b.y, 10 + r() * 4, 7 + r() * 3]);
  const color = variant === 'asun' ? '#5a2410' : big ? '#8a3a18' : '#76301a';
  return (
    <g>
      <Plate p={p} />
      {pieces.sort((a, b) => a[1] - b[1]).map(([x, y, rx, ry], i) => <MeatChunk key={i} p={p} r={r} x={x} y={y} rx={rx} ry={ry} color={color} />)}
      {/* pepper sauce flecks, onions and green pepper */}
      {scatter(r, 22, 98, 84, 40, 13).map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={0.9 + r() * 1.2} fill={pick(r, ['#d8341a', '#e8552a', '#b52a14'])} />)}
      <OnionRing x={80} y={74} rot={20} />
      <OnionRing x={120} y={94} rot={-15} />
      {variant !== 'asun' && <OnionRing x={104} y={98} rx={5} ry={3} rot={5} />}
      <path d="M124 72q6-4 10 2" fill="none" stroke="#3f8a2e" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 94q5 3 10-1" fill="none" stroke="#3f8a2e" strokeWidth="3" strokeLinecap="round" />
      {variant === 'asun' && <path d="M138 84q4-3 8 0" fill="none" stroke="#e2492b" strokeWidth="3" strokeLinecap="round" />}
    </g>
  );
}

function Chicken({ p }) {
  return (
    <g>
      <Plate p={p} />
      <path d="M54 86c6-12 20-14 28-8-6 8-18 12-28 8z" fill="#7cb342" />
      <path d="M58 84c8-6 16-6 22-4" fill="none" stroke="#c5e1a5" strokeWidth="1" />
      <Drumstick p={p} x={64} y={78} s={1.2} rot={-8} />
      <Drumstick p={p} x={86} y={92} s={1.15} rot={6} />
      <TomatoSlice x={150} y={84} />
      <TomatoSlice x={142} y={96} rr={6} />
    </g>
  );
}

function Fish({ p }) {
  const id = `${p}fish`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c27a2c" />
          <stop offset=".5" stopColor="#e3a24f" />
          <stop offset="1" stopColor="#b5682a" />
        </linearGradient>
      </defs>
      <Plate p={p} rx={90} />
      <ellipse cx="100" cy="98" rx="62" ry="9" fill="#000" opacity=".12" />
      {/* tail */}
      <path d="M146 88l20-14c2 8 2 22 0 30z" fill="#a8622a" stroke="#6b3a14" strokeWidth=".8" />
      {/* body */}
      <path d="M40 90c10-16 40-24 70-20 18 2 30 8 38 18-8 10-20 15-38 17-30 3-60-3-70-15z" fill={`url(#${id})`} stroke="#6b3a14" strokeWidth=".9" />
      {/* fins */}
      <path d="M86 72c6-8 20-10 28-4-8 2-18 4-28 4z" fill="#a8622a" />
      <path d="M92 104c6 6 14 6 20 2-6-2-14-2-20-2z" fill="#a8622a" />
      {/* head */}
      <path d="M62 78c-4 8-4 18 0 26" fill="none" stroke="#7a4518" strokeWidth="1.4" />
      <circle cx="50" cy="86" r="3.6" fill="#f4ead8" />
      <circle cx="50.5" cy="86" r="1.8" fill="#1a1410" />
      <path d="M41 92q4 2 8 1" fill="none" stroke="#6b3a14" strokeWidth="1" />
      {/* scored cuts */}
      {[78, 92, 106, 120].map((x) => <path key={x} d={`M${x} 80q5 8 0 16`} fill="none" stroke="#8a4a18" strokeWidth="1.6" />)}
      <path d="M66 80c20-8 50-8 70 2" fill="none" stroke="#f6cf8c" strokeWidth="1.6" opacity=".6" />
      <OnionRing x={150} y={104} rot={10} />
      <circle cx="140" cy="110" r="2.2" fill="#d8341a" />
      <circle cx="58" cy="110" r="2.2" fill="#3f8a2e" />
    </g>
  );
}

function DodoPlate({ p }) {
  const slices = [[66, 80, -20], [88, 76, -30], [110, 78, -15], [132, 82, -28], [74, 96, -22], [98, 94, -18], [122, 98, -30], [146, 96, -12], [86, 108, -25], [112, 110, -20]];
  return (
    <g>
      <Plate p={p} />
      {slices.map(([x, y, rot]) => <Dodo key={`${x}${y}`} p={p} x={x} y={y} rot={rot} s={1.15} />)}
    </g>
  );
}

function MoiMoi({ p }) {
  const id = `${p}moi`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efa06a" />
          <stop offset="1" stopColor="#c8693a" />
        </linearGradient>
      </defs>
      <Plate p={p} />
      {/* banana/uma leaf it was steamed in */}
      <path d="M44 100c10-24 40-36 70-34 26 2 46 14 48 30-24 14-90 18-118 4z" fill="#4a8a3c" />
      <path d="M48 99c34-10 78-14 112-4" fill="none" stroke="#79b363" strokeWidth="1.2" />
      {/* the moi moi loaf */}
      <path d="M70 96c-4-20 6-34 30-34s34 14 30 34c-10 6-50 6-60 0z" fill={`url(#${id})`} />
      <path d="M70 96c-4-20 6-34 30-34s34 14 30 34c-10 6-50 6-60 0z" fill={`url(#${p}vol)`} />
      {/* cut face showing egg and fish */}
      <ellipse cx="100" cy="84" rx="11" ry="9" fill="#f4f0e6" />
      <ellipse cx="100.5" cy="84.5" rx="5" ry="4.4" fill="#f0b323" />
      <path d="M112 74l6 4-4 4z" fill="#b8865a" />
      {[[82, 72], [90, 92], [116, 90], [84, 84], [120, 80]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".9" fill="#a74f22" />)}
    </g>
  );
}

// ---------- snacks & grills ----------

function Suya({ p, r }) {
  return (
    <g>
      {/* served on newspaper, the classic mallam way */}
      <path d="M22 112l18-50 142 6-12 52z" fill="#000" opacity=".12" />
      <path d="M18 106l18-50 142 6-12 52z" fill="#ece7dc" />
      <path d="M18 106l18-50 142 6-12 52z" fill="none" stroke="#cfc6b6" strokeWidth=".8" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${42 + i * 2} ${64 + i * 5}h${48 + (i % 3) * 12}`} stroke="#b5ad9f" strokeWidth="1.3" />
      ))}
      <path d="M118 72h40M116 78h36M114 84h40" stroke="#b5ad9f" strokeWidth="1.3" />
      <rect x="112" y="88" width="34" height="16" fill="#cfc6b6" />
      {/* cabbage + onions + tomatoes */}
      {scatter(r, 18, 140, 98, 22, 10).map((b, i) => <path key={i} d={`M${b.x} ${b.y}q4 -3 8 0`} fill="none" stroke="#cfe3a8" strokeWidth="1.6" strokeLinecap="round" />)}
      <OnionRing x={60} y={100} rot={-10} />
      <OnionRing x={70} y={106} rx={6} ry={3.5} rot={15} />
      <TomatoSlice x={150} y={84} rr={7} />
      <TomatoSlice x={160} y={96} rr={6} />
      {/* skewers of beef coated in yaji */}
      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(0 ${row * 12}) rotate(-6 100 76)`}>
          <path d="M38 76h112" stroke="#c9a46a" strokeWidth="2.2" strokeLinecap="round" />
          {[52, 68, 84, 100, 116, 132].map((x, i) => (
            <g key={x}>
              <path d={`M${x - 8} ${71}q8 -4 16 0l-1 10q-7 3 -14 0z`} fill={i % 2 ? '#6e2a12' : '#7d3216'} />
              <path d={`M${x - 8} ${71}q8 -4 16 0l-1 10q-7 3 -14 0z`} fill={`url(#${p}vol)`} />
            </g>
          ))}
          {scatter(r, 34, 92, 76, 46, 5).map((b, i) => <circle key={i} cx={b.x} cy={b.y} r=".75" fill={pick(r, ['#c2401c', '#e0a35a', '#8e2a10'])} />)}
        </g>
      ))}
    </g>
  );
}

function Shawarma({ p, r }) {
  const foil = `${p}foil`;
  const wrap = `${p}lav`;
  return (
    <g>
      <defs>
        <linearGradient id={foil} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f2" />
          <stop offset=".45" stopColor="#c9cbcc" />
          <stop offset=".7" stopColor="#f0f0ee" />
          <stop offset="1" stopColor="#a9abad" />
        </linearGradient>
        <linearGradient id={wrap} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0b46a" />
          <stop offset=".5" stopColor="#f3d79c" />
          <stop offset="1" stopColor="#d29a4e" />
        </linearGradient>
      </defs>
      <ellipse cx="104" cy="128" rx="58" ry="9" fill="#000" opacity=".15" />
      <g transform="rotate(-28 100 86)">
        {/* toasted lavash */}
        <rect x="74" y="34" width="52" height="96" rx="24" fill={`url(#${wrap})`} />
        {[52, 66, 80].map((y) => <path key={y} d={`M80 ${y}l40 6`} stroke="#a8692a" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />)}
        {/* open top with filling */}
        <ellipse cx="100" cy="40" rx="26" ry="9" fill="#fff6e4" />
        <path d="M78 40c6-10 38-10 44 0-6 6-38 6-44 0z" fill="#cfe3a8" />
        {scatter(r, 8, 100, 38, 18, 5).map((b, i) => <rect key={i} x={b.x - 3.5} y={b.y - 2} width="7" height="4" rx="2" fill="#b86a2c" transform={`rotate(${i * 30} ${b.x} ${b.y})`} />)}
        <circle cx="90" cy="38" r="3.4" fill="#d9634a" />
        <circle cx="90" cy="38" r="1.8" fill="#f2a084" />
        <circle cx="110" cy="40" r="3" fill="#d9634a" />
        <path d="M84 36q8 6 16 0t16 2" fill="none" stroke="#fffaf0" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M88 42q6 2 12 -1" fill="none" stroke="#d8341a" strokeWidth="1.6" strokeLinecap="round" />
        {/* foil wrap around the bottom half */}
        <path d="M72 82h56v24c0 14-12 26-28 26s-28-12-28-26z" fill={`url(#${foil})`} />
        <path d="M72 82l8 6 8-5 8 6 8-5 8 6 8-5 8 5" fill="none" stroke="#9fa1a3" strokeWidth="1" />
        {[[80, 96, 90, 110], [104, 92, 112, 112], [92, 116, 100, 124]].map(([a, b, c, d], i) => <path key={i} d={`M${a} ${b}L${c} ${d}`} stroke="#fff" strokeWidth="1.4" opacity=".7" />)}
        <rect x="74" y="34" width="52" height="96" rx="24" fill={`url(#${p}vol)`} opacity=".6" />
      </g>
    </g>
  );
}

function PuffPuff({ p, r }) {
  const id = `${p}puff`;
  const balls = [[70, 78], [94, 72], [118, 74], [140, 80], [82, 92], [106, 90], [130, 94], [96, 106], [120, 108], [74, 104]].sort((a, b) => a[1] - b[1]);
  return (
    <g>
      <defs>
        <radialGradient id={id} cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#f7c56a" />
          <stop offset=".55" stopColor="#d98a2b" />
          <stop offset="1" stopColor="#8a4512" />
        </radialGradient>
      </defs>
      <Plate p={p} />
      {balls.map(([x, y]) => (
        <g key={`${x}${y}`}>
          <ellipse cx={x + 2} cy={y + 9} rx="12" ry="4" fill="#000" opacity=".15" />
          <circle cx={x} cy={y} r="13" fill={`url(#${id})`} />
          <path d={`M${x - 6} ${y - 7}q5 -3 10 -1`} fill="none" stroke="#ffe3a8" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
          {[0, 1, 2].map((i) => <circle key={i} cx={x - 6 + r() * 12} cy={y - 6 + r() * 12} r=".6" fill="#fff" opacity=".8" />)}
        </g>
      ))}
    </g>
  );
}

function MeatPie({ p }) {
  const id = `${p}pie`;
  return (
    <g>
      <defs>
        <radialGradient id={id} cx=".4" cy=".3" r=".8">
          <stop offset="0" stopColor="#f7cf7e" />
          <stop offset=".6" stopColor="#e3a447" />
          <stop offset="1" stopColor="#a8621e" />
        </radialGradient>
      </defs>
      <Plate p={p} />
      {/* whole pie with crimped edge */}
      <path d="M48 98c0-26 22-40 44-40s40 14 40 40c-14 8-70 8-84 0z" fill={`url(#${id})`} stroke="#9a5a1a" strokeWidth=".8" />
      {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${52 + i * 7.4} ${99 - Math.sin((i / 10) * Math.PI) * 3}v-5`} stroke="#b26c26" strokeWidth="1.4" strokeLinecap="round" />)}
      <path d="M64 70q22-10 44 0" fill="none" stroke="#fff1c8" strokeWidth="2" opacity=".7" strokeLinecap="round" />
      <path d="M84 74l6 6M96 72l6 6" stroke="#b26c26" strokeWidth="1.4" strokeLinecap="round" />
      {/* half pie showing minced meat, potato and carrot */}
      <path d="M128 102c-2-16 8-26 20-26s22 10 22 26z" fill={`url(#${id})`} stroke="#9a5a1a" strokeWidth=".8" />
      <path d="M132 101c0-12 6-18 16-18s16 6 16 18z" fill="#7a4220" />
      {[[140, 94, '#e8d38c'], [150, 90, '#ef8a2a'], [156, 97, '#e8d38c'], [145, 99, '#5a2a12']].map(([x, y, f]) => <rect key={`${x}${y}`} x={x - 2.5} y={y - 2.5} width="5" height="5" rx="1" fill={f} />)}
    </g>
  );
}

// ---------- drinks ----------

function Glass({ p, liquid, top, garnish, ice = true }) {
  const id = `${p}liq`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={liquid} />
        </linearGradient>
      </defs>
      <ellipse cx="102" cy="134" rx="36" ry="7" fill="#000" opacity=".15" />
      {/* liquid */}
      <path d="M74 42h52l-6 86c0 4-6 6-20 6s-20-2-20-6z" fill={`url(#${id})`} />
      {ice && [[88, 56, 10], [104, 52, -12], [96, 70, 6]].map(([x, y, rot]) => (
        <rect key={`${x}${y}`} x={x - 7} y={y - 7} width="14" height="14" rx="3" fill="#fff" opacity=".35" stroke="#fff" strokeOpacity=".6" transform={`rotate(${rot} ${x} ${y})`} />
      ))}
      <ellipse cx="100" cy="42" rx="26" ry="5" fill={top} />
      <ellipse cx="100" cy="42" rx="26" ry="5" fill="#fff" opacity=".2" />
      {/* glass */}
      <path d="M70 30h60l-8 98c0 6-8 8-22 8s-22-2-22-8z" fill={`url(#${p}glass)`} stroke="#ffffff" strokeOpacity=".9" strokeWidth="1.5" />
      <ellipse cx="100" cy="30" rx="30" ry="5.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      {[[80, 60], [118, 84], [84, 102], [116, 50]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.2" ry="1.8" fill="#fff" opacity=".7" />)}
      {/* straw */}
      <path d="M110 112l14-96" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M110 112l14-96" stroke="#e2492b" strokeWidth="5" strokeLinecap="round" strokeDasharray="5 5" />
      {garnish}
    </g>
  );
}

function Drink({ p, variant }) {
  if (variant === 'chapman') {
    return (
      <Glass
        p={p}
        liquid="#c2321c"
        top="#f0643a"
        garnish={
          <>
            {/* orange wheel on the rim + cucumber slices */}
            <circle cx="70" cy="34" r="13" fill="#f39a1c" />
            <circle cx="70" cy="34" r="10.5" fill="#ffc451" />
            {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M70 34l${10 * Math.cos((i * Math.PI) / 4)} ${10 * Math.sin((i * Math.PI) / 4)}`} stroke="#f39a1c" strokeWidth="1" />)}
            <ellipse cx="96" cy="88" rx="9" ry="9" fill="#5e9c3a" opacity=".85" />
            <ellipse cx="96" cy="88" rx="7" ry="7" fill="#d7ecb0" opacity=".85" />
          </>
        }
      />
    );
  }
  if (variant === 'zobo') {
    return (
      <Glass
        p={p}
        liquid="#4a0716"
        top="#8e1631"
        garnish={
          <>
            {/* pineapple wedge on the rim + mint */}
            <path d="M58 40l16-16 6 18z" fill="#f6c943" stroke="#d29a1c" strokeWidth="1" />
            <path d="M60 39l13-13" stroke="#d29a1c" strokeWidth=".8" strokeDasharray="2 2" />
            <path d="M126 30q8-10 16-6-4 8-16 6zM128 30q2-12 10-14 0 10-10 14z" fill="#3f8a3a" />
          </>
        }
      />
    );
  }
  return <Glass p={p} liquid="#e07b1a" top="#f8b347" />;
}

function Bottle({ p, variant }) {
  const c = {
    cola: { glass: '#2a0c08', label: '#d6261c', cap: '#c9c9c9', band: '#ffffff' },
    malt: { glass: '#2c1406', label: '#1b1b1b', cap: '#d4a017', band: '#d4a017' },
    water: { glass: '#cfeaf2', label: '#1f6fb2', cap: '#1f6fb2', band: '#ffffff' },
  }[variant] || { glass: '#2a0c08', label: '#d6261c', cap: '#ccc', band: '#fff' };
  const clear = variant === 'water';
  return (
    <g>
      <ellipse cx="102" cy="138" rx="30" ry="6" fill="#000" opacity=".15" />
      <path d="M90 8h20v18c0 6 14 14 14 34v68c0 6-4 8-24 8s-24-2-24-8V60c0-20 14-28 14-34z" fill={c.glass} opacity={clear ? 0.75 : 1} stroke={clear ? '#9cc8d6' : '#000'} strokeOpacity=".4" />
      {clear && <path d="M80 70h40v58c0 4-4 6-20 6s-20-2-20-6z" fill="#a9dcec" opacity=".7" />}
      <rect x="88" y="4" width="24" height="10" rx="2" fill={c.cap} />
      <path d="M88 7h24M88 10h24" stroke="#000" strokeOpacity=".15" />
      <rect x="76" y="70" width="48" height="34" fill={c.label} />
      {variant === 'cola' ? (
        <>
          <path d="M76 76h48M76 98h48" stroke={c.band} strokeWidth="1.6" />
          <circle cx="100" cy="87" r="6" fill="none" stroke={c.band} strokeWidth="2" />
        </>
      ) : (
        <path d="M76 82q12 -6 24 0t24 0" fill="none" stroke={c.band} strokeWidth="3" />
      )}
      <rect x="76" y="70" width="48" height="34" fill={`url(#${p}glass)`} />
      <path d="M84 30c-6 8-8 16-8 30v60" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Dessert({ p }) {
  return (
    <g>
      <Plate p={p} />
      <path d="M70 96V72l50-12 14 8v28c-20 6-44 6-64 0z" fill="#5a2e1a" />
      <path d="M70 72l50-12 14 8-48 12z" fill="#7a432a" />
      <path d="M70 84l64-4" stroke="#f3dcb5" strokeWidth="3" />
      <circle cx="112" cy="64" r="6" fill="#d61f3a" />
      <path d="M112 58q2-6 6-6" fill="none" stroke="#3f7d3a" strokeWidth="1.6" />
    </g>
  );
}

function Bowl({ p }) {
  return (
    <g>
      <ellipse cx="102" cy="122" rx="62" ry="10" fill="#000" opacity=".14" />
      <path d="M40 70c0 30 26 50 60 50s60-20 60-50z" fill="#e2492b" />
      <path d="M40 70c0 30 26 50 60 50s60-20 60-50z" fill={`url(#${p}vol)`} />
      <ellipse cx="100" cy="70" rx="60" ry="16" fill="#f4ede1" />
      <ellipse cx="100" cy="71" rx="54" ry="13" fill="#e8a33c" />
      <path d="M44 92h112" stroke="#ffc72c" strokeWidth="4" opacity=".8" />
    </g>
  );
}

function Steam() {
  return (
    <g className="steam" fill="none" stroke="#5b4636" strokeOpacity=".35" strokeWidth="2.4" strokeLinecap="round">
      <path d="M84 48q-6-8 0-16t0-16" />
      <path d="M100 44q-6-8 0-16t0-16" />
      <path d="M116 48q-6-8 0-16t0-16" />
    </g>
  );
}

function Dish({ k, p, r }) {
  switch (k.kind) {
    case 'rice': return <Rice p={p} r={r} variant={k.variant} />;
    case 'swallow': return <SwallowDish p={p} r={r} k={k} />;
    case 'chicken': return <Chicken p={p} />;
    case 'meat': return <Meat p={p} r={r} variant={k.variant} />;
    case 'fish': return <Fish p={p} />;
    case 'dodo': return <DodoPlate p={p} />;
    case 'moimoi': return <MoiMoi p={p} />;
    case 'suya': return <Suya p={p} r={r} />;
    case 'wrap': return <Shawarma p={p} r={r} />;
    case 'puff': return <PuffPuff p={p} r={r} />;
    case 'pie': return <MeatPie p={p} />;
    case 'drink': return <Drink p={p} variant={k.variant} />;
    case 'bottle': return <Bottle p={p} variant={k.variant} />;
    case 'dessert': return <Dessert p={p} />;
    default: return <Bowl p={p} />;
  }
}

export default function FoodArt({ name = '', category = '', className = '', steam = true }) {
  const p = `fa${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const k = foodKind(name, category);
  const r = seeded(name + category);
  const hot = !['drink', 'bottle', 'dessert', 'suya', 'wrap'].includes(k.kind);
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <Defs p={p} />
      {steam && hot && <Steam />}
      <g transform="translate(0 -6)">
        <Dish k={k} p={p} r={r} />
      </g>
    </svg>
  );
}
