import { Router } from "express";
import { db } from "../db";
import {
  esignDocuments,
  esignSigners,
  esignFields,
  esignAuditLogs,
  esignSettings,
  esignTemplates,
  users,
  firmDetails,
  clients,
  accountingPeriods,
  trialBalances,
  trialBalanceLines,
  chartOfAccounts,
  journalEntries,
  journalLines,
  apAccountingPolicies,
  apStatutoryNotes
} from "@shared/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import { nanoid } from "nanoid";
import { emailService } from "../lib/emailService";
import { stampSignatureOnPdf } from "../lib/pdfSigner";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure upload directory exists
const esignUploadsDir = path.resolve(process.cwd(), "uploads", "esign");
if (!fs.existsSync(esignUploadsDir)) {
  fs.mkdirSync(esignUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, esignUploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".docx" || ext === ".doc" || ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image documents are supported for signing"));
    }
  },
});

// Self-healing columns migration for multi-doc & dynamic templates
(async () => {
  try { await db.execute(sql`ALTER TABLE esign_documents ADD COLUMN attachments_json JSON NULL`); } catch { }
  try { await db.execute(sql`ALTER TABLE esign_documents ADD COLUMN email_subject VARCHAR(255) NULL`); } catch { }
  try { await db.execute(sql`ALTER TABLE esign_documents ADD COLUMN email_template_id INT NULL`); } catch { }
  try { await db.execute(sql`ALTER TABLE esign_fields ADD COLUMN file_index INT DEFAULT 0`); } catch { }
  try { await db.execute(sql`ALTER TABLE esign_templates ADD COLUMN subject VARCHAR(255) NULL`); } catch { }
  try { await db.execute(sql`ALTER TABLE esign_templates ADD COLUMN email_body TEXT NULL`); } catch { }
})();

// Helper to safely parse attachments JSON or array
function parseAttachmentsList(raw: any, title?: string | null, filePath?: string | null, fileSize?: number | null): Array<{ fileName: string; filePath: string; fileSize?: number }> {
  if (Array.isArray(raw)) {
    return raw.filter((a) => a && (a.filePath || a.fileName));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => a && (a.filePath || a.fileName));
      }
    } catch { }
  }
  if (filePath) {
    return [{ fileName: title || "Document", filePath, fileSize: fileSize || 250000 }];
  }
  return [];
}

