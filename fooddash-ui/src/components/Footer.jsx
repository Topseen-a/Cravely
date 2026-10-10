import { useStore } from '../context/hooks';
import { clock } from '../lib/format';
import Logo from './illustrations/Logo';

// Simple Lagos skyline silhouette to cap the page.
function Skyline() {
  const blocks = [
    [0, 30], [40, 55], [70, 38], [110, 80], [130, 62], [180, 44], [215, 96], [240, 70], [290, 50], [330, 110],
    [352, 74], [400, 58], [440, 88], [480, 40], [520, 66], [560, 120], [585, 84], [640, 52], [690, 76], [730, 46],
    [770, 100], [800, 64], [850, 42], [900, 72], [940, 54], [990, 90], [1020, 60], [1070, 44], [1110, 70], [1160, 36],
  ];
  return (
    <svg viewBox="0 0 1200 130" preserveAspectRatio="none" className="block h-16 w-full text-ink sm:h-24" aria-hidden="true">
      {blocks.map(([x, h], i) => (
        <rect key={x} x={x} y={130 - h} width={i % 3 === 0 ? 34 : 44} height={h} fill="currentColor" />
      ))}
      <path d="M1000 130L1012 30h4l12 100" fill="currentColor" />
      {[-60, -40, -20, 20, 40, 60].map((d) => <path key={d} d={`M1014 40L${1014 + d} 118`} stroke="currentColor" strokeWidth="1.5" />)}
    </svg>
  );
}

export default function Footer() {
  const { store, zones } = useStore();
  return (
    <footer className="mt-20 pb-20 md:pb-0">
      <Skyline />
      <div className="bg-adire bg-ink text-cream">
        <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm text-cream/70">
              Proper Naija food, cooked fresh and delivered across Lagos — from the Island to the Mainland, sharp sharp.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-danfo">Kitchen hours</h3>
            <p className="mt-3 text-sm text-cream/80">
              {store ? (store.opening_time === store.closing_time ? 'Open 24 hours, every day' : `Every day, ${clock(store.opening_time)} – ${clock(store.closing_time)}`) : '—'}
            </p>
            <p className="mt-1 text-xs text-cream/50">West Africa Time (WAT)</p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-danfo">We deliver to</h3>
            <p className="mt-3 text-sm leading-relaxed text-cream/80">{zones.length ? zones.map((z) => z.name).join(' · ') : 'Pickup available'}</p>
          </div>
        </div>
        <div className="border-t border-cream/10">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-cream/50">
            <span>© {new Date().getFullYear()} Cravely. Made with love in Lagos 🇳🇬</span>
            <span>Payments secured by Paystack · Prices in Naira (₦)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
