import { Router } from "express";
import { db, pool } from "../db";
import path from "path";
import fs from "fs";
// @ts-ignore
import { ZipArchive } from "archiver";
import {
  practiceServices,
  clientServiceAssignments,
  practiceCustomFields,
  practiceEmailTemplates,
  practiceDocumentTemplates,
  practiceInvoiceTemplates,
  practiceOnboardingCriteria,
  practiceRiskCriteria,
  clients,
  users,
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// =========================================================================
// TABLE CREATION & INITIAL SEEDING FOR DATABASE PERSISTENCE
// =========================================================================
let isDbInitialized = false;

async function ensureTablesAndSeed(practiceId: number) {
  if (isDbInitialized) return;

  try {
    // 1. Create Practice Services Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Accounting',
        frequency VARCHAR(50) DEFAULT 'Yearly',
        billable BOOLEAN DEFAULT TRUE,
        fee DECIMAL(10, 2) DEFAULT 35.00,
        estimated_hours DECIMAL(6, 2) DEFAULT 4.00,
        service_manager VARCHAR(100) DEFAULT 'Suleman Shah',
        service_type VARCHAR(50) DEFAULT 'Default',
        is_active BOOLEAN DEFAULT TRUE,
        add_to_calendar BOOLEAN DEFAULT TRUE,
        client_types_json TEXT,
        steps_json TEXT,
        remind_team BOOLEAN DEFAULT TRUE,
        assign_all BOOLEAN DEFAULT TRUE,
        custom_workflow BOOLEAN DEFAULT FALSE,
        reminders_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create Client Service Assignments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_service_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        client_id INT NOT NULL,
        service_id INT NOT NULL,
        custom_fee DECIMAL(10, 2) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create Practice Custom Fields Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_custom_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'Text',
        options TEXT NULL,
        required BOOLEAN DEFAULT FALSE,
        sequence INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Create Practice Email Templates Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        trigger_days INT DEFAULT 14,
        body TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Create Practice Document Templates Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_document_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        version VARCHAR(50) DEFAULT '2026.1',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Create Practice Invoice Templates Table (Article 9000222508 & 9000172239)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_invoice_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        template_type VARCHAR(50) DEFAULT 'PDF',
        primary_color VARCHAR(30) DEFAULT '#10b981',
        logo_url TEXT NULL,
        header_text TEXT NULL,
        footer_text TEXT NULL,
        payment_terms TEXT NULL,
        page_size VARCHAR(20) DEFAULT 'A4',
        title_invoice VARCHAR(100) DEFAULT 'Invoice',
        title_draft VARCHAR(100) DEFAULT 'Draft Invoice',
        title_credit_note VARCHAR(100) DEFAULT 'Credit Note',
        title_paid VARCHAR(100) DEFAULT 'Invoice',
        margin_top INT DEFAULT 25,
        margin_bottom INT DEFAULT 25,
        margin_left INT DEFAULT 25,
        margin_right INT DEFAULT 25,
        footer_height INT DEFAULT 40,
        vat_reg_no BOOLEAN DEFAULT TRUE,
        company_reg_no BOOLEAN DEFAULT TRUE,
        bank_name VARCHAR(255) NULL,
        account_name VARCHAR(255) NULL,
        sort_code VARCHAR(20) NULL,
        account_number VARCHAR(50) NULL,
        iban VARCHAR(50) NULL,
        bic_swift VARCHAR(50) NULL,
        payment_instructions TEXT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure all Capium statutory columns exist on existing tables
    const invoiceCols = [
      "page_size VARCHAR(20) DEFAULT 'A4'",
      "title_invoice VARCHAR(100) DEFAULT 'Invoice'",
      "title_draft VARCHAR(100) DEFAULT 'Draft Invoice'",
      "title_credit_note VARCHAR(100) DEFAULT 'Credit Note'",
      "title_paid VARCHAR(100) DEFAULT 'Invoice'",
      "margin_top INT DEFAULT 25",
      "margin_bottom INT DEFAULT 25",
      "margin_left INT DEFAULT 25",
      "margin_right INT DEFAULT 25",
      "footer_height INT DEFAULT 40",
      "vat_reg_no BOOLEAN DEFAULT TRUE",
      "company_reg_no BOOLEAN DEFAULT TRUE"
    ];
    for (const col of invoiceCols) {
      try {
        await pool.query(`ALTER TABLE practice_invoice_templates ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (_) {}
    }


    // 6b. Create Practice Banks Table (Article 9000172239)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) DEFAULT 'Current',
        currency VARCHAR(50) DEFAULT 'Pound Sterling',
        account_code VARCHAR(50) DEFAULT '5242',
        sort_code VARCHAR(50) DEFAULT '20-00-00',
        account_number VARCHAR(50) DEFAULT '88776655',
        iban VARCHAR(100) NULL,
        bic_swift VARCHAR(50) NULL,
        payment_instructions TEXT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6c. Create Practice Doc Invoice Templates Table (Article 9000195170 & 9000222508)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_doc_invoice_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        file_name VARCHAR(255) DEFAULT 'Invoice.docx',
        file_size VARCHAR(50) DEFAULT '27.9 KB',
        bank_name VARCHAR(255) DEFAULT 'N/A',
        updated_on VARCHAR(50) DEFAULT '-',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure 4 docx file columns exist
    const docInvoiceCols = [
      "invoice_file VARCHAR(255) DEFAULT 'Invoice.docx'",
      "credit_note_file VARCHAR(255) DEFAULT 'CreditNote.docx'",
      "dividend_file VARCHAR(255) DEFAULT 'Dividend.docx'",
      "quotation_file VARCHAR(255) DEFAULT 'Quotation.docx'",
    ];
    for (const col of docInvoiceCols) {
      try {
        await pool.query(`ALTER TABLE practice_doc_invoice_templates ADD COLUMN IF NOT EXISTS ${col}`);
      } catch (_) {}
    }

    // 7. Create Practice Onboarding Criteria Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_onboarding_criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        is_required BOOLEAN DEFAULT TRUE,
        sequence INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Create Practice Risk Criteria Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_risk_criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Client Risk',
        risk_weight VARCHAR(20) DEFAULT 'Medium',
        risk_level VARCHAR(30) DEFAULT 'Normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // =========================================================================
    // SEED INITIAL DATABASE DATA IF EMPTY
    // =========================================================================

    // A. Seed 14 Standard Services
    const [existingServices]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_services WHERE practice_id = ?",
      [practiceId]
    );

    if (existingServices[0]?.count === 0) {
      const defaultServices = [
        {
          title: "Company Tax Return",
          category: "Taxation",
          frequency: "Yearly",
          billable: 1,
          fee: 35.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Charity"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Obtain Final Accounts", isMandatory: true },
            { id: "s2", title: "Client Approval", isMandatory: true },
            { id: "s3", title: "Prepare Tax Return", isMandatory: true },
            { id: "s4", title: "File Tax Return", isMandatory: true },
            { id: "s5", title: "Completion", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
            { id: "r2", timing: "2 Weeks prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
            { id: "r3", timing: "5 Days prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Self-Assessment",
          category: "Taxation",
          frequency: "Yearly",
          billable: 1,
          fee: 25.0,
          estimated_hours: 2.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Sole Trader", "Individual", "Partnership"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Collate Income & Bank Records", isMandatory: true },
            { id: "s2", title: "Draft Self Assessment Calculation", isMandatory: true },
            { id: "s3", title: "Partner Quality Review", isMandatory: true },
            { id: "s4", title: "Client Authorisation via Portal", isMandatory: true },
            { id: "s5", title: "HMRC Gateway Electronic Submission", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
            { id: "r2", timing: "2 Weeks prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Company Accounts",
          category: "Accounting",
          frequency: "Yearly",
          billable: 1,
          fee: 45.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "LLP"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Accounting Records Audit", isMandatory: true },
            { id: "s2", title: "Trial Balance & Year-End Reconciliations", isMandatory: true },
            { id: "s3", title: "Draft FRS 102/105 Statutory Accounts", isMandatory: true },
            { id: "s4", title: "Director Sign-Off via Capisign", isMandatory: true },
            { id: "s5", title: "Companies House iXBRL Submission", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Confirmation Statement",
          category: "Secretarial",
          frequency: "Yearly",
          billable: 1,
          fee: 15.0,
          estimated_hours: 0.25,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "LLP"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Check Company Officers & Directors", isMandatory: true },
            { id: "s2", title: "Check Persons with Significant Control (PSC)", isMandatory: true },
            { id: "s3", title: "Verify SIC Industry Codes", isMandatory: true },
            { id: "s4", title: "Verify Share Capital Structure", isMandatory: true },
            { id: "s5", title: "Verify Registered Office Address", isMandatory: true },
            { id: "s6", title: "Client Confirmation Request", isMandatory: true },
            { id: "s7", title: "Generate CS01 Electronic Filing", isMandatory: true },
            { id: "s8", title: "Submit to Companies House Gateway", isMandatory: true },
            { id: "s9", title: "Record Filing Acceptance Confirmation", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "2 Weeks prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Payroll",
          category: "Payroll",
          frequency: "Monthly",
          billable: 1,
          fee: 20.0,
          estimated_hours: 1.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Sole Trader", "Partnership", "LLP", "Charity"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Collate Monthly Timesheets & Adjustments", isMandatory: true },
            { id: "s2", title: "Process Payroll Calculations & Deductions", isMandatory: true },
            { id: "s3", title: "Publish Payslips to Employee Portal", isMandatory: true },
            { id: "s4", title: "Submit RTI Full Payment Submission (FPS) to HMRC", isMandatory: true },
            { id: "s5", title: "Pension Contribution Assessment & Filing", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "5 Days prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "VAT Return",
          category: "VAT",
          frequency: "Quarterly",
          billable: 1,
          fee: 30.0,
          estimated_hours: 2.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Sole Trader", "Partnership", "LLP", "Charity"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Collate Sales & Purchase Ledger Invoices", isMandatory: true },
            { id: "s2", title: "Reconcile VAT Control Account", isMandatory: true },
            { id: "s3", title: "Generate Boxes 1 to 9 Summary", isMandatory: true },
            { id: "s4", title: "Client Review & Authorisation", isMandatory: true },
            { id: "s5", title: "HMRC Making Tax Digital (MTD) Gateway Submission", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "2 Weeks prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Trust Tax Return",
          category: "Taxation",
          frequency: "Yearly",
          billable: 1,
          fee: 50.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Trust"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Collate Trust Deeds & Bank Statements", isMandatory: true },
            { id: "s2", title: "Prepare Form SA900 Trust Return", isMandatory: true },
            { id: "s3", title: "Calculate Beneficiary Income Allocations", isMandatory: true },
            { id: "s4", title: "Trustee Approval & Signature", isMandatory: true },
            { id: "s5", title: "Electronic Submission to HMRC", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Partnership Tax Return",
          category: "Taxation",
          frequency: "Yearly",
          billable: 1,
          fee: 40.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Partnership", "LLP"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Collate Partnership Financial Accounts", isMandatory: true },
            { id: "s2", title: "Draft SA800 Partnership Tax Return", isMandatory: true },
            { id: "s3", title: "Allocate Partner Profit Shares", isMandatory: true },
            { id: "s4", title: "Senior Partner Approval", isMandatory: true },
            { id: "s5", title: "HMRC Gateway Electronic Submission", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Sole Trader Accounts",
          category: "Accounting",
          frequency: "Yearly",
          billable: 1,
          fee: 30.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Sole Trader"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Bank & Cash Reconciliation", isMandatory: true },
            { id: "s2", title: "Expense Analysis & Disallowable Adjustments", isMandatory: true },
            { id: "s3", title: "Capital Allowances Computation", isMandatory: true },
            { id: "s4", title: "Draft Sole Trader Income Statement", isMandatory: true },
            { id: "s5", title: "Client Sign-Off", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Partnership Accounts",
          category: "Accounting",
          frequency: "Yearly",
          billable: 1,
          fee: 40.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Partnership", "LLP"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Partnership Bookkeeping Records Audit", isMandatory: true },
            { id: "s2", title: "Draft Profit and Loss Statement", isMandatory: true },
            { id: "s3", title: "Partner Capital & Current Accounts Reconciliation", isMandatory: true },
            { id: "s4", title: "Balance Sheet Finalisation", isMandatory: true },
            { id: "s5", title: "Partners Approval & Signature", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "1 Month prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Bookkeeping",
          category: "Bookkeeping",
          frequency: "Monthly",
          billable: 1,
          fee: 150.0,
          estimated_hours: 48.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Sole Trader", "Partnership", "LLP", "Charity"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Import & Reconcile Bank Feeds", isMandatory: true },
            { id: "s2", title: "Categorise Business Receipts & Payments", isMandatory: true },
            { id: "s3", title: "Process Purchase Ledger Supplier Bills", isMandatory: true },
            { id: "s4", title: "Issue Sales Invoices & Credit Notes", isMandatory: true },
            { id: "s5", title: "Credit Control & Aged Debtors Review", isMandatory: true },
            { id: "s6", title: "Aged Creditors Reconciliation", isMandatory: true },
            { id: "s7", title: "Resolve Unidentified Transactions with Client", isMandatory: true },
            { id: "s8", title: "Generate Monthly Management Trial Balance", isMandatory: true },
            { id: "s9", title: "Apply Accounting Period Lock", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 1,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "5 Days prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "CIS",
          category: "Payroll",
          frequency: "Monthly",
          billable: 1,
          fee: 25.0,
          estimated_hours: 1.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Sole Trader", "Partnership"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Verify Subcontractor UTR with HMRC CIS Service", isMandatory: true },
            { id: "s2", title: "Collate Subcontractor Payment Records", isMandatory: true },
            { id: "s3", title: "Calculate 20% / 30% / Gross CIS Deductions", isMandatory: true },
            { id: "s4", title: "Generate CIS Payment & Deduction Statements", isMandatory: true },
            { id: "s5", title: "Submit Monthly CIS300 Return to HMRC", isMandatory: true },
            { id: "s6", title: "Email Statements to Subcontractors", isMandatory: true },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([
            { id: "r1", timing: "5 Days prior to deadlines", staffUser: "Suleman Shah", clientUser: "All Client Contacts", cc: "" },
          ]),
        },
        {
          title: "Ad-hoc",
          category: "Ad-hoc",
          frequency: "One-Time",
          billable: 1,
          fee: 75.0,
          estimated_hours: 4.0,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 1,
          client_types_json: JSON.stringify(["Limited", "Sole Trader", "Partnership", "LLP", "Trust", "Charity"]),
          steps_json: JSON.stringify([
            { id: "s1", title: "Review Ad-hoc Client Request & Scope", isMandatory: true },
            { id: "s2", title: "Complete Advisory Task & Client Delivery", isMandatory: true },
          ]),
          remind_team: 0,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([]),
        },
        {
          title: "MTD - IT",
          category: "Taxation",
          frequency: "Quarterly/Yearly",
          billable: 1,
          fee: 35.0,
          estimated_hours: 0.25,
          service_manager: "Suleman Shah",
          service_type: "Default",
          is_active: 1,
          add_to_calendar: 0,
          client_types_json: JSON.stringify(["Sole Trader", "Individual"]),
          steps_json: JSON.stringify([
            {
              groupId: "g1",
              groupTitle: "Quarterly",
              items: [
                "Request / chase client records for the quarter",
                "Confirm records are digital and complete",
                "Separate records per income source (each trade reported separately)",
                "Match transactions and reconcile the bank",
                "Submit cumulative quarterly update via software per income source",
                "Confirm HMRC acknowledgment received",
              ],
            },
            {
              groupId: "g2",
              groupTitle: "Adjustments & Allowance/ Final Submission",
              items: [
                "Confirm all 4 quarterly updates submitted",
                "Post year-end adjustments (per source of income)",
                "Consolidate and post income from all sources (business, property, PAYE, savings, dividends, other)",
                "Finalise tax computation and get client sign-off",
                "Submit final declaration",
              ],
            },
          ]),
          remind_team: 1,
          assign_all: 0,
          custom_workflow: 0,
          reminders_json: JSON.stringify([]),
        },
      ];

      for (const s of defaultServices) {
        await pool.query(
          `INSERT INTO practice_services (
            practice_id, title, category, frequency, billable, fee, estimated_hours,
            service_manager, service_type, is_active, add_to_calendar, client_types_json,
            steps_json, remind_team, assign_all, custom_workflow, reminders_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            practiceId, s.title, s.category, s.frequency, s.billable, s.fee, s.estimated_hours,
            s.service_manager, s.service_type, s.is_active, s.add_to_calendar, s.client_types_json,
            s.steps_json, s.remind_team, s.assign_all, s.custom_workflow, s.reminders_json,
          ]
        );
      }
    } else {
      // Ensure MTD - IT is seeded if not present
      const [mtdCheck]: any = await pool.query(
        "SELECT id FROM practice_services WHERE practice_id = ? AND title = 'MTD - IT'",
        [practiceId]
      );
      if (mtdCheck.length === 0) {
        await pool.query(
          `INSERT INTO practice_services (
            practice_id, title, category, frequency, billable, fee, estimated_hours,
            service_manager, service_type, is_active, add_to_calendar, client_types_json,
            steps_json, remind_team, assign_all, custom_workflow, reminders_json
          ) VALUES (?, 'MTD - IT', 'Taxation', 'Quarterly/Yearly', 1, 35.00, 0.25, 'Suleman Shah', 'Default', 1, 0, ?, ?, 1, 0, 0, '[]')`,
          [
            practiceId,
            JSON.stringify(["Sole Trader", "Individual"]),
            JSON.stringify([
              {
                groupId: "g1",
                groupTitle: "Quarterly",
                items: [
                  "Request / chase client records for the quarter",
                  "Confirm records are digital and complete",
                  "Separate records per income source (each trade reported separately)",
                  "Match transactions and reconcile the bank",
                  "Submit cumulative quarterly update via software per income source",
                  "Confirm HMRC acknowledgment received",
                ],
              },
              {
                groupId: "g2",
                groupTitle: "Adjustments & Allowance/ Final Submission",
                items: [
                  "Confirm all 4 quarterly updates submitted",
                  "Post year-end adjustments (per source of income)",
                  "Consolidate and post income from all sources (business, property, PAYE, savings, dividends, other)",
                  "Finalise tax computation and get client sign-off",
                  "Submit final declaration",
                ],
              },
            ]),
          ]
        );
      } else {
        // Update MTD - IT with exact Capium frequency and steps
        await pool.query(
          `UPDATE practice_services SET
            frequency = 'Quarterly/Yearly', fee = 35.00, estimated_hours = 0.25,
            client_types_json = ?, steps_json = ?
          WHERE practice_id = ? AND title = 'MTD - IT'`,
          [
            JSON.stringify(["Sole Trader", "Individual"]),
            JSON.stringify([
              {
                groupId: "g1",
                groupTitle: "Quarterly",
                items: [
                  "Request / chase client records for the quarter",
                  "Confirm records are digital and complete",
                  "Separate records per income source (each trade reported separately)",
                  "Match transactions and reconcile the bank",
                  "Submit cumulative quarterly update via software per income source",
                  "Confirm HMRC acknowledgment received",
                ],
              },
              {
                groupId: "g2",
                groupTitle: "Adjustments & Allowance/ Final Submission",
                items: [
                  "Confirm all 4 quarterly updates submitted",
                  "Post year-end adjustments (per source of income)",
                  "Consolidate and post income from all sources (business, property, PAYE, savings, dividends, other)",
                  "Finalise tax computation and get client sign-off",
                  "Submit final declaration",
                ],
              },
            ]),
            practiceId,
          ]
        );
      }
    }

    // B. Seed Custom Fields
    const [existingFields]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_custom_fields WHERE practice_id = ?",
      [practiceId]
    );

    if (existingFields[0]?.count === 0) {
      const defaultFields = [
        { label: "Accountant Engagement Code", category: "Client Information", type: "Text", required: 0, sequence: 1 },
        { label: "HMRC Online Authorization Code", category: "Business Information", type: "Text", required: 0, sequence: 2 },
        { label: "PAYE Accounts Office Number", category: "PAYE Details", type: "Text", required: 0, sequence: 3 },
        { label: "Director Personal UTR", category: "Client Key Contact", type: "Text", required: 0, sequence: 4 },
        { label: "Annual Client Turnover Band", category: "Client Information", type: "Dropdown", options: "< £50k, £50k - £250k, £250k - £1M, £1M - £5M, > £5M", required: 0, sequence: 5 },
      ];

      for (const f of defaultFields) {
        await pool.query(
          "INSERT INTO practice_custom_fields (practice_id, label, category, type, options, required, sequence) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [practiceId, f.label, f.category, f.type, f.options || null, f.required, f.sequence]
        );
      }
    }

    // C. Seed Email Templates
    const [existingEmail]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_email_templates WHERE practice_id = ?",
      [practiceId]
    );

    if (existingEmail[0]?.count === 0) {
      const defaultEmails = [
        {
          name: "Year-End Accounts Due Reminder",
          subject: "Annual Accounts Deadline Notice: [client.name]",
          trigger_days: 30,
          body: `Dear [contact.name],

This is a courtesy notification from [practice.name] regarding your upcoming statutory Year-End Accounts for [client.name].

Statutory Filing Deadline: [deadline.due_date]
Financial Period Ending: [period.end_date]

Please ensure all bank statements, receipts, and year-end inventory figures are uploaded to your Client Portal.

Kind regards,
[practice.name]
Email: [practice.email]`,
        },
        {
          name: "Confirmation Statement (CS01) Reminder",
          subject: "Confirmation Statement Due for [client.name]",
          trigger_days: 21,
          body: `Dear [contact.name],

Your company's Annual Confirmation Statement (CS01) is due for submission to Companies House by [deadline.due_date].

Please confirm if there have been any changes to your registered office, directors, PSCs, or share structure in the last 12 months.

Regards,
[practice.name]`,
        },
        {
          name: "Quarterly MTD VAT Return Notice",
          subject: "VAT Return Submission Required: [client.name]",
          trigger_days: 14,
          body: `Dear [contact.name],

Your quarterly VAT return for the period ending [period.end_date] is due to HMRC by [deadline.due_date].

Please ensure your bookkeeping transactions and sales/purchase invoices are fully reconciled.

Regards,
[practice.name]`,
        },
        {
          name: "Self Assessment Tax Return Reminder",
          subject: "Personal Tax Return (SA100) Due - [contact.name]",
          trigger_days: 60,
          body: `Dear [contact.name],

This is a reminder from [practice.name] regarding your Self Assessment Tax Return for the tax year ending [period.end_date].

Filing & Payment Deadline: [deadline.due_date]

Please supply your P60, P11D, dividend vouchers, and interest statements at your earliest convenience.

Best regards,
[practice.name]`,
        },
      ];

      for (const e of defaultEmails) {
        await pool.query(
          "INSERT INTO practice_email_templates (practice_id, name, subject, trigger_days, body) VALUES (?, ?, ?, ?, ?)",
          [practiceId, e.name, e.subject, e.trigger_days, e.body]
        );
      }
    }

    // D. Seed Document Templates
    const [existingDocs]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_document_templates WHERE practice_id = ?",
      [practiceId]
    );

    if (existingDocs[0]?.count === 0) {
      const defaultDocs = [
        {
          title: "Standard Letter of Engagement (Limited Company)",
          type: "Letter of Engagement",
          version: "2026.1",
          content: `STANDARD LETTER OF ENGAGEMENT

Date: [proposal.commencement_date]
Client: [client.name]
Practice: [practice.name]

1. SCOPE OF PROFESSIONAL SERVICES
We agree to act as your accountants and tax advisors for the statutory accounting periods beginning [proposal.commencement_date]. Our engagement covers the agreed services outlined in the schedule of services.

2. STATUTORY RESPONSIBILITIES
As directors of [client.name], you are responsible for maintaining proper accounting records under the Companies Act 2006.

3. AGREED PROFESSIONAL FEES
The fee summary agreed for the scope of services is [proposal.price_summary].

Signed on behalf of [practice.name]: _____________________
Signed on behalf of [client.name]: _____________________`,
        },
        {
          title: "Letter of Engagement (Sole Trader / Individual)",
          type: "Letter of Engagement",
          version: "2026.1",
          content: `LETTER OF ENGAGEMENT - SELF EMPLOYED / INDIVIDUAL

Date: [proposal.commencement_date]
Client: [client.name]
Practice: [practice.name]

1. SERVICES PROVIDED
Preparation and electronic submission of Self Assessment Tax Return (SA100) and business accounts.

2. PROFESSIONAL FEES
Agreed annual fee schedule: [proposal.price_summary].

Client Signature: _____________________`,
        },
        {
          title: "HMRC 64-8 Agent Authorisation Notice",
          type: "Authorisation Mandate",
          version: "HMRC 64-8",
          content: `AUTHORISING YOUR AGENT (64-8 MANDATE)

To: HM Revenue & Customs
Client Name: [client.name]

I authorise [practice.name] to act as my appointed tax agent for Corporation Tax, VAT, PAYE, and Self Assessment matters.

Signed: _____________________
Date: [proposal.commencement_date]`,
        },
      ];

      for (const d of defaultDocs) {
        await pool.query(
          "INSERT INTO practice_document_templates (practice_id, title, type, version, content) VALUES (?, ?, ?, ?, ?)",
          [practiceId, d.title, d.type, d.version, d.content]
        );
      }
    }

    // E. Seed 5 Standard PDF Invoice Templates (Article 9000222508 & 9000172239)
    const [existingInvoices]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_invoice_templates WHERE practice_id = ?",
      [practiceId]
    );

    if (existingInvoices[0]?.count === 0) {
      const defaultInvoiceTemplates = [
        {
          template_name: "SeaGreen",
          template_type: "PDF",
          primary_color: "#10b981",
          page_size: "A4",
          title_invoice: "Invoice",
          title_draft: "Draft Invoice",
          title_credit_note: "Credit Note",
          title_paid: "Invoice",
          margin_top: 25,
          margin_bottom: 25,
          margin_left: 25,
          margin_right: 25,
          footer_height: 40,
          vat_reg_no: 1,
          company_reg_no: 1,
          header_text: "INVOICE / STATUTORY FEE NOTE",
          footer_text: "Thank you for your business. Please settle this fee note within 30 days of invoice date.",
          payment_terms: "Payment Terms: Net 30 Days. Late payments subject to statutory interest under Late Payment of Commercial Debts Act 1998.",
          bank_name: "Barclays Bank UK PLC",
          account_name: "Pegasus Accountancy Services Ltd - Client Account",
          sort_code: "20-00-00",
          account_number: "88776655",
          iban: "GB29BARC20000088776655",
          bic_swift: "BARCGB22",
          payment_instructions: "Please quote Invoice Number [invoice.number] as reference when making BACS payment.",
          is_default: 1,
        },
        {
          template_name: "BlueSky",
          template_type: "PDF",
          primary_color: "#0284c7",
          page_size: "A4",
          title_invoice: "Invoice",
          title_draft: "Draft Invoice",
          title_credit_note: "Credit Note",
          title_paid: "Invoice",
          margin_top: 25,
          margin_bottom: 25,
          margin_left: 25,
          margin_right: 25,
          footer_height: 40,
          vat_reg_no: 1,
          company_reg_no: 1,
          header_text: "PROFESSIONAL SERVICES INVOICE",
          footer_text: "Pegasus Accountancy Services Ltd • Registered in England & Wales #12345678",
          payment_terms: "Due upon receipt via BACS or Direct Debit.",
          bank_name: "HSBC UK Bank PLC",
          account_name: "Pegasus Accountancy Services Ltd",
          sort_code: "40-02-00",
          account_number: "11223344",
          iban: "GB12MIDL40020011223344",
          bic_swift: "MIDLGB22",
          payment_instructions: "Electronic BACS / Faster Payments Reference: [invoice.number]",
          is_default: 0,
        },
        {
          template_name: "Classic",
          template_type: "PDF",
          primary_color: "#1e3a8a",
          page_size: "A4",
          title_invoice: "Invoice",
          title_draft: "Draft Invoice",
          title_credit_note: "Credit Note",
          title_paid: "Invoice",
          margin_top: 25,
          margin_bottom: 25,
          margin_left: 25,
          margin_right: 25,
          footer_height: 40,
          vat_reg_no: 1,
          company_reg_no: 1,
          header_text: "TAX & ACCOUNTANCY INVOICE",
          footer_text: "Authorised & Regulated by ICAEW / ACCA. All fees are in GBP (£).",
          payment_terms: "Strictly Net 14 Days from date of invoice.",
          bank_name: "Lloyds Bank PLC",
          account_name: "Pegasus Accountancy Services Ltd",
          sort_code: "30-90-89",
          account_number: "99887766",
          iban: "GB50LOYD30908999887766",
          bic_swift: "LOYDGB21",
          payment_instructions: "Please remit funds to the account above quoting [invoice.number].",
          is_default: 0,
        },
        {
          template_name: "Modern",
          template_type: "PDF",
          primary_color: "#6c5ce7",
          page_size: "A4",
          title_invoice: "Invoice",
          title_draft: "Draft Invoice",
          title_credit_note: "Credit Note",
          title_paid: "Invoice",
          margin_top: 25,
          margin_bottom: 25,
          margin_left: 25,
          margin_right: 25,
          footer_height: 40,
          vat_reg_no: 1,
          company_reg_no: 1,
          header_text: "MONTHLY RETAINER & ADVISORY FEE NOTE",
          footer_text: "Fixed monthly accountancy and tax compliance subscription.",
          payment_terms: "Direct Debit collected automatically on 1st of month.",
          bank_name: "Barclays Bank UK PLC",
          account_name: "Pegasus Accountancy Services Ltd",
          sort_code: "20-00-00",
          account_number: "88776655",
          iban: "GB29BARC20000088776655",
          bic_swift: "BARCGB22",
          payment_instructions: "Direct Debit Mandate active under reference [client.code].",
          is_default: 0,
        },
        {
          template_name: "Executive",
          template_type: "PDF",
          primary_color: "#0f172a",
          page_size: "A4",
          title_invoice: "Invoice",
          title_draft: "Draft Invoice",
          title_credit_note: "Credit Note",
          title_paid: "Invoice",
          margin_top: 25,
          margin_bottom: 25,
          margin_left: 25,
          margin_right: 25,
          footer_height: 40,
          vat_reg_no: 1,
          company_reg_no: 1,
          header_text: "EXECUTIVE STATUTORY FEE NOTE",
          footer_text: "[practice.name] • VAT Reg: [practice.vat] • UTR: [practice.utr]",
          payment_terms: "Terms: Net 30 Days. Total Due: [invoice.grand_total]",
          bank_name: "Barclays Bank UK PLC",
          account_name: "Pegasus Accountancy Services Ltd",
          sort_code: "20-00-00",
          account_number: "88776655",
          iban: "GB29BARC20000088776655",
          bic_swift: "BARCGB22",
          payment_instructions: "Payable to [bank.account_name], Sort: [bank.sort_code], Acc: [bank.account_number]",
          is_default: 0,
        },
      ];

      for (const inv of defaultInvoiceTemplates) {
        await pool.query(
          `INSERT INTO practice_invoice_templates (
            practice_id, template_name, template_type, primary_color, page_size,
            title_invoice, title_draft, title_credit_note, title_paid,
            margin_top, margin_bottom, margin_left, margin_right, footer_height,
            vat_reg_no, company_reg_no, header_text, footer_text, payment_terms,
            bank_name, account_name, sort_code, account_number, iban, bic_swift,
            payment_instructions, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            practiceId, inv.template_name, inv.template_type, inv.primary_color, inv.page_size,
            inv.title_invoice, inv.title_draft, inv.title_credit_note, inv.title_paid,
            inv.margin_top, inv.margin_bottom, inv.margin_left, inv.margin_right, inv.footer_height,
            inv.vat_reg_no, inv.company_reg_no, inv.header_text, inv.footer_text, inv.payment_terms,
            inv.bank_name, inv.account_name, inv.sort_code, inv.account_number, inv.iban, inv.bic_swift,
            inv.payment_instructions, inv.is_default,
          ]
        );
      }
    }

    // Eb. Seed Practice Banks (Article 9000172239)
    const [existingBanks]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_banks WHERE practice_id = ?",
      [practiceId]
    );

    if (existingBanks[0]?.count === 0) {
      const defaultBanks = [
        {
          bank_name: "Barclays Bank UK PLC",
          account_type: "Current",
          currency: "Pound Sterling",
          account_code: "5242",
          sort_code: "20-00-00",
          account_number: "88776655",
          iban: "GB29BARC20000088776655",
          bic_swift: "BARCGB22",
          payment_instructions: "Please quote Invoice Number as payment reference.",
          is_default: 1,
        },
        {
          bank_name: "HSBC UK Bank PLC",
          account_type: "Current",
          currency: "Pound Sterling",
          account_code: "5243",
          sort_code: "40-02-00",
          account_number: "11223344",
          iban: "GB12MIDL40020011223344",
          bic_swift: "MIDLGB22",
          payment_instructions: "BACS Faster Payments reference: [invoice.number]",
          is_default: 0,
        },
        {
          bank_name: "Lloyds Bank PLC",
          account_type: "Client Account",
          currency: "Pound Sterling",
          account_code: "5244",
          sort_code: "30-90-89",
          account_number: "55667788",
          iban: "GB80LOYD30908955667788",
          bic_swift: "LOYDGB21",
          payment_instructions: "Remit to Pegasus Accountancy Client Account.",
          is_default: 0,
        },
      ];

      for (const b of defaultBanks) {
        await pool.query(
          `INSERT INTO practice_banks (
            practice_id, bank_name, account_type, currency, account_code, sort_code,
            account_number, iban, bic_swift, payment_instructions, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            practiceId, b.bank_name, b.account_type, b.currency, b.account_code, b.sort_code,
            b.account_number, b.iban, b.bic_swift, b.payment_instructions, b.is_default,
          ]
        );
      }
    }

    // Ec. Seed Practice Doc Invoice Templates (Article 9000195170 & 9000222508)
    const [existingDocInvoices]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_doc_invoice_templates WHERE practice_id = ?",
      [practiceId]
    );

    if (existingDocInvoices[0]?.count === 0) {
      const defaultDocInvoices = [
        {
          template_name: "Default Template",
          is_default: 1,
          file_name: "Invoice.docx",
          file_size: "27.9 KB",
          bank_name: "N/A",
          updated_on: "-",
        },
        {
          template_name: "Corporate Standard Template",
          is_default: 0,
          file_name: "Corporate_Invoice.docx",
          file_size: "32.4 KB",
          bank_name: "Barclays Bank UK PLC",
          updated_on: "12/04/2026",
        },
        {
          template_name: "Consultancy Hourly Retainer",
          is_default: 0,
          file_name: "Consulting_Invoice.docx",
          file_size: "29.1 KB",
          bank_name: "HSBC UK Bank PLC",
          updated_on: "05/04/2026",
        },
      ];

      for (const d of defaultDocInvoices) {
        await pool.query(
          `INSERT INTO practice_doc_invoice_templates (
            practice_id, template_name, is_default, file_name, file_size, bank_name, updated_on
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [practiceId, d.template_name, d.is_default, d.file_name, d.file_size, d.bank_name, d.updated_on]
        );
      }
    }

    // F. Seed Onboarding Criteria
    const [existingOnboarding]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_onboarding_criteria WHERE practice_id = ?",
      [practiceId]
    );

    if (existingOnboarding[0]?.count === 0) {
      const defaultOnboarding = [
        // Limited
        { entity_type: "Limited", title: "Proof of Identity (Passport / Photo ID for Directors)", is_required: 1, sequence: 1 },
        { entity_type: "Limited", title: "Proof of Residential Address (< 3 months utility / bank bill)", is_required: 1, sequence: 2 },
        { entity_type: "Limited", title: "Professional Clearance letter issued to previous accountant", is_required: 1, sequence: 3 },
        { entity_type: "Limited", title: "HMRC 64-8 Agent Authorisation code requested & approved", is_required: 1, sequence: 4 },
        { entity_type: "Limited", title: "Signed Letter of Engagement (Capisign E-Signature)", is_required: 1, sequence: 5 },
        { entity_type: "Limited", title: "Direct Debit Mandate / Recurring Fee payment setup", is_required: 0, sequence: 6 },
        { entity_type: "Limited", title: "Companies House Authentication Code verified", is_required: 1, sequence: 7 },
        // Sole Trader
        { entity_type: "SoleTrader", title: "Proof of ID & Photographic Identification", is_required: 1, sequence: 1 },
        { entity_type: "SoleTrader", title: "Proof of Address (Utility bill within 3 months)", is_required: 1, sequence: 2 },
        { entity_type: "SoleTrader", title: "Unique Taxpayer Reference (UTR) & NINO verified", is_required: 1, sequence: 3 },
        { entity_type: "SoleTrader", title: "HMRC 64-8 Authorisation completed", is_required: 1, sequence: 4 },
        { entity_type: "SoleTrader", title: "Signed Engagement Letter received", is_required: 1, sequence: 5 },
        // Partnership
        { entity_type: "Partnership", title: "Partnership Agreement / Deed inspected", is_required: 1, sequence: 1 },
        { entity_type: "Partnership", title: "ID verification for all nominated partners", is_required: 1, sequence: 2 },
        { entity_type: "Partnership", title: "Partnership UTR & individual partners UTRs recorded", is_required: 1, sequence: 3 },
        { entity_type: "Partnership", title: "64-8 Agent Authorisation completed", is_required: 1, sequence: 4 },
        { entity_type: "Partnership", title: "Engagement letter signed by Senior Partner", is_required: 1, sequence: 5 },
        // Individual
        { entity_type: "Individual", title: "Passport / Driving Licence ID check", is_required: 1, sequence: 1 },
        { entity_type: "Individual", title: "Proof of Address verified", is_required: 1, sequence: 2 },
        { entity_type: "Individual", title: "National Insurance Number (NINO) verified", is_required: 1, sequence: 3 },
        { entity_type: "Individual", title: "Self Assessment UTR authorization", is_required: 1, sequence: 4 },
        { entity_type: "Individual", title: "Signed Terms of Business", is_required: 1, sequence: 5 },
        // Trust
        { entity_type: "Trust", title: "Trust Deed & Settlement Document verified", is_required: 1, sequence: 1 },
        { entity_type: "Trust", title: "ID verification for all acting Trustees & Beneficiaries", is_required: 1, sequence: 2 },
        { entity_type: "Trust", title: "Trust Registration Service (TRS) URN / UTR recorded", is_required: 1, sequence: 3 },
        { entity_type: "Trust", title: "Signed Engagement Terms", is_required: 1, sequence: 4 },
      ];

      for (const o of defaultOnboarding) {
        await pool.query(
          "INSERT INTO practice_onboarding_criteria (practice_id, entity_type, title, is_required, sequence) VALUES (?, ?, ?, ?, ?)",
          [practiceId, o.entity_type, o.title, o.is_required, o.sequence]
        );
      }
    }

    // G. Seed Risk Criteria
    const [existingRisk]: any = await pool.query(
      "SELECT COUNT(*) as count FROM practice_risk_criteria WHERE practice_id = ?",
      [practiceId]
    );

    if (existingRisk[0]?.count === 0) {
      const defaultRisk = [
        // Limited
        { entity_type: "Limited", title: "Politically Exposed Persons (PEP) or Sanctions Match", category: "Client Risk", risk_weight: "High", risk_level: "Enhanced" },
        { entity_type: "Limited", title: "High-Risk Non-Cooperative Jurisdiction Links", category: "Geographic Risk", risk_weight: "High", risk_level: "Enhanced" },
        { entity_type: "Limited", title: "Cash-Intensive Trading Sector (e.g. hospitality, construction)", category: "Sector Risk", risk_weight: "Medium", risk_level: "Normal" },
        { entity_type: "Limited", title: "Complex or Opaque Corporate Ownership Structure (> 25% PSC)", category: "Structure Risk", risk_weight: "Medium", risk_level: "Normal" },
        { entity_type: "Limited", title: "Standard UK Registered Trading Entity with transparent directors", category: "Standard Risk", risk_weight: "Low", risk_level: "Low" },
        // Sole Trader
        { entity_type: "SoleTrader", title: "PEP or High-Risk Sanctions match", category: "Individual Risk", risk_weight: "High", risk_level: "Enhanced" },
        { entity_type: "SoleTrader", title: "High-volume cash transactions without business bank account", category: "Financial Risk", risk_weight: "Medium", risk_level: "Normal" },
        { entity_type: "SoleTrader", title: "Standard UK resident sole proprietor with verified bank account", category: "Standard Risk", risk_weight: "Low", risk_level: "Low" },
        // Partnership
        { entity_type: "Partnership", title: "Overseas partners or complex cross-border profit sharing", category: "Structure Risk", risk_weight: "High", risk_level: "Enhanced" },
        { entity_type: "Partnership", title: "UK resident partners with standard domestic trading activities", category: "Standard Risk", risk_weight: "Low", risk_level: "Low" },
        // Individual
        { entity_type: "Individual", title: "High net worth individual with non-domicile or overseas assets", category: "Wealth Risk", risk_weight: "Medium", risk_level: "Normal" },
        { entity_type: "Individual", title: "Standard UK PAYE / self-employed resident taxpayer", category: "Standard Risk", risk_weight: "Low", risk_level: "Low" },
        // Trust
        { entity_type: "Trust", title: "Discretionary Trust with offshore settlor or foreign assets", category: "Fiduciary Risk", risk_weight: "High", risk_level: "Enhanced" },
        { entity_type: "Trust", title: "Standard UK Will Trust / Bare Trust with UK resident trustees", category: "Standard Risk", risk_weight: "Low", risk_level: "Low" },
      ];

      for (const r of defaultRisk) {
        await pool.query(
          "INSERT INTO practice_risk_criteria (practice_id, entity_type, title, category, risk_weight, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
          [practiceId, r.entity_type, r.title, r.category, r.risk_weight, r.risk_level]
        );
      }
    }

    isDbInitialized = true;
  } catch (err) {
    console.error("Practice Settings DB Initialization Error:", err);
  }
}

// =========================================================================
// REST API ROUTES WITH DIRECT MYSQL DATABASE PERSISTENCE
// =========================================================================

// GET /api/practice/settings - Load all settings from MySQL database
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await ensureTablesAndSeed(practiceId);

    // 1. Fetch Services
    const [servicesRows]: any = await pool.query(
      "SELECT * FROM practice_services WHERE practice_id = ? ORDER BY id ASC",
      [practiceId]
    );

    const services = (servicesRows || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      frequency: row.frequency,
      billable: !!row.billable,
      fee: row.fee ? String(row.fee) : "35.00",
      estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : 4,
      serviceManager: row.service_manager,
      serviceType: row.service_type || "Default",
      isActive: !!row.is_active,
      addToCalendar: !!row.add_to_calendar,
      clientTypes: row.client_types_json ? JSON.parse(row.client_types_json) : ["Limited"],
      steps: row.steps_json ? JSON.parse(row.steps_json) : [],
      remindTeam: !!row.remind_team,
      assignAll: !!row.assign_all,
      customWorkflow: !!row.custom_workflow,
      reminders: row.reminders_json ? JSON.parse(row.reminders_json) : [],
    }));

    // 2. Fetch Client Service Assignments
    const [assignmentsRows]: any = await pool.query(
      "SELECT * FROM client_service_assignments WHERE practice_id = ?",
      [practiceId]
    );

    const clientServiceAssignments: Record<number, number[]> = {};
    (assignmentsRows || []).forEach((row: any) => {
      if (!clientServiceAssignments[row.client_id]) {
        clientServiceAssignments[row.client_id] = [];
      }
      clientServiceAssignments[row.client_id].push(row.service_id);
    });

    // 3. Fetch Custom Fields
    const [customFieldsRows]: any = await pool.query(
      "SELECT * FROM practice_custom_fields WHERE practice_id = ? ORDER BY sequence ASC, id ASC",
      [practiceId]
    );

    const customFields = (customFieldsRows || []).map((row: any) => ({
      id: row.id,
      label: row.label,
      category: row.category,
      type: row.type,
      options: row.options || "",
      required: !!row.required,
      sequence: row.sequence,
    }));

    // 4. Fetch Email Templates
    const [emailRows]: any = await pool.query(
      "SELECT * FROM practice_email_templates WHERE practice_id = ? ORDER BY id ASC",
      [practiceId]
    );

    const emailTemplates = (emailRows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      title: row.name,
      templateType: row.template_type || "Deadline Reminder Template",
      isCustom: !!row.is_custom,
      subject: row.subject,
      triggerDays: row.trigger_days,
      body: row.body,
    }));

    // 5. Fetch Document Templates (Capium Article 9000238645 & 9000172255)
    const [docRows]: any = await pool.query(
      "SELECT * FROM practice_document_templates WHERE practice_id = ? ORDER BY id ASC",
      [practiceId]
    );

    const documentTemplates = (docRows || []).map((row: any) => ({
      id: row.id,
      title: row.title || row.file_name || "Untitled Template",
      fileName: row.file_name || row.title || "Untitled Template",
      templateType: row.template_type || row.type || "Letter of Engagement",
      docType: row.doc_type || (row.type === "Custom" ? "Custom" : "Default"),
      version: row.version || "2026.1",
      content: row.content,
      emailSubject: row.email_subject || "",
      emailBody: row.email_body || "",
    }));

    // 6. Fetch Invoice Templates (Article 9000222508 & 9000172239)
    const [invoiceRows]: any = await pool.query(
      "SELECT * FROM practice_invoice_templates WHERE practice_id = ? ORDER BY is_default DESC, id ASC",
      [practiceId]
    );

    const invoiceTemplates = (invoiceRows || []).map((row: any) => ({
      id: row.id,
      templateName: row.template_name,
      templateType: row.template_type,
      primaryColor: row.primary_color || "#10b981",
      logoUrl: row.logo_url,
      pageSize: row.page_size || "A4",
      titleInvoice: row.title_invoice || "Invoice",
      titleDraft: row.title_draft || "Draft Invoice",
      titleCreditNote: row.title_credit_note || "Credit Note",
      titlePaid: row.title_paid || "Invoice",
      marginTop: row.margin_top ?? 25,
      marginBottom: row.margin_bottom ?? 25,
      marginLeft: row.margin_left ?? 25,
      marginRight: row.margin_right ?? 25,
      footerHeight: row.footer_height ?? 40,
      vatRegNo: row.vat_reg_no !== 0,
      companyRegNo: row.company_reg_no !== 0,
      headerText: row.header_text,
      footerText: row.footer_text,
      paymentTerms: row.payment_terms,
      bankName: row.bank_name,
      accountName: row.account_name,
      sortCode: row.sort_code,
      accountNumber: row.account_number,
      iban: row.iban,
      bicSwift: row.bic_swift,
      paymentInstructions: row.payment_instructions,
      isDefault: !!row.is_default,
    }));

    // 6b. Fetch Practice Banks
    const [banksRows]: any = await pool.query(
      "SELECT * FROM practice_banks WHERE practice_id = ? ORDER BY is_default DESC, id ASC",
      [practiceId]
    );

    const banks = (banksRows || []).map((row: any) => ({
      id: row.id,
      bankName: row.bank_name,
      accountType: row.account_type || "Current",
      currency: row.currency || "Pound Sterling",
      accountCode: row.account_code || "5242",
      sortCode: row.sort_code || "20-00-00",
      accountNumber: row.account_number || "88776655",
      iban: row.iban,
      bicSwift: row.bic_swift,
      paymentInstructions: row.payment_instructions,
      isDefault: !!row.is_default,
    }));

    // 6c. Fetch Doc Invoice Templates
    const [docInvoiceRows]: any = await pool.query(
      "SELECT * FROM practice_doc_invoice_templates WHERE practice_id = ? ORDER BY is_default DESC, id ASC",
      [practiceId]
    );

    const invoiceDocTemplates = (docInvoiceRows || []).map((row: any) => ({
      id: row.id,
      templateName: row.template_name,
      isDefault: !!row.is_default,
      fileName: row.file_name || "Invoice.docx",
      invoiceFile: row.invoice_file || row.file_name || "Invoice.docx",
      creditNoteFile: row.credit_note_file || "CreditNote.docx",
      dividendFile: row.dividend_file || "Dividend.docx",
      quotationFile: row.quotation_file || "Quotation.docx",
      fileSize: row.file_size || "27.9 KB",
      bankName: row.bank_name || "N/A",
      updatedOn: row.updated_on || "-",
    }));

    // 7. Fetch Onboarding Criteria
    const [onboardingRows]: any = await pool.query(
      "SELECT * FROM practice_onboarding_criteria WHERE practice_id = ? ORDER BY sequence ASC, id ASC",
      [practiceId]
    );

    const onboardingCriteria: Record<string, any[]> = {
      Limited: [],
      SoleTrader: [],
      Partnership: [],
      Individual: [],
      Trust: [],
    };

    (onboardingRows || []).forEach((row: any) => {
      if (!onboardingCriteria[row.entity_type]) {
        onboardingCriteria[row.entity_type] = [];
      }
      onboardingCriteria[row.entity_type].push({
        id: row.id,
        title: row.title,
        isRequired: !!row.is_required,
        sequence: row.sequence,
      });
    });

    // 8. Fetch Risk Criteria
    const [riskRows]: any = await pool.query(
      "SELECT * FROM practice_risk_criteria WHERE practice_id = ? ORDER BY id ASC",
      [practiceId]
    );

    const riskCriteria: Record<string, any[]> = {
      Limited: [],
      SoleTrader: [],
      Partnership: [],
      Individual: [],
      Trust: [],
    };

    (riskRows || []).forEach((row: any) => {
      if (!riskCriteria[row.entity_type]) {
        riskCriteria[row.entity_type] = [];
      }
      riskCriteria[row.entity_type].push({
        id: row.id,
        title: row.title,
        category: row.category,
        riskWeight: row.risk_weight,
        riskLevel: row.risk_level,
      });
    });

    res.json({
      services,
      clientServiceAssignments,
      customFields,
      emailTemplates,
      documentTemplates,
      invoiceTemplates,
      invoiceDocTemplates,
      banks,
      onboardingCriteria,
      riskCriteria,
    });
  } catch (error: any) {
    console.error("Fetch Practice Settings Error:", error);
    res.status(500).json({ message: "Failed to fetch practice settings", error: error.message });
  }
});

// POST /api/practice/settings/services - Create or Update Service
router.post("/services", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await ensureTablesAndSeed(practiceId);

    const {
      id,
      title,
      category,
      frequency,
      billable,
      fee,
      estimatedHours,
      serviceManager,
      serviceType,
      isActive,
      addToCalendar,
      clientTypes,
      steps,
      remindTeam,
      assignAll,
      customWorkflow,
      reminders,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Service title is required." });
    }

    if (id) {
      // Update existing
      await pool.query(
        `UPDATE practice_services SET
          title = ?, category = ?, frequency = ?, billable = ?, fee = ?, estimated_hours = ?,
          service_manager = ?, service_type = ?, is_active = ?, add_to_calendar = ?,
          client_types_json = ?, steps_json = ?, remind_team = ?, assign_all = ?,
          custom_workflow = ?, reminders_json = ?
        WHERE id = ? AND practice_id = ?`,
        [
          title.trim(),
          category || "Accounting",
          frequency || "Yearly",
          billable !== false ? 1 : 0,
          fee || "35.00",
          estimatedHours || 4.0,
          serviceManager || "Suleman Shah",
          serviceType || "Custom",
          isActive !== false ? 1 : 0,
          addToCalendar !== false ? 1 : 0,
          JSON.stringify(clientTypes || ["Limited"]),
          JSON.stringify(steps || []),
          remindTeam !== false ? 1 : 0,
          assignAll !== false ? 1 : 0,
          customWorkflow ? 1 : 0,
          JSON.stringify(reminders || []),
          id,
          practiceId,
        ]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO practice_services (
          practice_id, title, category, frequency, billable, fee, estimated_hours,
          service_manager, service_type, is_active, add_to_calendar, client_types_json,
          steps_json, remind_team, assign_all, custom_workflow, reminders_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          practiceId,
          title.trim(),
          category || "Accounting",
          frequency || "Yearly",
          billable !== false ? 1 : 0,
          fee || "35.00",
          estimatedHours || 4.0,
          serviceManager || "Suleman Shah",
          "Custom",
          isActive !== false ? 1 : 0,
          addToCalendar !== false ? 1 : 0,
          JSON.stringify(clientTypes || ["Limited"]),
          JSON.stringify(steps || []),
          remindTeam !== false ? 1 : 0,
          assignAll !== false ? 1 : 0,
          customWorkflow ? 1 : 0,
          JSON.stringify(reminders || []),
        ]
      );
    }

    res.json({ message: "Service saved to database successfully." });
  } catch (error: any) {
    console.error("Save Service Error:", error);
    res.status(500).json({ message: "Failed to save service", error: error.message });
  }
});

// DELETE /api/practice/settings/services/:id - Remove Service
router.delete("/services/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const serviceId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_services WHERE id = ? AND practice_id = ?", [
      serviceId,
      practiceId,
    ]);

    await pool.query("DELETE FROM client_service_assignments WHERE service_id = ? AND practice_id = ?", [
      serviceId,
      practiceId,
    ]);

    res.json({ message: "Service removed from database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete service", error: error.message });
  }
});

// POST /api/practice/settings/services/assign - Assign Services to Clients (Matrix)
router.post("/services/assign", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { clientId, serviceIds } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required." });
    }

    // Remove existing assignments for this client
    await pool.query(
      "DELETE FROM client_service_assignments WHERE client_id = ? AND practice_id = ?",
      [clientId, practiceId]
    );

    // Insert updated service assignments
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      for (const sId of serviceIds) {
        await pool.query(
          "INSERT INTO client_service_assignments (practice_id, client_id, service_id) VALUES (?, ?, ?)",
          [practiceId, clientId, sId]
        );
      }
    }

    res.json({ message: "Service assignments updated in database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign services", error: error.message });
  }
});

// POST /api/practice/settings/custom-fields - Add or Update Custom Field
router.post("/custom-fields", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { id, label, category, type = "Text", options = "", required = false, sequence = 1 } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ message: "Field label is required." });
    }

    if (id) {
      await pool.query(
        "UPDATE practice_custom_fields SET label = ?, category = ?, type = ?, options = ?, required = ?, sequence = ? WHERE id = ? AND practice_id = ?",
        [label.trim(), category, type, options, required ? 1 : 0, sequence, id, practiceId]
      );
    } else {
      await pool.query(
        "INSERT INTO practice_custom_fields (practice_id, label, category, type, options, required, sequence) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [practiceId, label.trim(), category, type, options, required ? 1 : 0, sequence]
      );
    }

    res.json({ message: "Custom field saved in database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save custom field", error: error.message });
  }
});

// DELETE /api/practice/settings/custom-fields/:id - Delete Custom Field
router.delete("/custom-fields/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const fieldId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_custom_fields WHERE id = ? AND practice_id = ?", [
      fieldId,
      practiceId,
    ]);

    res.json({ message: "Custom field deleted." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete custom field", error: error.message });
  }
});

// POST /api/practice/settings/email-templates - Save Email Template
router.post("/email-templates", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { id, name, title, templateType, isCustom = false, subject, triggerDays, body } = req.body;

    const finalName = (name || title || "").trim();
    if (!finalName || !subject) {
      return res.status(400).json({ message: "Template name and subject are required." });
    }

    if (id) {
      await pool.query(
        `UPDATE practice_email_templates SET
          name = ?, template_type = ?, is_custom = ?, subject = ?, trigger_days = ?, body = ?
        WHERE id = ? AND practice_id = ?`,
        [finalName, templateType || "Deadline Reminder Template", isCustom ? 1 : 0, subject.trim(), triggerDays || 14, body || "", id, practiceId]
      );
    } else {
      await pool.query(
        `INSERT INTO practice_email_templates (
          practice_id, name, template_type, is_custom, subject, trigger_days, body
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [practiceId, finalName, templateType || "Deadline Reminder Template", isCustom ? 1 : 0, subject.trim(), triggerDays || 14, body || ""]
      );
    }

    res.json({ message: "Email template saved in database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save email template", error: error.message });
  }
});

