import { Router } from "express";
import { pool } from "../db";
import path from "path";
import fs from "fs";
import multer from "multer";
import { authMiddleware } from "../lib/authUtils";
// @ts-ignore
import { ZipArchive } from "archiver";
import JSZip from "jszip";

const router = Router();
router.use(authMiddleware);

// Master template directory containing authentic SanSuite Word templates
const MASTER_TEMPLATES_DIR = fs.existsSync(path.resolve(process.cwd(), "server", "templates", "sansuite-docs"))
  ? path.resolve(process.cwd(), "server", "templates", "sansuite-docs")
  : path.resolve(process.cwd(), "server", "templates", "capium-docs");
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "invoice-templates");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage for uploaded docx/zip files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `tpl-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".docx", ".doc", ".zip"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .docx or .zip files are allowed."));
    }
  },
});

/**
 * Ensure database table exists and has necessary columns
 */
async function ensureInvoiceTemplatesTable(practiceId: number, clientId?: number | null) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookkeeping_invoice_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      practice_id INT NOT NULL,
      client_id INT NULL,
      template_name VARCHAR(255) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      invoice_file VARCHAR(255) DEFAULT 'Invoice.docx',
      credit_note_file VARCHAR(255) DEFAULT 'CreditNote.docx',
      dividend_file VARCHAR(255) DEFAULT 'Dividend.docx',
      quotation_file VARCHAR(255) DEFAULT 'Quotation.docx',
      updated_on VARCHAR(50) DEFAULT '-',
      bank_name VARCHAR(255) DEFAULT 'N/A',
      custom_dir VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ensure columns exist if table was previously created
  const cols = [
    "client_id INT NULL",
    "invoice_file VARCHAR(255) DEFAULT 'Invoice.docx'",
    "credit_note_file VARCHAR(255) DEFAULT 'CreditNote.docx'",
    "dividend_file VARCHAR(255) DEFAULT 'Dividend.docx'",
    "quotation_file VARCHAR(255) DEFAULT 'Quotation.docx'",
    "updated_on VARCHAR(50) DEFAULT '-'",
    "bank_name VARCHAR(255) DEFAULT 'N/A'",
    "custom_dir VARCHAR(500) NULL",
  ];

  for (const col of cols) {
    try {
      await pool.query(`ALTER TABLE bookkeeping_invoice_templates ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (_) {}
  }

  // Check if at least one template exists for this practice/client
  const [existing]: any = await pool.query(
    `SELECT id FROM bookkeeping_invoice_templates WHERE practice_id = ? ${
      clientId ? "AND (client_id = ? OR client_id IS NULL)" : ""
    }`,
    clientId ? [practiceId, clientId] : [practiceId]
  );

  if (!existing || existing.length === 0) {
    await pool.query(
      `INSERT INTO bookkeeping_invoice_templates (
        practice_id, client_id, template_name, is_default,
        invoice_file, credit_note_file, dividend_file, quotation_file,
        updated_on, bank_name
      ) VALUES (?, ?, 'Default', 1, 'Invoice.docx', 'CreditNote.docx', 'Dividend.docx', 'Quotation.docx', '-', 'N/A')`,
      [practiceId, clientId || null]
    );
  }
}

/**
 * Format current UK date: DD/MM/YYYY
 */
