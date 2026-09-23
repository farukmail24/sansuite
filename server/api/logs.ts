import { Router } from "express";
import { db } from "../db";
import { auditLogs, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: any, res) => {
  try {
    const list = await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      resource: auditLogs.resource,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      user: users.firstName
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.practiceId, req.user.practiceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch logs", error: error.message });
  }
});

export default router;
