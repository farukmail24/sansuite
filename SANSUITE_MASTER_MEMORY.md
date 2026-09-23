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
├── External Gateways: 
│   ├── Google Cloud OAuth 2.0 & Google Calendar API v3
│   ├── HMRC GovTalk XML Gateway (CT600, VAT MTD, RTI FPS/EPS, SA100)
│   └── Companies House REST API & XML Filing Gateway
└── Reference Knowledge: `d:/sansuite/sansuite info/` (1,033 Articles, 724 UI Image Folders)
```

---

## 2. MANDATORY GLOBAL RULES & CONVENTIONS

1. **NO EMOJIS (STRICT COMPLIANCE RULE)**:
   - **NEVER use text emojis** anywhere in application UI, labels, status badges, buttons, modals, cards, toast notifications, or icons across any component.
   - **ALWAYS use Lucide React SVG Icons** (`<Building2 />`, `<FileText />`, `<Calculator />`, `<Shield />`, `<CheckCircle2 />`, `<AlertCircle />`, `<Trash2 />`, `<Plus />`, `<RefreshCw />`, `<Mail />`, `<CalendarDays />`).
2. **STATUTORY ACCURACY**:
   - Strictly follow UK statutory guidelines for HMRC tax rates, bands, allowances, relief formulas, and Companies House filing deadlines.
3. **COMPILATION & TYPE SAFETY**:
   - All TypeScript files MUST compile with **0 errors** using `npm run check` (`tsc`).
4. **UI INSPIRATION & USER-FRIENDLINESS MANDATE**:
   - Always use provided UI screenshots as design and workflow inspiration to build ultra-modern, user-friendly, dynamic, and comprehensive features.
   - Deliver rich line-item calculations, chart-of-accounts mapping, VAT rate breakdowns, instant search/filtering, and seamless action workflows.
5. **ZERO MOCK DATA MANDATE (STRICT PRODUCTION INTEGRITY)**:
   - **NEVER use mock, fake, auto-seeded, or hardcoded fallback data** anywhere in application UI, forms, backend API responses, or database tables.
   - All rendered metrics, lists, tables, and statuses must originate strictly from authentic MySQL database records or external live statutory APIs.
   - If a table or record is empty in the database, NEVER show dummy placeholder cards or fake calculations. ALWAYS render a clean, professional, purpose-built **Empty State** with an explanation and an action button (e.g. `+ Log Staff AML Training`, `+ Add Client`) allowing the user to create real records.
   - Modal and form inputs must never pre-fill fake names, test emails, or dummy certificates. Placeholders must be instructional only.
6. **CAPIUM-INSPIRED WORKFLOWS & STRICT COPYRIGHT / BRAND PROTECTION**:
   - **100% Workflow & Functional Parity**: SanSuite is functionally inspired by Capium's industry-leading UK accounting suite. We preserve and match 100% of the business logic, operational options, statutory formulas, and accounting workflows so nothing is omitted.
   - **STRICTLY NO VISUAL CLONING (Copyright Protection)**: NEVER copy or clone Capium's visual theme, cyan/yellow color palette, exact layouts, or brand styling to prevent any copyright and intellectual property infringement.
   - **Original SanSuite Brand Identity**: All interfaces must be designed natively using SanSuite's premium purple/slate/emerald modern aesthetic, Lucide React SVG icons (never emojis), smooth glassmorphism, responsive cards, and clean zero-state tables.

---

## 3. MASTER 19-MODULE REGISTRY & NAVIGATION DIRECTORY

| # | Module Name | `sansuite info` Path | Articles | UI Images | UI Routes | Backend API Paths | Primary MySQL DB Tables |
|---|---|---|---|---|---|---|---|
| 1 | **Practice Management (PM)** | `sansuite info/Practice Management/` | 65 | 61 | `/practice`, `/practice/clients`, `/practice/tasks`, `/practice/services`, `/practice/deadlines`, `/practice/calendar`, `/practice/conversations`, `/practice/proposals`, `/practice/documents`, `/practice/settings`, `/practice/reports`, `/public/sign/:token` | `server/api/practice.ts`, `server/api/practice-services.ts`, `server/api/practice-deadlines.ts`, `server/api/practice-conversations.ts`, `server/api/practice-loe.ts`, `server/api/practice-documents.ts`, `server/api/practice-settings.ts` | `clients`, `tasks`, `pm_services`, `pm_service_steps`, `pm_client_services`, `pm_deadlines`, `pm_calendar_integrations`, `pm_client_timeline`, `pm_email_templates`, `practice_email_templates`, `pm_conversations`, `pm_document_requests`, `pm_loe_documents`, `pm_aml_checks` |
| 2 | **Accounts Production (AP)** | `sansuite info/Accounts Production/` | 108 | 80 | `/accounts-production`, `/accounts-production/:clientId`, `/accounts-production/:clientId/tb`, `/accounts-production/:clientId/settings`, `/accounts-production/:clientId/submit` | `server/api/accounts-production.ts` | `accounting_periods`, `trial_balances`, `trial_balance_lines`, `ap_accounting_policies`, `ap_statutory_notes`, `ap_company_officers`, `ap_ixbrl_submissions`, `ap_report_options` |
| 3 | **Corporation Tax (CT600)** | `sansuite info/Corporation Tax/` | 59 | 40 | `/corporation-tax`, `/corporation-tax/returns`, `/corporation-tax/:clientId` | `server/api/corporation-tax.ts` | `ct600_returns`, `ct600_capital_allowances`, `ct600_loss_schedules`, `ct600_supplementary_forms`, `ct_submissions` |
| 4 | **Bookkeeping & MTD VAT** | `sansuite info/Bookkeeping/` | 139 | 123 | `/bookkeeping`, `/bookkeeping/:id`, `/bookkeeping/:id/invoices`, `/bookkeeping/:id/purchases`, `/bookkeeping/:id/bank`, `/bookkeeping/:id/bank/:accountId/reconcile`, `/bookkeeping/:id/journals`, `/bookkeeping/:id/vat`, `/bookkeeping/mtd`, `/bookkeeping/fixed-assets`, `/bookkeeping/dividends`, `/bookkeeping/cis-300`, `/bookkeeping/bank-feeds` | `server/api/bookkeeping.ts`, `server/api/journals.ts`, `server/api/cis.ts`, `server/api/dividends.ts` | `sales_invoices`, `invoice_items`, `purchases`, `purchase_items`, `bank_accounts`, `bank_transactions`, `vat_periods`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `items`, `cis_settings` |
| 5 | **Payroll & RTI** | `sansuite info/Payroll/` | 136 | 103 | `/payroll`, `/payroll/employees`, `/payroll/payruns`, `/payroll/pay-runs`, `/payroll/rti`, `/payroll/settings` | `server/api/payroll.ts` | `paye_schemes`, `employees`, `pay_runs`, `payslips`, `rti_submissions` |
| 6 | **Self Assessment (SA100/800)** | `sansuite info/Self Assessment/` | 103 | 77 | `/self-assessment`, `/self-assessment/sa100`, `/self-assessment/sa800`, `/self-assessment/questionnaire` | `server/api/self-assessment.ts` | `self_assessment_clients`, `sa100_returns`, `sa800_returns`, `sa_submissions` |
| 7 | **MTD for Income Tax (MTD IT)** | `sansuite info/MTD IT/` | 89 | 41 | `/mtd-it` | `server/api/mtd-it.ts` | `mtd_it_periods`, `mtd_it_submissions` |
| 8 | **Charity Accounts** | `sansuite info/Charities/` | 26 | 18 | `/charity-accounts`, `/charity-accounts/:charityId/dashboard`, `/charity-accounts/:charityId/funds`, `/charity-accounts/:charityId/donations`, `/charity-accounts/:charityId/accounts-production`, `/charity-accounts/:charityId/manage` | `server/api/charity.ts` | `charities`, `charity_accounting_periods`, `charity_contacts`, `charity_funds`, `charity_fund_transfers`, `charity_donations`, `charity_recurring_donations`, `charity_donations_in_kind`, `charity_gift_aid_settings`, `charity_gift_aid_claims`, `charity_activities`, `charity_sponsor_events`, `charity_sorp_mappings`, `charity_trial_balance_lines`, `charity_trustees_reports`, `charity_independent_examiner_reports`, `charity_report_settings` |
| 9 | **Anti-Money Laundering (AML)** | `sansuite info/Anti-Money Laundering/` | 13 | 7 | `/aml` | `server/api/aml.ts`, `server/api/practice.ts` | `aml_checks`, `pm_aml_checks` |
| 10 | **Company Secretarial** | `sansuite info/Company Secretarial/` | 12 | 6 | `/company-secretarial`, `/company-secretarial/formations/new`, `/company-secretarial/:id` | `server/api/company-secretarial.ts`, `server/api/companies-house.ts` | `companies_house_submissions`, `company_formations`, `ch_directors`, `ch_api_settings` |
| 11 | **Time & Fees (WIP)** | `sansuite info/Time and Fees/` | 15 | 14 | `/time-fees` | `server/api/time-fees.ts` | `timesheets`, `time_entries`, `fee_invoices`, `wip_ledger` |
| 12 | **eSign (formerly SanSign / Capisign)** | `sansuite info/Capisign v2.0/` | 16 | 10 | `/esign`, `/public/sign/:token` | `server/api/esign.ts`, `server/api/practice-loe.ts` | `esign_documents`, `pm_loe_documents` |
| 13 | **Capium Pay (SanSuite Pay)** | `sansuite info/Capium Pay/` | 30 | 7 | `/payments/checkout` | `server/api/gateway-checkout.ts` | `payment_transactions`, `payment_gateway_configs` |
| 14 | **Capium 365 (Client Portal)** | `sansuite info/Capium 365/` | 134 | 74 | `/365`, `/portal/client/:clientId` | `server/api/portal.ts` | `portal_users`, `portal_documents`, `portal_messages` |
| 15 | **Capium Hub (Collaboration)** | `sansuite info/Capium Hub/` | 8 | 8 | `/portal/hub` | `server/api/portal.ts` | `portal_approvals`, `portal_shared_files` |
| 16 | **Onboarding & Data Migration** | `sansuite info/Onboarding/` | 25 | 23 | `/onboarding`, `/practice/settings?tab=migration` | `server/api/system-admin.ts` | `migration_jobs`, `migration_mappings` |
| 17 | **General Settings & 2FA** | `sansuite info/General/` | 39 | 29 | `/settings`, `/system-admin`, `/profile` | `server/api/system-admin.ts`, `server/api/admin.ts` | `system_settings`, `announcements`, `subscription_plans`, `firm_details` |
| 18 | **SME User Experience** | `sansuite info/SME User Information/` | 2 | 1 | `/365/mobile`, `/portal/sme` | `server/api/portal.ts` | `sme_preferences`, `receipt_uploads` |
| 19 | **Refresher Courses & Learning** | `sansuite info/Refresher Courses/` & `Webinars/` | 14 | 2 | `/academy`, `/support/training` | `server/api/support.ts` | `learning_modules`, `webinar_schedules` |

---

## 4. PRACTICE MANAGEMENT (PM) SUITE - DETAILED RECENT ARCHITECTURES

### A. Google Calendar 2-Way Sync Engine
- **OAuth 2.0 Integration**:
  - Routes: `/api/auth/google` (initiation) and `/api/auth/google/callback` (callback token exchange).
  - Dynamic user profile lookup: `https://www.googleapis.com/oauth2/v2/userinfo` dynamically fetches authenticated Gmail account (zero hardcoded emails).
  - Storage: `pm_calendar_integrations` table (`provider`, `account_email`, `access_token`, `refresh_token`, `expiry_date`, `is_active`, `last_synced_at`).
  - Sync API: `POST /api/pm/calendar/sync` and `GET /api/pm/calendar/integrations`.
  - Event Dispatch: Automatically pushes statutory deadline and meeting events to Google Calendar (`https://www.googleapis.com/calendar/v3/calendars/primary/events`) with 30-min popup and email reminders.

