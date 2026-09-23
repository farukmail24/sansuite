import { Router } from "express";
import { db } from "../db";
import { meetingMinutes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const list = await db.select().from(meetingMinutes).where(eq(meetingMinutes.clientId, clientId));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch meeting minutes", error: error.message });
  }
});

router.post("/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [result] = await db.insert(meetingMinutes).values({ ...req.body, clientId });
    res.json({ id: result.insertId, message: "Minute created" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create minute", error: error.message });
  }
});

export default router;
