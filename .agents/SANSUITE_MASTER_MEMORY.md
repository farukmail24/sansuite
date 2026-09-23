# SANSUITE COMPLETE ECOSYSTEM - MASTER ARCHITECTURE & 19-MODULE MEMORY KNOWLEDGE BASE

> **CRITICAL MANDATORY INSTRUCTION FOR ALL AGENTS & SESSIONS:**  
> This document is the **single source of truth** for the entire **SanSuite** ecosystem. It consolidates all **1,033 knowledge-base articles, 724 UI screenshot folders, statutory compliance formulas (HMRC & Companies House), database schema objects, backend API routes, and React components** across all **19 functional modules**.  
> Whenever any module, sub-feature, statutory tax rule, or screen is mentioned in any chat or session, refer to this document for instant, zero-friction context and execution.

---

## 1. ECOSYSTEM ARCHITECTURE & TECHNOLOGY STACK

```
SanSuite Enterprise Cloud Ecosystem
│
├── Frontend: React 18 + TypeScript, Vite, TailwindCSS / Vanilla CSS, TanStack Query v5, Wouter, Lucide React (0 Emojis)
├── Backend: Node.js + Express (TypeScript), Drizzle ORM, WebSocket Server, Multi-Tenant Session Engine
├── Database: MySQL (Database: `sansuite` on Port 3306)
├── Gateway Integrations: HMRC GovTalk XML Gateway (CT600, VAT MTD, RTI FPS/EPS, SA100), Companies House XML Gateway & REST API
└── Reference Knowledge: `d:/sansuite/sansuite info/` (1,033 Articles, 724 UI Image Folders)
```

---

## 2. MANDATORY GLOBAL RULES & CONVENTIONS

1. **NO EMOJIS (STRICT COMPLIANCE RULE)**:
   - **NEVER use text emojis** anywhere in application UI, labels, status badges, buttons, modals, cards, toast notifications, or icons across any component.
   - **ALWAYS use Lucide React SVG Icons** (`<Building2 />`, `<FileText />`, `<Calculator />`, `<Shield />`, `<CheckCircle2 />`, `<AlertCircle />`, `<Trash2 />`, `<Plus />`, `<RefreshCw />`).
2. **STATUTORY ACCURACY**:
   - Strictly follow UK statutory guidelines for HMRC tax rates, bands, allowances, relief formulas, and Companies House filing deadlines.
3. **COMPILATION & TYPE SAFETY**:
   - All TypeScript files MUST compile with **0 errors** using `npm run check` (`tsc`).

---

## 3. MASTER 19-MODULE REGISTRY & NAVIGATION DIRECTORY

