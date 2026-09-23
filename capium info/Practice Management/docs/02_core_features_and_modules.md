# Practice Management - Complete Features & Module Specifications

This document outlines the detailed functional specifications of all 13 core subsystems of the Practice Management module, based on exhaustive analysis of the Capium help center articles.

---

## 1. Practice Management Dashboard & Overview
- **Reference Articles:** `9000165732_practice-management-dashboard`, `9000203352_how-to-view-your-users-activity`
- **Core Capabilities:**
  - **KPI Metrics Cards:**
    - Total Active Clients & New Clients added in the last 30 days.
    - Total Upcoming Deadlines & Deadlines due this week.
    - Overdue Deadlines requiring immediate attention.
    - Active Tasks count broken down by High / Medium / Low priority.
  - **Visual Interactive Charts:**
    - **Deadlines by Status Chart:** Donut / Bar chart categorizing deadlines into (Due, Overdue, Submitted). Clicking any category drills down into the filtered Deadlines list.
    - **Tasks by Priority Chart:** Visual breakdown of current workloads.
    - **Staff Workload Distribution Chart:** Number of active tasks assigned per team member, filterable by specific service type.
  - **Deadlines Quick Table:**
    - Filterable by *All*, *Upcoming*, *Overdue*. Allows direct status transition or deadline completion.
  - **Real-Time Activity Stream:**
    - Audit log of client additions, document uploads, submissions, and status changes for Current Week and Current Month.

---

## 2. Client Management & CRM
- **Reference Articles:** `9000165736`, `9000165779`, `9000179570`, `9000188953`, `9000201273`, `9000206287`, `9000214656`, `9000216489`, `9000235439`, `9000236608`, `9000271639`
- **Client Types Supported:**
  - Limited Company (Ltd, Plc)
  - Sole Trader / Individual
  - Partnership & Limited Liability Partnership (LLP)
  - Trust & Charity
- **Client Profile & Information Hub:**
  - **Overview Tab:** Company name, registration number, UTR, VAT number, incorporation date, registered address, primary contact info.
  - **Services Tab:** List of assigned statutory and bespoke services, billing fees, assigned manager, and service status.
  - **Deadlines Tab:** Complete list of all statutory (Companies House, HMRC CT600, VAT, MTD IT) and custom deadlines.
  - **Interactive Timeline Tab:** Chronological activity feed showing all emails, notes, logged phone calls, meetings, documents, and system events. Users can pin critical notes to the top of the timeline.
  - **Documents Tab:** Storage of client uploaded files, signed LoE, tax returns, and folder directories.
  - **Tasks Tab:** Pending and completed tasks related to the client.
- **Client Onboarding Checklist:**
  - Configurable multi-step onboarding workflow (e.g. Identity Proof, AML Verification, 64-8 Agent Authorisation, Previous Accountant Clearance, Letter of Engagement Signing).
- **AML & Risk Assessment Checks:**
  - Checklist for Anti-Money Laundering compliance (ID check, Proof of Address, PEP check, Risk classification: Low/Medium/High).
- **Global Custom Fields:**
  - Ability for the practice administrator to define dynamic custom fields (Text, Date, Dropdown, Number) that automatically appear on all client profiles.
- **Client Deletion & Reactivation:**
  - Soft delete option with archive state, allowing full audit history retention and reactivation via Administration.
- **Exporting Clients:**
  - Full CSV / Excel export with column filtering and date ranges.

---

## 3. Services & Workflow Steps Configuration
- **Reference Articles:** `9000165742`, `9000165770`, `9000166605`, `9000225224`, `9000235774`, `9000267572`
- **Standard Pre-configured Services:**
  - Accounts Production (Statutory annual accounts for Companies House & HMRC)
  - Corporation Tax (CT600)
  - Self Assessment Tax Return (SA100 / SA800 / SA900)
  - Bookkeeping & Management Accounts
  - Payroll & Pension Auto-enrolment
  - VAT Returns (Quarterly / Monthly / MTD for VAT)
  - Confirmation Statement (CS01)
  - Making Tax Digital for Income Tax (MTD IT)
