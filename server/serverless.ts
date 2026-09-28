/**
 * Vercel Serverless Entry Point
 * 
 * Reuses registerRoutes() from the main server to ensure all routes
 * are registered identically. The http.Server returned by registerRoutes
 * is discarded — only the Express app is used for request handling.
 */
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

// process.env.VERCEL is set to "1" at bundle time via esbuild define config

const app = express();

// Security / CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

let isReady = false;
let initPromise: Promise<void> | null = null;

async function ensureApp() {
  if (isReady) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // registerRoutes returns an http.Server — we discard it
        // The Express app is already mutated with all routes
        await registerRoutes(app);
      } catch (err: any) {
        console.error("[Serverless] registerRoutes error:", err?.message || err);
        // Still mark as ready — individual routes will handle their own DB errors
      }
      isReady = true;
    })();
  }
  await initPromise;
}

async function handler(req: any, res: any) {
  try {
    await ensureApp();

    // Normalize url — Vercel rewrites strip the /api prefix
    if (req.url && !req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }

    return app(req, res);
  } catch (err: any) {
    console.error("[Serverless] Fatal handler error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
}

// Explicit CJS export — esbuild bundle doesn't re-export 'export default'
// Vercel's @vercel/node runtime looks for module.exports or module.exports.default
(module as any).exports = handler;
(module as any).exports.default = handler;