// DELETE /api/practice/settings/email-templates/:id - Delete Email Template
router.delete("/email-templates/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_email_templates WHERE id = ? AND practice_id = ?", [
      templateId,
      practiceId,
    ]);

    res.json({ message: "Email template removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete email template", error: error.message });
  }
});

// POST /api/practice/settings/document-templates - Save Document / LOE Template (Article 9000238645)
router.post("/document-templates", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { id, title, fileName, templateType, type, docType, version, content, emailSubject, emailBody } = req.body;

    const finalTitle = (title || fileName || "").trim();
    if (!finalTitle || !content) {
      return res.status(400).json({ message: "Document title and content are required." });
    }

    if (id) {
      await pool.query(
        `UPDATE practice_document_templates SET
          title = ?, file_name = ?, template_type = ?, type = ?, doc_type = ?,
          version = ?, content = ?, email_subject = ?, email_body = ?
        WHERE id = ? AND practice_id = ?`,
        [
          finalTitle,
          fileName || finalTitle,
          templateType || type || "Letter of Engagement",
          templateType || type || "Letter of Engagement",
          docType || (type === "Custom" ? "Custom" : "Default"),
          version || "2026.1",
          content,
          emailSubject || "",
          emailBody || "",
          id,
          practiceId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO practice_document_templates (
          practice_id, title, file_name, template_type, type, doc_type, version, content, email_subject, email_body
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          practiceId,
          finalTitle,
          fileName || finalTitle,
          templateType || type || "Letter of Engagement",
          templateType || type || "Letter of Engagement",
          docType || "Custom",
          version || "2026.1",
          content,
          emailSubject || "",
          emailBody || "",
        ]
      );
    }

    res.json({ message: "Document template saved in database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save document template", error: error.message });
  }
});