- **Custom Bespoke Services:**
  - Ability to create custom services (e.g. Business Advisory, Cashflow Forecasting, R&D Tax Relief).
- **Workflow Steps (Sub-tasks) Definition:**
  - Each service can have custom ordered workflow steps (e.g., *1. Request Bank Statements -> 2. Reconcile Transactions -> 3. Draft Accounts -> 4. Manager Review -> 5. Send for Client Signature -> 6. Submit to Companies House & HMRC*).
- **Service Fee Adjustments & Invoicing Frequency:**
  - Fixed fee, recurring monthly retainer, hourly rate, or one-off setup fee per client assignment.

---

## 4. Deadlines & Statutory Compliance Engine
- **Reference Articles:** `9000165771`, `9000165783`, `9000172240`, `9000172244`, `9000172245`, `9000203137`, `9000236557`, `9000247184`, `9000276995`
- **Automated Deadline Calculation:**
  - **Accounts Filing:** 9 months after accounting period end date for private companies.
  - **CT600 Filing:** 12 months after accounting period end date (tax payment deadline is 9 months + 1 day).
  - **VAT Return:** 1 calendar month and 7 days after the end of the VAT quarter.
  - **Confirmation Statement:** 14 days after the review period end date.
  - **Self Assessment:** 31st January following the end of the tax year (online) or 31st October (paper).
- **Deadline Status Lifecycle:**
  - `UPCOMING` -> `DUE` -> `OVERDUE` -> `SUBMITTED` -> `COMPLETED`
- **Deadline Refresh Engine:**
  - Automated sync and manual "Refresh Deadlines" action that rolls forward accounting periods, computes new filing deadlines upon year-end completion, and synchronizes with Companies House APIs.
- **Submissions Summary:**
  - Centralized dashboard showing all filings sent to HMRC and Companies House with submission IDs, timestamps, and acceptance receipts.

---

## 5. Task Management & Scheduling
- **Reference Articles:** `9000171881`, `9000172247`, `9000218653`, `9000219750`, `9000219857`
- **Task Capabilities:**
  - Create ad-hoc tasks or link tasks directly to a specific Client, Service, or Statutory Deadline.
  - Set priorities (Low, Medium, High, Urgent) and due dates.
  - Assign to individual staff members or teams.
  - Checklist of sub-steps with completion progress bar.
- **Quick Add Feature:**
  - Floating "+ Quick Add" button accessible from any page to rapidly create a Task, Client, Deadline, Note, or Time Entry in a modal without navigating away.
- **Calendar & Scheduling Integration:**
  - Interactive Month / Week / Day view of all tasks and staff commitments.
  - Two-way synchronization with Google Calendar and Microsoft Outlook / Office 365.

---

## 6. Communication & Email Inbox (Conversations)
- **Reference Articles:** `9000165784`, `9000166533`, `9000188513`, `9000195110`, `9000203130`, `9000224477`, `9000231489`
- **Email Inbox Sync (Conversations):**
  - Connect Gmail, Office 365, or Custom IMAP/SMTP accounts.
  - Centralized inbox showing emails linked automatically to the respective client's profile based on email address.
  - Custom HTML email signatures per user.
- **Automated Deadline Reminders:**
  - Configurable email/SMS triggers sent to clients before deadlines (e.g. at 60, 30, 14, and 7 days before deadline).
- **Bulk Emailing with Tagging & Filters:**
  - Send targeted bulk announcements/newsletters filtered by Client Type, Assigned Service, or Custom Tags.
- **SMS Integration:**
  - Send SMS reminders and alerts with a custom alphanumeric Sender ID (e.g. "MyPractice").

---

## 7. Document Management & Client Document Requests
- **Reference Articles:** `9000166534`, `9000174901`, `9000209740`
- **Document Hub Features:**
  - Hierarchical folder structure per client (e.g., `/2026/Accounts/`, `/2026/VAT/`, `/Legal & Permanent/`).
  - Bulk document upload with drag-and-drop.
  - Tagging, version control, and client-visibility permissions.