// Helper to build authentic statutory accounts summary for signers to review
async function getStatutoryAccountsSummary(clientId: number) {
  try {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return null;

    const periods = await db
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.clientId, clientId))
      .orderBy(desc(accountingPeriods.endDate), desc(accountingPeriods.id));
    const currentPeriod = periods[0] || null;

    let tbLines: any[] = [];
    let latestTb: any = null;

    if (currentPeriod) {
      const [tb] = await db
        .select()
        .from(trialBalances)
        .where(and(eq(trialBalances.clientId, clientId), eq(trialBalances.periodId, currentPeriod.id)))
        .orderBy(desc(trialBalances.createdAt), desc(trialBalances.id))
        .limit(1);
      latestTb = tb;
    }

    if (!latestTb) {
      const [tb] = await db
        .select()
        .from(trialBalances)
        .where(eq(trialBalances.clientId, clientId))
        .orderBy(desc(trialBalances.createdAt), desc(trialBalances.id))
        .limit(1);
      latestTb = tb;
    }

    if (latestTb) {
      const linesFromDb = await db
        .select({
          nominalCode: trialBalanceLines.nominalCode,
          debit: trialBalanceLines.debit,
          credit: trialBalanceLines.credit,
          accountName: trialBalanceLines.accountName,
          category: chartOfAccounts.category,
        })
        .from(trialBalanceLines)
        .leftJoin(
          chartOfAccounts,
          and(
            eq(trialBalanceLines.nominalCode, chartOfAccounts.nominalCode),
            eq(chartOfAccounts.clientId, clientId)
          )
        )
        .where(eq(trialBalanceLines.trialBalanceId, latestTb.id));

      tbLines = linesFromDb.map((l) => ({
        nominalCode: l.nominalCode,
        debit: parseFloat(l.debit || "0"),
        credit: parseFloat(l.credit || "0"),
        accountName: l.accountName,
        category:
          l.category ||
          (l.nominalCode.startsWith("4")
            ? "Turnover"
            : l.nominalCode.startsWith("5")
            ? "Cost of Sales"
            : l.nominalCode.startsWith("7") || l.nominalCode.startsWith("8")
            ? "Administrative Expenses"
            : l.nominalCode.startsWith("0")
            ? "Fixed Assets"
            : l.nominalCode.startsWith("1")
            ? "Current Assets"
            : l.nominalCode.startsWith("2")
            ? "Current Liabilities"
            : l.nominalCode.startsWith("3")
            ? "Capital & Reserves"
            : "General"),
      }));
    }

    if (tbLines.length === 0) {
      const jLines = await db
        .select({
          nominalCode: journalLines.nominalCode,
          debit: journalLines.debit,
          credit: journalLines.credit,
          description: journalLines.description,
          accountName: chartOfAccounts.name,
          category: chartOfAccounts.category,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalId, journalEntries.id))
        .leftJoin(
          chartOfAccounts,
          and(
            eq(journalLines.nominalCode, chartOfAccounts.nominalCode),
            eq(chartOfAccounts.clientId, clientId)
          )
        )
        .where(eq(journalEntries.clientId, clientId));

      const map = new Map<string, any>();
      for (const jl of jLines) {
        const code = jl.nominalCode || "";
        if (!code) continue;
        if (!map.has(code)) {
          map.set(code, {
            nominalCode: code,
            accountName: jl.accountName || jl.description || `Account ${code}`,
            category:
              jl.category ||
              (code.startsWith("4")
                ? "Turnover"
                : code.startsWith("5")
                ? "Cost of Sales"
                : code.startsWith("7") || code.startsWith("8")
                ? "Administrative Expenses"
                : code.startsWith("0")
                ? "Fixed Assets"
                : code.startsWith("1")
                ? "Current Assets"
                : code.startsWith("2")
                ? "Current Liabilities"
                : code.startsWith("3")
                ? "Capital & Reserves"
                : "General"),
            debit: 0,
            credit: 0,
          });
        }
        const item = map.get(code);
        item.debit += parseFloat(jl.debit || "0");
        item.credit += parseFloat(jl.credit || "0");
      }
      tbLines = Array.from(map.values());
    }

    const turnoverLines = tbLines.filter(
      (l) => l.category === "Turnover" || l.category === "Income" || l.nominalCode?.startsWith("4")
    );
    const turnover = Math.abs(turnoverLines.reduce((s, l) => s + (l.credit - l.debit), 0));

    const cosLines = tbLines.filter(
      (l) => l.category === "Cost of Sales" || l.category === "Direct Expenses" || l.nominalCode?.startsWith("5")
    );
    const costOfSales = Math.abs(cosLines.reduce((s, l) => s + (l.debit - l.credit), 0));

    const grossProfit = turnover - costOfSales;

    const adminLines = tbLines.filter(
      (l) =>
        l.category === "Administrative Expenses" ||
        l.category === "Expense" ||
        l.nominalCode?.startsWith("7") ||
        l.nominalCode?.startsWith("8")
    );
    const adminExpenses = Math.abs(adminLines.reduce((s, l) => s + (l.debit - l.credit), 0));

    const operatingProfit = grossProfit - adminExpenses;
    const profitBeforeTax = operatingProfit;
    const taxation = 0;
    const profitAfterTax = profitBeforeTax - taxation;

    const fixedAssetLines = tbLines.filter(
      (l) => l.category === "Fixed Assets" || l.nominalCode?.startsWith("0")
    );
    const fixedAssets = Math.max(0, fixedAssetLines.reduce((s, l) => s + (l.debit - l.credit), 0));

    const currentAssetLines = tbLines.filter(
      (l) =>
        l.category === "Current Assets" ||
        l.nominalCode?.startsWith("1") ||
        l.nominalCode?.startsWith("20")
    );
    const currentAssets = currentAssetLines.reduce((s, l) => s + (l.debit - l.credit), 0);

    const currentLiabilityLines = tbLines.filter(
      (l) =>
        l.category === "Current Liabilities" ||
        l.nominalCode?.startsWith("21") ||
        l.nominalCode?.startsWith("22")
    );
    const currentLiabilities = currentLiabilityLines.reduce((s, l) => s + (l.credit - l.debit), 0);

    const netCurrentAssets = currentAssets - currentLiabilities;
    const totalAssetsLessCurrentLiabilities = fixedAssets + netCurrentAssets;

    const longTermLiabilityLines = tbLines.filter(
      (l) => l.category === "Long Term Liabilities" || l.nominalCode?.startsWith("23")
    );
    const longTermLiabilities = longTermLiabilityLines.reduce((s, l) => s + (l.credit - l.debit), 0);

    const netAssets = totalAssetsLessCurrentLiabilities - longTermLiabilities;

    const equityLines = tbLines.filter(
      (l) => l.category === "Capital & Reserves" || l.nominalCode?.startsWith("3")
    );
    const equity = equityLines.reduce((s, l) => s + (l.credit - l.debit), 0);

    let policies: any = null;
    let notes: any = null;
    if (currentPeriod) {
      const [pol] = await db
        .select()
        .from(apAccountingPolicies)
        .where(
          and(eq(apAccountingPolicies.clientId, clientId), eq(apAccountingPolicies.periodId, currentPeriod.id))
        )
        .limit(1);
      policies = pol;

      const [not] = await db
        .select()
        .from(apStatutoryNotes)
        .where(
          and(eq(apStatutoryNotes.clientId, clientId), eq(apStatutoryNotes.periodId, currentPeriod.id))
        )
        .limit(1);
      notes = not;
    }

    const periodName = currentPeriod
      ? `Year Ended ${new Date(currentPeriod.endDate).getFullYear()}`
      : "Financial Year";

    return {
      clientId,
      companyName: client.clientName,
      registrationNumber: client.registrationNumber || (client as any).companyNumber || "",
      companyType: client.companyType || "Private Limited Company",
      periodId: currentPeriod?.id || null,
      periodName,
      periodStartDate: currentPeriod?.startDate,
      periodEndDate: currentPeriod?.endDate,
      accountingStandard: policies?.accountingStandard || "FRS102_1A",
      turnover,
      costOfSales,
      grossProfit,
      adminExpenses,
      operatingProfit,
      profitBeforeTax,
      taxation,
      profitAfterTax,
      fixedAssets,
      currentAssets,
      currentLiabilities,
      netCurrentAssets,
      totalAssetsLessCurrentLiabilities,
      longTermLiabilities,
      netAssets,
      shareCapital: equity || 0,
      retainedEarnings: profitAfterTax,
      averageEmployees: notes?.averageEmployees || 1,
      basisOfPreparation: policies?.basisOfPreparation,
      turnoverPolicy: policies?.turnoverPolicy,
      lines: tbLines,
    };
  } catch (err) {
    console.error("Failed to compile statutoryAccountsSummary:", err);
    return null;
  }
}

