let socket: WebSocket | null = null;

export function getClientWebSocket(): WebSocket | null {
  if (typeof window === "undefined") return null;

  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WEBSOCKET] Connected to server");
    };

    socket.onerror = (err) => {
      console.error("[WEBSOCKET] Error:", err);
    };
  }

  return socket;
}
