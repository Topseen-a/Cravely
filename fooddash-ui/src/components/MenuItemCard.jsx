import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { useCart } from '../context/hooks';
import { useToast } from '../context/hooks';
import { naira, apiError } from '../lib/format';
import FoodArt from './illustrations/FoodArt';
import { foodKind, TILE } from '../lib/food';
import Icon from './Icon';

export function DishTile({ item, category, className = '' }) {
  const kind = foodKind(item.name, category).kind;
  return (
    <div className={`bg-adire-light relative overflow-hidden ${TILE[kind]} ${className}`}>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : (
        <FoodArt name={item.name} category={category} className="h-full w-full p-3 transition duration-500 group-hover:scale-110 group-hover:-rotate-2" />
      )}
    </div>
  );
}

export default function MenuItemCard({ item, category, index = 0 }) {
  const { user, isStaff } = useAuth();
  const { add, update, remove, lineFor } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const line = lineFor(item.ID);
  const soldOut = !item.is_available;

  const act = async (fn) => {
    if (!user) {
      toast('Log in or sign up to start your order 🙂');
      navigate('/login?next=/');
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`group animate-fade-up flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop ${soldOut ? 'opacity-90' : ''}`}
    >
      <div className="relative">
        <DishTile item={item} category={category} className={`aspect-[4/3] ${soldOut ? 'grayscale-[.85]' : ''}`} />
        {soldOut && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-4 border-jollof bg-white/90 px-3 py-1 font-display text-lg font-extrabold uppercase tracking-wider text-jollof">
            E don finish
          </span>
        )}
        {line && !soldOut && (
          <span className="animate-pop absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-danfo">
            {line.quantity} in cart
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold leading-snug">{item.name}</h3>
        {item.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{item.description}</p>}
        {soldOut && <p className="mt-2 text-sm font-semibold text-jollof-dark">{item.sold_out_note || 'Sold out for now — check back soon.'}</p>}

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-display text-2xl font-extrabold text-jollof">{naira(item.price)}</span>

          {!isStaff && !soldOut && (line ? (
            <div className="flex items-center gap-1 rounded-full border-2 border-ink bg-danfo p-1">
              <button
                disabled={busy}
                onClick={() => act(() => (line.quantity > 1 ? update(line.ID, line.quantity - 1, line.special_instructions) : remove(line.ID)))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/10 disabled:opacity-50"
                aria-label={`Remove one ${item.name}`}
              >
                <Icon name={line.quantity > 1 ? 'minus' : 'trash'} className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="w-6 text-center font-bold" aria-live="polite">{line.quantity}</span>
              <button
                disabled={busy || line.quantity >= 50}
                onClick={() => act(() => add(item.ID, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/10 disabled:opacity-50"
                aria-label={`Add another ${item.name}`}
              >
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={() => act(async () => { await add(item.ID, 1); toast(`${item.name} added to your cart`, 'success'); })}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-danfo px-4 font-bold shadow-[2px_2px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={3} />
              Add
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
