import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateOrderStatus, getDailySummary } from '../api/endpoints';
import { useStaffOrders } from '../hooks/useStaffOrders';
import { useToast } from '../context/hooks';
import { useStore } from '../context/hooks';
import { ACTION_LABEL } from '../lib/status';
import { naira, minutesAgo, prettyPhone, apiError, lagosTime } from '../lib/format';
import { chime, unlockAudio } from '../lib/chime';
import { OkadaIcon } from '../components/illustrations/Vehicles';
import StoreStatusPill from '../components/StoreStatusPill';
import { Button, Card, Modal, PaymentChip, Segmented, Skeleton, StatusChip, Textarea } from '../components/ui';
import Icon from '../components/Icon';

const COLUMNS = [
  { key: 'RECEIVED', title: 'New', accent: 'bg-adire' },
  { key: 'PREPARING', title: 'Cooking', accent: 'bg-danfo-dark' },
  { key: 'READY', title: 'Ready', accent: 'bg-palm' },
  { key: 'OUT_FOR_DELIVERY', title: 'On the way', accent: 'bg-lagoon' },
];

function Stat({ label, value, sub, dark }) {
  return (
    <div className={`@container min-w-0 rounded-3xl p-5 ${dark ? 'bg-adire bg-ink text-cream' : 'border border-line/70 bg-white shadow-card'}`}>
      <p className={`text-sm font-semibold ${dark ? 'text-danfo' : 'text-muted'}`}>{label}</p>
      <p className="mt-1 whitespace-nowrap font-display text-[clamp(1.25rem,13cqw,1.875rem)] font-extrabold tracking-tight">{value}</p>
      {sub && <p className={`mt-1 text-xs ${dark ? 'text-cream/60' : 'text-muted'}`}>{sub}</p>}
    </div>
  );
}