### B. Tasks Workflow & Multi-View Engine (`/practice/tasks`)
- **Five Dedicated Views (Aligned with Capium Architecture)**:
  1. **Kanban View**: 4 columns (`To Do`, `In Progress`, `In Review`, `Completed`) with buttery-smooth optimistic drag & drop and visual drop indicators.
  2. **List View**: Sortable tabular view with inline status modification and single-click completion.
  3. **Calendar View**: Left `Calendar Overview` panel (Current Month Progress %, Upcoming Month, Tasks/Services/Clients count), interactive 7-column Month grid with colored priority markers (Red=High, Yellow=Low, Blue/Black=Normal), Month/Week toggles, and click-on-date task creation.
  4. **By Status View**: 4 columns (`OverDue`, `InProgress`, `Completed`, `Not Started`) with quick task addition and drag-and-drop.
  5. **Task Reports View**: Direct links (`> Tasks Report`, `> Tasks Users Report`, `> Tasks Notes Report (New)`, `> Tasks Notes Report (Old)`) redirecting to `/practice/reports?report=tasks-master`, etc.
- **Create New Ad-hoc Task Modal**:
  - Fields: `Task Type` (Client Billable, Client Non Billable, Other Non Billable), `Task Title *`, `Task Description`, `Client *`, `Service *`, `Email Notification` toggle, `Start Date`, `Due Date *`, `Visibility` (Public/Private), `Priority` (Low/Normal/High/Urgent), `Assign to *` (Staff select), and `Checklist` (Dynamic reorderable steps + Add Step).