// DELETE /api/practice/settings/document-templates/:id - Delete Document Template
router.delete("/document-templates/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const docId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_document_templates WHERE id = ? AND practice_id = ?", [
      docId,
      practiceId,
    ]);

    res.json({ message: "Document template removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete document template", error: error.message });
  }
});

// =========================================================================
// INVOICE TEMPLATES & BANK DETAILS (Articles 9000222508 & 9000172239)
// =========================================================================

// POST /api/practice/settings/invoice-templates - Create or Update PDF Invoice Template
router.post("/invoice-templates", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await ensureTablesAndSeed(practiceId);

    const {
      id,
      templateName,
      templateType = "PDF",
      primaryColor = "#10b981",
      logoUrl,
      pageSize = "A4",
      titleInvoice = "Invoice",
      titleDraft = "Draft Invoice",
      titleCreditNote = "Credit Note",
      titlePaid = "Invoice",
      marginTop = 25,
      marginBottom = 25,
      marginLeft = 25,
      marginRight = 25,
      footerHeight = 40,
      vatRegNo = true,
      companyRegNo = true,
      headerText,
      footerText,
      paymentTerms,
      bankName,
      accountName,
      sortCode,
      accountNumber,
      iban,
      bicSwift,
      paymentInstructions,
      isDefault = false,
    } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ message: "Template name is required." });
    }

    // If marked default, unset others first
    if (isDefault) {
      await pool.query(
        "UPDATE practice_invoice_templates SET is_default = FALSE WHERE practice_id = ?",
        [practiceId]
      );
    }

    if (id) {
      await pool.query(
        `UPDATE practice_invoice_templates SET
          template_name = ?, template_type = ?, primary_color = ?, logo_url = ?,
          page_size = ?, title_invoice = ?, title_draft = ?, title_credit_note = ?,
          title_paid = ?, margin_top = ?, margin_bottom = ?, margin_left = ?,
          margin_right = ?, footer_height = ?, vat_reg_no = ?, company_reg_no = ?,
          header_text = ?, footer_text = ?, payment_terms = ?, bank_name = ?,
          account_name = ?, sort_code = ?, account_number = ?, iban = ?,
          bic_swift = ?, payment_instructions = ?, is_default = ?
        WHERE id = ? AND practice_id = ?`,
        [
          templateName.trim(),
          templateType,
          primaryColor,
          logoUrl || null,
          pageSize,
          titleInvoice,
          titleDraft,
          titleCreditNote,
          titlePaid,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          footerHeight,
          vatRegNo ? 1 : 0,
          companyRegNo ? 1 : 0,
          headerText || "INVOICE / STATUTORY FEE NOTE",
          footerText || "",
          paymentTerms || "Net 30 Days",
          bankName || "",
          accountName || "",
          sortCode || "",
          accountNumber || "",
          iban || "",
          bicSwift || "",
          paymentInstructions || "",
          isDefault ? 1 : 0,
          id,
          practiceId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO practice_invoice_templates (
          practice_id, template_name, template_type, primary_color, logo_url,
          page_size, title_invoice, title_draft, title_credit_note, title_paid,
          margin_top, margin_bottom, margin_left, margin_right, footer_height,
          vat_reg_no, company_reg_no, header_text, footer_text, payment_terms,
          bank_name, account_name, sort_code, account_number, iban, bic_swift,
          payment_instructions, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          practiceId,
          templateName.trim(),
          templateType,
          primaryColor,
          logoUrl || null,
          pageSize,
          titleInvoice,
          titleDraft,
          titleCreditNote,
          titlePaid,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          footerHeight,
          vatRegNo ? 1 : 0,
          companyRegNo ? 1 : 0,
          headerText || "INVOICE / STATUTORY FEE NOTE",
          footerText || "",
          paymentTerms || "Net 30 Days",
          bankName || "",
          accountName || "",
          sortCode || "",
          accountNumber || "",
          iban || "",
          bicSwift || "",
          paymentInstructions || "",
          isDefault ? 1 : 0,
        ]
      );
    }

    res.json({ message: "Invoice template and settings saved in database." });
  } catch (error: any) {
    console.error("Save Invoice Template Error:", error);
    res.status(500).json({ message: "Failed to save invoice template", error: error.message });
  }
});

