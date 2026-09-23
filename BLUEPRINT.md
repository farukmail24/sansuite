# SanSuite SaaS Platform — System Blueprint & Architecture

This document serves as the comprehensive architectural blueprint for the SanSuite SaaS Platform. It outlines the technology stack, database schema, module architecture, and API structure of the application.

---

## 1. Technology Stack

The platform is built as a modern, monolithic web application with a strongly typed TypeScript ecosystem across both the frontend and backend.

### **Frontend**
*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Routing:** Wouter (Lightweight, declarative routing)
*   **State Management & Data Fetching:** TanStack React Query (v5)
*   **Styling:** Tailwind CSS + custom CSS (`index.css`)
*   **UI Components:** Custom UI library (accessible components like standard buttons, inputs, modals), Icons by `lucide-react`
*   **Forms & Validation:** React Hook Form + Zod

### **Backend**
*   **Server:** Node.js with Express.js
*   **Database ORM:** Drizzle ORM
*   **Database Engine:** MySQL / PostgreSQL (via connection pooling)
*   **Authentication:** Passport.js (Local Strategy with Session-based auth)
*   **API Architecture:** RESTful APIs grouped by business domain

### **Shared**
*   **Schema & Types:** Zod schemas and Drizzle table definitions are shared between frontend and backend via the `@shared` alias to ensure end-to-end type safety.

---

## 2. Core Modules & Features

The platform is designed as an all-in-one ecosystem for accounting practices. It is divided into several distinct domain modules:

### A. Practice Management
*   **CRM (Clients & Contacts):** Centralized client data, KYC, and AML status tracking.
*   **Task Management:** Interactive drag-and-drop Kanban board (Todo, In Progress, Review, Completed).
*   **Deadlines Tracker:** Automated tracking of HMRC submission deadlines (VAT, CT600, Confirmation Statements).

### B. Time & Fees
*   **Jobs Management:** Create and assign specific jobs/projects to clients.
*   **Timesheets:** Staff can log hours against specific jobs, supporting billable/non-billable tracking.
*   **Invoicing:** (Future) Convert logged time directly into fees/invoices.

### C. Bookkeeping
*   **Chart of Accounts (CoA):** Client-specific nominal codes, categories, and default tax rates.
*   **Sales Invoices & Purchases:** Full lifecycle creation of invoices and bills, including multi-line item VAT calculations.
*   **Bank Accounts & Reconciliation:** Track multiple bank balances and match transactions.
*   **VAT Returns:** 4-step wizard to calculate VAT liability (Box 1-9) based on logged invoices and purchases.

### D. Payroll (Pay Run Engine)
*   **Employee Management:** Track tax codes (e.g., 1257L), NI numbers, salaries, and pension opt-ins.
*   **Pay Runs:** Generate monthly or weekly pay runs.
*   **Calculation Engine:** Automated calculation of Gross Pay, PAYE (Income Tax), Employee NI, and Employer/Employee Pensions.
*   **Payslip UI:** Detailed, printable payslip views with full deductions breakdown.

### E. Accounts Production
*   **Client Workspace:** A centralized dashboard per client for financial reporting.
*   **Trial Balance Import:** Ability to map and import Trial Balances (CSV/Manual).
*   **Financial Reports:** Generation of FRS 102 / FRS 105 compliant annual reports.

### F. Taxation
*   **Corporation Tax (CT600):** Form generation, marginal relief calculations, and HMRC submission tracking.
*   **Self Assessment (SA100):** Individual tax returns (Employment, Self-Employment, Property).
*   **Partnership Return (SA800):** Partnership income and profit distribution.
*   **Client Questionnaire:** 17-question intake form to gather tax data directly from clients.

### G. My Admin (Firm Management)
*   **User Management:** Role-based access control (Admin, Accountant, Auditor, Staff).
*   **Subscription Management:** Visual display of current tier (Small/Medium/Large) and client usage limits.

---

## 3. Database Schema (Drizzle ORM)

The database is highly relational. Below are the key tables organized by domain:

*   **Auth & Core:** `users`, `practices`, `clients`, `contacts`
*   **Practice Management:** `tasks`, `deadlines`
*   **Time & Fees:** `jobs`, `timesheets`
*   **Bookkeeping:** `chart_of_accounts`, `sales_invoices`, `purchases`, `bank_accounts`, `vat_periods`
*   **Payroll:** `employees`, `pay_runs`, `payslips`
*   **Tax & AP:** `accounting_periods`, `trial_balances`, `annual_reports`, `ct600_returns`, `self_assessment_clients`, `sa100_returns`, `sa800_returns`

*All tables use standard integer primary keys, timestamps (`createdAt`, `updatedAt`), and strict foreign key constraints.*

---

## 4. Directory Structure

\`\`\`text
SanSuite/
├── client/
│   ├── src/
│   │   ├── components/      # Reusable UI components (Sidebar, Topbar, Modals)
│   │   ├── hooks/           # Custom React hooks (useAuth, useToast)
│   │   ├── lib/             # Utilities (queryClient, tailwind merge)
│   │   ├── pages/           # Page-level components grouped by module
│   │   │   ├── admin/
│   │   │   ├── accounts-production/
│   │   │   ├── bookkeeping/
│   │   │   ├── corporation-tax/
│   │   │   ├── payroll/
│   │   │   ├── practice/
│   │   │   ├── self-assessment/
│   │   │   └── timefees/
│   │   ├── App.tsx          # Main React Router setup
│   │   └── index.css        # Global styles and Tailwind directives
├── server/
│   ├── api/                 # Express routers separated by domain
│   │   ├── accounting.ts    # CT600, SA100, SA800, AP
│   │   ├── admin.ts         # User management, Firm settings
│   │   ├── bookkeeping.ts   # Invoices, VAT, CoA
│   │   ├── payroll.ts       # Payruns, Payslips engine
│   │   ├── practice.ts      # Tasks, CRM, Deadlines
│   │   └── timefees.ts      # Jobs, Timesheets
│   ├── auth.ts              # Passport.js authentication logic
│   ├── db.ts                # Database connection initialization
│   └── routes.ts            # Main router aggregator
├── shared/
│   └── schema.ts            # Drizzle definitions and Zod schemas (Single Source of Truth)
├── drizzle.config.ts        # Drizzle ORM configuration
├── vite.config.ts           # Vite bundler configuration
└── package.json             # Dependencies and scripts
\`\`\`

---

## 5. Security & Authentication

*   **Middleware:** All API routes (except login/register) are protected by `authMiddleware`, which verifies the active session.
*   **Tenant Isolation:** Most queries inherently filter by `practiceId` or via linked `clientId`s to ensure firms only see their own data.
*   **Password Hashing:** `scrypt` is used for secure password hashing before storing in the database.

---

## 6. Future Scalability & Roadmap

As the platform scales, the following technical enhancements should be considered:

1.  **Microservices Transition:** If the monolithic Express backend becomes a bottleneck, domains like the Payroll Calculation Engine or Tax HMRC Integrations can be decoupled into microservices.
2.  **HMRC MTD (Making Tax Digital) API Integration:** Currently, submissions are tracked via status strings ("Submitted"). True integration will require implementing HMRC OAuth2.0 flows and XML/JSON payload generation.
3.  **Real-time Capabilities:** Implementing WebSockets (e.g., Socket.io) for real-time Kanban board updates across multiple users, or real-time notifications for completed background tasks (like heavy payroll calculations).
4.  **Database Migration Management:** Moving from ad-hoc manual table creation to a strict CI/CD integrated `drizzle-kit migrate` workflow for robust schema evolution.