function getUkDateString(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// 1. GET /api/bookkeeping/invoice-templates
// List invoice templates for practice or client
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;

    await ensureInvoiceTemplatesTable(practiceId, clientId);

    let query = "SELECT * FROM bookkeeping_invoice_templates WHERE practice_id = ?";
    const params: any[] = [practiceId];

    if (clientId) {
      query += " AND (client_id = ? OR client_id IS NULL)";
      params.push(clientId);
    }
    query += " ORDER BY is_default DESC, id ASC";

    const [rows]: any = await pool.query(query, params);

    // Also fetch available bank accounts for the bank dropdown
    let banks: string[] = ["N/A"];
    try {
      const [bankRows]: any = await pool.query(
        "SELECT bank_name FROM practice_banks WHERE practice_id = ? ORDER BY is_default DESC",
        [practiceId]
      );
      if (bankRows && bankRows.length > 0) {
        bankRows.forEach((b: any) => {
          if (b.bank_name && !banks.includes(b.bank_name)) {
            banks.push(b.bank_name);
          }
        });
      }
    } catch (_) {}

    // Check client bank accounts if clientId is provided
    if (clientId) {
      try {
        const [clientBankRows]: any = await pool.query(
          "SELECT bank_name, account_name FROM bookkeeping_bank_accounts WHERE client_id = ?",
          [clientId]
        );
        if (clientBankRows && clientBankRows.length > 0) {
          clientBankRows.forEach((b: any) => {
            const name = b.account_name || b.bank_name;
            if (name && !banks.includes(name)) {
              banks.push(name);
            }
          });
        }
      } catch (_) {}
    }

    const templates = (rows || []).map((row: any) => ({
      id: row.id,
      templateName: row.template_name,
      isDefault: Boolean(row.is_default),
      invoiceFile: row.invoice_file || "Invoice.docx",
      creditNoteFile: row.credit_note_file || "CreditNote.docx",
      dividendFile: row.dividend_file || "Dividend.docx",
      quotationFile: row.quotation_file || "Quotation.docx",
      updatedOn: row.updated_on || "-",
      bank: row.bank_name || "N/A",
    }));

    res.json({ templates, banks });
  } catch (error: any) {
    console.error("Error fetching invoice templates:", error);
    res.status(500).json({ message: "Failed to fetch invoice templates", error: error.message });
  }
});

// 2. POST /api/bookkeeping/invoice-templates
// Add or Edit template (Name, default bank, default status)
router.post("/", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { id, clientId, templateName, bankName = "N/A", isDefault = false } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ message: "Template name is required." });
    }

    await ensureInvoiceTemplatesTable(practiceId, clientId ? parseInt(clientId) : null);

    const parsedClientId = clientId ? parseInt(clientId) : null;

    if (isDefault) {
      // Unset other defaults
      if (parsedClientId) {
        await pool.query(
          "UPDATE bookkeeping_invoice_templates SET is_default = FALSE WHERE practice_id = ? AND client_id = ?",
          [practiceId, parsedClientId]
        );
      } else {
        await pool.query(
          "UPDATE bookkeeping_invoice_templates SET is_default = FALSE WHERE practice_id = ? AND client_id IS NULL",
          [practiceId]
        );
      }
    }

    if (id) {
      await pool.query(
        `UPDATE bookkeeping_invoice_templates SET
          template_name = ?,
          bank_name = ?,
          is_default = ?
        WHERE id = ? AND practice_id = ?`,
        [templateName.trim(), bankName || "N/A", isDefault ? 1 : 0, id, practiceId]
      );
      res.json({ message: "Invoice template updated successfully." });
    } else {
      await pool.query(
        `INSERT INTO bookkeeping_invoice_templates (
          practice_id, client_id, template_name, is_default,
          invoice_file, credit_note_file, dividend_file, quotation_file,
          updated_on, bank_name
        ) VALUES (?, ?, ?, ?, 'Invoice.docx', 'CreditNote.docx', 'Dividend.docx', 'Quotation.docx', '-', ?)`,
        [practiceId, parsedClientId, templateName.trim(), isDefault ? 1 : 0, bankName || "N/A"]
      );
      res.json({ message: "Invoice template added successfully." });
    }
  } catch (error: any) {
    console.error("Error saving invoice template:", error);
    res.status(500).json({ message: "Failed to save invoice template", error: error.message });
  }
});

