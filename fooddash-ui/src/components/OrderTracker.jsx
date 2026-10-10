import { STATUS, stepsFor } from '../lib/status';
import { Okada } from './illustrations/Vehicles';
import Icon from './Icon';

const STEP_ICON = { RECEIVED: 'receipt', PREPARING: 'flame', READY: 'bag', OUT_FOR_DELIVERY: 'bike', DELIVERED: 'pin', PICKED_UP: 'check' };

// A Lagos road from the kitchen to the customer. The okada rides to the
// current step, so customers can see progress at a glance. Everything is
// positioned on one track so the rider, the bar and the stops line up.
export default function OrderTracker({ order }) {
  const steps = stepsFor(order.type);
  const current = Math.max(0, steps.indexOf(order.status));
  const at = (i) => (i / (steps.length - 1)) * 100;
  const moving = order.status === 'OUT_FOR_DELIVERY';

  return (
    <div className="bg-adire relative overflow-hidden rounded-3xl bg-lagoon-dark px-8 pb-12 pt-6 text-cream sm:px-14 sm:pb-14">
      <div className="relative">
        <div className="relative h-20">
          <div className="absolute bottom-1 -translate-x-1/2 transition-[left] duration-[1500ms] ease-out" style={{ left: `${at(current)}%` }}>
            <svg viewBox="0 0 92 76" className={`h-16 w-20 ${moving ? '' : '[&_.wheel]:[animation-play-state:paused]'}`} aria-hidden="true">
              <Okada />
            </svg>
          </div>
        </div>

        <div className="relative h-3 rounded-full bg-ink/60">
          <div className="absolute inset-y-0 left-0 rounded-full bg-danfo transition-[width] duration-[1500ms] ease-out" style={{ width: `${at(current)}%` }} />
        </div>

        <ol className="relative h-9">
          {steps.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s} className="absolute top-0 -translate-x-1/2 -translate-y-[calc(50%+6px)]" style={{ left: `${at(i)}%` }}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${done ? 'border-danfo bg-danfo text-ink' : 'border-cream/30 bg-lagoon-dark text-cream/50'} ${i === current ? 'ring-4 ring-danfo/30' : ''}`}>
                  <Icon name={STEP_ICON[s]} className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <span className={`absolute left-1/2 top-11 hidden -translate-x-1/2 whitespace-nowrap text-sm font-semibold sm:block ${done ? 'text-cream' : 'text-cream/50'}`}>
                  {STATUS[s].label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-cream/80 sm:hidden">Step {current + 1} of {steps.length}: {STATUS[order.status]?.label}</p>
    </div>
  );
}
