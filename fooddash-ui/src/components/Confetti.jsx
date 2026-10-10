import { useMemo } from 'react';

// A short burst of green-white-green and danfo-yellow confetti.
const COLORS = ['#0a8754', '#ffffff', '#0a8754', '#ffc72c', '#e2492b'];

// Stable pseudo-random number in [0, 1) for piece i, property k.
const rnd = (i, k) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export default function Confetti({ count = 60 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: rnd(i, 1) * 100,
        delay: rnd(i, 2) * 0.6,
        duration: 2.2 + rnd(i, 3) * 1.8,
        size: 6 + rnd(i, 4) * 8,
        color: COLORS[i % COLORS.length],
        drift: (rnd(i, 5) - 0.5) * 200,
        rotate: rnd(i, 6) * 720,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>{`@keyframes confetti-fall{0%{transform:translate(0,-10vh) rotate(0)}100%{transform:translate(var(--drift),110vh) rotate(var(--rot));opacity:.9}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            boxShadow: p.color === '#ffffff' ? '0 0 0 1px rgba(0,0,0,.08)' : undefined,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rotate}deg`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