// 3. GET /api/bookkeeping/invoice-templates/:id/download-zip
// Dynamically stream InvoiceTemplates_[CompanyName].zip containing the 4 Word documents
router.get("/:id/download-zip", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);
    const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;

    // Fetch company / client name for filename
    let companyName = "SanSuite";
    if (clientId) {
      try {
        const [clientRows]: any = await pool.query(
          "SELECT company_name, business_name FROM clients WHERE id = ?",
          [clientId]
        );
        if (clientRows && clientRows[0]) {
          companyName = clientRows[0].business_name || clientRows[0].company_name || "Company";
        }
      } catch (_) {}
    } else {
      try {
        const [practiceRows]: any = await pool.query(
          "SELECT practice_name FROM practices WHERE id = ?",
          [practiceId]
        );
        if (practiceRows && practiceRows[0]) {
          companyName = practiceRows[0].practice_name || "Practice";
        }
      } catch (_) {}
    }

    // Clean company name for filename
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, " ").trim().replace(/\s+/g, " ");
    const zipFilename = `InvoiceTemplates_${safeCompanyName}.zip`;

    // Fetch template record to see if custom directory exists
    const [tRows]: any = await pool.query(
      "SELECT * FROM bookkeeping_invoice_templates WHERE id = ? AND practice_id = ?",
      [templateId, practiceId]
    );
    const template = tRows?.[0];

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    const archive = new (ZipArchive as any)({ zlib: { level: 9 } });

    archive.on("error", (err: any) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).send({ error: err.message });
      }
    });

    archive.pipe(res);

    const filesToBundle = [
      { defaultName: "Invoice.docx", customField: template?.invoice_file },
      { defaultName: "CreditNote.docx", customField: template?.credit_note_file },
      { defaultName: "Dividend.docx", customField: template?.dividend_file },
      { defaultName: "Quotation.docx", customField: template?.quotation_file },
    ];

    for (const f of filesToBundle) {
      let filePath = "";
      if (template?.custom_dir) {
        const customCandidate = path.join(template.custom_dir, f.defaultName);
        if (fs.existsSync(customCandidate)) {
          filePath = customCandidate;
        }
      }
      if (!filePath) {
        filePath = path.join(MASTER_TEMPLATES_DIR, f.defaultName);
      }

      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: f.defaultName });
      } else {
        console.warn(`Template file missing at ${filePath}`);
      }
    }

    await archive.finalize();
  } catch (error: any) {
    console.error("Error downloading templates zip:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to create templates zip", error: error.message });
    }
  }
});

