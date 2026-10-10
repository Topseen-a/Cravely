import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyOrders } from '../api/endpoints';
import { useCart } from '../context/hooks';
import { useToast } from '../context/hooks';
import { naira, lagosDateTime, apiError } from '../lib/format';
import { isTerminal } from '../lib/status';
import { DishTile } from '../components/MenuItemCard';
import { DanfoIcon } from '../components/illustrations/Vehicles';
import { Button, Card, EmptyState, PageTitle, Skeleton, StatusChip } from '../components/ui';
import Icon from '../components/Icon';

function OrderRow({ order, index }) {
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const active = !isTerminal(order.status);
  const names = order.items?.map((i) => `${i.quantity}× ${i.name || i.menu_item?.name}`).join(', ');

  // Re-add everything from this order that is still on the menu.
  const reorder = async (e) => {
    e.preventDefault();
    setBusy(true);
    let added = 0;
    for (const it of order.items || []) {
      if (!it.menu_item?.ID || it.menu_item.DeletedAt) continue;
      try {
        await add(it.menu_item_id, it.quantity, it.special_instructions);
        added += 1;
      } catch (err) {
        toast(apiError(err), 'error');
      }
    }
    setBusy(false);
    if (added) navigate('/cart');
  };

  return (
    <Link to={`/orders/${order.ID}`} style={{ animationDelay: `${index * 40}ms` }} className="animate-fade-up block">
      <Card className={`flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-pop sm:p-5 ${active ? 'border-2 border-ink' : ''}`}>
        <div className="relative hidden h-[84px] w-[84px] shrink-0 sm:block">
          {order.items?.slice(0, 2).map((it, i) => (
            <div key={it.ID} className={`absolute ${i ? 'left-5 top-5' : 'left-0 top-0'}`}>
              <DishTile item={it.menu_item?.ID ? it.menu_item : { name: it.name }} className="h-16 w-16 rounded-2xl border-2 border-white shadow-card" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={order.status} />
            <span className="font-mono text-xs font-bold text-muted">{order.reference}</span>
          </div>
          <p className="mt-2 truncate font-semibold">{names}</p>
          <p className="mt-1 text-sm text-muted">
            {lagosDateTime(order.CreatedAt)} · {order.type === 'delivery' ? `Delivery${order.delivery_zone ? ` to ${order.delivery_zone.name}` : ''}` : 'Pickup'}
          </p>
        </div>
        <div className="flex flex-col items-end justify-between gap-2">
          <p className="font-display text-xl font-extrabold">{naira(order.total_amount)}</p>
          {active ? (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-jollof">Track <Icon name="arrow" className="h-4 w-4" /></span>
          ) : (
            <Button size="sm" variant="outline" loading={busy} onClick={reorder}>Order again</Button>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (page) =>
    getMyOrders(page, 10).then(({ data }) => {
      setOrders((prev) => (page === 1 ? data.data : [...(prev || []), ...data.data]));
      setMeta(data.meta);
    });

  useEffect(() => {
    load(1).catch(() => setOrders([]));
  }, []);

  const more = async () => {
    setLoadingMore(true);
    await load(meta.page + 1).catch(() => {});
    setLoadingMore(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle eyebrow="Your orders" title="Wetin you don chop" />
      {!orders ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState art={<DanfoIcon className="h-24" />} title="No orders yet" action={<Link to="/#menu"><Button size="lg">Start your first order</Button></Link>}>
          Your danfo is waiting. Once you order, you can track it live here.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {orders.map((o, i) => <OrderRow key={o.ID} order={o} index={i} />)}
          {meta && orders.length < meta.total && (
            <div className="pt-4 text-center">
              <Button variant="outline" loading={loadingMore} onClick={more}>Load older orders</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
