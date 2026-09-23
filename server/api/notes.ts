import { Router } from "express";
import { db } from "../db";
import { clientNotes, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

router.get("/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const list = await db.select({
      id: clientNotes.id,
      note: clientNotes.note,
      createdAt: clientNotes.createdAt,
      createdBy: users.firstName
    })
    .from(clientNotes)
    .leftJoin(users, eq(clientNotes.createdBy, users.id))
    .where(eq(clientNotes.clientId, clientId));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch notes", error: error.message });
  }
});

router.post("/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [result] = await db.insert(clientNotes).values({ 
      ...req.body, 
      clientId, 
      createdBy: req.user.id 
    });
    res.json({ id: result.insertId, message: "Note created" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create note", error: error.message });
  }
});

export default router;
