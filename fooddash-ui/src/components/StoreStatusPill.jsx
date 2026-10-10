import { useStore } from '../context/hooks';
import { clock } from '../lib/format';

// Kitchen fire is on: a small flickering flame.
function Flame() {
  return (
    <svg viewBox="0 0 16 20" className="flicker h-[18px] w-[14px]" aria-hidden="true">
      <path d="M8 19.5c-4 0-6.8-2.6-6.8-6.2 0-3.5 2.4-5.3 3.6-8.3.4 1.8 1.4 2.9 2.5 3.4C7 4.6 8.4 2 10.8.5c-.4 3.4 4 5.8 4 11.4 0 4.6-3 7.6-6.8 7.6z" fill="#e2492b" />
      <path d="M8.2 19.5c-2.2 0-3.6-1.4-3.6-3.3 0-2.4 2-3.4 2.6-5.4 1.4 1.3 4.6 2.7 4.6 5.5 0 2-1.5 3.2-3.6 3.2z" fill="#ffc72c" />
    </svg>
  );
}

// Kitchen is resting: a crescent moon.
function Moon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path d="M10.5 1.2A7 7 0 1 0 14.8 11 5.6 5.6 0 0 1 10.5 1.2z" fill="#23307a" />
    </svg>
  );
}

export default function StoreStatusPill({ className = '' }) {
  const { store } = useStore();
  if (!store) return null;
  const allDay = store.opening_time === store.closing_time;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-1.5 text-sm font-bold ${className}`}>
      {store.is_open ? <Flame /> : <Moon />}
      {store.is_open
        ? allDay ? 'Kitchen open 24/7' : `Kitchen open · till ${clock(store.closing_time)}`
        : `Closed · opens ${clock(store.opening_time)}`}
    </span>
  );
}
