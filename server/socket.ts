/**
 * WebSocket Server with Redis Pub/Sub for Cross-Server Broadcast
 *
 * Single server: broadcasts directly to local clients (in-memory Set).
 * Multiple servers: each server also subscribes to a Redis channel.
 *   - When server-1 calls broadcast(), it publishes to Redis.
 *   - Server-2 and Server-3 receive the Redis message and forward
 *     it to their locally connected clients.
 *
 * This means ALL clients across ALL servers receive every broadcast,
 * regardless of which server they are connected to.
 */

import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { redis } from "./lib/redis";

const WS_CHANNEL = "sansuite:broadcast";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(httpServer: HTTPServer) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = request.url;
    if (pathname && pathname.startsWith("/ws")) {
      wss!.handleUpgrade(request, socket as any, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
    // Do not destroy the socket here — Vite's upgrade listener handles other paths.
  });

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    console.log(`[WebSocket] Client connected. Total local connections: ${clients.size}`);

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        // Publish to Redis so all servers forward it
        broadcastViaRedis(payload);
      } catch (e) {
        console.error("[WebSocket] Failed to parse message:", e);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected. Remaining local: ${clients.size}`);
    });
  });

  // Subscribe to Redis channel for cross-server messages
  setupRedisPubSub();

  return wss;
}

function sendToLocalClients(data: any) {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function setupRedisPubSub() {
  try {
    // Create a dedicated subscriber connection (Redis requires a separate client for subscribe)
    const subscriber = (redis as any).duplicate?.() ?? redis;

    if (typeof subscriber.subscribe === "function") {
      subscriber.subscribe(WS_CHANNEL, (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          // Forward to this server's local clients
          sendToLocalClients(data);
        } catch (e) {
          console.error("[WebSocket] Failed to parse Redis message:", e);
        }
      });
      console.log(`[WebSocket] Subscribed to Redis channel '${WS_CHANNEL}' for cross-server broadcast`);
    } else {
      // InMemoryRedisShim: pub/sub is no-op, local broadcast handles everything
      console.log("[WebSocket] Redis Pub/Sub not available — using local broadcast (single-server mode)");
    }
  } catch (e) {
    console.error("[WebSocket] Redis Pub/Sub setup failed, falling back to local broadcast:", e);
  }
}

/**
 * Publish a message to Redis so ALL servers (including this one via subscriber)
 * forward it to their local WebSocket clients.
 */
export async function broadcastViaRedis(data: any) {
  try {
    const message = JSON.stringify(data);
    const result = await (redis as any).publish?.(WS_CHANNEL, message);
    // If Redis Pub/Sub is not available (shim returns 0 subscribers or is no-op),
    // fall back to local broadcast directly.
    if (!result || result === 0) {
      sendToLocalClients(data);
    }
  } catch {
    // Failsafe: always deliver to local clients
    sendToLocalClients(data);
  }
}

/**
 * Backward-compatible broadcast() for existing code that imports this function.
 * Prefer broadcastViaRedis() for new code.
 */
export function broadcast(data: any) {
  broadcastViaRedis(data);
}
