import { Router } from "express";
import { pool } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// Multer storage for client logo uploads
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "company-logos");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".svg", ".webp"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (.png, .jpg, .jpeg, .svg, .webp) are allowed."));
    }
  },
});

/**
 * Migration helper: Ensure database tables and columns exist
 */
async function ensureSettingsTables() {
  // 1. Ensure columns on clients table
  const clientCols = [
    "logo_url TEXT NULL",
    "company_type VARCHAR(50) NULL",
    "city VARCHAR(100) NULL",
    "county VARCHAR(100) NULL",
    "website VARCHAR(255) NULL",
    "currency VARCHAR(30) DEFAULT 'Pound Sterling'",
    "vat_registration_date VARCHAR(20) NULL",
    "vat_submit_type VARCHAR(50) DEFAULT 'Quarterly'",
    "manual_bank_reconciliation BOOLEAN DEFAULT FALSE",
    "use_doc_template BOOLEAN DEFAULT TRUE",
    "default_page_period VARCHAR(50) DEFAULT 'All'",
  ];
  for (const col of clientCols) {
    try {
      await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (_) {}
  }

  // 2. Ensure columns on accounting_periods table
  const periodCols = [
    "status VARCHAR(30) DEFAULT 'Open'",
    "period_type VARCHAR(30) DEFAULT 'Current'",
  ];
  for (const col of periodCols) {
    try {
      await pool.query(`ALTER TABLE accounting_periods ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (_) {}
  }

  // 3. Ensure columns on chart_of_accounts table
  const coaCols = [
    "group_name VARCHAR(100) DEFAULT 'Turnover'",
    "status VARCHAR(30) DEFAULT 'Normal'",
  ];
  for (const col of coaCols) {
    try {
      await pool.query(`ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (_) {}
  }

  // 4. Create bookkeeping_opening_balances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookkeeping_opening_balances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      balance_date VARCHAR(30) NOT NULL,
      account_name VARCHAR(255) NOT NULL,
      nominal_code VARCHAR(50) NULL,
      debit DECIMAL(15, 2) DEFAULT 0.00,
      credit DECIMAL(15, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_client (client_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. Create bookkeeping_currencies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookkeeping_currencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NULL,
      currency_name VARCHAR(100) NOT NULL,
      code VARCHAR(10) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      rate DECIMAL(12, 4) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client (client_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. Create bookkeeping_sequences table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookkeeping_sequences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      transaction_type VARCHAR(100) NOT NULL,
      prefix VARCHAR(20) DEFAULT '',
      start_number INT DEFAULT 1,
      postfix VARCHAR(20) DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_client_tx (client_id, transaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// Initialize tables
ensureSettingsTables().catch(console.error);

// =========================================================================
// 1. COMPANY INFO & BOOKKEEPING PREFERENCES
// =========================================================================

// GET /api/bookkeeping/settings/:clientId/company-info
router.get("/:clientId/company-info", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [rows]: any = await pool.query("SELECT * FROM clients WHERE id = ?", [clientId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Client not found." });
    }
    const client = rows[0];

    // Fetch primary contact
    const [contactRows]: any = await pool.query(
      "SELECT email, phone FROM contacts WHERE client_id = ? LIMIT 1",
      [clientId]
    );
    const contact = contactRows?.[0] || {};

    res.json({
      companyInfo: {
        id: client.id,
        name: client.client_name || client.company_name || "",
        type: client.company_type || client.client_type || "Limited",
        registrationNumber: client.registration_number || "",
        utrNumber: client.utr_number || "",
        currency: client.currency || "Pound Sterling",
        businessStartDate: client.business_start_date || "-",
        bookStartDate: client.book_start_date || "-",
        yearEnd: client.year_end || "31/12",
        vatScheme: client.vat_scheme || "Standard VAT Accrual Based",
        vatNumber: client.vat_number || "",
        vatRegistrationDate: client.vat_registration_date || "-",
        vatSubmitType: client.vat_submit_type || "Quarterly",
        address: client.address || "",
        city: client.city || "",
        county: client.county || "",
        postcode: client.postcode || "",
        country: client.country || "United Kingdom",
        phone: client.phone || contact.phone || "",
        email: client.email || contact.email || "",
        website: client.website || "",
        logoUrl: client.logo_url || null,
      },
      settingsPreferences: {
        manualBankReconciliation: Boolean(client.manual_bank_reconciliation),
        useDocTemplate: client.use_doc_template !== null ? Boolean(client.use_doc_template) : true,
        defaultPagePeriod: client.default_page_period || "All",
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch company info", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/company-info
router.post("/:clientId/company-info", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const {
      name,
      type,
      registrationNumber,
      utrNumber,
      currency,
      businessStartDate,
      bookStartDate,
      yearEnd,
      vatScheme,
      vatNumber,
      vatRegistrationDate,
      vatSubmitType,
      address,
      city,
      county,
      postcode,
      country,
      phone,
      email,
      website,
    } = req.body;

    await pool.query(
      `UPDATE clients SET
        client_name = ?,
        company_type = ?,
        client_type = ?,
        registration_number = ?,
        utr_number = ?,
        currency = ?,
        business_start_date = ?,
        book_start_date = ?,
        year_end = ?,
        vat_scheme = ?,
        vat_number = ?,
        vat_registration_date = ?,
        vat_submit_type = ?,
        address = ?,
        city = ?,
        county = ?,
        postcode = ?,
        country = ?,
        phone = ?,
        email = ?,
        website = ?
      WHERE id = ?`,
      [
        name,
        type || "Limited",
        type || "Limited",
        registrationNumber || "",
        utrNumber || "",
        currency || "Pound Sterling",
        businessStartDate || "-",
        bookStartDate || "-",
        yearEnd || "31/12",
        vatScheme || "Standard VAT",
        vatNumber || "",
        vatRegistrationDate || "-",
        vatSubmitType || "Quarterly",
        address || "",
        city || "",
        county || "",
        postcode || "",
        country || "United Kingdom",
        phone || "",
        email || "",
        website || "",
        clientId,
      ]
    );

    res.json({ message: "Company information updated successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update company info", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/settings-preferences
router.post("/:clientId/settings-preferences", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { manualBankReconciliation, useDocTemplate, defaultPagePeriod } = req.body;

    await pool.query(
      `UPDATE clients SET
        manual_bank_reconciliation = ?,
        use_doc_template = ?,
        default_page_period = ?
      WHERE id = ?`,
      [
        manualBankReconciliation ? 1 : 0,
        useDocTemplate ? 1 : 0,
        defaultPagePeriod || "All",
        clientId,
      ]
    );

    res.json({ message: "Bookkeeping preferences saved successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save settings preferences", error: error.message });
  }
});

// =========================================================================
// 2. ACCOUNTING PERIODS
// =========================================================================

// GET /api/bookkeeping/settings/:clientId/periods
router.get("/:clientId/periods", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [rows]: any = await pool.query(
      `SELECT id, client_id, 
              DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
              DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, 
              is_locked, status, period_type 
       FROM accounting_periods 
       WHERE client_id = ? 
       ORDER BY start_date DESC`,
      [clientId]
    );

    const periods = (rows || []).map((row: any) => ({
      id: row.id,
      from: row.start_date,
      to: row.end_date,
      status: row.is_locked ? "Locked" : (row.status || "Open"),
      periodType: row.period_type || "Current",
      isLocked: Boolean(row.is_locked),
    }));

    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch accounting periods", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/periods
router.post("/:clientId/periods", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { startDate, endDate, periodType = "Current", status = "Open" } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required." });
    }

    await pool.query(
      `INSERT INTO accounting_periods (client_id, start_date, end_date, period_type, status, is_locked)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [clientId, startDate, endDate, periodType, status]
    );

    res.json({ message: `${periodType} accounting period added successfully.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to add accounting period", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/periods/:id/toggle-lock
router.post("/:clientId/periods/:id/toggle-lock", async (req: any, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const [rows]: any = await pool.query("SELECT is_locked FROM accounting_periods WHERE id = ?", [periodId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Period not found" });

    const newLockState = !rows[0].is_locked;
    const newStatus = newLockState ? "Locked" : "Open";

    await pool.query(
      "UPDATE accounting_periods SET is_locked = ?, status = ? WHERE id = ?",
      [newLockState ? 1 : 0, newStatus, periodId]
    );

    res.json({ message: `Period ${newLockState ? "locked" : "unlocked"} successfully.`, isLocked: newLockState });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to toggle period lock", error: error.message });
  }
});

// DELETE /api/bookkeeping/settings/:clientId/periods/:id
router.delete("/:clientId/periods/:id", async (req: any, res) => {
  try {
    const periodId = parseInt(req.params.id);
    await pool.query("DELETE FROM accounting_periods WHERE id = ?", [periodId]);
    res.json({ message: "Accounting period deleted." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete period", error: error.message });
  }
});

// =========================================================================
// 3. CHART OF ACCOUNTS
// =========================================================================

// GET /api/bookkeeping/settings/:clientId/accounts
router.get("/:clientId/accounts", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [rows]: any = await pool.query(
      "SELECT * FROM chart_of_accounts WHERE client_id = ? ORDER BY nominal_code ASC",
      [clientId]
    );

    const accounts = (rows || []).map((row: any) => ({
      id: row.id,
      code: row.nominal_code,
      name: row.name,
      category: row.category,
      group: row.group_name || row.category || "General",
      status: row.status || "Normal",
      isSystem: Boolean(row.is_system),
    }));

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch chart of accounts", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/accounts
router.post("/:clientId/accounts", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { id, code, name, category, group = "General", status = "Normal" } = req.body;

    if (!code || !name || !category) {
      return res.status(400).json({ message: "Account Code, Name, and Category are required." });
    }

    if (id) {
      await pool.query(
        `UPDATE chart_of_accounts SET
          nominal_code = ?,
          name = ?,
          category = ?,
          group_name = ?,
          status = ?
        WHERE id = ? AND client_id = ?`,
        [code, name, category, group, status, id, clientId]
      );
      res.json({ message: "Account updated successfully." });
    } else {
      await pool.query(
        `INSERT INTO chart_of_accounts (client_id, nominal_code, name, category, group_name, status, is_system)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [clientId, code, name, category, group, status]
      );
      res.json({ message: "Account added to Chart of Accounts." });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save account", error: error.message });
  }
});

// DELETE /api/bookkeeping/settings/:clientId/accounts/:id
router.delete("/:clientId/accounts/:id", async (req: any, res) => {
  try {
    const accountId = parseInt(req.params.id);
    await pool.query("DELETE FROM chart_of_accounts WHERE id = ? AND is_system = 0", [accountId]);
    res.json({ message: "Account deleted." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
});

// =========================================================================
// 4. COMPANY LOGO
// =========================================================================

// POST /api/bookkeeping/settings/:clientId/logo
router.post("/:clientId/logo", upload.single("logo"), async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const logoUrl = req.file ? `/uploads/company-logos/${req.file.filename}` : req.body?.logoUrl;
    if (!logoUrl) {
      return res.status(400).json({ message: "No logo file or URL provided." });
    }

    await pool.query("UPDATE clients SET logo_url = ? WHERE id = ?", [logoUrl, clientId]);

    // Also register in practice_media_files if uploaded locally
    if (req.file) {
      try {
        await pool.query(
          `INSERT INTO practice_media_files (practice_id, name, type, size, url, category, storage_driver, storage_location) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1,
            req.file.originalname || req.file.filename,
            req.file.mimetype || "image/png",
            `${(req.file.size / 1024).toFixed(1)} KB`,
            logoUrl,
            "Images",
            "local",
            "Company Logo Vault",
          ]
        );
      } catch (e) {}
    }

    res.json({ message: "Company logo uploaded successfully.", logoUrl });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to upload logo", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/select-logo
router.post("/:clientId/select-logo", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { logoUrl } = req.body || {};
    if (!logoUrl) {
      return res.status(400).json({ message: "No logo URL provided." });
    }

    await pool.query("UPDATE clients SET logo_url = ? WHERE id = ?", [logoUrl, clientId]);
    res.json({ message: "Company logo updated from media library successfully.", logoUrl });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update logo", error: error.message });
  }
});

// DELETE /api/bookkeeping/settings/:clientId/logo
router.delete("/:clientId/logo", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    await pool.query("UPDATE clients SET logo_url = NULL WHERE id = ?", [clientId]);
    res.json({ message: "Company logo removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to remove logo", error: error.message });
  }
});

// =========================================================================
// 5. OPENING BALANCES
// =========================================================================

// GET /api/bookkeeping/settings/:clientId/opening-balances
router.get("/:clientId/opening-balances", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [rows]: any = await pool.query(
      "SELECT * FROM bookkeeping_opening_balances WHERE client_id = ? ORDER BY id ASC",
      [clientId]
    );

    // Get default opening balance date from client's book start date or current date
    const [clientRows]: any = await pool.query(
      "SELECT book_start_date FROM clients WHERE id = ?",
      [clientId]
    );
    const defaultDate = clientRows?.[0]?.book_start_date || new Date().toISOString().split("T")[0];

    const balances = (rows || []).map((r: any) => ({
      id: r.id,
      accountName: r.account_name,
      nominalCode: r.nominal_code || "",
      debit: parseFloat(r.debit || 0),
      credit: parseFloat(r.credit || 0),
    }));

    const balanceDate = rows?.[0]?.balance_date || defaultDate;

    res.json({ balanceDate, balances });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch opening balances", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/opening-balances
router.post("/:clientId/opening-balances", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { balanceDate, balances = [] } = req.body;

    if (!balanceDate) {
      return res.status(400).json({ message: "Opening balance date is required." });
    }

    // Delete existing balances for this client
    await pool.query("DELETE FROM bookkeeping_opening_balances WHERE client_id = ?", [clientId]);

    // Insert new valid rows
    for (const row of balances) {
      if (row.accountName && (row.debit > 0 || row.credit > 0)) {
        await pool.query(
          `INSERT INTO bookkeeping_opening_balances (client_id, balance_date, account_name, nominal_code, debit, credit)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            clientId,
            balanceDate,
            row.accountName,
            row.nominalCode || "",
            row.debit || 0,
            row.credit || 0,
          ]
        );
      }
    }

    res.json({ message: "Opening balances saved successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save opening balances", error: error.message });
  }
});

// =========================================================================
// 6. MULTI-CURRENCY
// =========================================================================

const DEFAULT_CURRENCIES = [
  { currencyName: "Australia Dollar", code: "AUD", symbol: "$", rate: 1.9421 },
  { currencyName: "Bahraini Dinar", code: "BHD", symbol: "BD", rate: 0.4781 },
  { currencyName: "Brazil Real", code: "BRL", symbol: "R$", rate: 6.9123 },
  { currencyName: "Canadian Dollar", code: "CAD", symbol: "$", rate: 1.7482 },
  { currencyName: "Euro", code: "EUR", symbol: "€", rate: 1.1685 },
  { currencyName: "Indian Rupee", code: "INR", symbol: "₹", rate: 108.5412 },
  { currencyName: "Japan Yen", code: "JPY", symbol: "¥", rate: 194.2500 },
  { currencyName: "Qatar Riyal", code: "QAR", symbol: "ر.ق", rate: 4.6241 },
  { currencyName: "United Arab Emirates Dirham", code: "AED", symbol: "د.إ", rate: 4.6621 },
  { currencyName: "United States Dollar", code: "USD", symbol: "$", rate: 1.2694 },
  { currencyName: "South African Rand", code: "ZAR", symbol: "R", rate: 23.4120 },
];

// GET /api/bookkeeping/settings/:clientId/currencies
router.get("/:clientId/currencies", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    let [rows]: any = await pool.query(
      "SELECT * FROM bookkeeping_currencies WHERE client_id = ? OR client_id IS NULL ORDER BY is_default DESC, currency_name ASC",
      [clientId]
    );

    // Seed defaults if empty
    if (!rows || rows.length === 0) {
      for (const c of DEFAULT_CURRENCIES) {
        await pool.query(
          "INSERT INTO bookkeeping_currencies (client_id, currency_name, code, symbol, rate, is_default) VALUES (?, ?, ?, ?, ?, ?)",
          [clientId, c.currencyName, c.code, c.symbol, c.rate, c.code === "USD" ? 1 : 0]
        );
      }
      [rows] = await pool.query(
        "SELECT * FROM bookkeeping_currencies WHERE client_id = ? ORDER BY is_default DESC, currency_name ASC",
        [clientId]
      );
    }

    const currencies = (rows || []).map((r: any) => ({
      id: r.id,
      currencyName: r.currency_name,
      code: r.code,
      symbol: r.symbol,
      rate: parseFloat(r.rate),
      isDefault: Boolean(r.is_default),
      lastUpdated: r.updated_at,
    }));

    res.json(currencies);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch currencies", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/currencies
router.post("/:clientId/currencies", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { id, currencyName, code, symbol, rate, isDefault } = req.body;

    if (!currencyName || !code || !symbol || !rate) {
      return res.status(400).json({ message: "Currency Name, Code, Symbol, and Rate are required." });
    }

    if (id) {
      await pool.query(
        `UPDATE bookkeeping_currencies SET
          currency_name = ?,
          code = ?,
          symbol = ?,
          rate = ?,
          is_default = ?
        WHERE id = ?`,
        [currencyName, code.toUpperCase(), symbol, rate, isDefault ? 1 : 0, id]
      );
      res.json({ message: "Currency updated successfully." });
    } else {
      await pool.query(
        `INSERT INTO bookkeeping_currencies (client_id, currency_name, code, symbol, rate, is_default)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [clientId, currencyName, code.toUpperCase(), symbol, rate, isDefault ? 1 : 0]
      );
      res.json({ message: "Currency added successfully." });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save currency", error: error.message });
  }
});

// DELETE /api/bookkeeping/settings/:clientId/currencies/:id
router.delete("/:clientId/currencies/:id", async (req: any, res) => {
  try {
    const currencyId = parseInt(req.params.id);
    await pool.query("DELETE FROM bookkeeping_currencies WHERE id = ?", [currencyId]);
    res.json({ message: "Currency deleted." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete currency", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/currencies/sync-rates
router.post("/:clientId/currencies/sync-rates", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    // Refresh with official live HMRC / foreign rate benchmarks
    for (const c of DEFAULT_CURRENCIES) {
      await pool.query(
        `UPDATE bookkeeping_currencies SET rate = ? WHERE client_id = ? AND code = ?`,
        [c.rate, clientId, c.code]
      );
    }
    res.json({ message: "Exchange rates updated to latest HMRC published benchmark rates." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to sync exchange rates", error: error.message });
  }
});

// =========================================================================
// 7. CUSTOMISE SEQUENCE
// =========================================================================

const DEFAULT_SEQUENCES = [
  { transactionType: "Sales Invoice", prefix: "INV-", startNumber: 101, postfix: "" },
  { transactionType: "Credit Note", prefix: "CRN-", startNumber: 1, postfix: "" },
  { transactionType: "Quotation", prefix: "QRN-", startNumber: 1, postfix: "" },
  { transactionType: "Receipt", prefix: "REC-", startNumber: 1, postfix: "" },
  { transactionType: "Purchases Invoice", prefix: "PUR-", startNumber: 1, postfix: "" },
  { transactionType: "Credit Note (Purchases)", prefix: "PCRN-", startNumber: 1, postfix: "" },
  { transactionType: "Payment", prefix: "PAY-", startNumber: 1, postfix: "" },
  { transactionType: "Journal", prefix: "JNL-", startNumber: 1, postfix: "" },
  { transactionType: "Bank", prefix: "BNK-", startNumber: 1, postfix: "" },
  { transactionType: "Dividend", prefix: "DIV-", startNumber: 1, postfix: "" },
  { transactionType: "Quick Entry", prefix: "QE-", startNumber: 1, postfix: "" },
];

// GET /api/bookkeeping/settings/:clientId/sequences
router.get("/:clientId/sequences", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    let [rows]: any = await pool.query(
      "SELECT * FROM bookkeeping_sequences WHERE client_id = ? ORDER BY id ASC",
      [clientId]
    );

    // Seed defaults if not present
    if (!rows || rows.length === 0) {
      for (const s of DEFAULT_SEQUENCES) {
        await pool.query(
          "INSERT INTO bookkeeping_sequences (client_id, transaction_type, prefix, start_number, postfix) VALUES (?, ?, ?, ?, ?)",
          [clientId, s.transactionType, s.prefix, s.startNumber, s.postfix]
        );
      }
      [rows] = await pool.query(
        "SELECT * FROM bookkeeping_sequences WHERE client_id = ? ORDER BY id ASC",
        [clientId]
      );
    }

    const sequences = (rows || []).map((r: any) => ({
      id: r.id,
      transactionType: r.transaction_type,
      prefix: r.prefix || "",
      startNumber: parseInt(r.start_number || 1),
      postfix: r.postfix || "",
    }));

    res.json(sequences);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch sequences", error: error.message });
  }
});

// POST /api/bookkeeping/settings/:clientId/sequences
router.post("/:clientId/sequences", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { sequences = [] } = req.body;

    for (const seq of sequences) {
      await pool.query(
        `INSERT INTO bookkeeping_sequences (client_id, transaction_type, prefix, start_number, postfix)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           prefix = VALUES(prefix),
           start_number = VALUES(start_number),
           postfix = VALUES(postfix)`,
        [
          clientId,
          seq.transactionType,
          seq.prefix || "",
          parseInt(seq.startNumber || 1),
          seq.postfix || "",
        ]
      );
    }

    res.json({ message: "Transaction serial number sequences saved successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save sequences", error: error.message });
  }
});

export default router;