// 1. Get document details for public signing page
router.get("/public/documents/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [signer] = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.verificationToken, token));

    if (!signer || !signer.documentId) {
      return res.status(404).json({ message: "Document or signer token not found" });
    }

    const [doc] = await db
      .select()
      .from(esignDocuments)
      .where(eq(esignDocuments.id, signer.documentId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Fetch fields assigned to this document / signer
    const fields = await db
      .select()
      .from(esignFields)
      .where(eq(esignFields.documentId, doc.id));

    // Fetch firm details for branding
    let firmInfo: any = null;
    if (doc.practiceId) {
      const [firm] = await db
        .select({
          firmName: firmDetails.firmName,
          email: firmDetails.email,
          phone: firmDetails.phone,
        })
        .from(firmDetails)
        .where(eq(firmDetails.practiceId, doc.practiceId));
      firmInfo = firm;
    }

    // Record 'Opened' audit log if first time viewing and currently awaiting
    if (signer.status === "Awaiting") {
      await db.insert(esignAuditLogs).values({
        documentId: doc.id,
        action: "Opened",
        details: `Document opened by ${signer.signerName} (${signer.signerEmail}) from IP: ${req.ip || "127.0.0.1"}`,
      });
    }

    const attachments = parseAttachmentsList(doc.attachmentsJson, doc.title, doc.filePath, doc.fileSize);

    // If source module is Accounts Production or client ID is present, attach live statutory accounts summary
    let statutoryAccountsSummary = null;
    if (doc.clientId && (doc.sourceModule === "Accounts Production" || (doc.title && doc.title.toLowerCase().includes("account")))) {
      statutoryAccountsSummary = await getStatutoryAccountsSummary(doc.clientId);
    }

    res.json({
      id: doc.id,
      title: doc.title,
      sourceModule: doc.sourceModule,
      clientId: doc.clientId,
      filePath: doc.filePath,
      attachments,
      signedFilePath: doc.signedFilePath,
      fileSize: doc.fileSize,
      message: doc.message,
      status: doc.status,
      signerStatus: signer.status,
      signerName: signer.signerName,
      signerEmail: signer.signerEmail,
      signerRole: signer.signerRole,
      isPasswordProtected: Boolean(doc.isPasswordProtected),
      hasAccessCode: Boolean(doc.accessCode),
      expiryDate: doc.expiryDate,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
      fields,
      firmInfo,
      statutoryAccountsSummary,
    });
  } catch (error) {
    console.error("Public signature lookup error:", error);
    res.status(500).json({ message: "Failed to retrieve document details" });
  }
});

// 2. Verify passcode for password-protected document
router.post("/public/documents/:token/verify-passcode", async (req, res) => {
  try {
    const { token } = req.params;
    const { passcode } = req.body;

    const [signer] = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.verificationToken, token));

    if (!signer || !signer.documentId) {
      return res.status(404).json({ message: "Invalid verification token" });
    }

    const [doc] = await db
      .select()
      .from(esignDocuments)
      .where(eq(esignDocuments.id, signer.documentId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!doc.isPasswordProtected || !doc.accessCode) {
      return res.json({ verified: true });
    }

    if (passcode && passcode.trim() === doc.accessCode.trim()) {
      return res.json({ verified: true });
    }

    return res.status(401).json({ verified: false, message: "Incorrect security passcode." });
  } catch (error) {
    console.error("Passcode verification error:", error);
    res.status(500).json({ message: "Failed to verify passcode" });
  }
});

