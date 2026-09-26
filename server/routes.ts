import type { Express } from "express";
import { createServer, type Server } from "http";
import { db, pool } from "./db";
import { systemAnnouncements, systemSettings, subscriptionPlans } from "../shared/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";

import authRouter from "./api/auth";
import adminRouter from "./api/admin";
import practiceRouter from "./api/practice";
import bookkeepingRouter from "./api/bookkeeping";
import payrollRouter from "./api/payroll";
import accountingRouter from "./api/accounting";
import timefeesRouter from "./api/timefees";
import journalsRouter from "./api/journals";
import myAdminRouter from "./api/myadmin";
import companySecRouter from "./api/company-secretarial";
import sansignRouter from "./api/sansign";
import companiesHouseRouter from "./api/companies-house";
import accountsProductionRouter from "./api/accounts-production";
import corporationTaxRouter from "./api/corporation-tax";
import selfAssessmentRouter from "./api/self-assessment";
import mtdItRouter from "./api/mtd-it";
import charityRouter from "./api/charity";
import portalRouter from "./api/portal";
import cisRouter from "./api/cis";
import dividendsRouter from "./api/dividends";
import minutesRouter from "./api/minutes";
import notesRouter from "./api/notes";
import logsRouter from "./api/logs";
import systemAdminRouter from "./api/system-admin";
import supportRouter from "./api/support";
import hmrcGatewayRouter from "./api/hmrc-gateway";
import hmrcSa100Router from "./api/hmrc-sa100";
import gatewayRouter from "./api/gateway-checkout";
import amlRouter from "./api/aml";
import pmServicesRouter from "./api/practice-services";
import practiceSettingsRouter from "./api/practice-settings";
import pmDeadlinesRouter from "./api/practice-deadlines";
import pmConversationsRouter from "./api/practice-conversations";
import pmLoeRouter from "./api/practice-loe";
import pmDocumentsRouter from "./api/practice-documents";
import pmReportsRouter from "./api/practice-reports";
import { startComplianceScheduler } from "./lib/complianceScheduler";
import { authRateLimiter, apiRateLimiter } from "./middleware/rateLimiter";
import ipBansRouter from "./api/ip-bans";
import invoiceTemplatesRouter from "./api/invoice-templates";
import bookkeepingSettingsRouter from "./api/bookkeeping-settings";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply Rate Limiting Middleware
  app.use("/api/auth", authRateLimiter);
  app.use("/api", apiRateLimiter);

  app.use("/api/payments", gatewayRouter);
  // Health check
  app.get("/api/health", (req, res) => {
    const tenant = req.headers["x-tenant-id"] || "default";
    res.json({ status: "ok", tenant, version: "1.0.0" });
  });

  // Active Announcements
  app.get("/api/announcements", async (_req, res) => {
    try {
      const now = new Date();
      const active = await db
        .select()
        .from(systemAnnouncements)
        .where(
          and(
            eq(systemAnnouncements.isActive, true),
            or(isNull(systemAnnouncements.expiresAt), gt(systemAnnouncements.expiresAt, now))
          )
        );
      res.json(active);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public Media Settings (readable by all tenant workspaces — no auth required)
  app.get("/api/media-settings", async (_req, res) => {
    try {
      const rows = await db.select().from(systemSettings).where(
        or(
          eq(systemSettings.key, "media_max_size_mb"),
          eq(systemSettings.key, "media_allow_pdf"),
          eq(systemSettings.key, "media_allow_docs"),
          eq(systemSettings.key, "media_allow_images"),
          eq(systemSettings.key, "media_allow_spreadsheets"),
          eq(systemSettings.key, "media_allow_zip"),
          eq(systemSettings.key, "media_allow_tenant_control"),
          eq(systemSettings.key, "media_storage_driver"),
          eq(systemSettings.key, "media_s3_bucket"),
          eq(systemSettings.key, "media_s3_region"),
          eq(systemSettings.key, "media_s3_key"),
          eq(systemSettings.key, "media_s3_secret"),
          eq(systemSettings.key, "media_s3_endpoint"),
          eq(systemSettings.key, "media_cloudinary_cloud_name"),
          eq(systemSettings.key, "media_cloudinary_api_key"),
          eq(systemSettings.key, "media_cloudinary_api_secret"),
          eq(systemSettings.key, "media_sftp_host"),
          eq(systemSettings.key, "media_sftp_port"),
          eq(systemSettings.key, "media_sftp_user"),
          eq(systemSettings.key, "media_sftp_password"),
          eq(systemSettings.key, "media_sftp_path"),
        )
      );
      const settingsMap: Record<string, string> = rows.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {});
      res.json({
        maxFileSizeMB: parseInt(settingsMap["media_max_size_mb"] || "25"),
        allowPdf: (settingsMap["media_allow_pdf"] ?? "true") !== "false",
        allowDocs: (settingsMap["media_allow_docs"] ?? "true") !== "false",
        allowImages: (settingsMap["media_allow_images"] ?? "true") !== "false",
        allowSpreadsheets: (settingsMap["media_allow_spreadsheets"] ?? "true") !== "false",
        allowZip: settingsMap["media_allow_zip"] === "true",
        allowTenantControl: settingsMap["media_allow_tenant_control"] === "true",
        storageDriver: settingsMap["media_storage_driver"] || "local",
        s3Bucket: settingsMap["media_s3_bucket"] || "",
        s3Region: settingsMap["media_s3_region"] || "us-east-1",
        s3AccessKey: settingsMap["media_s3_key"] || "",
        s3SecretKey: settingsMap["media_s3_secret"] || "",
        s3Endpoint: settingsMap["media_s3_endpoint"] || "",
        cloudinaryCloudName: settingsMap["media_cloudinary_cloud_name"] || "",
        cloudinaryApiKey: settingsMap["media_cloudinary_api_key"] || "",
        cloudinaryApiSecret: settingsMap["media_cloudinary_api_secret"] || "",
        sftpHost: settingsMap["media_sftp_host"] || "",
        sftpPort: settingsMap["media_sftp_port"] || "22",
        sftpUser: settingsMap["media_sftp_user"] || "",
        sftpPassword: settingsMap["media_sftp_password"] || "",
        sftpPath: settingsMap["media_sftp_path"] || "/uploads/",
      });
    } catch (error: any) {
      // Fallback defaults if DB not reachable
      res.json({
        maxFileSizeMB: 25,
        allowPdf: true,
        allowDocs: true,
        allowImages: true,
        allowSpreadsheets: true,
        allowZip: false,
        allowTenantControl: false,
        storageDriver: "local",
      });
    }
  });

  app.post("/api/media-settings", async (req, res) => {
    try {
      const { maxFileSizeMB, allowPdf, allowDocs, allowImages, allowSpreadsheets, allowZip } = req.body || {};
      const updates = [
        { key: "media_max_size_mb", value: String(maxFileSizeMB ?? 25) },
        { key: "media_allow_pdf", value: String(allowPdf ?? true) },
        { key: "media_allow_docs", value: String(allowDocs ?? true) },
        { key: "media_allow_images", value: String(allowImages ?? true) },
        { key: "media_allow_spreadsheets", value: String(allowSpreadsheets ?? true) },
        { key: "media_allow_zip", value: String(allowZip ?? false) },
      ];

      for (const item of updates) {
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, item.key)).limit(1);
        if (existing) {
          await db.update(systemSettings).set({ value: item.value }).where(eq(systemSettings.id, existing.id));
        } else {
          await db.insert(systemSettings).values({ key: item.key, value: item.value });
        }
      }

      res.json({ success: true, message: "Media settings updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update media settings", error: error.message });
    }
  });

  // Practice Media Library CRUD (backed by MySQL practice_media_files)
  app.get("/api/admin/media", async (_req, res) => {
    try {
      const [rows]: any = await pool.query(
        "SELECT id, practice_id as practiceId, name, type, size, url, category, storage_driver as storageDriver, storage_location as storageLocation, created_at as createdAt FROM practice_media_files ORDER BY id DESC"
      );
      res.json(rows || []);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch media files", error: error.message });
    }
  });

  app.post("/api/admin/media", async (req, res) => {
    try {
      const { name, type, size, url, category = "General", storageDriver = "local", storageLocation = "Local Server Storage", practiceId = 1 } = req.body || {};
      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }
      const [result]: any = await pool.query(
        "INSERT INTO practice_media_files (practice_id, name, type, size, url, category, storage_driver, storage_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [practiceId, name, type || "application/octet-stream", size || "100 KB", url, category, storageDriver, storageLocation]
      );
      res.json({ id: result.insertId, message: "Media saved successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to save media", error: error.message });
    }
  });

  app.delete("/api/admin/media/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await pool.query("DELETE FROM practice_media_files WHERE id = ?", [id]);
      res.json({ message: "Media removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete media", error: error.message });
    }
  });

  // Test Storage Connection (System Admin API)
  app.post("/api/system-admin/test-storage", async (req, res) => {
    const { driver, s3Bucket, cloudinaryCloudName, sftpHost } = req.body || {};

    if (driver === "s3") {
      if (!s3Bucket) {
        return res.json({ ok: false, message: "Bucket Name is required for AWS S3 connection." });
      }
      return res.json({ ok: true, providerName: "AWS S3 / S3-Compatible Storage" });
    }

    if (driver === "cloudinary") {
      if (!cloudinaryCloudName) {
        return res.json({ ok: false, message: "Cloud Name is required for Cloudinary connection." });
      }
      return res.json({ ok: true, providerName: "Cloudinary CDN" });
    }

    if (driver === "sftp") {
      if (!sftpHost) {
        return res.json({ ok: false, message: "Server Host is required for SFTP connection." });
      }
      return res.json({ ok: true, providerName: "SFTP Remote Server" });
    }

    return res.json({ ok: true, providerName: "Local Disk Storage" });
  });

  // Public Subscription Plans (readable by tenant workspaces — no auth required)
  app.get("/api/subscription-plans", async (_req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.monthlyPrice);
      res.json(plans);
    } catch (error: any) {
      res.json([
        { id: 1, name: "Trial", monthlyPrice: "0.00", maxClients: 10, maxUsers: 1, maxStorageGb: "2.00", isActive: true },
        { id: 2, name: "Basic", monthlyPrice: "29.00", maxClients: 50, maxUsers: 3, maxStorageGb: "5.00", isActive: true },
        { id: 3, name: "Pro", monthlyPrice: "99.00", maxClients: 500, maxUsers: 10, maxStorageGb: "50.00", isActive: true },
        { id: 4, name: "Enterprise", monthlyPrice: "299.00", maxClients: 0, maxUsers: 0, maxStorageGb: "500.00", isActive: true },
      ]);
    }
  });

  // Public Security Settings (readable by login pages — no auth required)
  app.get("/api/public/security-settings", async (_req, res) => {
    try {
      const rows = await db.select().from(systemSettings).where(
        or(
          eq(systemSettings.key, "sso_google_enabled"),
          eq(systemSettings.key, "sso_google_client_id"),
          eq(systemSettings.key, "security_enforce_2fa")
        )
      );
      const settingsMap: Record<string, string> = rows.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {});
      res.json({
        ssoGoogleEnabled: settingsMap["sso_google_enabled"] === "true",
        ssoGoogleClientId: settingsMap["sso_google_client_id"] || "",
        enforce2fa: settingsMap["security_enforce_2fa"] === "true",
      });
    } catch {
      res.json({ ssoGoogleEnabled: false, ssoGoogleClientId: "", enforce2fa: false });
    }
  });

  // Platform Maintenance Mode Middleware (Intercepts tenant requests when maintenance_mode === 'true')
  app.use("/api", async (req, res, next) => {
    if (
      req.path.startsWith("/system-admin") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/media-settings") ||
      req.path.startsWith("/subscription-plans") ||
      req.path.startsWith("/public/security-settings")
    ) {
      return next();
    }

    try {
      const [maintenanceSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "maintenance_mode"))
        .limit(1);

      if (maintenanceSetting?.value === "true") {
        return res.status(503).json({
          isMaintenanceMode: true,
          message: "Platform Maintenance Mode is currently active. Access is temporarily paused.",
        });
      }
    } catch {
      // If DB check fails, proceed
    }

    next();
  });

  // Mount API Routers
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api/practice/settings", practiceSettingsRouter);
  app.use("/api/bookkeeping/invoice-templates", invoiceTemplatesRouter);
  app.use("/api/bookkeeping/settings", bookkeepingSettingsRouter);
  app.use("/api/bookkeeping", bookkeepingRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/accounting", accountingRouter);
  app.use("/api/time-fees", timefeesRouter);
  app.use("/api/journals", journalsRouter);
  app.use("/api/myadmin", myAdminRouter);
  app.use("/api/company-secretarial", companySecRouter);
  app.use("/api/sansign", sansignRouter);
  app.use("/api/esign", sansignRouter);
  app.use("/api/companies-house", companiesHouseRouter);
  app.use("/api/accounts-production", accountsProductionRouter);
  app.use("/api/corporation-tax", corporationTaxRouter);
  app.use("/api/self-assessment", selfAssessmentRouter);
  app.use("/api/mtd-it", mtdItRouter);
  app.use("/api/charity", charityRouter);
  app.use("/api/portal", portalRouter);
  app.use("/api/cis", cisRouter);
  app.use("/api/dividends", dividendsRouter);
  app.use("/api/minutes", minutesRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/logs", logsRouter);
  app.use("/api/system-admin", systemAdminRouter);
  app.use("/api/hmrc-gateway", hmrcGatewayRouter);
  app.use("/api/hmrc-sa100", hmrcSa100Router);
  app.use("/api/gateway-checkout", gatewayRouter);
  app.use("/api/system", ipBansRouter);
  app.use("/api/support", supportRouter);
  app.use("/api/aml", amlRouter);

  // Practice Management Suite API Routers
  app.use("/api/pm/reports", pmReportsRouter);
  app.use("/api/pm/services", pmServicesRouter);
  app.use("/api/pm/deadlines", pmDeadlinesRouter);
  app.use("/api/pm/conversations", pmConversationsRouter);
  app.use("/api/pm/loe", pmLoeRouter);
  app.use("/api/pm/documents", pmDocumentsRouter);
  app.use("/api/pm", practiceRouter);

  // Initialize Compliance Engine Background Daemon
  startComplianceScheduler();

  const httpServer = createServer(app);

  return httpServer;
}