### C. Statutory Compliance Deadlines & Automated Email Engine (`/practice/deadlines`)
- **Calculation Rules**:
  - Annual Accounts: AP End + 9 Months (or live Companies House API sync).
  - Corporation Tax (CT600): AP End + 12 Months (Tax payment: AP End + 9 Months 1 Day).
  - VAT Return: Quarter End + 1 Month + 7 Days.
  - Confirmation Statement (CS01): Review Date + 14 Days.
  - Self Assessment: 31st January following tax year end (5th April).
- **Background Daemon (`server/lib/complianceScheduler.ts`)**:
  - Runs on startup and every 12 hours.
  - Updates deadline status (`Upcoming` -> `Due` [$\le 30$ days] -> `Overdue` [$< 0$ days]).
  - **Automated Milestone Email Dispatcher**: Automatically dispatches statutory compliance notice emails at **30, 14, 7, 3, and 1 day** milestones to clients, logging activities into `pm_conversations` and `pm_client_timeline`.
- **Manual & Batch UI Actions**:
  - `Mail` / `Remind` Button on each deadline card/row: Calls `POST /api/pm/deadlines/:id/send-reminder` for instant one-click notification.
  - `Dispatch Reminders` Button: Calls `POST /api/pm/deadlines/reminders/dispatch-all` to batch notify all clients with upcoming deadlines.