| # | Module Name | `sansuite info` Path | Articles | UI Images | UI Routes | Backend API Paths | Primary MySQL DB Tables |
|---|---|---|---|---|---|---|---|
| 1 | **Practice Management (PM)** | `sansuite info/Practice Management/` | 65 | 61 | `/practice`, `/practice/clients`, `/practice/services`, `/practice/deadlines`, `/practice/conversations`, `/practice/proposals`, `/practice/documents`, `/practice/settings`, `/practice/reports`, `/public/sign/:token` | `server/api/practice.ts`, `server/api/practice-services.ts`, `server/api/practice-deadlines.ts`, `server/api/practice-conversations.ts`, `server/api/practice-loe.ts`, `server/api/practice-documents.ts` | `clients`, `pm_services`, `pm_service_steps`, `pm_client_services`, `pm_deadlines`, `pm_client_timeline`, `pm_email_templates`, `pm_conversations`, `pm_document_requests`, `pm_loe_documents`, `pm_aml_checks` |
| 2 | **Accounts Production (AP)** | `sansuite info/Accounts Production/` | 108 | 80 | `/accounts-production`, `/accounts-production/:clientId`, `/accounts-production/:clientId/tb`, `/accounts-production/:clientId/settings`, `/accounts-production/:clientId/submit` | `server/api/accounts-production.ts` | `accounting_periods`, `trial_balances`, `trial_balance_lines`, `ap_accounting_policies`, `ap_statutory_notes`, `ap_company_officers`, `ap_ixbrl_submissions`, `ap_report_options` |
| 3 | **Corporation Tax (CT600)** | `sansuite info/Corporation Tax/` | 59 | 40 | `/corporation-tax`, `/corporation-tax/returns`, `/corporation-tax/:clientId` | `server/api/corporation-tax.ts` | `ct600_returns`, `ct600_capital_allowances`, `ct600_loss_schedules`, `ct600_supplementary_forms`, `ct_submissions` |
| 4 | **Bookkeeping & MTD VAT** | `sansuite info/Bookkeeping/` | 139 | 123 | `/bookkeeping`, `/bookkeeping/:id`, `/bookkeeping/:id/invoices`, `/bookkeeping/:id/purchases`, `/bookkeeping/:id/bank`, `/bookkeeping/:id/bank/:accountId/reconcile`, `/bookkeeping/:id/journals`, `/bookkeeping/:id/vat`, `/bookkeeping/mtd`, `/bookkeeping/fixed-assets`, `/bookkeeping/dividends`, `/bookkeeping/cis-300`, `/bookkeeping/bank-feeds` | `server/api/bookkeeping.ts`, `server/api/journals.ts`, `server/api/cis.ts`, `server/api/dividends.ts` | `sales_invoices`, `invoice_items`, `purchases`, `purchase_items`, `bank_accounts`, `bank_transactions`, `vat_periods`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `items`, `cis_settings` |
| 5 | **Payroll & RTI** | `sansuite info/Payroll/` | 136 | 103 | `/payroll`, `/payroll/employees`, `/payroll/payruns`, `/payroll/pay-runs`, `/payroll/rti`, `/payroll/settings` | `server/api/payroll.ts` | `paye_schemes`, `employees`, `pay_runs`, `payslips`, `rti_submissions` |
| 6 | **Self Assessment (SA100/800)** | `sansuite info/Self Assessment/` | 103 | 77 | `/self-assessment`, `/self-assessment/sa100`, `/self-assessment/sa800`, `/self-assessment/questionnaire` | `server/api/self-assessment.ts` | `self_assessment_clients`, `sa100_returns`, `sa800_returns`, `sa_submissions` |
| 7 | **MTD for Income Tax (MTD IT)** | `sansuite info/MTD IT/` | 89 | 41 | `/mtd-it` | `server/api/mtd-it.ts` | `mtd_it_periods`, `mtd_it_submissions` |
| 8 | **Charities Accounts** | `sansuite info/Charities/` | 26 | 18 | `/charity-accounts` | `server/api/charity.ts` | `charity_funds`, `charity_accounts` |
| 9 | **Anti-Money Laundering (AML)** | `sansuite info/Anti-Money Laundering/` | 13 | 7 | `/aml` | `server/api/aml.ts`, `server/api/practice.ts` | `aml_checks`, `pm_aml_checks` |
| 10 | **Company Secretarial** | `sansuite info/Company Secretarial/` | 12 | 6 | `/company-secretarial`, `/company-secretarial/formations/new`, `/company-secretarial/:id` | `server/api/company-secretarial.ts`, `server/api/companies-house.ts` | `companies_house_submissions`, `company_formations`, `ch_directors`, `ch_api_settings` |
| 11 | **Time & Fees (WIP)** | `sansuite info/Time and Fees/` | 15 | 14 | `/time-fees` | `server/api/time-fees.ts` | `timesheets`, `time_entries`, `fee_invoices`, `wip_ledger` |
| 12 | **Capisign v2.0 (eSign)** | `sansuite info/Capisign v2.0/` | 16 | 10 | `/esign`, `/public/sign/:token` | `server/api/esign.ts`, `server/api/practice-loe.ts` | `esign_documents`, `pm_loe_documents` |
| 13 | **Capium Pay (SanSuite Pay)** | `sansuite info/Capium Pay/` | 30 | 7 | `/payments/checkout` | `server/api/gateway-checkout.ts` | `payment_transactions`, `payment_gateway_configs` |
| 14 | **Capium 365 (Client Portal)** | `sansuite info/Capium 365/` | 134 | 74 | `/365`, `/portal/client/:clientId` | `server/api/portal.ts` | `portal_users`, `portal_documents`, `portal_messages` |
| 15 | **Capium Hub (Collaboration)** | `sansuite info/Capium Hub/` | 8 | 8 | `/portal/hub` | `server/api/portal.ts` | `portal_approvals`, `portal_shared_files` |
| 16 | **Onboarding & Data Migration** | `sansuite info/Onboarding/` | 25 | 23 | `/onboarding`, `/practice/settings?tab=migration` | `server/api/system-admin.ts` | `migration_jobs`, `migration_mappings` |
| 17 | **General Settings & 2FA** | `sansuite info/General/` | 39 | 29 | `/settings`, `/system-admin`, `/profile` | `server/api/system-admin.ts`, `server/api/admin.ts` | `system_settings`, `announcements`, `subscription_plans`, `firm_details` |
| 18 | **SME User Experience** | `sansuite info/SME User Information/` | 2 | 1 | `/365/mobile`, `/portal/sme` | `server/api/portal.ts` | `sme_preferences`, `receipt_uploads` |
| 19 | **Refresher Courses & Learning** | `sansuite info/Refresher Courses/` & `Webinars/` | 14 | 2 | `/academy`, `/support/training` | `server/api/support.ts` | `learning_modules`, `webinar_schedules` |

