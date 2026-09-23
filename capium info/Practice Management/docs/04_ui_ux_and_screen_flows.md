# Practice Management - UI/UX & Screen Flow Specifications

## 1. Primary Navigation & Information Architecture

The Practice Management module layout consists of a responsive top navigation bar, quick-add action triggers, contextual sub-navigation tabs, and data grid tables.

```
+---------------------------------------------------------------------------------------------------+
|  [Sansuite Logo]   Practice Management v1.0   | Search Clients, Tasks, Deadlines... | [+ Quick Add] | User |
+---------------------------------------------------------------------------------------------------+
|  [Dashboard]  [Clients]  [Deadlines]  [Tasks]  [Conversations]  [LoE / Capisign]  [Time]  [Reports]   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|                                       MAIN CONTENT VIEW AREA                                      |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Screen Specifications

### 2.1 Dashboard Screen (`/pm/dashboard`)
- **Header Section:**
  - Quick KPI summary cards:
    - *Total Clients* (with badge: `+N this month`)
    - *Upcoming Deadlines (Next 30 Days)*
    - *Overdue Deadlines* (highlighted in red)
    - *Open Tasks* (High / Medium / Low split)
- **Middle Section (Interactive Charts & Visuals):**
  - **Left Card (Deadlines by Status):** Donut chart showing Due vs Overdue vs Submitted. Clickable legend to filter table below.
  - **Middle Card (Tasks by Priority):** Bar chart showing workload distribution.
  - **Right Card (Staff Workload):** Team member task assignment breakdown.
- **Bottom Section (Split View):**
  - **Left Pane (Deadlines Action List):** Table with columns `Client Name | Service | Statutory Deadline | Internal Target | Status | Action`.
  - **Right Pane (Live Activity Feed):** Scrollable chronological stream with icons for emails, notes, document uploads, and submissions.

---

### 2.2 Client Hub & Details Screen (`/pm/clients` & `/pm/clients/:id`)
- **Clients Directory Table View:**
  - Search bar with instant autocomplete.
  - Filter pills: `All | Limited Companies | Sole Traders | Partnerships | Individuals | Inactive`.
  - Columns: `Client Code | Company / Client Name | Type | Company No | Assigned Manager | Deadlines Due | Status | Actions`.
  - Bulk Action Toolbar: *Bulk Email, Assign Manager, Export CSV, Archive*.
- **Client 360-Degree Profile View:**
  - **Sticky Header:** Client name, type badge, company number, UTR, visible manager avatar, status pill, and action buttons (*Edit, Send Email, Create Task, Raise Invoice*).
  - **Tab 1: Overview & Details:** Full corporate details, registered office, directorships, shareholdings, AML compliance badge.
  - **Tab 2: Services & Fees:** List of contracted services, agreed recurring fee, billing schedule, and assigned staff member.
  - **Tab 3: Deadlines & Compliance:** Tabular list of all past, current, and future statutory filings with status chips and submission links.
  - **Tab 4: Interactive Timeline:** Chronological feed. Features "Pin Note to Top", filter by (Emails, Notes, Calls, Meetings, System Alerts), and rich text inline note creator.
  - **Tab 5: Document Hub:** Folder tree explorer with drag-and-drop upload zone and client sharing toggle.
  - **Tab 6: Tasks & Checklists:** Work items specific to this client.
  - **Tab 7: Invoicing & WIP:** Invoices issued, payment status, and unbilled timesheet WIP.

---

### 2.3 Deadlines & Submissions Hub (`/pm/deadlines`)
- **Filter Bar:**
  - Service Selector (All, Accounts Production, CT600, VAT, Confirmation Statement, MTD IT).
  - Date Range Picker (Due This Week, This Month, Next 30 Days, Custom Range).
  - Manager / Assignee dropdown.
  - "Refresh Deadlines" button to trigger automated recalculations.
- **Interactive Data Grid:**
  - Status color coding: `Green (Submitted)`, `Blue (Upcoming)`, `Orange (Due Soon)`, `Red (Overdue)`.
  - One-click actions: Mark Complete, Assign Task, Send Document Request, View History.

---

### 2.4 Proposals, Letters of Engagement & Capisign E-Signing (`/pm/loe`)
- **Workflow Steps in UI:**
  1. **Template Selection:** Select standard LoE, Proposal, or Custom Agreement.
  2. **Client / Prospect Details:** Auto-fill client details or enter prospect information.
  3. **Service & Fee Selection:** Checkbox list of services included with customizable fee inputs.
  4. **Document Preview:** Rich HTML/PDF preview with dynamic merge tags resolved and practice branding logo applied.
  5. **Dispatch for E-Signature:** Send secure email link to client.
- **Client Signing Portal (Mobile & Desktop Responsive):**
  - Clean, distraction-free document viewer.
  - Interactive signature pad: *Draw Signature*, *Type Name (cursive font)*, or *Upload Signature Image*.
  - "Accept & Sign Document" button with mandatory consent checkbox.
  - Instant download of signed copy with embedded cryptographic certificate.

---

### 2.5 Conversations & Email Inbox (`/pm/conversations`)
- **Two-Column Layout:**
  - **Left Pane:** Email folders (*Inbox, Sent, Scheduled, Templates, Client Filter*) and thread list with unread badges.
  - **Right Pane:** Email conversation thread view with full message history, attachment viewer, quick reply box, and "Link to Client" dropdown selector.
- **Bulk Email Dispatch Modal:**
  - Client recipient filter (by Tag, Service, Client Type).
  - Template dropdown selector.
  - WYSIWYG editor with merge tag insert dropdown (e.g. `{{client_name}}`, `{{company_number}}`, `{{next_deadline}}`).
  - Preview Mode showing sample client data.

---

### 2.6 Quick Add Modal (Global Trigger)
- Modal dialog with tabbed triggers:
  - **+ New Client:** Fast entry (Company Name, Type, Reg No, Contact Email, Manager).
  - **+ New Task:** Title, Client, Priority, Due Date, Assignee.
  - **+ New Deadline:** Client, Service, Statutory Date, Internal Date.
  - **+ Log Time:** Client, Service, Duration (or Stopwatch), Notes.
  - **+ Add Note:** Client, Note Body, Pin to Timeline checkbox.