### D. Dynamic Email Template Merge Engine (`/practice/settings?tab=email_templates`)
- **Template Storage**: `practice_email_templates` / `pm_email_templates`.
- **Capium-Aligned Template Types**:
  - `Update Task Template`
  - `Delete Task Template`
  - `Task Reminder Template`
  - `Update Recurring Tasks Template`
  - `New Recurring Task Template`
  - `Delete Recurring Task Template`
  - **`Deadline Reminder Template`**
- **Dynamic Token Tags**:
  - `{UserName}` / `{AccountantName}`: Staff / Manager Name
  - `{ClientName}`: Client Name / Contact
  - `{TaskNumber}`: Task / Deadline ID
  - `{TaskName}` / `{DeadlineName}`: Obligation / Service Name
  - `{TaskDueDate}` / `{StatutoryDueDate}`: Formatted Due Date
  - `{DaysRemaining}`: Countdown string (e.g. `14 Day(s)`)
  - `{FirmName}`: Practice Name
  - `{AccountantEmail}`: Practice / Sender Email
  - `{AccountantNumber}`: Practice Contact Phone
- **Token Merge Execution**: Automated substitutions occur dynamically whenever reminders are sent via individual UI trigger, batch dispatch, or compliance background daemon.

### E. Central Statutory & Tax Submissions Matrix (`/practice` Dashboard)
- **Endpoint**: `GET /api/pm/submissions`.
- **Filing Columns**:
  - `CT`: Corporation Tax (CT600)
  - `AP`: Accounts Production (Companies House FRS 102 / 105)
  - `SA100`, `SA800`, `SA900`: Self Assessment
  - `MTD-VAT`: Making Tax Digital VAT Returns
  - `BK-CIS`: CIS Monthly Submissions
  - `PR-FPS`, `PR-EPS`, `PR-P60`, `PR-P45`, `PR-11D`, `PR-EYU`: Payroll RTI Submissions