- **Document Request Chaser:**
  - Send structured checklist requests to clients (e.g., "Please upload Bank Statements for Q1 and Dividend Vouchers").
  - Automated chasing emails until all items are marked as uploaded by the client.
  - Client portal upload interface with instant notification to the assigned accountant.

---

## 8. Proposals, Letters of Engagement & Capisign E-Signing
- **Reference Articles:** `9000165786`, `9000169896`, `9000172255`, `9000172376`, `9000178336`, `9000201481`, `9000238645`
- **Proposal & Letter of Engagement Builder:**
  - Create standard LoE and fee proposal templates with dynamic merge tags (`{{client_name}}`, `{{services_list}}`, `{{agreed_fee}}`, `{{practice_logo}}`).
  - Practice branding: upload practice logo, customize headers, footers, terms and conditions.
- **Sending to Prospects & Existing Clients:**
  - Send to new prospective clients before converting them to active clients.
  - Send updated annual engagement letters to existing clients upon fee reviews.
- **Capisign E-Signature Flow:**
  - Secure digital signing link emailed to the client.
  - Client opens responsive document viewer, reviews terms, inputs name, and draws/types signature.
  - Full cryptographic audit trail: records Signer IP address, Timestamp, Email, User Agent, and SHA-256 document checksum.
  - Auto-converts prospect into active client upon completed signature.

---

## 9. HMRC & Regulatory Integrations
- **Reference Articles:** `9000165781`, `9000195171`, `9000214943`, `9000235538`
- **Agent Authorisation Form 64-8:**
  - Generate standard HMRC Form 64-8 for individual or corporate tax authorisation.
  - Digital online authorisation request tracking and paper print/sign generation.
- **AML & Risk Assessment Module:**
  - Risk grading matrix (Low, Medium, High Risk).
  - PEP (Politically Exposed Persons) checks and sanctions screening records.

---

## 10. Time Tracking & Timesheets
- **Reference Articles:** `9000204723_recording-time-and-timesheets`
- **Time Entry Options:**
  - **Live Stopwatch Timer:** Start/pause/stop timer while working on a specific client and service.
  - **Manual Entry:** Log hours, minutes, billing rate, service category, and task notes.
- **Timesheets Matrix:**
  - Weekly and monthly timesheet grid view per employee.
  - Billable vs non-billable hours breakdown.
  - One-click export to Invoicing module.

---

## 11. Billing & Invoicing
- **Reference Articles:** `9000172239`, `9000195170`, `9000222508`
- **Invoice Template Customization:**
  - Header, footer, payment terms, VAT breakdown, and custom practice bank details (Account number, Sort Code, IBAN).
- **Invoicing Generation:**
  - Generate invoices from fixed service fees, recurring monthly subscriptions, or unbilled timesheet entries.
  - PDF generation and direct email delivery to client.

---

## 12. Team & Staff Management (Administration)
- **Reference Articles:** `9000165734`, `9000165785`, `9000237170`
- **Role-Based Access Control (RBAC):**
  - Roles: Administrator, Partner, Practice Manager, Senior Accountant, Junior Staff, Trainee.
- **Visible Manager Concept:**
  - Assign specific managers to clients so staff only see their relevant client portfolio and tasks if restricted.
- **User Activity Audit Logs:**
  - Track user logins, client modifications, document deletions, and submission histories.

---

## 13. Reports & Analytics
- **Reference Articles:** `9000207051_how-to-view-reports-in-practice-management`
- **Standard Reports Available:**
  - **Client Portfolio Report:** Breakdown of clients by type, status, manager, and fee band.
  - **Statutory Deadlines & Compliance Report:** Upcoming filings across the next 30/60/90 days.
  - **Tasks & Productivity Report:** Completed vs overdue tasks per team member.
  - **Timesheets & Billability Report:** Utilization rate, total billable hours vs actual fee recovery.
  - **Invoices & Unbilled Work Report:** Aged debtors, unbilled WIP (Work In Progress).