// DELETE /api/practice/settings/invoice-templates/:id - Delete Invoice Template
router.delete("/invoice-templates/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const templateId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_invoice_templates WHERE id = ? AND practice_id = ?", [
      templateId,
      practiceId,
    ]);

    res.json({ message: "Invoice template removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete invoice template", error: error.message });
  }
});

// POST /api/practice/settings/banks - Add or Update Bank Details (Article 9000172239)
router.post("/banks", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await ensureTablesAndSeed(practiceId);

    const {
      id,
      bankName,
      accountType = "Current",
      currency = "Pound Sterling",
      accountCode = "5242",
      sortCode,
      accountNumber,
      iban,
      bicSwift,
      paymentInstructions,
      isDefault = false,
    } = req.body;

    if (!bankName || !bankName.trim()) {
      return res.status(400).json({ message: "Bank name is required." });
    }

    if (isDefault) {
      await pool.query("UPDATE practice_banks SET is_default = FALSE WHERE practice_id = ?", [practiceId]);
    }

    if (id) {
      await pool.query(
        `UPDATE practice_banks SET
          bank_name = ?, account_type = ?, currency = ?, account_code = ?,
          sort_code = ?, account_number = ?, iban = ?, bic_swift = ?,
          payment_instructions = ?, is_default = ?
        WHERE id = ? AND practice_id = ?`,
        [
          bankName.trim(),
          accountType,
          currency,
          accountCode,
          sortCode || "",
          accountNumber || "",
          iban || "",
          bicSwift || "",
          paymentInstructions || "",
          isDefault ? 1 : 0,
          id,
          practiceId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO practice_banks (
          practice_id, bank_name, account_type, currency, account_code,
          sort_code, account_number, iban, bic_swift, payment_instructions, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          practiceId,
          bankName.trim(),
          accountType,
          currency,
          accountCode,
          sortCode || "",
          accountNumber || "",
          iban || "",
          bicSwift || "",
          paymentInstructions || "",
          isDefault ? 1 : 0,
        ]
      );
    }

    res.json({ message: "Bank account saved in database." });
  } catch (error: any) {
    console.error("Save Bank Error:", error);
    res.status(500).json({ message: "Failed to save bank details", error: error.message });
  }
});

