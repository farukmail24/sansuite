/**
 * Redis Singleton with Graceful In-Memory Fallback
 *
 * If REDIS_URL is set, connects to Redis (for production / multi-server).
 * If not, provides a lightweight in-memory shim so the app still works
 * on a single server (development / simple deployments).
 *
 * Usage:
 *   import { redis, isRedisAvailable } from './redis';
 *   await redis.set('key', 'value', 'EX', 60);
 *   const val = await redis.get('key');
 */

import IORedis from "ioredis";

// =============================================
// IN-MEMORY SHIM (used when Redis is not available)
// =============================================
class InMemoryRedisShim {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<"OK"> {
    let expiresAt: number | undefined;
    // Handle: set(key, value, 'EX', seconds) or set(key, value, 'PX', ms)
    const modeIdx = args.findIndex((a: any) => a === "EX" || a === "PX" || a === "NX" || a === "XX");
    if (modeIdx !== -1) {
      const mode = args[modeIdx];
      const duration = args[modeIdx + 1];
      if (mode === "EX" && duration) expiresAt = Date.now() + Number(duration) * 1000;
      if (mode === "PX" && duration) expiresAt = Date.now() + Number(duration);
      // NX: only set if not exists
      if (mode === "NX" && this.store.has(key)) return null as any;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt((await this.get(key)) || "0", 10);
    const next = current + 1;
    const existing = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: existing?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async keys(pattern: string): Promise<string[]> {
    const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.store.keys()).filter((k) => re.test(k));
  }

  // Pub/Sub stubs (no-op for single server — socket.ts handles broadcast locally)
  subscribe(_channel: string, _cb: (ch: string, msg: string) => void) {}
  publish(_channel: string, _message: string): Promise<number> { return Promise.resolve(0); }
  duplicate() { return this; }
  on(_event: string, _cb: any) { return this; }
  quit(): Promise<"OK"> { return Promise.resolve("OK"); }
  ping(): Promise<"PONG"> { return Promise.resolve("PONG"); }

  // Cleanup stale entries every 5 minutes
  private startCleanup() {
    setInterval(() => {
      const now = Date.now();
      this.store.forEach((entry, key) => {
        if (entry.expiresAt && entry.expiresAt < now) {
          this.store.delete(key);
        }
      });
    }, 5 * 60 * 1000);
  }

  constructor() {
    this.startCleanup();
  }
}

// =============================================
// DYNAMIC PROXY & CONFIGURATION
// =============================================
let _redis: IORedis | InMemoryRedisShim = new InMemoryRedisShim();
let _redisAvailable = false;
let _connectionPromise: Promise<void> | null = null;

export async function configureRedis(url: string | null) {
  // Gracefully close existing connection if it's IORedis
  if (_redis instanceof IORedis) {
    try {
      await _redis.quit();
    } catch (e) {
      console.warn("[Redis] Error closing old connection:", e);
    }
  }

  _redisAvailable = false;
  _connectionPromise = null;

  if (!url) {
    console.log("[Redis] Using local in-memory fallback (single-server mode)");
    _redis = new InMemoryRedisShim();
    return;
  }

  try {
    const client = new IORedis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    client.on("connect", () => {
      _redisAvailable = true;
      console.log("[Redis] Connected to Redis — external mode ACTIVE");
    });

    client.on("error", (err: Error) => {
      if (_redisAvailable) {
        console.error("[Redis] Connection error:", err.message);
      }
    });

    client.on("close", () => {
      _redisAvailable = false;
      console.warn("[Redis] Connection closed.");
    });

    _connectionPromise = client.connect().catch((err) => {
      console.warn("[Redis] Could not connect. Using in-memory fallback.");
      _redis = new InMemoryRedisShim();
      _redisAvailable = false;
    });

    _redis = client as unknown as IORedis;
  } catch {
    console.warn("[Redis] Init failed. Using in-memory fallback.");
    _redis = new InMemoryRedisShim();
  }
}

// Proxy the redis instance so imports don't lose the reference when it changes
export const redis = new Proxy({} as IORedis, {
  get(target, prop) {
    const activeClient = _redis as any;
    const value = activeClient[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});

export const isRedisAvailable = () => _redisAvailable;
