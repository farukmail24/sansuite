# Sansuite Practice Management Module - Complete Specification & Blueprint

## Overview
This repository contains the complete functional analysis, technical specifications, database schema, API design, workflows, and UI/UX blueprints for building the **Practice Management Module** in the **Sansuite** platform, reverse-engineered and enhanced from the full Capium Practice Management system.

All 65 help articles, user guides, FAQs, and system screenshots have been systematically scraped, categorized, and documented.

---

## Directory Structure

```
d:/sansuite/
├── README.md                                  # Repository overview and guide
├── PRACTICE_MANAGEMENT_MASTER_REPORT.md       # Master comprehensive analysis & implementation report (Bengali & English)
├── capium_pm_full_dataset.json                # Complete scraped raw dataset of all 65 articles & metadata
├── raw_articles/                              # All 65 raw articles in Markdown (.md) and JSON (.json)
├── images/                                    # Downloaded screenshots and UI guides for all articles
└── docs/
    ├── 01_architecture_and_data_models.md     # Database schemas, ERD, models, enums & entity relationships
    ├── 02_core_features_and_modules.md        # Comprehensive feature breakdowns (all 13 sub-modules)
    ├── 03_api_and_system_workflows.md         # REST/GraphQL API specifications, webhooks & background jobs
    ├── 04_ui_ux_and_screen_flows.md           # Screen layouts, navigation maps, modal flows & wireframe specs
    └── 05_article_knowledge_base_index.md     # Full index of all scraped 65 articles with image references
```

---

## Core Sub-Modules Covered

1. **Practice Dashboard & Real-Time Analytics** (KPIs, Deadlines, Task Distribution, Team Workload, Activity Stream)
2. **Client Management & CRM** (Onboarding, Company/Sole Trader/Partnership Profiles, Timelines, Custom Fields, AML Checks, Prospects)
3. **Services & Workflow Steps Configuration** (Statutory & Custom Services, Sub-step Checklists, Reminders, Fee Adjustments)
4. **Deadlines & Statutory Compliance Engine** (Companies House, HMRC, VAT, MTD IT, Submissions Tracker, Deadline Refresh)
5. **Task Management & Scheduling** (Tasks, Priorities, Milestones, Workload allocation, Calendar Integration)
6. **Communication & Email Inbox (Conversations)** (Email sync via IMAP/SMTP/OAuth, Bulk Emailing with Tags, SMS Sender ID, Template Builder)
7. **Document Management & Client Hub** (Secure Storage, Folder Trees, Document Requests & Chasing, Client Portal Uploads)
8. **Proposals, Letters of Engagement & E-Signing (Capisign)** (Template Designer, Dynamic Merge Tags, Branding/Logo, Audit Trail, Client E-Sign Flow)
9. **HMRC & Regulatory Integrations** (Agent Authorisation 64-8 Paper & Online, Risk Assessment Checks)
10. **Time Tracking & Timesheets** (Live Timers, Manual Logging, Billable Rates, Approval Workflows)
11. **Billing & Invoicing Engine** (Invoice Templates, Bank Details, Automated Recurring Invoices, Fee Schedules)
12. **Team & Staff Access Control** (Roles, Permissions Matrix, Visible Manager Assignments, User Activity Logs)
13. **Comprehensive Reporting & Export System** (Compliance Reports, Client Lists, Productivity & Revenue Analytics)

---

## How to Use This Specification

1. **For System Architects & Backend Developers:** Review `docs/01_architecture_and_data_models.md` and `docs/03_api_and_system_workflows.md` for schema DDL and API contracts.
2. **For Frontend & UI/UX Engineers:** Review `docs/04_ui_ux_and_screen_flows.md` and refer to local images in `images/` for exact layout implementations.
3. **For Product Managers & QA Engineers:** Review `PRACTICE_MANAGEMENT_MASTER_REPORT.md` and `docs/02_core_features_and_modules.md` for exhaustive acceptance criteria and step-by-step test cases.
