import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMenu } from '../api/endpoints';
import { useAuth } from '../context/hooks';
import { useCart } from '../context/hooks';
import { useStore } from '../context/hooks';
import { naira, greeting } from '../lib/format';
import LagosScene from '../components/illustrations/LagosScene';
import FoodArt from '../components/illustrations/FoodArt';
import MenuItemCard from '../components/MenuItemCard';
import StoreStatusPill from '../components/StoreStatusPill';
import { Skeleton, EmptyState } from '../components/ui';
import Icon from '../components/Icon';

const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO_URL;

function Squiggle() {
  return (
    <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-jollof" aria-hidden="true">
      <path d="M3 14C60 4 120 4 160 10s100 6 137-6" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function Hero() {
  const { user } = useAuth();
  const { store, zones } = useStore();
  const fastest = zones.length ? Math.min(...zones.map((z) => z.estimated_minutes || 0).filter(Boolean)) : null;

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-[2rem] border-2 border-ink lg:min-h-[640px]"
      style={{ background: 'linear-gradient(180deg,#ff9b5a 0%,#ffc277 50%,#ffe3a8 100%)' }}
    >
      <div className="relative z-10 grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr] lg:p-14">
        <div className="animate-fade-up">
          <StoreStatusPill />
          {user && (
            <p className="mt-5 font-display text-xl font-bold text-ink-soft [overflow-wrap:anywhere] sm:text-2xl">
              {greeting()}, {user.name?.split(' ')[0]} 👋
            </p>
          )}
          <h1 className={`${user ? 'mt-2' : 'mt-5'} text-[clamp(1.9rem,10vw,2.6rem)] font-extrabold leading-[1.04] sm:text-6xl lg:text-[3.6rem] xl:text-[4.1rem]`}>
            {user ? (
              <span className="relative inline-block">Wetin you go chop?<Squiggle /></span>
            ) : (
              <>
                Lagos&rsquo; favourite kitchen, delivered{' '}
                <span className="relative inline-block whitespace-nowrap">sharp sharp.<Squiggle /></span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-soft">
            Smoky party jollof, pounded yam &amp; egusi, suya with extra yaji — cooked fresh and on its way to you from Yaba to Lekki.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#menu" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-ink bg-ink px-7 font-bold text-cream shadow-[3px_3px_0_0_rgba(23,18,14,.35)] transition hover:-translate-y-0.5">
              Order now <Icon name="arrow" />
            </a>
            <Link to={user ? '/orders' : '/register'} className="inline-flex h-14 items-center rounded-xl border-2 border-ink bg-white/70 px-7 font-bold backdrop-blur transition hover:bg-white">
              {user ? 'Track my orders' : 'Create an account'}
            </Link>
          </div>
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-ink-soft">
            <div className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4" />{fastest ? `From ${fastest} min delivery` : 'Fresh, fast delivery'}</div>
            <div className="flex items-center gap-2"><Icon name="cash" className="h-4 w-4" />Pay on delivery{store?.paystack_enabled ? ' or online' : ''}</div>
            <div className="flex items-center gap-2"><Icon name="flame" className="h-4 w-4" />Cooked to order</div>
          </dl>
        </div>

        {/* floating "today's special" card */}
        <div className="relative hidden lg:block">
          <div className="animate-float absolute right-2 top-0 w-72 rotate-3 rounded-3xl border-2 border-ink bg-cream p-4 shadow-pop">
            <div className="bg-adire-light rounded-2xl bg-jollof-soft">
              <FoodArt name="Jollof Rice" className="h-44 w-full" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-jollof">Today&rsquo;s special</p>
                <p className="font-display text-xl font-bold">Party Jollof</p>
              </div>
              <p className="font-display text-xl font-extrabold">{naira(3500)}</p>
            </div>
          </div>
          <span className="absolute -top-4 right-56 -rotate-12 whitespace-nowrap rounded-full border-2 border-ink bg-danfo px-4 py-2 font-display text-lg font-extrabold shadow-[3px_3px_0_0_var(--color-ink)]">
            Smoky! 🔥
          </span>
        </div>
      </div>

      <div className="relative mt-auto h-56 sm:h-72 lg:h-[380px]">
        {HERO_VIDEO ? (
          <video className="h-full w-full object-cover" src={HERO_VIDEO} autoPlay muted loop playsInline aria-hidden="true" />
        ) : (
          <LagosScene sky={false} className="h-full w-full" />
        )}
      </div>
    </section>
  );
}

function AreasMarquee() {
  const { zones } = useStore();
  if (!zones.length) return null;
  const row = zones.map((z) => (
    <span key={z.ID} className="flex items-center gap-3 whitespace-nowrap px-6">
      <span className="font-display text-xl font-extrabold uppercase">{z.name}</span>
      <span className="rounded-full bg-danfo px-2 py-0.5 text-xs font-bold text-ink">{naira(z.fee)}</span>
      <span className="text-danfo">✦</span>
    </span>
  ));
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border-2 border-ink bg-ink py-3 text-cream" aria-label={`We deliver to ${zones.map((z) => z.name).join(', ')}`}>
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {row}
        {row}
        {row}
        {row}
      </div>
    </div>
  );
}

function FloatingCart() {
  const { cart, itemCount } = useCart();
  if (!itemCount) return null;
  return (
    <Link to="/cart" className="animate-fade-up fixed inset-x-4 bottom-20 z-30 flex items-center justify-between rounded-2xl border-2 border-ink bg-danfo px-5 py-3.5 font-bold shadow-pop md:hidden">
      <span className="flex items-center gap-2">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-1.5 text-sm text-danfo">{itemCount}</span>
        View cart
      </span>
      <span>{naira(cart.subtotal)}</span>
    </Link>
  );
}

export default function MenuPage() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const sectionRefs = useRef({});

  const fetchMenu = () => getMenu().then(({ data }) => setMenu(data.data || [])).catch(() => setError(true));
  useEffect(() => {
    fetchMenu();
  }, []);
  const load = () => {
    setError(false);
    fetchMenu();
  };

  const filtered = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    return menu
      .map((c) => ({ ...c, items: (c.items || []).filter((i) => !q || `${i.name} ${i.description} ${c.name}`.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length);
  }, [menu, query]);

  // Highlight the category chip for the section in view.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.id))),
      { rootMargin: '-140px 0px -60% 0px' },
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [filtered]);

  const jump = (id) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  };

  return (
    <div>
      <Hero />
      <AreasMarquee />

      <section id="menu" className="scroll-mt-24 pt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.18em] text-jollof">The menu</p>
            <h2 className="text-4xl font-extrabold sm:text-5xl">Weytin you go chop today?</h2>
          </div>
          <label className="relative w-full sm:w-80">
            <span className="sr-only">Search the menu</span>
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jollof, suya, egusi…"
              className="h-12 w-full rounded-full border-2 border-line bg-white pl-12 pr-4 focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        {filtered.length > 0 && (
          <div className="sticky top-[70px] z-20 -mx-4 mb-8 border-b border-line/60 bg-cream/90 px-4 py-3 backdrop-blur-md">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {filtered.map((c) => (
                <button
                  key={c.ID}
                  onClick={() => jump(c.ID)}
                  className={`h-10 shrink-0 rounded-full border-2 px-4 text-sm font-bold transition ${active === c.ID ? 'border-ink bg-ink text-cream' : 'border-line bg-white hover:border-ink/40'}`}
                >
                  {c.name}
                  <span className="ml-1.5 opacity-60">{c.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <EmptyState title="We couldn't load the menu" action={<button onClick={load} className="font-bold text-jollof underline">Try again</button>}>
            Network wahala. Check your connection and try again.
          </EmptyState>
        ) : !menu ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState art={<FoodArt name="bowl" className="h-32" />} title={query ? `No "${query}" today` : 'The menu is being prepared'}>
            {query ? 'Try another dish — we have plenty more.' : 'Check back shortly.'}
          </EmptyState>
        ) : (
          <div className="space-y-14">
            {filtered.map((c) => (
              <section key={c.ID} data-id={c.ID} ref={(el) => (sectionRefs.current[c.ID] = el)}>
                <div className="mb-5 flex items-baseline gap-3">
                  <h3 className="text-3xl font-extrabold">{c.name}</h3>
                  {c.description && <p className="hidden text-muted sm:block">{c.description}</p>}
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {c.items.map((item, i) => <MenuItemCard key={item.ID} item={item} category={c.name} index={i} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
      <FloatingCart />
    </div>
  );
}
