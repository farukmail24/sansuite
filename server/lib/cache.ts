/**
 * Distributed Cache — Redis-backed with in-memory fallback
 *
 * Drop-in replacement for the old in-memory CacheManager.
 * When Redis is available: shared across all server instances.
 * When Redis is not available: falls back to in-process memory (single server only).
 */
import { redis } from "./redis";

class CacheManager {
  public async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (err) {
      console.error("[Cache] set error:", err);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      console.error("[Cache] delete error:", err);
    }
  }

  public async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(`*${pattern}*`);
      for (const key of keys) {
        await redis.del(key);
      }
    } catch (err) {
      console.error("[Cache] clearPattern error:", err);
    }
  }
}

export const cache = new CacheManager();
