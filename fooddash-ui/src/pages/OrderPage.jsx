import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { cancelOrder, payOrder } from '../api/endpoints';
import { useToast } from '../context/hooks';
import { STATUS } from '../lib/status';
import { naira, lagosDateTime, prettyPhone, apiError, lagosTime } from '../lib/format';
import OrderTracker from '../components/OrderTracker';
import OrderTimeline from '../components/OrderTimeline';
import Confetti from '../components/Confetti';
import { DishTile } from '../components/MenuItemCard';
import { Button, Card, EmptyState, Modal, PaymentChip, Skeleton, StatusChip, Textarea } from '../components/ui';
import Icon from '../components/Icon';

function CopyRef({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      className="inline-flex items-center gap-1.5 rounded-lg bg-ink/5 px-2.5 py-1 font-mono text-sm font-bold tracking-wider hover:bg-ink/10"
      title="Copy order reference"
    >
      {value}
      <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
    </button>
  );
}

function eta(order) {
  const mins = order.delivery_zone?.estimated_minutes;
  if (!mins || order.type !== 'delivery' || ['DELIVERED', 'CANCELLED'].includes(order.status)) return null;
  return lagosTime(new Date(new Date(order.CreatedAt).getTime() + mins * 60000));
}

export default function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { order, setOrder, error, live } = useOrderStatus(id);
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (error === 'not_found')
    return <EmptyState title="We can't find that order" action={<Link to="/orders"><Button>See my orders</Button></Link>}>It may belong to another account.</EmptyState>;
  if (error) return <EmptyState title="Couldn't load your order" action={<Button onClick={() => window.location.reload()}>Try again</Button>} />;
  if (!order)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </div>
    );

  const s = STATUS[order.status];
  const arrival = eta(order);
  const unpaidOnline = order.payment_method === 'paystack' && order.payment_status !== 'paid' && order.status !== 'CANCELLED';

  const doCancel = async () => {
    setBusy(true);
    try {
      const { data } = await cancelOrder(order.ID, reason);
      setOrder(data.data);
      setCancelOpen(false);
      toast('Order cancelled', 'info');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doPay = async () => {
    setBusy(true);
    try {
      const { data } = await payOrder(order.ID);
      window.location.assign(data.data.authorization_url);
    } catch (err) {
      toast(apiError(err), 'error');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {params.get('new') && <Confetti />}
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="back" className="h-4 w-4" /> My orders
      </Link>

      <Card className="animate-fade-up overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <CopyRef value={order.reference} />
            <StatusChip status={order.status} />
            {live && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-palm">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-palm opacity-70" /><span className="relative h-2 w-2 rounded-full bg-palm" /></span>
                LIVE
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
            {params.get('new') && order.status === 'RECEIVED' ? 'Order placed! 🎉' : s.label}
          </h1>
          <p className="mt-1 text-lg text-muted">{s.caption}</p>
          {order.status === 'CANCELLED' && order.cancel_reason && <p className="mt-2 text-sm text-jollof-dark">{order.cancel_reason}</p>}
          {arrival && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-lagoon-soft px-4 py-2 font-bold text-lagoon-dark">
              <Icon name="clock" className="h-4 w-4" /> Estimated arrival around {arrival}
            </p>
          )}
        </div>
        {order.status !== 'CANCELLED' && <div className="px-3 pb-3 sm:px-4 sm:pb-4"><OrderTracker order={order} /></div>}
      </Card>

      {unpaidOnline && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-danfo-soft p-5">
          <div>
            <p className="font-display text-xl font-bold">Payment pending</p>
            <p className="text-sm text-ink-soft">We&rsquo;ll start cooking as soon as your payment is confirmed.</p>
          </div>
          <Button onClick={doPay} loading={busy}>Pay {naira(order.total_amount)}</Button>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-muted">{order.type === 'delivery' ? 'Delivering to' : 'Pickup'}</h2>
          {order.type === 'delivery' ? (
            <div className="mt-3 space-y-2">
              <p className="flex gap-2 font-semibold"><Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-jollof" />{order.delivery_address}</p>
              {order.landmark && <p className="pl-7 text-sm text-muted">Landmark: {order.landmark}</p>}
              {order.delivery_zone && <p className="pl-7 text-sm text-muted">{order.delivery_zone.name}</p>}
            </div>
          ) : (
            <p className="mt-3 flex gap-2 font-semibold"><Icon name="store" className="h-5 w-5 text-jollof" />Collect from the Cravely kitchen</p>
          )}
          {order.contact_phone && <p className="mt-3 flex gap-2 text-sm"><Icon name="phone" className="h-4 w-4 text-muted" />{prettyPhone(order.contact_phone)}</p>}
          {order.note && <p className="mt-3 rounded-xl bg-cream-dark/60 px-3 py-2 text-sm italic">“{order.note}”</p>}
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-muted">Payment</h2>
          <div className="mt-3 flex items-center gap-2">
            <PaymentChip status={order.payment_status} />
            <span className="text-sm text-muted">{order.payment_method === 'paystack' ? 'Online · Paystack' : order.type === 'pickup' ? 'Pay at pickup' : 'Pay on delivery'}</span>
          </div>
          <p className="mt-3 text-sm text-muted">Placed {lagosDateTime(order.CreatedAt)}</p>
          {order.status === 'RECEIVED' && (
            <button onClick={() => setCancelOpen(true)} className="mt-4 text-sm font-bold text-jollof hover:underline">Cancel this order</button>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <h2 className="text-2xl font-bold">Your food</h2>
        <ul className="mt-4 divide-y divide-line/70">
          {order.items?.map((it) => (
            <li key={it.ID} className="flex items-center gap-4 py-3">
              <DishTile item={it.menu_item?.ID ? it.menu_item : { name: it.name }} className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="flex-1">
                <p className="font-semibold">{it.quantity}× {it.name || it.menu_item?.name}</p>
                {it.special_instructions && <p className="text-sm italic text-muted">“{it.special_instructions}”</p>}
              </div>
              <p className="font-semibold">{naira(it.unit_price * it.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t-2 border-dashed border-line pt-4 text-[15px]">
          <div className="flex justify-between"><dt className="text-muted">Food</dt><dd>{naira(order.subtotal)}</dd></div>
          {order.type === 'delivery' && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{naira(order.delivery_fee)}</dd></div>}
          {order.vat > 0 && <div className="flex justify-between"><dt className="text-muted">VAT</dt><dd>{naira(order.vat)}</dd></div>}
          <div className="flex items-baseline justify-between pt-2"><dt className="font-display text-xl font-bold">Total</dt><dd className="font-display text-2xl font-extrabold text-jollof">{naira(order.total_amount)}</dd></div>
        </dl>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="mb-5 text-2xl font-bold">Order updates</h2>
        <OrderTimeline events={order.events} />
      </Card>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?">
        <p className="text-muted">The kitchen hasn&rsquo;t started yet, so you can still cancel.{order.payment_status === 'paid' && ' Your payment will be refunded.'}</p>
        <Textarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4" maxLength={300} placeholder="e.g. Ordered the wrong thing" />
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>Keep order</Button>
          <Button variant="jollof" className="flex-1" loading={busy} onClick={doCancel}>Yes, cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
