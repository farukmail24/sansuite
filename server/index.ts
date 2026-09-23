// Server Entry Point
import express, { type Request, Response, NextFunction } from "express";
import "dotenv/config";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import path from "path";
import fs from "fs";
import { log } from "./lib/utils";
import { db } from "./db";
import { systemSettings } from "../shared/schema";
import { configureRedis } from "./lib/redis";
import { eq } from "drizzle-orm";

const app = express();


// --- SECURITY: CORS ---
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "http://localhost:5000",
    "http://localhost:5173",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: "50mb", extended: false }));

// Sub-domain Multi-Tenancy Middleware
// Parses req.hostname to extract the tenant subdomain
// e.g. firm1.SanSuite.com -> firm1
app.use((req, _res, next) => {
  const hostname = req.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== "www" && subdomain !== "api") {
      req.headers["x-tenant-id"] = subdomain;
    }
  }
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
const profileImagesDir = path.join(uploadsDir, "profile_images");
const settingsImagesDir = path.join(uploadsDir, "settings_images");
const documentsDir = path.join(uploadsDir, "documents");
const mediaDir = path.join(uploadsDir, "media");
const esignDir = path.join(uploadsDir, "esign");

[uploadsDir, profileImagesDir, settingsImagesDir, documentsDir, mediaDir, esignDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploads directory statically
app.use("/uploads", express.static(uploadsDir));

export { log };

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      // Skip noisy 304 Not Modified cache checks and background polling from multiple open tabs
      if (res.statusCode === 304 || reqPath === "/api/announcements") {
        return;
      }
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Redis from DB config
  try {
    const configRow = await db.select().from(systemSettings).where(eq(systemSettings.key, 'redis_config')).limit(1);
    let redisUrl = process.env.REDIS_URL || null;
    if (configRow.length > 0) {
      const config = JSON.parse(configRow[0].value);
      if (config.type === 'external' && config.url) {
        redisUrl = config.url;
      } else if (config.type === 'local') {
        redisUrl = null;
      }
    }
    await configureRedis(redisUrl);
  } catch (err) {
    console.error("[Startup] Failed to initialize Redis config from DB", err);
    await configureRedis(process.env.REDIS_URL || null);
  }

  const httpServer = await registerRoutes(app);
  const { initWebSocketServer } = await import("./socket");
  initWebSocketServer(httpServer);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on http://localhost:${port}`);
  });
})();
