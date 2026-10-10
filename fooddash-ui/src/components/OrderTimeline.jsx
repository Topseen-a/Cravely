import { STATUS } from '../lib/status';
import { lagosTime } from '../lib/format';

export default function OrderTimeline({ events }) {
  if (!events?.length) return null;
  return (
    <ol className="relative space-y-5 border-l-2 border-dashed border-line pl-6">
      {[...events].reverse().map((ev, i) => (
        <li key={ev.ID} className="relative">
          <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${i === 0 ? STATUS[ev.status]?.dot || 'bg-ink' : 'bg-line'}`} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="font-semibold">{STATUS[ev.status]?.label || ev.status}</p>
            <time className="text-xs font-semibold text-muted">{lagosTime(ev.CreatedAt)}</time>
          </div>
          {ev.note && <p className="text-sm text-muted">{ev.note}</p>}
        </li>
      ))}
    </ol>
  );
}
