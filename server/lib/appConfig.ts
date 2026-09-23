import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { inArray } from "drizzle-orm";

/**
 * Dynamically resolves the base application URL
 * Priority order:
 * 1. Explicit request headers (x-forwarded-proto/host or req.protocol/get('host'))
 * 2. Environment variables (APP_URL, BASE_URL, PUBLIC_URL)
 * 3. Database systemSettings (app_url, site_url, base_url)
 * 4. Fallback: http://localhost:{PORT || 5000}
 */
export async function getAppBaseUrl(req?: any): Promise<string> {
  // 1. From active express request
  if (req && typeof req.get === "function") {
    const proto = req.headers?.["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers?.["x-forwarded-host"] || req.get("host");
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 2. From environment variables
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");

  // 3. From database systemSettings
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, ["app_url", "site_url", "base_url"]));
    const match = rows.find((r) => r.value && r.value.trim().length > 0);
    if (match && match.value) {
      return match.value.trim().replace(/\/$/, "");
    }
  } catch {
    // Silently fall through if DB unavailable
  }

  // 4. Local port fallback
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}
