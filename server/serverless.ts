/**
 * Vercel Serverless Entry Point
 * 
 * Directly exports the Express application instance for Vercel's Node runtime.
 * Vercel automatically manages the request/response lifecycle for Express apps.
 */
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

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

// Normalize URL in case Vercel rewrites strip /api prefix or include /api/index.js
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url) {
    if (req.url.startsWith("/api/index.js")) {
      req.url = req.url.replace(/^\/api\/index\.js/, "/api") || "/api";
    } else if (!req.url.startsWith("/api")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
  }
  next();
});

// Register all API routes onto the Express app
registerRoutes(app);

export default function handler(req: any, res: any) {
  return new Promise((resolve) => {
    res.on("finish", () => resolve(undefined));
    res.on("close", () => resolve(undefined));

    try {
      app(req, res, (err?: any) => {
        if (err) {
          console.error("[Serverless] Express unhandled error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || "Internal Server Error" });
          }
        }
        resolve(undefined);
      });
    } catch (err: any) {
      console.error("[Serverless] Handler error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Internal Server Error" });
      }
      resolve(undefined);
    }
  });
}