// 4. POST /api/bookkeeping/invoice-templates/:id/upload
// Upload modified .docx or .zip template file
router.post("/:id/upload", upload.single("file"), async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);

    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const uploadedFilePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const updatedOnDate = getUkDateString();

    // Create a unique folder for this template's custom files
    const templateCustomDir = path.join(UPLOAD_DIR, `template-${templateId}`);
    if (!fs.existsSync(templateCustomDir)) {
      fs.mkdirSync(templateCustomDir, { recursive: true });
    }

    let invoiceFile = "Invoice.docx";
    let creditNoteFile = "CreditNote.docx";
    let dividendFile = "Dividend.docx";
    let quotationFile = "Quotation.docx";

    if (ext === ".docx" || ext === ".doc") {
      // Determine which file type was uploaded
      const lowerName = originalName.toLowerCase();
      let targetName = "Invoice.docx";
      if (lowerName.includes("credit")) {
        targetName = "CreditNote.docx";
        creditNoteFile = originalName;
      } else if (lowerName.includes("dividend")) {
        targetName = "Dividend.docx";
        dividendFile = originalName;
      } else if (lowerName.includes("quote") || lowerName.includes("quotation")) {
        targetName = "Quotation.docx";
        quotationFile = originalName;
      } else {
        targetName = "Invoice.docx";
        invoiceFile = originalName;
      }

      const destPath = path.join(templateCustomDir, targetName);
      fs.copyFileSync(uploadedFilePath, destPath);
    } else if (ext === ".zip") {
      // Save original zip file as template backup
      const destZip = path.join(templateCustomDir, "bundle.zip");
      fs.copyFileSync(uploadedFilePath, destZip);

      // Extract all Word .docx files inside the zip directly into templateCustomDir
      try {
        const zipData = fs.readFileSync(uploadedFilePath);
        const zip = await JSZip.loadAsync(zipData);
        for (const [relPath, fileEntry] of Object.entries(zip.files)) {
          if (!fileEntry.dir) {
            const baseName = path.basename(relPath);
            const lower = baseName.toLowerCase();
            let targetName = baseName;
            if (lower.includes("credit")) targetName = "CreditNote.docx";
            else if (lower.includes("dividend")) targetName = "Dividend.docx";
            else if (lower.includes("quote") || lower.includes("quotation")) targetName = "Quotation.docx";
            else if (lower.includes("invoice")) targetName = "Invoice.docx";

            if (targetName.endsWith(".docx")) {
              const fileBuffer = await fileEntry.async("nodebuffer");
              fs.writeFileSync(path.join(templateCustomDir, targetName), fileBuffer);
            }
          }
        }
      } catch (zipErr) {
        console.error("Error extracting uploaded zip bundle:", zipErr);
      }
    }

    // Clean up temporary upload file
    try {
      fs.unlinkSync(uploadedFilePath);
    } catch (_) {}

    // Update database record
    await pool.query(
      `UPDATE bookkeeping_invoice_templates SET
        updated_on = ?,
        custom_dir = ?
      WHERE id = ? AND practice_id = ?`,
      [updatedOnDate, templateCustomDir, templateId, practiceId]
    );

    res.json({
      message: `Template "${originalName}" uploaded successfully.`,
      updatedOn: updatedOnDate,
    });
  } catch (error: any) {
    console.error("Error uploading template file:", error);
    res.status(500).json({ message: "Failed to upload template file", error: error.message });
  }
});

// 5. POST /api/bookkeeping/invoice-templates/:id/reset
// Reset template back to authentic Capium defaults
router.post("/:id/reset", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);

    // Fetch custom_dir to remove if exists
    const [rows]: any = await pool.query(
      "SELECT custom_dir FROM bookkeeping_invoice_templates WHERE id = ? AND practice_id = ?",
      [templateId, practiceId]
    );

    if (rows?.[0]?.custom_dir && fs.existsSync(rows[0].custom_dir)) {
      try {
        fs.rmSync(rows[0].custom_dir, { recursive: true, force: true });
      } catch (_) {}
    }

    await pool.query(
      `UPDATE bookkeeping_invoice_templates SET
        invoice_file = 'Invoice.docx',
        credit_note_file = 'CreditNote.docx',
        dividend_file = 'Dividend.docx',
        quotation_file = 'Quotation.docx',
        updated_on = '-',
        custom_dir = NULL
      WHERE id = ? AND practice_id = ?`,
      [templateId, practiceId]
    );

    res.json({ message: "Template successfully reset to standard SanSuite defaults." });
  } catch (error: any) {
    console.error("Error resetting template:", error);
    res.status(500).json({ message: "Failed to reset template", error: error.message });
  }
});

// 6. DELETE /api/bookkeeping/invoice-templates/:id
// Delete non-default template
router.delete("/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);

    const [rows]: any = await pool.query(
      "SELECT is_default, custom_dir FROM bookkeeping_invoice_templates WHERE id = ? AND practice_id = ?",
      [templateId, practiceId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Template not found." });
    }

    if (rows[0].is_default) {
      return res.status(400).json({ message: "Cannot delete the default template. Please designate another default first." });
    }

    if (rows[0].custom_dir && fs.existsSync(rows[0].custom_dir)) {
      try {
        fs.rmSync(rows[0].custom_dir, { recursive: true, force: true });
      } catch (_) {}
    }

    await pool.query("DELETE FROM bookkeeping_invoice_templates WHERE id = ? AND practice_id = ?", [
      templateId,
      practiceId,
    ]);

    res.json({ message: "Invoice template deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template", error: error.message });
  }
});

export default router;