// DELETE /api/practice/settings/banks/:id - Remove Bank
router.delete("/banks/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const bankId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_banks WHERE id = ? AND practice_id = ?", [bankId, practiceId]);
    res.json({ message: "Bank account removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete bank", error: error.message });
  }
});

// POST /api/practice/settings/invoice-doc-templates - Add or Update Doc Invoice Template (Article 9000195170)
router.post("/invoice-doc-templates", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await ensureTablesAndSeed(practiceId);

    const {
      id,
      templateName,
      isDefault = false,
      fileName = "Invoice.docx",
      fileSize = "27.9 KB",
      bankName = "N/A",
      updatedOn = new Date().toLocaleDateString("en-GB"),
    } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ message: "Template name is required." });
    }

    if (isDefault) {
      await pool.query(
        "UPDATE practice_doc_invoice_templates SET is_default = FALSE WHERE practice_id = ?",
        [practiceId]
      );
    }

    if (id) {
      await pool.query(
        `UPDATE practice_doc_invoice_templates SET
          template_name = ?, is_default = ?, file_name = ?, file_size = ?,
          bank_name = ?, updated_on = ?
        WHERE id = ? AND practice_id = ?`,
        [templateName.trim(), isDefault ? 1 : 0, fileName, fileSize, bankName, updatedOn, id, practiceId]
      );
    } else {
      await pool.query(
        `INSERT INTO practice_doc_invoice_templates (
          practice_id, template_name, is_default, file_name, file_size, bank_name, updated_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [practiceId, templateName.trim(), isDefault ? 1 : 0, fileName, fileSize, bankName, updatedOn]
      );
    }

    res.json({ message: "Doc Invoice Template saved in database." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save doc template", error: error.message });
  }
});

// POST /api/practice/settings/invoice-doc-templates/reset - Reset to standard default
router.post("/invoice-doc-templates/reset", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    await pool.query("DELETE FROM practice_doc_invoice_templates WHERE practice_id = ?", [practiceId]);
    await pool.query(
      `INSERT INTO practice_doc_invoice_templates (
        practice_id, template_name, is_default, file_name, file_size, bank_name, updated_on
      ) VALUES
      (?, 'Default Template', 1, 'Invoice.docx', '27.9 KB', 'N/A', '-'),
      (?, 'Corporate Standard Template', 0, 'Corporate_Invoice.docx', '32.4 KB', 'Barclays Bank UK PLC', '12/04/2026'),
      (?, 'Consultancy Hourly Retainer', 0, 'Consulting_Invoice.docx', '29.1 KB', 'HSBC UK Bank PLC', '05/04/2026')`,
      [practiceId, practiceId, practiceId]
    );

    res.json({ message: "Doc templates reset to standard SanSuite defaults." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to reset templates", error: error.message });
  }
});

// DELETE /api/practice/settings/invoice-doc-templates/:id - Delete Doc Invoice Template
router.delete("/invoice-doc-templates/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const docId = parseInt(req.params.id);

    await pool.query("DELETE FROM practice_doc_invoice_templates WHERE id = ? AND practice_id = ?", [
      docId,
      practiceId,
    ]);

    res.json({ message: "Template removed." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete doc template", error: error.message });
  }
});

// GET /api/practice/settings/invoice-doc-templates/:id/download-zip - Stream Word docx templates ZIP
router.get("/invoice-doc-templates/:id/download-zip", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;

    let practiceName = "Practice";
    try {
      const [rows]: any = await pool.query("SELECT practice_name FROM practices WHERE id = ?", [practiceId]);
      if (rows && rows[0]?.practice_name) {
        practiceName = rows[0].practice_name;
      }
    } catch (_) {}

    const safeName = practiceName.replace(/[^a-zA-Z0-9_-]/g, " ").trim().replace(/\s+/g, " ");
    const zipFilename = `InvoiceTemplates_${safeName}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    const archive = new (ZipArchive as any)({ zlib: { level: 9 } });
    archive.on("error", (err: any) => {
      if (!res.headersSent) res.status(500).send({ error: err.message });
    });
    archive.pipe(res);

    const masterDir = fs.existsSync(path.resolve(process.cwd(), "server", "templates", "sansuite-docs"))
      ? path.resolve(process.cwd(), "server", "templates", "sansuite-docs")
      : path.resolve(process.cwd(), "server", "templates", "capium-docs");
    const files = ["Invoice.docx", "CreditNote.docx", "Dividend.docx", "Quotation.docx"];

    for (const f of files) {
      const filePath = path.join(masterDir, f);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: f });
      }
    }

    await archive.finalize();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to download zip", error: error.message });
    }
  }
});

