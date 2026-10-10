import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { wsUrl } from '../api/client';

// Opens a WebSocket to the API and reconnects with backoff if it drops
// (common on mobile data). Returns whether it is currently connected.
export function useSocket(path, onMessage, enabled = true) {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onMessage);
  useLayoutEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    if (!enabled || !path) return;
    let socket;
    let retry;
    let attempts = 0;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(wsUrl(path));
      socket.onopen = () => {
        attempts = 0;
        setConnected(true);
      };
      socket.onmessage = (e) => {
        try {
          handler.current(JSON.parse(e.data));
        } catch {
          /* ignore malformed messages */
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (stopped) return;
        attempts += 1;
        retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts));
      };
    };
    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [path, enabled]);

  return connected;
}
