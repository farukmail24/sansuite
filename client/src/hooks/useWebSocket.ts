import { useEffect, useRef, useState } from "react";

export interface WebSocketMessage {
  type: string;
  payload?: any;
  message?: string;
}

export function useWebSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const unmountedRef = useRef(false);

  // Keep url in a ref so connect() always reads the latest without being a dependency
  const urlRef = useRef(url);
  useEffect(() => { urlRef.current = url; }, [url]);

  // Stable connect ref — never recreated, so useEffect deps never change
  const connectRef = useRef<() => void>(null!);

  connectRef.current = () => {
    if (unmountedRef.current) return;
    // Don't open a new socket if already connecting/open
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.CONNECTING ||
        socketRef.current.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    try {
      const rawUrl = urlRef.current;
      let wsUrl: string;
      if (rawUrl) {
        wsUrl = rawUrl;
      } else {
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host =
          window.location.host && window.location.host !== "undefined"
            ? window.location.host
            : "localhost:5000";
        wsUrl = `${wsProtocol}//${host}/ws`;
      }

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (unmountedRef.current) { socket.close(); return; }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (_) {}
      };

      socket.onclose = () => {
        if (unmountedRef.current) return;
        setIsConnected(false);

        // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(2000 * Math.pow(2, attempts), 30000);
        reconnectAttemptsRef.current = attempts + 1;

        reconnectTimerRef.current = setTimeout(() => {
          // Always call via ref so we get the latest function body
          if (!unmountedRef.current) connectRef.current();
        }, delay);
      };

      socket.onerror = () => {
        // Silently close — onclose will handle reconnect
        try { socket.close(); } catch (_) {}
      };
    } catch (_) {
      // WebSocket not available or URL invalid — don't retry
    }
  };

  // Empty dep array — runs once on mount, cleans up on unmount
  useEffect(() => {
    unmountedRef.current = false;
    connectRef.current();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try { socketRef.current?.close(); } catch (_) {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = (msg: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  };

  return { isConnected, lastMessage, sendMessage };
}