- **Actions**: `360° Filing` deep drill-down per client.

---

## 5. DATABASE ARCHITECTURE QUICK LOOKUP (`sansuite`)

- **Practice & Users**: `practices`, `users`, `clients`, `contacts`, `firm_details`.
- **Practice Management & AML**: `tasks`, `pm_services`, `pm_service_steps`, `pm_client_services`, `pm_client_periods`, `pm_deadlines`, `pm_calendar_integrations`, `pm_client_timeline`, `pm_email_templates`, `practice_email_templates`, `pm_conversations`, `pm_document_requests`, `pm_loe_templates`, `pm_loe_documents`, `pm_aml_checks`, `pm_aml_checklist_answers`, `pm_onboarding_checks`, `pm_kyc_documents`.
- **Accounts Production**: `accounting_periods`, `trial_balances`, `trial_balance_lines`, `annual_reports`, `management_reports`, `ap_accounting_policies`, `ap_statutory_notes`, `ap_company_officers`, `ap_ixbrl_submissions`, `ap_report_options`.
- **Corporation Tax**: `ct600_returns`, `ct600_capital_allowances`, `ct600_loss_schedules`, `ct600_supplementary_forms`, `ct_submissions`.
- **Bookkeeping & VAT**: `sales_invoices`, `invoice_items`, `purchases`, `purchase_items`, `bank_accounts`, `bank_transactions`, `vat_periods`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `items`, `cis_settings`.
- **Payroll**: `paye_schemes`, `employees`, `pay_runs`, `payslips`, `rti_submissions`.
- **Self Assessment**: `self_assessment_clients`, `sa100_returns`, `sa800_returns`, `sa_submissions`.
- **Company Secretarial & Admin**: `companies_house_submissions`, `company_formations`, `ch_directors`, `ch_api_settings`, `system_settings`, `announcements`, `subscription_plans`.

---

## 6. AML & KYC COMPLIANCE INTEGRATION ARCHITECTURE (MULTI-TENANT)

### Multi-Tenant Storage:
- **Table**: `practice_aml_settings` (`practice_id`, `default_provider`, `dilisense_api_key`, `xama_api_key`, `xama_account_id`, `veriphy_api_key`, `veriphy_account_id`, `open_sanctions_api_key`, `open_sanctions_api_url`).
- Each accounting firm / practice stores and manages their own commercial subscriptions. If unconfigured, the system safely falls back to platform environment defaults.

