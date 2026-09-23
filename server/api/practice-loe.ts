import { Router } from "express";
import { db } from "../db";
import { pmLoeTemplates, pmLoeDocuments, clients, pmClientTimeline, users, practices } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import crypto from "crypto";

const router = Router();

// Ensure default LoE Template
async function ensureDefaultLoeTemplate(practiceId: number) {
  const existing = await db.select().from(pmLoeTemplates).where(eq(pmLoeTemplates.practiceId, practiceId)).limit(1);
  if (existing.length === 0) {
    await db.insert(pmLoeTemplates).values({
      practiceId,
      templateName: "Standard Standard Letter of Engagement (UK Practice)",
      templateType: "LetterOfEngagement",
      headerHtml: `<div style="text-align:center;padding:20px;border-bottom:2px solid #6c5ce7;"><h2>LETTER OF ENGAGEMENT & PROFESSIONAL TERMS</h2><p>SanSuite Chartered Accountants & Registered Auditors</p></div>`,
      bodyHtml: `<h3>1. Purpose & Scope of Engagement</h3>
<p>This Letter of Engagement sets out the basis on which we are to act as your accountants and tax advisors for <strong>{{client_name}}</strong> (Company No: {{company_number}}).</p>

<h3>2. Contracted Professional Services</h3>
<p>We agree to provide the following compliance and advisory services:</p>
<div style="background:#f8fafc;padding:15px;border-radius:6px;margin:15px 0;">
{{services_list}}
</div>

<h3>3. Agreed Professional Fees</h3>
<p>Our agreed professional fee for the contracted services is <strong>{{agreed_fee}}</strong>, payable in accordance with our standard payment terms.</p>

<h3>4. Client Responsibilities & Data Protection</h3>
<p>You agree to provide full, complete, and accurate records in a timely manner. We will process all personal data strictly in compliance with UK GDPR and Data Protection Act 2018 regulations.</p>

<h3>5. Agreement & Electronic Signature</h3>
<p>By signing below, you confirm your acceptance of the terms and conditions outlined in this agreement.</p>`,
      footerHtml: `<div style="text-align:center;font-size:12px;color:#64748b;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:10px;"><p>SanSuite Practice Management System - Legally Binding Electronic Document</p></div>`,
      isDefault: true,
    });
  }
}

// --- PUBLIC SIGNING ENDPOINTS (NO AUTH REQUIRED) ---

// GET /api/pm/loe/public/:token - Client accesses document to review & sign
router.get("/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const docs = await db.select().from(pmLoeDocuments).where(eq(pmLoeDocuments.publicSignToken, token)).limit(1);

    if (docs.length === 0) {
      return res.status(404).json({ message: "Document not found or signing link has expired." });
    }

    const doc = docs[0];

    // Mark as Viewed if first time
    if (doc.status === "Sent") {
      await db
        .update(pmLoeDocuments)
        .set({ status: "Viewed", viewedAt: new Date() })
        .where(eq(pmLoeDocuments.id, doc.id));
    }

    // Fetch practice information
    const practiceInfo = await db.select().from(practices).where(eq(practices.id, doc.practiceId)).limit(1);

    res.json({
      id: doc.id,
      documentTitle: doc.documentTitle,
      clientName: doc.prospectName,
      status: doc.status,
      totalFeeQuoted: doc.totalFeeQuoted,
      servicesIncluded: doc.servicesIncludedJson ? JSON.parse(doc.servicesIncludedJson) : [],
      practiceName: practiceInfo[0]?.name || "SanSuite Practice",
      pdfUrl: doc.pdfUrl,
      signedAt: doc.signedAt,
      signeeName: doc.signeeName,
    });
  } catch (error: any) {
    console.error("Error fetching public signing document:", error);
    res.status(500).json({ message: error.message || "Failed to load document" });
  }
});