// 3. Submit signature (Draw or Type) with legal declaration
router.post("/public/documents/:token/sign", async (req, res) => {
  try {
    const { token } = req.params;
    const { signatureData, passcode } = req.body;

    if (!signatureData) {
      return res.status(400).json({ message: "Signature data is required" });
    }

    const [signer] = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.verificationToken, token));

    if (!signer || !signer.documentId) {
      return res.status(404).json({ message: "Invalid verification token" });
    }

    const [doc] = await db
      .select()
      .from(esignDocuments)
      .where(eq(esignDocuments.id, signer.documentId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Verify passcode if protected
    if (doc.isPasswordProtected && doc.accessCode) {
      if (!passcode || passcode.trim() !== doc.accessCode.trim()) {
        return res.status(401).json({ message: "Incorrect security passcode" });
      }
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "127.0.0.1";
    const clientUserAgent = (req.headers["user-agent"] as string) || "Unknown Browser";

    // Update signer record
    await db
      .update(esignSigners)
      .set({
        status: "Signed",
        signedAt: new Date(),
        ipAddress: clientIp,
        userAgent: clientUserAgent.substring(0, 255),
        signatureData: typeof signatureData === "string" ? signatureData : JSON.stringify(signatureData),
      })
      .where(eq(esignSigners.id, signer.id));

    // Check if all signers are now Signed
    const allSigners = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.documentId, doc.id));

    const allCompleted = allSigners.every((s) => s.id === signer.id || s.status === "Signed");

    // Stamp signature directly onto the uploaded PDF document
    let signedFilePath: string | null = null;
    try {
      const outputRelativePath = `/uploads/esign/signed_doc_${doc.id}.pdf`;
      const docFields = await db
        .select()
        .from(esignFields)
        .where(eq(esignFields.documentId, doc.id));

      const [firmRecord] = await db
        .select({ firmName: firmDetails.firmName })
        .from(firmDetails)
        .where(eq(firmDetails.practiceId, doc.practiceId || 1));

      await stampSignatureOnPdf({
        originalPdfRelativePath: doc.filePath,
        outputRelativePath,
        signatureData: typeof signatureData === "string" ? signatureData : "",
        signerName: signer.signerName || "Client Signer",
        signerEmail: signer.signerEmail || "",
        documentTitle: doc.title || "Statutory Document",
        firmName: firmRecord?.firmName || "San Accounts Ltd.",
        ipAddress: clientIp,
        signedAt: new Date(),
        verificationToken: token,
        fields: docFields.map((f) => ({
          pageNumber: Number(f.pageNumber) || 1,
          coordX: Number(f.coordX) || 50,
          coordY: Number(f.coordY) || 75,
          width: Number(f.width) || 25,
          height: Number(f.height) || 8,
        })),
      });

      signedFilePath = outputRelativePath;
    } catch (stampErr) {
      console.error("[eSign] PDF signature stamping error:", stampErr);
    }

    if (allCompleted) {
      await db
        .update(esignDocuments)
        .set({
          status: "Signed",
          completedAt: new Date(),
          signedFilePath: signedFilePath || undefined,
        })
        .where(eq(esignDocuments.id, doc.id));
    }

    // Record digital audit log
    await db.insert(esignAuditLogs).values({
      documentId: doc.id,
      action: "Signed",
      details: `Electronically signed by ${signer.signerName} (${signer.signerEmail}) from IP ${clientIp} using ${clientUserAgent.substring(0, 80)}`,
    });

    // Notify practice firm by email
    const [firm] = await db
      .select({ email: firmDetails.email, firmName: firmDetails.firmName })
      .from(firmDetails)
      .where(eq(firmDetails.practiceId, doc.practiceId || 1));

    if (firm?.email) {
      emailService.sendSignatureCompletionNotice({
        to: firm.email,
        signerName: signer.signerName || "Client Signer",
        documentTitle: doc.title || "Statutory Document",
        completedAt: new Date(),
        ipAddress: clientIp,
      }).catch((err) => console.error("[eSign] Completion email notification failed:", err));
    }

    res.json({
      success: true,
      message: "Document successfully signed and verified with legal digital audit trail!",
      completedAt: new Date().toISOString(),
      ipAddress: clientIp,
      signedFilePath,
    });
  } catch (error) {
    console.error("Public signature error:", error);
    res.status(500).json({ message: "Failed to submit signature" });
  }
});

// 4. Decline signature
router.post("/public/documents/:token/decline", async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const [signer] = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.verificationToken, token));

    if (!signer || !signer.documentId) {
      return res.status(404).json({ message: "Invalid verification token" });
    }

    await db
      .update(esignSigners)
      .set({ status: "Declined" })
      .where(eq(esignSigners.id, signer.id));

    await db
      .update(esignDocuments)
      .set({ status: "Declined" })
      .where(eq(esignDocuments.id, signer.documentId));

    await db.insert(esignAuditLogs).values({
      documentId: signer.documentId,
      action: "Declined",
      details: `Declined by ${signer.signerName} (${signer.signerEmail}). Reason: ${reason || "No reason specified"}`,
    });

    res.json({ success: true, message: "Document declined." });
  } catch (error) {
    console.error("Decline error:", error);
    res.status(500).json({ message: "Failed to decline document" });
  }
});

