import { Router } from "express";
import { authMiddleware } from "../lib/authUtils";
import { db } from "../db";
import { ipBans } from "../../shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { listAllBans, manualBanIp, unbanIp } from "../middleware/rateLimiter";

const router = Router();
router.use(authMiddleware);

// GET /api/system/ip-bans — list all IP bans (active + historical)
router.get("/ip-bans", async (req: any, res) => {
  try {
    const rows = await listAllBans();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/system/ip-bans — manually ban an IP
router.post("/ip-bans", async (req: any, res) => {
  try {
    const { ipAddress, reason, permanent, durationMinutes } = req.body;
    if (!ipAddress) return res.status(400).json({ message: "ipAddress is required" });
    await manualBanIp(
      ipAddress,
      reason || "Manual ban by admin",
      req.user?.email || "admin",
      !!permanent,
      durationMinutes
    );
    res.json({ message: `IP ${ipAddress} has been banned.` });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/system/ip-bans/:id — unban an IP ban record
router.delete("/ip-bans/:id", async (req: any, res) => {
  try {
    const banId = parseInt(req.params.id);
    await unbanIp(banId, req.user?.email || "admin");
    res.json({ message: "IP ban has been lifted." });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
