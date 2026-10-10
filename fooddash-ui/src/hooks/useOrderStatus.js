import { useCallback, useEffect, useState } from 'react';
import { getOrder } from '../api/endpoints';
import { useSocket } from './useSocket';
import { isTerminal } from '../lib/status';

// Loads an order and keeps it live over WebSocket until it is finished.
export function useOrderStatus(orderId) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!orderId) return;
    getOrder(orderId)
      .then(({ data }) => setOrder(data.data))
      .catch((err) => setError(err.response?.status === 404 ? 'not_found' : 'failed'));
  }, [orderId]);

  useEffect(reload, [reload]);

  const live = useSocket(
    orderId ? `/orders/${orderId}` : null,
    (msg) => msg.data && setOrder(msg.data),
    !!order && !isTerminal(order.status),
  );

  // Catch up on anything missed while the socket was reconnecting.
  useEffect(() => {
    if (live) reload();
  }, [live, reload]);

  return { order, setOrder, error, live, reload };
}
