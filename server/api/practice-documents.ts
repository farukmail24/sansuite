import { Router } from "express";
import { db } from "../db";
import { pmDocumentRequests, clients, pmClientTimeline, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import crypto from "crypto";

const router = Router();

// --- PUBLIC CLIENT UPLOAD ENDPOINTS (NO AUTH REQUIRED) ---
router.get("/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const reqs = await db.select().from(pmDocumentRequests).where(eq(pmDocumentRequests.publicToken, token)).limit(1);

    if (reqs.length === 0) {
      return res.status(404).json({ message: "Document request link not found or expired." });
    }

    const docReq = reqs[0];
    const client = await db.select().from(clients).where(eq(clients.id, docReq.clientId)).limit(1);

    res.json({
      id: docReq.id,
      requestTitle: docReq.requestTitle,
      description: docReq.description,
      requiredItems: JSON.parse(docReq.requiredItemsJson || "[]"),
      dueDate: docReq.dueDate,
      status: docReq.status,
      clientName: client[0]?.clientName || "Valued Client",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to load document request" });
  }
});

router.post("/public/:token/upload", async (req, res) => {
  try {
    const { token } = req.params;
    const { uploadedItems } = req.body; // array of items marked completed with file names

    const reqs = await db.select().from(pmDocumentRequests).where(eq(pmDocumentRequests.publicToken, token)).limit(1);
    if (reqs.length === 0) return res.status(404).json({ message: "Request not found." });

    const docReq = reqs[0];

    await db
      .update(pmDocumentRequests)
      .set({
        status: "Completed",
        completedAt: new Date(),
        requiredItemsJson: JSON.stringify(uploadedItems || []),
      })
      .where(eq(pmDocumentRequests.id, docReq.id));

    // Log to client timeline
    await db.insert(pmClientTimeline).values({
      practiceId: docReq.practiceId,
      clientId: docReq.clientId,
      activityType: "Document",
      title: `Client Uploaded Requested Documents`,
      content: `Completed document request: '${docReq.requestTitle}' with ${Array.isArray(uploadedItems) ? uploadedItems.length : 1} files.`,
    });

    res.json({ success: true, message: "Documents successfully uploaded to accountant portal." });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to upload documents" });
  }
});

// --- AUTHENTICATED PRACTICE USER ENDPOINTS ---
router.use(authMiddleware);

// GET /api/pm/documents/requests - List document requests
router.get("/requests", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId } = req.query;

    const list = await db
      .select({
        id: pmDocumentRequests.id,
        practiceId: pmDocumentRequests.practiceId,
        clientId: pmDocumentRequests.clientId,
        clientName: clients.clientName,
        requestTitle: pmDocumentRequests.requestTitle,
        description: pmDocumentRequests.description,
        requiredItemsJson: pmDocumentRequests.requiredItemsJson,
        publicToken: pmDocumentRequests.publicToken,
        dueDate: pmDocumentRequests.dueDate,
        status: pmDocumentRequests.status,
        createdAt: pmDocumentRequests.createdAt,
        completedAt: pmDocumentRequests.completedAt,
      })
      .from(pmDocumentRequests)
      .innerJoin(clients, eq(pmDocumentRequests.clientId, clients.id))
      .where(eq(pmDocumentRequests.practiceId, practiceId))
      .orderBy(desc(pmDocumentRequests.createdAt));

    let filtered = list;
    if (clientId) {
      filtered = filtered.filter(r => r.clientId === parseInt(clientId as string));
    }

    res.json(filtered.map(r => ({
      ...r,
      requiredItems: JSON.parse(r.requiredItemsJson || "[]"),
      publicUrl: `/public/documents/upload/${r.publicToken}`
    })));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch document requests" });
  }
});

// POST /api/pm/documents/requests - Create a new document request
router.post("/requests", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, serviceId, requestTitle, description, requiredItems, dueDate } = req.body;

    const token = crypto.randomBytes(24).toString("hex");

    const [insertRes] = await db.insert(pmDocumentRequests).values({
      practiceId,
      clientId: parseInt(clientId),
      serviceId: serviceId ? parseInt(serviceId) : null,
      requestTitle,
      description: description || "",
      requiredItemsJson: JSON.stringify(requiredItems || []),
      publicToken: token,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: "Pending",
      requestedBy: req.user.id,
    });

    // Log to client timeline
    await db.insert(pmClientTimeline).values({
      practiceId,
      clientId: parseInt(clientId),
      userId: req.user.id,
      activityType: "Document",
      title: `Sent Document Request: ${requestTitle}`,
      content: `Requested items: ${(requiredItems || []).map((i: any) => i.name || i).join(", ")}`,
      metadataJson: JSON.stringify({ token, requestId: insertRes.insertId }),
    });

    res.json({
      id: insertRes.insertId,
      publicToken: token,
      publicUrl: `/public/documents/upload/${token}`,
      message: "Document request created and dispatched successfully",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create document request" });
  }
});

export default router;
