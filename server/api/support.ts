import { Router } from "express";
import { db } from "../db";
import { supportTickets, ticketMessages } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();

// GET /api/support/tickets
router.get("/tickets", authMiddleware, async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const tickets = await db.select().from(supportTickets).where(eq(supportTickets.practiceId, practiceId)).orderBy(desc(supportTickets.createdAt));
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/support/tickets
router.post("/tickets", authMiddleware, async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const { subject, category, message, priority } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [ticketResult] = await db.insert(supportTickets).values({
      practiceId,
      userId,
      subject,
      category,
      priority: priority || 'normal',
      status: 'open'
    });

    const ticketId = ticketResult.insertId;

    await db.insert(ticketMessages).values({
      ticketId,
      senderType: 'tenant',
      senderId: userId,
      message,
      isInternal: false
    });

    res.json({ success: true, ticketId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/support/tickets/:id
router.get("/tickets/:id", authMiddleware, async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const ticketId = parseInt(req.params.id);

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (!ticket || ticket.practiceId !== practiceId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const messages = await db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);

    // Filter out internal messages for tenants
    const visibleMessages = messages.filter(m => !m.isInternal);

    res.json({ ticket, messages: visibleMessages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/support/tickets/:id/messages
router.post("/tickets/:id/messages", authMiddleware, async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (!ticket || ticket.practiceId !== practiceId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await db.insert(ticketMessages).values({
      ticketId,
      senderType: 'tenant',
      senderId: userId,
      message,
      isInternal: false
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
