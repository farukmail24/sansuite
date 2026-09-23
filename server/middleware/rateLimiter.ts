/**
 * Distributed Rate Limiter & IP Ban System
 *
 * Uses Redis for cross-server state:
 *  - Violation counters: Redis INCR with TTL (atomic, shared across servers)
 *  - IP ban cache: Redis keys (shared, survives server restarts)
 *  - Ban records: MySQL ip_bans table (source of truth)
 *
 * Graceful fallback: when Redis is unavailable, falls back to the
 * in-process shim automatically (single-server mode).
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { ipBans } from "../../shared/schema";
import { eq, and, or, isNull, gt, sql } from "drizzle-orm";
import { redis } from "../lib/redis";

// =============================================
// CONSTANTS
// =============================================

// Progressive ban durations in minutes
const PROGRESSIVE_BANS = [
  30,           // 1st offense: 30 minutes
  2 * 60,       // 2nd offense: 2 hours
  24 * 60,      // 3rd offense: 24 hours
  7 * 24 * 60,  // 4th offense: 7 days
];
// 5th offense and beyond = permanent

// Number of rate-limit violations before auto-ban
const VIOLATIONS_TO_BAN = 5;

// Ban cache TTL in Redis (seconds) — recheck DB after this period
const BAN_CACHE_TTL_SEC = 5 * 60; // 5 minutes

// =============================================
// HELPERS
// =============================================

export function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

async function isIpBanned(ip: string): Promise<{ banned: boolean; permanent: boolean; until: Date | null }> {
  const cacheKey = `ban:status:${ip}`;

  try {
    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (parsed.banned && parsed.until && new Date(parsed.until) <= new Date()) {
        // Expired — treat as not banned, let it refresh below
      } else {
        return parsed;
      }
    }

    // Not in cache — query DB
    const now = new Date();
    const rows = await db
      .select()
      .from(ipBans)
      .where(
        and(
          eq(ipBans.ipAddress, ip),
          isNull(ipBans.unbannedAt),
          or(isNull(ipBans.bannedUntil), gt(ipBans.bannedUntil, now))
        )
      )
      .limit(1);

    let result: { banned: boolean; permanent: boolean; until: Date | null };

    if (rows.length > 0) {
      const ban = rows[0];
      result = {
        banned: true,
        permanent: !ban.bannedUntil,
        until: ban.bannedUntil ?? null,
      };
    } else {
      result = { banned: false, permanent: false, until: null };
    }

    // Cache result in Redis with TTL
    await redis.set(cacheKey, JSON.stringify(result), "EX", BAN_CACHE_TTL_SEC);
    return result;
  } catch (err) {
    console.error("[RateLimiter] isIpBanned error:", err);
    return { banned: false, permanent: false, until: null };
  }
}

async function recordBan(ip: string, reason: string): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(ipBans)
      .where(eq(ipBans.ipAddress, ip))
      .orderBy(sql`created_at DESC`)
      .limit(1);

    const violationCount = existing.length > 0 ? (existing[0].violationCount || 1) + 1 : 1;
    const isPermanent = violationCount > PROGRESSIVE_BANS.length;
    const banMinutes = isPermanent ? null : PROGRESSIVE_BANS[violationCount - 1];
    const bannedUntil = banMinutes ? new Date(Date.now() + banMinutes * 60 * 1000) : null;

    await db.insert(ipBans).values({
      ipAddress: ip,
      reason,
      banType: isPermanent ? "permanent" : "temporary",
      bannedUntil,
      violationCount,
      bannedBy: "system",
    });

    // Invalidate Redis ban cache for this IP so it's rechecked immediately
    await redis.del(`ban:status:${ip}`);

    const banMsg = isPermanent
      ? `[IpBan] IP ${ip} PERMANENTLY BANNED (violation #${violationCount}). Reason: ${reason}`
      : `[IpBan] IP ${ip} banned for ${banMinutes} minutes (violation #${violationCount}). Reason: ${reason}`;
    console.warn(banMsg);
  } catch (err) {
    console.error("[IpBan] Failed to record ban:", err);
  }
}

// =============================================
// RATE LIMITER FACTORY
// =============================================

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  key?: "path+ip" | "ip";
}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const windowSec = Math.ceil(windowMs / 1000);
  const max = options.max || 100;
  const message = options.message || "Too many requests, please try again later.";
  const keyMode = options.key || "path+ip";

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = extractIp(req);

    // 1. Check if IP is banned (Redis-cached, DB-backed)
    const banStatus = await isIpBanned(ip);
    if (banStatus.banned) {
      const msg = banStatus.permanent
        ? "Your IP address has been permanently banned due to repeated abuse."
        : `Your IP address is temporarily banned. Try again after ${banStatus.until?.toUTCString() || "some time"}.`;
      return res.status(403).json({ message: msg, banned: true, permanent: banStatus.permanent });
    }

    // 2. Rate limit check using Redis atomic INCR
    const rateKey = keyMode === "ip"
      ? `rl:${ip}`
      : `rl:${req.path.replace(/\//g, ":")}:${ip}`;

    try {
      const count = await redis.incr(rateKey);

      // Set TTL only on first request in window
      if (count === 1) {
        await redis.expire(rateKey, windowSec);
      }

      const ttl = await redis.ttl(rateKey);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
      res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : windowSec));

      if (count > max) {
        // Track abuse violations per IP (separate key, longer TTL)
        const abuseKey = `rl:abuse:${ip}`;
        const abuseCount = await redis.incr(abuseKey);
        await redis.expire(abuseKey, 24 * 60 * 60); // 24h window for abuse tracking

        if (abuseCount >= VIOLATIONS_TO_BAN) {
          await recordBan(ip, `Exceeded rate limit ${abuseCount} times`);
          await redis.del(abuseKey);
          return res.status(403).json({
            message: "Your IP has been banned due to repeated rate limit violations.",
            banned: true,
          });
        }

        const retryAfter = ttl > 0 ? ttl : windowSec;
        return res.status(429).json({ message, retryAfter });
      }

      next();
    } catch (err) {
      // If Redis fails, allow request through (fail open — prefer availability)
      console.error("[RateLimiter] Redis error, allowing request:", err);
      next();
    }
  };
}

// =============================================
// NAMED LIMITERS
// =============================================

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 10000 : 15,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
  key: "path+ip",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 10000 : 300,
  message: "Rate limit exceeded. Slow down API requests.",
  key: "ip",
});

// =============================================
// ADMIN BAN/UNBAN HELPERS (used by ip-bans.ts API)
// =============================================

export async function listAllBans() {
  return db.select().from(ipBans).orderBy(sql`created_at DESC`);
}

export async function manualBanIp(
  ip: string,
  reason: string,
  bannedBy: string,
  permanent: boolean,
  durationMinutes?: number
) {
  const bannedUntil = permanent ? null : new Date(Date.now() + (durationMinutes || 60) * 60 * 1000);
  await db.insert(ipBans).values({
    ipAddress: ip,
    reason,
    banType: permanent ? "permanent" : "temporary",
    bannedUntil,
    violationCount: 1,
    bannedBy,
  });
  // Invalidate Redis cache so ban takes effect immediately
  await redis.del(`ban:status:${ip}`);
}

export async function unbanIp(banId: number, unbannedBy: string) {
  const rows = await db.select({ ip: ipBans.ipAddress }).from(ipBans).where(eq(ipBans.id, banId)).limit(1);
  await db.update(ipBans).set({ unbannedAt: new Date(), unbannedBy }).where(eq(ipBans.id, banId));
  if (rows.length > 0) {
    // Invalidate Redis ban cache for this IP immediately
    await redis.del(`ban:status:${rows[0].ip}`);
  }
}
