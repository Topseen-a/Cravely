import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/hooks';
import { useAuth } from '../context/hooks';
import { useStore } from '../context/hooks';
import { useToast } from '../context/hooks';
import { placeOrder } from '../api/endpoints';
import { naira, apiError, clock } from '../lib/format';
import { computeTotals } from '../lib/pricing';
import { DishTile } from '../components/MenuItemCard';
import { OkadaIcon } from '../components/illustrations/Vehicles';
import FoodArt from '../components/illustrations/FoodArt';
import { Button, Card, EmptyState, Input, Select, Textarea, PageTitle } from '../components/ui';
import Icon from '../components/Icon';

const SAVED = 'cravely.checkout';

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED) || '{}');
  } catch {
    return {};
  }
}

function CartLine({ line }) {
  const { update, remove } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(line.special_instructions || '');

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const item = line.menu_item;
  return (
    <div className={`flex gap-3 py-5 transition min-[380px]:gap-4 ${busy ? 'opacity-60' : ''}`}>
      <DishTile item={item} className="h-14 w-14 shrink-0 rounded-2xl min-[380px]:h-20 min-[380px]:w-20" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">{item.name}</h3>
            <p className="text-sm text-muted">{naira(item.price)} each</p>
          </div>
          <p className="font-display text-lg font-extrabold">{naira(item.price * line.quantity)}</p>
        </div>

        {!item.is_available && <p className="mt-1 text-sm font-semibold text-jollof-dark">Sold out — remove it to continue</p>}

        {editing ? (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. no pepper, extra dodo"
              className="h-10 flex-1 rounded-xl border-2 border-line bg-white px-3 text-sm focus:border-ink focus:outline-none"
            />
            <Button size="sm" variant="dark" onClick={() => run(async () => { await update(line.ID, line.quantity, note); setEditing(false); })}>Save</Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-1 text-left text-sm text-muted hover:text-ink">
            {line.special_instructions ? <span className="italic">“{line.special_instructions}” · edit</span> : '+ Add a note for the chef'}
          </button>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center rounded-full border-2 border-line bg-white">
            <button disabled={busy || line.quantity <= 1} onClick={() => run(() => update(line.ID, line.quantity - 1, line.special_instructions))} className="flex h-9 w-9 items-center justify-center disabled:opacity-30" aria-label="Decrease quantity">
              <Icon name="minus" className="h-4 w-4" />
            </button>
            <span className="w-7 text-center font-bold">{line.quantity}</span>
            <button disabled={busy || line.quantity >= 50} onClick={() => run(() => update(line.ID, line.quantity + 1, line.special_instructions))} className="flex h-9 w-9 items-center justify-center disabled:opacity-30" aria-label="Increase quantity">
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          <button disabled={busy} onClick={() => run(() => remove(line.ID))} className="text-sm font-semibold text-muted hover:text-jollof">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Option({ selected, onClick, icon, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex flex-1 items-center gap-4 rounded-2xl border-2 p-4 text-left transition disabled:opacity-40 ${selected ? 'border-ink bg-danfo-soft shadow-[3px_3px_0_0_var(--color-ink)]' : 'border-line bg-white hover:border-ink/40'}`}
    >
      <span className="flex h-12 w-14 shrink-0 items-center justify-center">{icon}</span>
      <span>
        <span className="block font-display text-lg font-bold leading-tight">{title}</span>
        <span className="block text-sm text-muted">{children}</span>
      </span>
    </button>
  );
}

export default function CartPage() {
  const { cart, refreshCart, clear } = useCart();
  const { user } = useAuth();
  const { store, zones } = useStore();
  const toast = useToast();
  const navigate = useNavigate();

  const saved = loadSaved();
  const [type, setType] = useState(saved.type || 'delivery');
  const [zoneId, setZoneId] = useState(saved.zoneId || '');
  const [address, setAddress] = useState(saved.address || '');
  const [landmark, setLandmark] = useState(saved.landmark || '');
  const [phone, setPhone] = useState(user?.phone ? '0' + user.phone.slice(4) : '');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('pay_on_delivery');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  if (!cart) return <div className="py-24 text-center text-muted">Loading your cart…</div>;

  if (!cart.items?.length)
    return (
      <EmptyState
        art={<div className="rounded-full bg-cream-dark p-6"><FoodArt name="empty plate" steam={false} className="h-28 w-40" /></div>}
        title="Your cart dey empty"
        action={<Link to="/#menu"><Button size="lg">Browse the menu</Button></Link>}
      >
        Add some jollof, suya or swallow — we&rsquo;ll handle the rest.
      </EmptyState>
    );

  const zone = zones.find((z) => String(z.ID) === String(zoneId));
  const vatPercent = store?.vat_percent ?? 0;
  const totals = computeTotals(cart.subtotal, type === 'delivery' ? zone?.fee || 0 : 0, vatPercent);
  const soldOut = cart.items.filter((i) => !i.menu_item.is_available);
  const belowMin = store && cart.subtotal < store.min_order;
  const closed = store && !store.is_open;

  const submit = async () => {
    setError('');
    if (type === 'delivery') {
      if (!zone) return setError('Choose your delivery area');
      if (!address.trim()) return setError('Enter your delivery address');
      if (!phone.trim()) return setError('Enter a phone number so the rider can reach you');
    }
    setPlacing(true);
    try {
      const { data } = await placeOrder({
        type,
        payment_method: payment,
        delivery_zone_id: type === 'delivery' ? zone.ID : undefined,
        delivery_address: type === 'delivery' ? address : '',
        landmark: type === 'delivery' ? landmark : '',
        contact_phone: phone,
        note,
      });
      localStorage.setItem(SAVED, JSON.stringify({ type, zoneId, address, landmark }));
      await refreshCart();
      if (data.payment?.authorization_url) {
        window.location.assign(data.payment.authorization_url);
        return;
      }
      if (data.payment_error) toast(data.payment_error, 'error');
      navigate(`/orders/${data.data.ID}?new=1`);
    } catch (err) {
      setError(apiError(err, 'Could not place your order'));
      refreshCart();
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <PageTitle eyebrow="Checkout" title="Your order" action={
        <button onClick={() => clear().catch(() => {})} className="text-sm font-semibold text-muted hover:text-jollof">Clear cart</button>
      } />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="px-5 sm:px-6">
            <div className="divide-y divide-line/70">
              {cart.items.map((line) => <CartLine key={line.ID} line={line} />)}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-2xl font-bold">How you want am?</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Option selected={type === 'delivery'} onClick={() => setType('delivery')} icon={<OkadaIcon className="h-12" />} title="Delivery" disabled={!zones.length}>
                {zones.length ? `Rider brings it · from ${naira(Math.min(...zones.map((z) => z.fee)))}` : 'Not available right now'}
              </Option>
              <Option selected={type === 'pickup'} onClick={() => setType('pickup')} icon={<Icon name="store" className="h-9 w-9" strokeWidth={1.8} />} title="Pickup">
                Collect from our kitchen · free
              </Option>
            </div>

            {type === 'delivery' && (
              <div className="animate-fade-up mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Delivery area" value={zone ? zoneId : ''} onChange={(e) => setZoneId(e.target.value)} className="sm:col-span-2" required>
                  <option value="">Choose your area…</option>
                  {zones.map((z) => (
                    <option key={z.ID} value={z.ID}>
                      {z.name} — {naira(z.fee)}{z.estimated_minutes ? ` · ~${z.estimated_minutes} min` : ''}
                    </option>
                  ))}
                </Select>
                <Textarea label="Street address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Herbert Macaulay Way, Sabo" className="sm:col-span-2" maxLength={500} />
                <Input label="Nearest landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Opposite Yaba market, by the blue gate" hint="Helps the rider find you faster" maxLength={200} />
                <Input label="Phone number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" hint="The rider will call when they arrive" />
              </div>
            )}
            {type === 'pickup' && (
              <div className="animate-fade-up mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Phone number (optional)" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" hint="We'll call if there's any delay" />
              </div>
            )}
            <Textarea label="Note for the kitchen (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, cutlery, gate code…" className="mt-4" maxLength={500} />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-2xl font-bold">How you go pay?</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Option selected={payment === 'pay_on_delivery'} onClick={() => setPayment('pay_on_delivery')} icon={<Icon name="cash" className="h-9 w-9" strokeWidth={1.8} />} title={type === 'pickup' ? 'Pay at pickup' : 'Pay on delivery'}>
                Cash, POS or bank transfer
              </Option>
              {store?.paystack_enabled && (
                <Option selected={payment === 'paystack'} onClick={() => setPayment('paystack')} icon={<Icon name="card" className="h-9 w-9" strokeWidth={1.8} />} title="Pay online now">
                  Card, transfer or USSD via Paystack
                </Option>
              )}
            </div>
          </Card>
        </div>

        <Card className="sticky top-24 overflow-hidden">
          <div className="danfo-stripes h-2" />
          <div className="p-6">
            <h2 className="text-2xl font-bold">Summary</h2>
            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Food</dt><dd className="font-semibold">{naira(totals.subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery{type === 'delivery' && zone ? ` · ${zone.name}` : ''}</dt>
                <dd className="font-semibold">{type === 'pickup' ? 'Free' : zone ? naira(totals.delivery) : '—'}</dd>
              </div>
              {vatPercent > 0 && <div className="flex justify-between"><dt className="text-muted">VAT ({vatPercent}%)</dt><dd className="font-semibold">{naira(totals.vat)}</dd></div>}
              <div className="flex items-baseline justify-between border-t-2 border-dashed border-line pt-4">
                <dt className="font-display text-xl font-bold">Total</dt>
                <dd className="font-display text-3xl font-extrabold text-jollof">{naira(totals.total)}</dd>
              </div>
            </dl>

            {type === 'delivery' && zone?.estimated_minutes > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-lagoon-soft px-3 py-2 text-sm font-semibold text-lagoon-dark">
                <Icon name="clock" className="h-4 w-4" /> Arrives in about {zone.estimated_minutes} minutes
              </p>
            )}
            {closed && <p className="mt-4 rounded-xl bg-jollof-soft px-3 py-2 text-sm font-semibold text-jollof-dark">We&rsquo;re closed now. Orders open at {clock(store.opening_time)}.</p>}
            {belowMin && <p className="mt-4 rounded-xl bg-danfo-soft px-3 py-2 text-sm font-semibold">Minimum order is {naira(store.min_order)}.</p>}
            {soldOut.length > 0 && <p className="mt-4 rounded-xl bg-jollof-soft px-3 py-2 text-sm font-semibold text-jollof-dark">Remove sold-out items to continue.</p>}
            {error && <p role="alert" className="mt-4 rounded-xl bg-jollof-soft px-3 py-2 text-sm font-semibold text-jollof-dark">{error}</p>}

            <Button size="lg" className="mt-6 w-full" loading={placing} disabled={closed || belowMin || soldOut.length > 0} onClick={submit}>
              {payment === 'paystack' ? `Pay ${naira(totals.total)}` : `Place order · ${naira(totals.total)}`}
            </Button>
            <p className="mt-3 text-center text-xs text-muted">
              {payment === 'paystack' ? 'You’ll be taken to Paystack’s secure checkout.' : 'Pay the rider or cashier when your food arrives.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
