import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

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
        await registerRoutes(app);
      } catch (err: any) {
        console.error("Warning during serverless registerRoutes initialization:", err);
      }
      isReady = true;
    })();
  }
  await initPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureApp();
    // Normalize url if Vercel strips /api prefix during rewrite
    if (req.url && !req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function fatal error:", err);
    res.status(500).json({ error: "Server initialization error", message: err.message });
  }
}
