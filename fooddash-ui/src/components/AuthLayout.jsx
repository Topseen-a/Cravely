import { Danfo, Okada } from './illustrations/Vehicles';
import FoodArt from './illustrations/FoodArt';

function Panel({ quote, by }) {
  return (
    <div className="bg-adire relative hidden overflow-hidden bg-adire p-12 text-cream lg:flex lg:flex-col">
      <div className="relative z-10 max-w-md">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-danfo">Cravely · Lagos</p>
        <p className="mt-6 font-display text-4xl font-bold leading-tight">&ldquo;{quote}&rdquo;</p>
        <p className="mt-4 text-cream/70">— {by}</p>
      </div>

      <div className="relative mt-auto">
        <div className="animate-float absolute -top-56 right-4 w-56 rotate-6 rounded-3xl bg-cream p-3 shadow-pop">
          <div className="rounded-2xl bg-palm-soft"><FoodArt name="Pounded Yam & Egusi" className="h-36 w-full" /></div>
        </div>
        <div className="animate-float absolute -top-40 left-0 w-44 -rotate-6 rounded-3xl bg-cream p-3 shadow-pop" style={{ animationDelay: '-2s' }}>
          <div className="rounded-2xl bg-jollof-soft"><FoodArt name="Beef Suya" className="h-28 w-full" /></div>
        </div>
        {/* road */}
        <svg viewBox="0 0 600 130" className="w-full" aria-hidden="true">
          <rect y="100" width="600" height="30" fill="#17120e" />
          <path d="M0 115h600" stroke="#ffc72c" strokeWidth="3" strokeDasharray="22 18" />
          <g transform="translate(0 22)"><g className="animate-drive-slow" style={{ animationDelay: '-6s' }}><Danfo route="OSHODI" /></g></g>
          <g transform="translate(0 30)"><g className="animate-drive" style={{ animationDelay: '-2s' }}><Okada /></g></g>
        </svg>
      </div>
    </div>
  );
}

export default function AuthLayout({ children, quote, by }) {
  return (
    <div className="grid grid-cols-1 min-h-[calc(100vh-70px)] lg:grid-cols-[1fr_1.1fr]">
      <Panel quote={quote} by={by} />
      <div className="flex items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <div className="animate-fade-up w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