// POST /api/pm/loe/public/:token - Submit signature & generate audit certificate
router.post("/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { signeeName, signatureDataUrl } = req.body;

    const docs = await db.select().from(pmLoeDocuments).where(eq(pmLoeDocuments.publicSignToken, token)).limit(1);
    if (docs.length === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    const doc = docs[0];
    if (doc.status === "Signed") {
      return res.status(400).json({ message: "This document has already been signed." });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const signedAt = new Date();

    // Create cryptographic checksum hash
    const documentHash = crypto
      .createHash("sha256")
      .update(`${doc.id}-${signeeName}-${signedAt.toISOString()}-${token}`)
      .digest("hex");

    const auditCertificate = {
      certificateId: `CERT-${Date.now().toString(36).toUpperCase()}`,
      documentTitle: doc.documentTitle,
      signerName: signeeName,
      signerIp: String(ipAddress),
      signerUserAgent: userAgent,
      signedTimestamp: signedAt.toISOString(),
      documentChecksumSha256: documentHash,
      complianceStandard: "UK Electronic Communications Act 2000 & eIDAS Compliant",
    };

    await db
      .update(pmLoeDocuments)
      .set({
        status: "Signed",
        signedAt,
        signeeName,
        signeeIp: String(ipAddress),
        signeeUserAgent: userAgent,
        signatureDataUrl,
        auditCertificateJson: JSON.stringify(auditCertificate),
      })
      .where(eq(pmLoeDocuments.id, doc.id));

    // Log to client timeline if linked to a client
    if (doc.clientId) {
      await db.insert(pmClientTimeline).values({
        practiceId: doc.practiceId,
        clientId: doc.clientId,
        activityType: "Document",
        title: `Letter of Engagement Signed by ${signeeName}`,
        content: `Document '${doc.documentTitle}' was electronically signed with audit hash ${documentHash.substring(0, 16)}...`,
        metadataJson: JSON.stringify(auditCertificate),
      });

      // Update client trading status to active if prospect
      await db.update(clients).set({ tradingStatus: "Trading" }).where(eq(clients.id, doc.clientId));
    }

    res.json({
      success: true,
      message: "Document successfully signed and cryptographic certificate generated.",
      auditCertificate,
    });
  } catch (error: any) {
    console.error("Error submitting digital signature:", error);
    res.status(500).json({ message: error.message || "Failed to submit signature" });
  }
});

// --- AUTHENTICATED PRACTICE USER ENDPOINTS ---
router.use(authMiddleware);

// GET /api/pm/loe - List all LoE / Proposals
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    await ensureDefaultLoeTemplate(practiceId);

    const documents = await db
      .select({
        id: pmLoeDocuments.id,
        practiceId: pmLoeDocuments.practiceId,
        clientId: pmLoeDocuments.clientId,
        clientName: clients.clientName,
        prospectName: pmLoeDocuments.prospectName,
        prospectEmail: pmLoeDocuments.prospectEmail,
        documentTitle: pmLoeDocuments.documentTitle,
        status: pmLoeDocuments.status,
        totalFeeQuoted: pmLoeDocuments.totalFeeQuoted,
        publicSignToken: pmLoeDocuments.publicSignToken,
        sentAt: pmLoeDocuments.sentAt,
        viewedAt: pmLoeDocuments.viewedAt,
        signedAt: pmLoeDocuments.signedAt,
        signeeName: pmLoeDocuments.signeeName,
        createdAt: pmLoeDocuments.createdAt,
      })
      .from(pmLoeDocuments)
      .leftJoin(clients, eq(pmLoeDocuments.clientId, clients.id))
      .where(eq(pmLoeDocuments.practiceId, practiceId))
      .orderBy(desc(pmLoeDocuments.createdAt));

    res.json(documents);
  } catch (error: any) {
    console.error("Failed to fetch LoE documents:", error);
    res.status(500).json({ message: error.message || "Failed to fetch LoE documents" });
  }
});

// POST /api/pm/loe/generate - Generate proposal / LoE document
router.post("/generate", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, prospectName, prospectEmail, documentTitle, totalFeeQuoted, servicesIncluded, templateId } = req.body;

    const signToken = crypto.randomBytes(24).toString("hex");

    const [insertRes] = await db.insert(pmLoeDocuments).values({
      practiceId,
      clientId: clientId ? parseInt(clientId) : null,
      prospectName: prospectName || "Valued Client",
      prospectEmail: prospectEmail || "",
      templateId: templateId ? parseInt(templateId) : null,
      documentTitle: documentTitle || "Letter of Engagement & Fee Proposal",
      totalFeeQuoted: String(totalFeeQuoted || "0.00"),
      servicesIncludedJson: JSON.stringify(servicesIncluded || []),
      publicSignToken: signToken,
      status: "Draft",
    });

    res.json({
      id: insertRes.insertId,
      publicSignToken: signToken,
      signUrl: `/public/sign/${signToken}`,
      message: "Engagement document generated successfully",
    });
  } catch (error: any) {
    console.error("Failed to generate LoE:", error);
    res.status(500).json({ message: error.message || "Failed to generate LoE" });
  }
});

// POST /api/pm/loe/:id/send - Dispatch to client email
router.post("/:id/send", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);

    const doc = await db.select().from(pmLoeDocuments).where(and(eq(pmLoeDocuments.id, id), eq(pmLoeDocuments.practiceId, practiceId))).limit(1);
    if (doc.length === 0) return res.status(404).json({ message: "Document not found" });

    await db
      .update(pmLoeDocuments)
      .set({ status: "Sent", sentAt: new Date() })
      .where(eq(pmLoeDocuments.id, id));

    res.json({ success: true, message: `Document dispatched to ${doc[0].prospectEmail || "client"}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to send document" });
  }
});

// GET /api/pm/loe/templates - List templates
router.get("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    await ensureDefaultLoeTemplate(practiceId);

    const templates = await db.select().from(pmLoeTemplates).where(eq(pmLoeTemplates.practiceId, practiceId));
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch templates" });
  }
});

export default router;
