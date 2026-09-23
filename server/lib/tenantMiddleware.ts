import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { practices } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface TenantRequest extends Request {
  tenant?: {
    id: number;
    name: string;
    subdomain: string;
  };
}

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const host = req.headers.host || "";
    const parts = host.split(".");
    
    // If host has subdomain (e.g. demo.sansuite.co.uk or demo.localhost:5000)
    if (parts.length >= 3 || (host.includes("localhost") && parts.length >= 2)) {
      const subdomain = parts[0].toLowerCase();
      if (subdomain !== "www" && subdomain !== "app" && subdomain !== "admin") {
        const [practice] = await db.select().from(practices).where(eq(practices.subdomain, subdomain));
        if (practice) {
          req.tenant = {
            id: practice.id,
            name: practice.name,
            subdomain: subdomain,
          };
        }
      }
    }
    next();
  } catch (error) {
    console.error("Tenant Middleware Error:", error);
    next();
  }
}