---

## 4. DETAILED BREAKDOWN OF ALL 19 MODULES

### Module 1: Practice Management (PM)
- **Client 360° Hub (`/practice/clients`)**: 360-degree drawer view showing Client info, Fee schedules, Timeline history, Deadlines, and AML status.
- **Master Services Catalog (`/practice/services`)**: Configurable statutory services (Accounts, CT600, VAT, CS01, Payroll, SA100) with workflow steps and trigger rules.
- **Statutory Deadlines Engine (`/practice/deadlines`)**:
  - Accounts: AP End + 9 months
  - CT600: AP End + 12 months (Payment: 9m 1d)
  - VAT MTD: Quarter End + 1 month + 7 days
  - CS01: Review Date + 14 days
  - SA100: 31st January following tax year
  - Background daemon: `server/lib/complianceScheduler.ts` updates status every 12h.
- **Communications (`/practice/conversations`)**: Bulk emailer with merge tags (`{{client_name}}`, `{{company_number}}`, `{{deadline_date}}`), template library, SMS sender.
- **Proposals & Capisign E-Sign (`/practice/proposals`)**: Letters of Engagement (LoE), public URL `/public/sign/:token`, signature canvas, SHA-256 audit certificate.

### Module 2: Accounts Production (AP)
- **Frameworks**: FRS 102 Section 1A (Small Entities: Full, Abridged, Filleted), FRS 105 (Micro-Entities), Dormant Company Accounts (DCA).
- **Trial Balance Engine (`/accounts-production/:clientId/tb`)**: Live sync from bookkeeping journals (`/api/accounts-production/:clientId/live-tb`), auto-mapping to 4-digit UK nominal codes:
  - `1000-1999`: Fixed Assets (Tangible / Intangible)
  - `2000-2999`: Current Assets (Debtors, Stock, Bank, Cash)
  - `3000-3999`: Liabilities & Capital (Creditors, Share Capital, Retained Reserves)
  - `4000-4999`: Turnover / Revenue
  - `5000-5999`: Cost of Sales
  - `6000-8999`: Administrative & Operating Expenses
- **Statutory Financial Statements (`/accounts-production/:clientId?tab=statements`)**: P&L, Balance Sheet with Section 477 Small Company Audit Exemption statement.
- **Disclosure Notes (`/accounts-production/:clientId?tab=notes`)**: Note 1 (Employees s411), Note 2 (Fixed Assets Schedule), Note 3 (Debtors), Note 4/5 (Creditors), Note 7 (Director Loans s413).
- **iXBRL Filing (`/accounts-production/:clientId?tab=ixbrl`)**: UK GAAP tagged iXBRL generation & Companies House XML Gateway Electronic Submission.

### Module 3: Corporation Tax (CT600)
- **Profit Reconciliation**: $\text{Taxable Trading Profit} = \text{Net Profit} + \text{Depreciation} + \text{Disallowable Expenses} - \text{Capital Allowances} - \text{Loss Relief}$.
- **UK Tax Rates & Marginal Relief (2025/2026)**:
  - Small Profits Rate: **19%** ($\le £50,000$)
  - Main Rate: **25%** ($\ge £250,000$)
  - Marginal Relief Formula between £50,000 and £250,000: $(250,000 - \text{Profits Chargeable}) \times \frac{3}{200}$.
- **Capital Allowances Schedule**: AIA (£1M limit), FYA (100% full expensing), Main Pool WDA (18%), Special Rate Pool (6%), SBA.
- **Filing**: IR Mark calculation, pre-flight validation, GovTalk XML Gateway submission, and Capisign director approval dispatch.

### Module 4: Bookkeeping & MTD VAT
- **Sales & Purchases**: Quotes, Invoices, Recurring schedules, Multi-rate VAT (20%, 5%, 0%, Exempt).
- **Bank & Cash**: Multi-currency bank accounts, statement CSV import, auto bank reconciliation, cash coding.
- **MTD VAT Return 9-Box Standard Calculation**: Boxes 1 through 9 calculated and submitted to HMRC MTD VAT API.
- **CIS Module**: Subcontractor verification, deduction statements, CIS300 monthly returns.

### Module 5: Payroll & RTI
- **HMRC 2025/26 PAYE Tax Engine**: Personal Allowance £12,570, Basic 20%, Higher 40%, Additional 45%.
- **Class 1 National Insurance**: Employee (8%/2%), Employer (15%), Employment Allowance deduction.
- **RTI Electronic Filing**: Real-time FPS (Full Payment Submission) and EPS (Employer Payment Summary).
- **Pensions & Certificates**: Auto-Enrolment workplace pensions, PDF Payslips, P45 & P60 certificates.

