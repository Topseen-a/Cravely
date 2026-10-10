import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getTodaysOrders } from '../api/endpoints';
import { useSocket } from './useSocket';

// Today's orders, kept live via the staff WebSocket. A slow poll is kept as
// a safety net in case the socket is blocked by a network.
export function useStaffOrders({ onNewOrder, onChange } = {}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cb = useRef({ onNewOrder, onChange });
  useLayoutEffect(() => {
    cb.current = { onNewOrder, onChange };
  });

  const refresh = useCallback(
    () =>
      getTodaysOrders()
        .then(({ data }) => {
          setOrders(data.data || []);
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  const upsert = useCallback((order) => {
    setOrders((prev) => {
      const i = prev.findIndex((o) => o.ID === order.ID);
      if (i === -1) return [...prev, order];
      const next = [...prev];
      next[i] = order;
      return next;
    });
  }, []);

  const live = useSocket('/staff', (msg) => {
    if (!msg.data) return;
    upsert(msg.data);
    if (msg.event === 'order.created') cb.current.onNewOrder?.(msg.data);
    cb.current.onChange?.();
  });

  useEffect(() => {
    if (live) refresh();
  }, [live, refresh]);

  return { orders, loading, error, live, refresh, upsert };
}