function Summary({ summary }) {
  if (!summary) return <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  const active = ['RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].reduce((n, s) => n + (summary.by_status?.[s] || 0), 0);
  return (
    <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-4">
      <Stat dark label="Orders today" value={summary.total_orders} sub={`${active} in progress · ${summary.by_status?.CANCELLED || 0} cancelled`} />
      <Stat label="Sales" value={naira(summary.total_revenue)} sub={`${naira(summary.paid_revenue)} collected`} />
      <Stat label="Average order" value={naira(Math.round(summary.average_order))} sub={`${summary.by_type?.delivery || 0} delivery · ${summary.by_type?.pickup || 0} pickup`} />
      <div className="min-w-0 rounded-3xl border border-line/70 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold text-muted">Top dishes</p>
        {summary.top_items?.length ? (
          <ol className="mt-2 space-y-1 text-sm">
            {summary.top_items.slice(0, 3).map((t, i) => (
              <li key={t.name} className="flex justify-between gap-2">
                <span className="truncate"><span className="font-bold text-jollof">{i + 1}.</span> {t.name}</span>
                <span className="font-bold">{t.quantity}</span>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-sm text-muted">No sales yet today</p>}
      </div>
    </div>
  );
}

function OrderCard({ order, now, onAction }) {
  const [busy, setBusy] = useState('');
  const age = (now - new Date(order.CreatedAt).getTime()) / 60000;
  const late = (order.status === 'RECEIVED' && age > 10) || (order.status === 'PREPARING' && age > 35);
  const forward = (order.next_statuses || []).filter((s) => s !== 'CANCELLED');
  const canCancel = order.next_statuses?.includes('CANCELLED');
  const waitingPayment = order.payment_method === 'paystack' && order.payment_status !== 'paid';

  const act = async (status) => {
    if (status === 'CANCELLED') return onAction(order, status);
    setBusy(status);
    await onAction(order, status);
    setBusy('');
  };

  return (
    <Card className={`animate-pop overflow-hidden ${late ? 'ring-2 ring-jollof' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-line/60 px-4 py-3">
        <p className="whitespace-nowrap font-mono text-sm font-bold">{order.reference}</p>
        <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${order.type === 'delivery' ? 'bg-lagoon-soft text-lagoon-dark' : 'bg-cream-dark text-ink-soft'}`}>
          {order.type === 'delivery' ? <OkadaIcon className="h-4 shrink-0" /> : <Icon name="store" className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{order.type === 'delivery' ? order.delivery_zone?.name || 'Delivery' : 'Pickup'}</span>
        </span>
        <p className={`w-full text-xs font-semibold ${late ? 'text-jollof' : 'text-muted'}`}>{lagosTime(order.CreatedAt)} · {minutesAgo(order.CreatedAt, now)}</p>
      </div>

      <div className="space-y-3 px-4 py-3">
        <ul className="space-y-1.5">
          {order.items?.map((it) => (
            <li key={it.ID} className="text-[15px]">
              <span className="font-bold">{it.quantity}×</span> {it.name || it.menu_item?.name}
              {it.special_instructions && <span className="ml-1 rounded bg-danfo-soft px-1.5 py-0.5 text-xs font-semibold">{it.special_instructions}</span>}
            </li>
          ))}
        </ul>
        {order.note && <p className="rounded-xl bg-danfo-soft px-3 py-2 text-sm font-semibold">📝 {order.note}</p>}

        <div className="rounded-xl bg-cream px-3 py-2 text-sm">
          <p className="font-semibold">{order.customer?.name}</p>
          {order.contact_phone && (
            <a href={`tel:${order.contact_phone}`} className="inline-flex items-center gap-1 font-semibold text-adire underline">
              <Icon name="phone" className="h-3.5 w-3.5" /> {prettyPhone(order.contact_phone)}
            </a>
          )}
          {order.type === 'delivery' && (
            <>
              <p className="mt-1 text-ink-soft">{order.delivery_address}</p>
              {order.landmark && <p className="text-muted">↳ {order.landmark}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <PaymentChip status={order.payment_status} method={order.payment_method} />
          <span className="font-display text-lg font-extrabold">{naira(order.total_amount)}</span>
        </div>
      </div>

      {(forward.length > 0 || canCancel) && (
        <div className="flex flex-wrap gap-2 border-t border-line/60 bg-cream/50 px-4 py-3">
          {forward.map((s, i) => (
            <Button
              key={s}
              size="sm"
              variant={i === 0 ? 'primary' : 'outline'}
              className="flex-1"
              loading={busy === s}
              disabled={!!busy || (s === 'PREPARING' && waitingPayment)}
              title={s === 'PREPARING' && waitingPayment ? 'Waiting for online payment' : undefined}
              onClick={() => act(s)}
            >
              {s === 'PREPARING' && waitingPayment ? 'Awaiting payment' : ACTION_LABEL[s]}
            </Button>
          ))}
          {canCancel && (
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act('CANCELLED')} aria-label="Cancel order">
              <Icon name="x" className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function Column({ col, orders, now, onAction }) {
  return (
    <section className="min-w-0">
      <header className="mb-3 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${col.accent}`} />
        <h2 className="text-lg font-bold">{col.title}</h2>
        <span className="rounded-full bg-ink px-2 text-sm font-bold text-cream">{orders.length}</span>
      </header>
      <div className="space-y-3">
        {orders.length ? orders.map((o) => <OrderCard key={o.ID} order={o} now={now} onAction={onAction} />) : (
          <p className="rounded-3xl border-2 border-dashed border-line px-4 py-8 text-center text-sm text-muted">Nothing here</p>
        )}
      </div>
    </section>
  );
}

export default function StaffDashboard() {
  const toast = useToast();
  const { store } = useStore();
  const [summary, setSummary] = useState(null);
  const [sound, setSound] = useState(false);
  const [mobileCol, setMobileCol] = useState('RECEIVED');
  const [showDone, setShowDone] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  // Re-render every 30s so "x min ago" and late warnings stay current.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadSummary = useCallback(() => {
    getDailySummary().then(({ data }) => setSummary(data.data)).catch(() => {});
  }, []);
  useEffect(loadSummary, [loadSummary]);

  const summaryTimer = useRef();
  const { orders, loading, error, live, upsert, refresh } = useStaffOrders({
    onNewOrder: (o) => {
      if (soundRef.current) chime();
      toast(`New order ${o.reference} · ${o.type === 'delivery' ? o.delivery_zone?.name || 'delivery' : 'pickup'}`, 'info');
    },
    onChange: () => {
      clearTimeout(summaryTimer.current);
      summaryTimer.current = setTimeout(loadSummary, 800);
    },
  });

  const byStatus = useMemo(() => {
    const m = {};
    for (const o of orders) (m[o.status] ||= []).push(o);
    return m;
  }, [orders]);
  const done = [...(byStatus.DELIVERED || []), ...(byStatus.PICKED_UP || []), ...(byStatus.CANCELLED || [])].sort(
    (a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt),
  );

  const setStatus = async (order, status, note = '') => {
    try {
      const { data } = await updateOrderStatus(order.ID, { status, note });
      upsert(data.data);
      loadSummary();
    } catch (err) {
      toast(apiError(err), 'error');
      refresh();
    }
  };

  const onAction = (order, status) => {
    if (status === 'CANCELLED') {
      setReason('');
      setCancelling(order);
      return null;
    }
    return setStatus(order, status);
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.18em] text-jollof">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })}
          </p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Kitchen board</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StoreStatusPill />
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${live ? 'text-palm' : 'text-muted'}`}>
              <span className={`h-2 w-2 rounded-full ${live ? 'bg-palm' : 'bg-muted'} ${live ? 'blink' : ''}`} />
              {live ? 'Live — new orders appear instantly' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sound ? 'dark' : 'outline'}
            onClick={() => {
              if (!sound) { unlockAudio(); chime(); }
              setSound(!sound);
            }}
          >
            <Icon name={sound ? 'sound' : 'mute'} /> {sound ? 'Sound on' : 'Turn on sound'}
          </Button>
          <Button variant="outline" onClick={() => { refresh(); loadSummary(); }} aria-label="Refresh"><Icon name="refresh" /></Button>
        </div>
      </div>

      <Summary summary={summary} />
      {summary?.refunds_pending > 0 && (
        <p className="mt-4 rounded-2xl bg-jollof-soft px-4 py-3 text-sm font-bold text-jollof-dark">
          {summary.refunds_pending} paid order{summary.refunds_pending > 1 ? 's were' : ' was'} cancelled and need{summary.refunds_pending > 1 ? '' : 's'} a refund via the Paystack dashboard.
        </p>
      )}
      {store && !store.is_open && <p className="mt-4 rounded-2xl bg-danfo-soft px-4 py-3 text-sm font-bold">The kitchen is closed — customers can&rsquo;t place new orders right now.</p>}

      <div className="mt-10">
        {error && <p className="mb-4 rounded-2xl bg-jollof-soft px-4 py-3 text-sm font-bold text-jollof-dark">Couldn&rsquo;t load orders. Retrying…</p>}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : (
          <>
            <div className="mb-4 md:hidden">
              <Segmented value={mobileCol} onChange={setMobileCol} options={COLUMNS.map((c) => ({ value: c.key, label: c.title, count: byStatus[c.key]?.length || 0 }))} />
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((c) => (
                <div key={c.key} className={mobileCol === c.key ? '' : 'hidden md:block'}>
                  <Column col={c} orders={byStatus[c.key] || []} now={now} onAction={onAction} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-10">
          <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-2 text-lg font-bold">
            Completed today <span className="rounded-full bg-cream-dark px-2 text-sm">{done.length}</span>
            <span className={`transition ${showDone ? 'rotate-90' : ''}`}>›</span>
          </button>
          {showDone && (
            <Card className="mt-3 divide-y divide-line/70">
              {done.map((o) => (
                <div key={o.ID} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="font-mono font-bold">{o.reference}</span>
                  <StatusChip status={o.status} />
                  <span className="flex-1 truncate text-muted">{o.items?.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span>
                  <PaymentChip status={o.payment_status} />
                  <span className="font-bold">{naira(o.total_amount)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title={`Cancel ${cancelling?.reference}?`}>
        <p className="text-muted">The customer will see this reason. {cancelling?.payment_status === 'paid' && 'This order was paid online and will be flagged for a refund.'}</p>
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4" placeholder="e.g. Ran out of ingredients" maxLength={300} />
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setCancelling(null)}>Keep order</Button>
          <Button variant="jollof" className="flex-1" onClick={async () => { const o = cancelling; setCancelling(null); await setStatus(o, 'CANCELLED', reason || 'Cancelled by the kitchen'); }}>
            Cancel order
          </Button>
        </div>
      </Modal>
    </div>
  );
}