### Module 6: Self Assessment (SA100 / SA800)
- **SA100 Individual Returns**: Supplementary pages for Employment, Self-Employment, Property, Dividends, Capital Gains.
- **SA800 Partnership Returns**: Partnership statement & profit allocation shares.
- **Client Questionnaire**: Online tax questionnaire for individual clients.

### Module 7: MTD for Income Tax (MTD IT)
- **Quarterly Income Updates**: Quarterly submission of business income and expenses to HMRC MTD IT API.
- **End of Period Statements (EOPS) & Final Declaration**.

### Module 8: Charities Accounts
- **Charity SORP FRS 102**: Receipts & Payments or Accruals accounts for Registered Charities and Charitable Companies.
- **Fund Accounting**: Restricted, Unrestricted, and Endowment funds tracking.

### Module 9: Anti-Money Laundering (AML)
- **Electronic ID Verification**: Passport, Driving Licence, Proof of Address checks.
- **Risk Assessment Matrix**: Risk scoring, PEP & Sanctions screening, AML compliance registers.

### Module 10: Company Secretarial
- **Companies House Gateway**: Confirmation Statement (CS01), Officer appointments/resignations, PSC Register changes, Company Formation Wizard.

### Module 11: Time and Fees (WIP)
- **Timesheets**: Daily and weekly staff time entry, billable vs non-billable hours, WIP ledger, client fee invoices.

### Module 12: Capisign v2.0 (eSign)
- **E-Signature Platform**: Touch/mouse signature pad, typography font signatures, audit certificates with SHA-256 hash.

### Module 13: Capium Pay (SanSuite Pay)
- **Payment Gateway**: Integrated client credit card and Open Banking payments, invoice payment links.

### Module 14: Capium 365 (Client Portal)
- **Client Web & Mobile Portal**: Document exchange, invoice approval, secure messaging with accountants.

### Module 15: Capium Hub
- **Document Management**: Centralized file sharing, client approval requests, folder management.

### Module 16: Onboarding & Data Migration
- **Migration Wizards**: Automated import from Xero, QuickBooks Online, Sage, and FreeAgent (Chart of Accounts, Opening Balances, Contacts).

### Module 17: General Settings & Security
- **System Admin**: Multi-Factor Authentication (2FA), Staff Roles & Permissions, Practice Details, Subscription Plans.

### Module 18: SME User Experience
- **Client Portal Experience**: Simplified UI for business owners to upload receipts and approve returns.

### Module 19: Refresher Courses & Learning Hub
- **Academy**: CPD training courses, accounting webinars, and UK legislative guides.

---

## 5. DATABASE ARCHITECTURE QUICK LOOKUP (`sansuite`)

- **Practice & Users**: `practices`, `users`, `clients`, `contacts`, `firm_details`.
- **Practice Management**: `pm_services`, `pm_service_steps`, `pm_client_services`, `pm_client_periods`, `pm_deadlines`, `pm_client_timeline`, `pm_email_templates`, `pm_conversations`, `pm_document_requests`, `pm_loe_templates`, `pm_loe_documents`, `pm_aml_checks`.
- **Accounts Production**: `accounting_periods`, `trial_balances`, `trial_balance_lines`, `annual_reports`, `management_reports`, `ap_accounting_policies`, `ap_statutory_notes`, `ap_company_officers`, `ap_ixbrl_submissions`, `ap_report_options`.
- **Corporation Tax**: `ct600_returns`, `ct600_capital_allowances`, `ct600_loss_schedules`, `ct600_supplementary_forms`, `ct_submissions`.
- **Bookkeeping & VAT**: `sales_invoices`, `invoice_items`, `purchases`, `purchase_items`, `bank_accounts`, `bank_transactions`, `vat_periods`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `items`, `cis_settings`.
- **Payroll**: `paye_schemes`, `employees`, `pay_runs`, `payslips`, `rti_submissions`.
- **Self Assessment**: `self_assessment_clients`, `sa100_returns`, `sa800_returns`, `sa_submissions`.
- **Company Secretarial & Admin**: `companies_house_submissions`, `company_formations`, `ch_directors`, `ch_api_settings`, `system_settings`, `announcements`, `subscription_plans`.

---

## 6. HOW TO WORK ON ANY MODULE IN FUTURE SESSIONS

1. **Check Table 3**: Identify the module name, UI route, backend path, and MySQL tables.
2. **Access `sansuite info`**: If you need exact UI layout reference or original help guides, open `sansuite info/<ModuleName>/raw_articles/` or `sansuite info/<ModuleName>/images/`.
3. **Execute Changes**: Follow the design rules (No emojis, Lucide icons, responsive layout) and run `npm run check` to ensure zero errors.
