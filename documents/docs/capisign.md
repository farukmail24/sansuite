# Capisign Module (E-Signature Addon)

Capisign is SanSuite's native electronic signature and document approval tool. It integrates with accounts production, self-assessment, and bookkeeping to send tax computations, accounts, or custom documents to client signers for secure, legally binding digital signatures.

---

## 1. Capisign Home Dashboard (Overview)

This dashboard tracks all signature requests sent by the practice.

### Screenshot Reference
![Capisign Dashboard](../screenshots/Capisign/Capisign_home.png)

### Key Components

#### A. Global Navigation Tabs
- **Overview (Active):** Main document tracking dashboard.
- **Sign Documents:** Setup wizard to upload a PDF, place signature/date fields, and send for signature.
- **My Signature:** Set up the accountant's own signature styles (drawn, typed, or uploaded image).
- **Settings:** Audit trails, notification settings, and brand customization (custom emails/logos).
- **Templates:** Set up reusable document layout templates with pre-placed signature boxes.

#### B. Document Status Tabs (Filters)
Allows filtering of the main document log:
- `All` (Active)
- `Awaiting Approval`
- `Signed`
- `Declined`
- `Drafts`
- `Cancelled`
- `Archived`

#### C. Notice Banner
- Displays system update notices:
  - *e.g., "Note: The document sent before 09/01/2026, with a status of Awaiting Approval, should be resent for signature by clicking 'Resend' under Actions."*

#### D. Document Log Table
- **Search:** Text search box to query documents by title/signer.
- **Action Controls:** Column menu button (three vertical dots) for customizing table layout.
- **Columns:**
  - `Checkbox` (for bulk archive/cancel actions)
  - `Title` (Name of document / PDF)
  - `Created on` (Date of upload)
  - `Module Name` (e.g., Accounts Production, Corporation Tax - tracks source system)
  - `Size` (File size in KB/MB)
  - `Status` (Awaiting Approval, Signed, Declined)
  - `Signers` (Count/Names of required signers)
  - `Signed by` (Signers who have completed signature)
  - `Signed on` (Timestamp of completion)
  - `Notes` (Internal practice notes)
  - `Actions` (Context actions: Resend, Void, Delete, Download PDF)

---

## 2. Recommended Database Schema / Data Models

To implement Capisign, we require the following database tables:

### `Capisign_documents`
- `id` (INT, Primary Key)
- `title` (VARCHAR)
- `file_path` (VARCHAR)
- `file_size` (INT)
- `source_module` (VARCHAR - e.g., Bookkeeping, CorporationTax)
- `status` (ENUM - Draft, AwaitingApproval, Signed, Declined, Cancelled)
- `created_by_user_id` (INT)
- `created_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, Nullable)

### `Capisign_signers`
- `id` (INT, Primary Key)
- `document_id` (INT, FK referencing `Capisign_documents.id`)
- `signer_email` (VARCHAR)
- `signer_name` (VARCHAR)
- `status` (ENUM - Awaiting, Signed, Declined)
- `signed_at` (TIMESTAMP, Nullable)
- `ip_address` (VARCHAR, Nullable)
- `user_agent` (VARCHAR, Nullable)
- `verification_token` (VARCHAR, Unique)

### `Capisign_fields`
- `id` (INT, Primary Key)
- `document_id` (INT, FK referencing `Capisign_documents.id`)
- `signer_id` (INT, FK referencing `Capisign_signers.id`)
- `field_type` (ENUM - Signature, Initial, Date, Textbox)
- `page_number` (INT)
- `coord_x` (DECIMAL(5,2))
- `coord_y` (DECIMAL(5,2))
- `width` (DECIMAL(5,2))
- `height` (DECIMAL(5,2))

### `Capisign_audit_logs`
- `id` (INT, Primary Key)
- `document_id` (INT, FK referencing `Capisign_documents.id`)
- `action` (VARCHAR - e.g., Sent, Opened, Signed, Resent)
- `timestamp` (TIMESTAMP)
- `details` (TEXT)