### Supported Live Providers:
1. **OpenSanctions (Open Source & Free `https://api.opensanctions.org`)**:
   - **Endpoints**: `GET /search/default`, `GET /match/default`.
   - **Capabilities**: Free global open-source PEP, Sanctions (UN, EU, US OFAC, UK OFSI), Interpol, and criminal watchlists.
   - **Backend Route**: `server/api/aml.ts` (`/api/aml/opensanctions/check`, `/api/aml/opensanctions/test-connection`).

2. **Dilisense REST API (`https://api.dilisense.com/v1`)**:
   - **Endpoints**: `GET /checkIndividual`, `GET /checkEntity`.
   - **Capabilities**: Global Sanctions (OFSI, OFAC, EU, UN), PEP, Criminal & Adverse Media with fuzzy name matching (100 free checks monthly on developer signup).
   - **Backend Route**: `server/api/aml.ts` (`/api/aml/dilisense/check`, `/api/aml/dilisense/test-connection`).

3. **Xama Technologies Practice Management API (`https://api.xamatech.com/v1`)**:
   - **Endpoints**: `/verifications`, `/accounts/me`.
   - **Capabilities**: Biometric Identity Verification (eIDV), No-login Client Onboarding Portal Link generation, Companies House UBO/PSC sync.
   - **Backend Route**: `server/api/aml.ts` (`/api/aml/xama/initiate`, `/api/aml/xama/test-connection`, `/api/aml/xama/check/:checkId`).

4. **Veriphy (Davies Group - UK Electronic IDV & SmartSearch `https://api.veriphy.co.uk/v1`)**:
   - **Endpoints**: `/status`, `/check`.
   - **Capabilities**: UK Electoral roll, Credit bureau checks, PEP & Sanctions screening.
   - **Backend Route**: `server/api/aml.ts` (`/api/aml/veriphy/check`, `/api/aml/veriphy/test-connection`).

---

## 7. MY ADMIN (PRACTICE WORKSPACE) DYNAMIC ARCHITECTURE

### Key Database Tables:
- `firm_details`: Practice legal and business details, `hmrc_agent_code`, `sa_agent_id`, `ct_agent_id`, `notification_settings`, `sms_balance`.
- `firm_notes`: Firm internal notes (`id`, `practice_id`, `title`, `text`, `created_by`, `created_at`).
- `practice_backups`: Encrypted practice database snapshots (`id`, `backup_code`, `practice_id`, `requested_by`, `file_format`, `status`, `file_size`, `file_path`, `created_at`).
- `practice_referrals`: Colleague invitations and partner tracking (`id`, `practice_id`, `colleague_name`, `colleague_email`, `message`, `status`, `created_at`).
- `practice_media_files`: Uploaded media files & attachments (`id`, `practice_id`, `name`, `type`, `size`, `url`, `category`, `storage_driver`, `storage_location`, `created_at`).
- `users`: Team members with persisted `permissions_json` column.
- `clients`: Registered clients with persisted `extra_details_json` column.

### Backend Endpoints:
- `server/api/admin.ts`:
  - Firm Details: `GET /api/admin/firm-details`, `POST /api/admin/firm-details`.
  - Internal Notes: `GET /api/admin/notes`, `POST /api/admin/notes`, `DELETE /api/admin/notes/:id`.
  - Practice Backups: `GET /api/admin/backups`, `POST /api/admin/backups`, `GET /api/admin/backups/:id/download`.
  - Referrals: `GET /api/admin/referrals`, `POST /api/admin/referrals`.
  - Bulk SMS: `POST /api/admin/sms/send`, `POST /api/admin/sms/topup`.
  - Media & Files: `GET /api/admin/media`, `POST /api/admin/media`, `DELETE /api/admin/media/:id`.