// ========================================================
// PROTECTED ROUTES (Practice Staff / Accountants)
// ========================================================
router.use(authMiddleware);

// Upload PDF / Document for eSign (Single file)
router.post("/upload", upload.single("file"), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded" });
    }

    const relativePath = `/uploads/esign/${req.file.filename}`;
    res.json({
      success: true,
      fileName: req.file.originalname,
      filePath: relativePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    console.error("eSign file upload failed:", error);
    res.status(500).json({ message: error.message || "Failed to process file upload" });
  }
});

// Upload Multiple PDFs / Documents for eSign
router.post("/upload-multiple", upload.array("files", 10), (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded" });
    }

    const uploaded = files.map((f) => ({
      fileName: f.originalname,
      filePath: `/uploads/esign/${f.filename}`,
      fileSize: f.size,
      mimeType: f.mimetype,
    }));

    res.json({
      success: true,
      files: uploaded,
    });
  } catch (error: any) {
    console.error("eSign multi-file upload failed:", error);
    res.status(500).json({ message: error.message || "Failed to process multi-file upload" });
  }
});

// 5. Get all documents for the current practice
router.get("/documents", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const { status, search, sourceModule } = req.query;

    // Fetch documents belonging to practice
    let query = db
      .select({
        id: esignDocuments.id,
        title: esignDocuments.title,
        filePath: esignDocuments.filePath,
        attachmentsJson: esignDocuments.attachmentsJson,
        signedFilePath: esignDocuments.signedFilePath,
        fileSize: esignDocuments.fileSize,
        sourceModule: esignDocuments.sourceModule,
        status: esignDocuments.status,
        message: esignDocuments.message,
        isPasswordProtected: esignDocuments.isPasswordProtected,
        accessCode: esignDocuments.accessCode,
        expiryDate: esignDocuments.expiryDate,
        createdByUserId: esignDocuments.createdByUserId,
        createdAt: esignDocuments.createdAt,
        completedAt: esignDocuments.completedAt,
        clientId: esignDocuments.clientId,
      })
      .from(esignDocuments)
      .innerJoin(users, eq(esignDocuments.createdByUserId, users.id))
      .where(eq(users.practiceId, practiceId))
      .orderBy(desc(esignDocuments.createdAt));

    const docs = await query;

    // Fetch all signers for these documents
    const docIds = docs.map((d) => d.id);
    let allSigners: any[] = [];
    if (docIds.length > 0) {
      allSigners = await db
        .select()
        .from(esignSigners)
        .where(
          sql`${esignSigners.documentId} IN (${sql.raw(docIds.join(","))})`
        );
    }

    // Attach signers to documents
    const enrichedDocs = docs.map((d) => {
      const docSigners = allSigners.filter((s) => s.documentId === d.id);
      const primarySigner = docSigners[0];
      const attachments = parseAttachmentsList(d.attachmentsJson, d.title, d.filePath, d.fileSize);
      return {
        ...d,
        attachments,
        signers: docSigners,
        signerName: primarySigner?.signerName || "Client Signer",
        signerEmail: primarySigner?.signerEmail || "",
        signerRole: primarySigner?.signerRole || "Signer",
        verificationToken: primarySigner?.verificationToken || "",
        publicUrl: primarySigner?.verificationToken ? `/esign/public/${primarySigner.verificationToken}` : null,
      };
    });

    // Filter in-memory if query params provided
    let filtered = enrichedDocs;
    if (status && status !== "All") {
      filtered = filtered.filter((d) => d.status?.toLowerCase() === (status as string).toLowerCase().replace(/\s+/g, ""));
    }
    if (sourceModule && sourceModule !== "All") {
      filtered = filtered.filter((d) => d.sourceModule === sourceModule);
    }
    if (search) {
      const term = (search as string).toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title?.toLowerCase().includes(term) ||
          d.signerName?.toLowerCase().includes(term) ||
          d.signerEmail?.toLowerCase().includes(term)
      );
    }

    // Calculate live KPI counts
    const counts = {
      total: enrichedDocs.length,
      awaiting: enrichedDocs.filter((d) => d.status === "AwaitingApproval" || d.status === "Awaiting").length,
      signed: enrichedDocs.filter((d) => d.status === "Signed").length,
      declined: enrichedDocs.filter((d) => d.status === "Declined").length,
      drafts: enrichedDocs.filter((d) => d.status === "Draft").length,
      cancelled: enrichedDocs.filter((d) => d.status === "Cancelled").length,
    };

    res.json({
      documents: filtered,
      counts,
    });
  } catch (error) {
    console.error("Failed to fetch esign documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// 6. Get single document with complete details, signers, fields, and audit trail
router.get("/documents/:id", async (req: any, res) => {
  try {
    const docId = parseInt(req.params.id);

    const [doc] = await db
      .select()
      .from(esignDocuments)
      .where(eq(esignDocuments.id, docId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const signersList = await db
      .select()
      .from(esignSigners)
      .where(eq(esignSigners.documentId, docId));

    const fieldsList = await db
      .select()
      .from(esignFields)
      .where(eq(esignFields.documentId, docId));

    const auditTrail = await db
      .select()
      .from(esignAuditLogs)
      .where(eq(esignAuditLogs.documentId, docId))
      .orderBy(desc(esignAuditLogs.timestamp));

    const attachments = parseAttachmentsList(doc.attachmentsJson, doc.title, doc.filePath, doc.fileSize);

    res.json({
      ...doc,
      attachments,
      signers: signersList,
      fields: fieldsList,
      auditLogs: auditTrail,
    });
  } catch (error) {
    console.error("Failed to fetch document details:", error);
    res.status(500).json({ message: "Failed to fetch document details" });
  }
});

// Delete / Void signature request
router.delete("/documents/:id", async (req: any, res) => {
  try {
    const docId = parseInt(req.params.id);
    const [doc] = await db.select().from(esignDocuments).where(eq(esignDocuments.id, docId));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    await db.delete(esignAuditLogs).where(eq(esignAuditLogs.documentId, docId));
    await db.delete(esignFields).where(eq(esignFields.documentId, docId));
    await db.delete(esignSigners).where(eq(esignSigners.documentId, docId));
    await db.delete(esignDocuments).where(eq(esignDocuments.id, docId));

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Failed to delete esign document:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

// 7. Multi-step create signature request (Wizard backend)
router.post("/documents", async (req: any, res) => {
  try {
    const {
      title,
      sourceModule = "DirectUpload",
      filePath,
      attachments = [],
      fileSize = 250000,
      clientId,
      message,
      emailSubject,
      emailTemplateId,
      emailCustomBody,
      expiryDate,
      isPasswordProtected = false,
      accessCode,
      signers = [],
      fields = [],
      isDraft = false,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const practiceId = req.user.practiceId || 1;
    const status = isDraft ? "Draft" : "AwaitingApproval";

    // If filePath is a base64 data URL, write it to physical disk in uploads/esign
    let resolvedFilePath = filePath || (Array.isArray(attachments) && attachments[0]?.filePath) || null;
    if (filePath && typeof filePath === "string" && filePath.startsWith("data:")) {
      try {
        const matches = filePath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], "base64");
          const ext = matches[1].includes("pdf") ? ".pdf" : ".bin";
          const filename = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const fullPath = path.join(esignUploadsDir, filename);
          fs.writeFileSync(fullPath, buffer);
          resolvedFilePath = `/uploads/esign/${filename}`;
        }
      } catch (err) {
        console.warn("Failed to extract base64 filePath to disk:", err);
      }
    } else if (resolvedFilePath && resolvedFilePath.length > 250) {
      resolvedFilePath = resolvedFilePath.substring(0, 250);
    }

    const finalAttachments = Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : resolvedFilePath
        ? [{ fileName: title, filePath: resolvedFilePath, fileSize: parseInt(fileSize) || 0 }]
        : [];

    // 1. Insert Document
    const [docResult] = await db.insert(esignDocuments).values({
      practiceId,
      clientId: clientId ? parseInt(clientId) : null,
      title,
      sourceModule,
      filePath: resolvedFilePath || (finalAttachments[0]?.filePath ?? null),
      attachmentsJson: finalAttachments,
      emailSubject: emailSubject || null,
      emailTemplateId: emailTemplateId ? parseInt(emailTemplateId) : null,
      fileSize: parseInt(fileSize) || 0,
      message: message || null,
      status,
      isPasswordProtected: Boolean(isPasswordProtected),
      accessCode: accessCode || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdByUserId: req.user.id,
    } as any);

    const docId = docResult.insertId;

    // 2. Insert Signers
    const createdSigners = [];
    const signerIdMap = new Map<number, number>(); // index -> db id

    const rawSigners = Array.isArray(signers) && signers.length > 0
      ? signers
      : [{ signerName: req.body.signerName || "Client Signer", signerEmail: req.body.signerEmail, signerRole: "Signer" }];

    for (let i = 0; i < rawSigners.length; i++) {
      const s = rawSigners[i];
      if (!s.signerEmail) continue;
      const verificationToken = nanoid(32);
      const [signerResult] = await db.insert(esignSigners).values({
        documentId: docId,
        signerName: s.signerName || "Signer",
        signerEmail: s.signerEmail,
        signerRole: s.signerRole || "Signer",
        status: isDraft ? "Draft" : "Awaiting",
        verificationToken,
      });

      const signerId = signerResult.insertId;
      signerIdMap.set(i, signerId);
      createdSigners.push({
        id: signerId,
        signerName: s.signerName,
        signerEmail: s.signerEmail,
        signerRole: s.signerRole,
        verificationToken,
        publicUrl: `/esign/public/${verificationToken}`,
      });
    }

    // 3. Insert Fields (if provided)
    if (Array.isArray(fields) && fields.length > 0) {
      for (const f of fields) {
        const targetSignerId = f.signerId || signerIdMap.get(f.signerIndex || 0) || createdSigners[0]?.id;
        await db.insert(esignFields).values({
          documentId: docId,
          signerId: targetSignerId || null,
          fileIndex: typeof f.fileIndex === "number" ? f.fileIndex : 0,
          fieldType: f.fieldType || "Signature",
          pageNumber: f.pageNumber || 1,
          coordX: f.coordX ? String(f.coordX) : "20.00",
          coordY: f.coordY ? String(f.coordY) : "75.00",
          width: f.width ? String(f.width) : "25.00",
          height: f.height ? String(f.height) : "8.00",
        });
      }
    }

    // 4. Record Audit Log
    await db.insert(esignAuditLogs).values({
      documentId: docId,
      action: isDraft ? "Draft Saved" : "Created",
      details: isDraft
        ? `Document saved as draft with ${finalAttachments.length} file(s) by ${req.user.firstName || req.user.email}`
        : `Signature request with ${finalAttachments.length} attached document(s) dispatched to ${createdSigners.length} recipient(s) by ${req.user.firstName || req.user.email}`,
    });

    // Dispatches live/simulated email invitations with dynamic template
    if (!isDraft) {
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const reqBaseUrl = host ? `${proto}://${host}` : undefined;

      for (const s of createdSigners) {
        if (s.signerEmail) {
          emailService.sendSignatureInvitation({
            to: s.signerEmail,
            signerName: s.signerName || "Signatory",
            documentTitle: title,
            signingUrl: s.publicUrl,
            message: message || undefined,
            customSubject: emailSubject || undefined,
            customBody: emailCustomBody || undefined,
            attachments: finalAttachments.map((a: any) => ({ fileName: a.fileName, fileSize: a.fileSize })),
            expiresAt: expiryDate || undefined,
            baseUrl: reqBaseUrl,
          }).catch((err) => console.error(`[eSign] Invitation email failed for ${s.signerEmail}:`, err));
        }
      }
    }

    res.json({
      id: docId,
      status,
      signers: createdSigners,
      primarySigningUrl: createdSigners[0]?.publicUrl || null,
      message: isDraft ? "Document saved as draft" : "Signature request created and dispatched successfully!",
    });
  } catch (error) {
    console.error("Failed to create document:", error);
    res.status(500).json({ message: "Failed to create document" });
  }
});

// 8. Resend Reminder
router.post("/documents/:id/remind", async (req: any, res) => {
  try {
    const docId = parseInt(req.params.id);
    const [doc] = await db
      .select()
      .from(esignDocuments)
      .where(eq(esignDocuments.id, docId));

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const pendingSigners = await db
      .select()
      .from(esignSigners)
      .where(and(eq(esignSigners.documentId, docId), eq(esignSigners.status, "Awaiting")));

    if (pendingSigners.length === 0) {
      return res.status(400).json({ message: "No pending signers found for this document" });
    }

    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const reqBaseUrl = host ? `${proto}://${host}` : undefined;

    // Trigger reminder emails
    for (const s of pendingSigners) {
      if (s.signerEmail && s.verificationToken) {
        emailService.sendSignatureReminder({
          to: s.signerEmail,
          signerName: s.signerName || "Signatory",
          documentTitle: doc.title || "Statutory Document",
          signingUrl: `/esign/public/${s.verificationToken}`,
          baseUrl: reqBaseUrl,
        }).catch((err) => console.error(`[eSign] Reminder email failed for ${s.signerEmail}:`, err));
      }
    }

    await db.insert(esignAuditLogs).values({
      documentId: docId,
      action: "Resent",
      details: `Signature reminder notification resent to ${pendingSigners.length} pending recipient(s) by ${req.user.firstName || req.user.email}`,
    });

    res.json({
      success: true,
      message: `Reminder successfully sent to ${pendingSigners.length} pending signer(s).`,
    });
  } catch (error) {
    console.error("Failed to resend reminder:", error);
    res.status(500).json({ message: "Failed to resend reminder" });
  }
});

// 9. Cancel Request
router.post("/documents/:id/cancel", async (req: any, res) => {
  try {
    const docId = parseInt(req.params.id);

    await db
      .update(esignDocuments)
      .set({ status: "Cancelled" })
      .where(eq(esignDocuments.id, docId));

    await db
      .update(esignSigners)
      .set({ status: "Declined" })
      .where(and(eq(esignSigners.documentId, docId), eq(esignSigners.status, "Awaiting")));

    await db.insert(esignAuditLogs).values({
      documentId: docId,
      action: "Cancelled",
      details: `Signature request cancelled by ${req.user.firstName || req.user.email}`,
    });

    res.json({ success: true, message: "Signature request successfully cancelled." });
  } catch (error) {
    console.error("Failed to cancel document:", error);
    res.status(500).json({ message: "Failed to cancel document" });
  }
});

// 10. Delete Document
router.delete("/documents/:id", async (req: any, res) => {
  try {
    const docId = parseInt(req.params.id);

    // Delete child rows first
    await db.delete(esignFields).where(eq(esignFields.documentId, docId));
    await db.delete(esignAuditLogs).where(eq(esignAuditLogs.documentId, docId));
    await db.delete(esignSigners).where(eq(esignSigners.documentId, docId));
    await db.delete(esignDocuments).where(eq(esignDocuments.id, docId));

    res.json({ success: true, message: "Document deleted successfully." });
  } catch (error) {
    console.error("Failed to delete document:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

// 11. Settings Endpoints
router.get("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const [existing] = await db
      .select()
      .from(esignSettings)
      .where(eq(esignSettings.practiceId, practiceId));

    if (existing) {
      return res.json(existing);
    }

    // Create default if not found
    await db.insert(esignSettings).values({
      practiceId,
      emailRemindersEnabled: true,
      reminderDays: 3,
      masterPasswordEnabled: false,
      customMessage: "Please review and electronically sign this document from your accounting team.",
      notifyOnSign: true,
      notifyOnDecline: true,
    });

    const [created] = await db
      .select()
      .from(esignSettings)
      .where(eq(esignSettings.practiceId, practiceId));

    res.json(created);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.post("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const {
      emailRemindersEnabled,
      reminderDays,
      masterPasswordEnabled,
      masterPassword,
      customMessage,
      notifyOnSign,
      notifyOnDecline,
    } = req.body;

    const [existing] = await db
      .select()
      .from(esignSettings)
      .where(eq(esignSettings.practiceId, practiceId));

    if (existing) {
      await db
        .update(esignSettings)
        .set({
          emailRemindersEnabled: Boolean(emailRemindersEnabled),
          reminderDays: parseInt(reminderDays) || 3,
          masterPasswordEnabled: Boolean(masterPasswordEnabled),
          masterPassword: masterPassword || null,
          customMessage: customMessage || null,
          notifyOnSign: Boolean(notifyOnSign),
          notifyOnDecline: Boolean(notifyOnDecline),
          updatedAt: new Date(),
        })
        .where(eq(esignSettings.practiceId, practiceId));
    } else {
      await db.insert(esignSettings).values({
        practiceId,
        emailRemindersEnabled: Boolean(emailRemindersEnabled),
        reminderDays: parseInt(reminderDays) || 3,
        masterPasswordEnabled: Boolean(masterPasswordEnabled),
        masterPassword: masterPassword || null,
        customMessage: customMessage || null,
        notifyOnSign: Boolean(notifyOnSign),
        notifyOnDecline: Boolean(notifyOnDecline),
      });
    }

    res.json({ success: true, message: "eSign settings updated cleanly." });
  } catch (error) {
    console.error("Failed to update settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// 12. Templates Endpoints
router.get("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const templatesList = await db
      .select()
      .from(esignTemplates)
      .where(eq(esignTemplates.practiceId, practiceId))
      .orderBy(desc(esignTemplates.createdAt));

    res.json(templatesList);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

router.post("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const { name, category = "General", description, fieldsJson } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Template name is required" });
    }

    const [result] = await db.insert(esignTemplates).values({
      practiceId,
      name,
      category,
      description: description || null,
      fieldsJson: fieldsJson || null,
    });

    res.json({
      id: result.insertId,
      name,
      category,
      description,
      message: "Template saved successfully",
    });
  } catch (error) {
    console.error("Failed to save template:", error);
    res.status(500).json({ message: "Failed to save template" });
  }
});

router.delete("/templates/:id", async (req: any, res) => {
  try {
    const templateId = parseInt(req.params.id);
    await db.delete(esignTemplates).where(eq(esignTemplates.id, templateId));
    res.json({ success: true, message: "Template deleted successfully." });
  } catch (error) {
    console.error("Failed to delete template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// 13. My Signature Studio (Accountant's personal signature)
router.get("/my-signature", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [u] = await db
      .select({ signatureData: users.signatureData })
      .from(users)
      .where(eq(users.id, userId));

    res.json({ signatureData: u?.signatureData || null });
  } catch (error) {
    console.error("Failed to fetch signature:", error);
    res.status(500).json({ message: "Failed to fetch signature" });
  }
});

router.post("/my-signature", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { signatureData } = req.body;

    await db
      .update(users)
      .set({ signatureData: signatureData || null })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Signature saved successfully!" });
  } catch (error) {
    console.error("Failed to save signature:", error);
    res.status(500).json({ message: "Failed to save signature" });
  }
});

export default router;