// POST /api/practice/settings/onboarding - Save Onboarding Criteria
router.post("/onboarding", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { entityType = "Limited", criteriaList } = req.body;

    if (!Array.isArray(criteriaList)) {
      return res.status(400).json({ message: "Criteria list must be an array." });
    }

    // Delete existing criteria for this entity type
    await pool.query(
      "DELETE FROM practice_onboarding_criteria WHERE entity_type = ? AND practice_id = ?",
      [entityType, practiceId]
    );

    // Insert updated criteria
    for (let i = 0; i < criteriaList.length; i++) {
      const c = criteriaList[i];
      await pool.query(
        "INSERT INTO practice_onboarding_criteria (practice_id, entity_type, title, is_required, sequence) VALUES (?, ?, ?, ?, ?)",
        [practiceId, entityType, c.title, c.isRequired ? 1 : 0, i + 1]
      );
    }

    res.json({ message: `Onboarding criteria for ${entityType} updated in database.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save onboarding criteria", error: error.message });
  }
});

// POST /api/practice/settings/risk-assessment - Save Risk Criteria
router.post("/risk-assessment", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const { entityType = "Limited", criteriaList } = req.body;

    if (!Array.isArray(criteriaList)) {
      return res.status(400).json({ message: "Criteria list must be an array." });
    }

    // Delete existing risk criteria for this entity type
    await pool.query(
      "DELETE FROM practice_risk_criteria WHERE entity_type = ? AND practice_id = ?",
      [entityType, practiceId]
    );

    // Insert updated risk criteria
    for (const rc of criteriaList) {
      await pool.query(
        "INSERT INTO practice_risk_criteria (practice_id, entity_type, title, category, risk_weight, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
        [practiceId, entityType, rc.title, rc.category || "Client Risk", rc.riskWeight || "Medium", rc.riskLevel || "Normal"]
      );
    }

    res.json({ message: `Risk matrix for ${entityType} updated in database.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save risk criteria", error: error.message });
  }
});

export default router;