- `server/api/myadmin.ts`:
  - Users: `GET /api/myadmin/users`, `POST /api/myadmin/users`, `PATCH /api/myadmin/users/:id`, `DELETE /api/myadmin/users/:id`, `POST /users/import-csv`.
  - Clients: `GET /api/myadmin/clients`, `POST /api/myadmin/clients`, `PATCH /api/myadmin/clients/:id`, `DELETE /api/myadmin/clients/:id`, `POST /clients/import-csv`.
  - Contacts: `GET /api/myadmin/contacts`, `POST /api/myadmin/contacts`, `PATCH /api/myadmin/contacts/:id`, `DELETE /api/myadmin/contacts/:id`, `POST /contacts/import-csv`.
- `server/routes.ts`:
  - Media Settings: `GET /api/media-settings`, `POST /api/media-settings` (persisted to `system_settings`).

---

## 8. HOW TO WORK ON ANY MODULE IN FUTURE SESSIONS

1. **Check Table 3 & Section 4**: Identify the module name, UI route, backend path, and MySQL tables.
2. **Access `sansuite info`**: If you need exact UI layout reference or original help guides, open `sansuite info/<ModuleName>/raw_articles/` or `sansuite info/<ModuleName>/images/`.
3. **Execute Changes**: Follow the design rules (No emojis, Lucide icons, responsive layout) and run `npm run check` (`tsc`) to ensure zero compilation errors.

---

## 9. ACCOUNTS PRODUCTION (AP) & ESIGN ARCHITECTURE

### Key Database Tables:
- `accounting_periods`: Accounting periods per client (`id`, `client_id`, `start_date`, `end_date`, `period_name`, `accounting_standard`, `due_date`, `status`, `is_locked`).
- `trial_balances`: Header records for trial balances (`id`, `client_id`, `period_id`, `ref_no`, `description`, `mode_of_import`, `total_debit`, `total_credit`, `is_balanced`, `status`).
- `trial_balance_lines`: Nominal ledger line entries (`id`, `tb_id`, `nominal_code`, `account_name`, `category`, `debit`, `credit`).
- `ap_accounting_policies`: Disclosed accounting policies (`id`, `client_id`, `period_id`, `accounting_standard`, `basis_of_preparation`, `turnover_policy`, `tangible_assets_policy`, `financial_instruments_policy`).
- `ap_statutory_notes`: Companies Act 2006 disclosures (`id`, `client_id`, `period_id`, `average_employees`, `tangible_assets_schedule_json`, `debtors_breakdown_json`, `creditors_due_within_one_year_json`, `creditors_due_after_one_year_json`, `share_capital_json`, `directors_loans_json`).
- `ap_company_officers`: Company directors registry (`id`, `client_id`, `name`, `role`, `appointed_on`, `resigned_on`, `is_signatory`).
- `ap_ixbrl_submissions`: iXBRL tagging and Companies House gateway filing logs (`id`, `client_id`, `period_id`, `ch_transaction_id`, `submission_number`, `accounts_type`, `ixbrl_content`, `status`, `submitted_at`).
- `ap_report_options`: Comprehensive report configuration and disclosures (`id`, `client_id`, `company_name`, `registration_number`, `settings_json`).
- `esign_documents`: Digital signature requests and audit trails (`id`, `client_id`, `title`, `source_module`, `status`, `signer_name`, `signer_email`, `public_url`, `created_at`, `completed_at`).

### Core Production Standards:
- **Global eSign Standard**: "SanSign" has been permanently renamed to **eSign** across all UI labels, components (`SendToeSignModal`), certificates (`ESIGN DIGITAL CERTIFICATE OF COMPLETION`), and API dispatch routes.
- **Zero Mock Data Standard**: All metrics, periods, officers, notes, trial balances, and submissions are 100% database-backed from MySQL. Purpose-built Empty States are rendered when tables have zero records.
- **Statutory Frameworks**: FRS 102 Section 1A (Small Entities), FRS 105 (Micro-Entities), Dormant Company Accounts (DCA), with automatic Small Company Audit Exemption (Section 477 Companies Act 2006).

