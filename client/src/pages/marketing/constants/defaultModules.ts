export interface MarketingModule {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription?: string;
  iconName: string;
  category: "Practice" | "Accounting" | "Tax" | "Compliance";
  bulletPoints: string[];
  badgeTag: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  workflowSteps?: Array<{ step: number; title: string; description: string }>;
  capiumComparisonHighlight?: string;
}

export const DEFAULT_MARKETING_MODULES: MarketingModule[] = [
  {
    id: 1,
    slug: "practice-management",
    title: "Practice Management & CRM",
    shortDescription: "Centralized client onboarding, AML KYC verification, automated statutory deadlines, and staff timesheets.",
    detailedDescription: "Complete control over your practice workflows. Automate risk assessments, track HMRC deadlines with zero spreadsheet maintenance, and manage staff capacity effortlessly.",
    iconName: "Briefcase",
    category: "Practice",
    badgeTag: "Core Engine",
    sortOrder: 1,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Automated HMRC & Companies House Deadlines",
      "Built-in AML & Risk Assessment Scoring",
      "Client CRM with Multi-Entity Hierarchy",
      "Staff Timesheets & Capacity Planning",
      "Integrated Proposal & Letter of Engagement Builder"
    ],
    workflowSteps: [
      { step: 1, title: "Client Onboarding & KYC ID Verification", description: "Automated AML risk assessment, biometric passport verification, and digital letters of engagement with dynamic fee calculations." },
      { step: 2, title: "Companies House & HMRC Calendar Sync", description: "Real-time synchronization of annual accounts and confirmation statement deadlines with color-coded Kanban pipelines." },
      { step: 3, title: "Workflow Automation & Task Delegation", description: "Customizable job templates, automated email and SMS chasing, and staff billable time tracking." },
      { step: 4, title: "Real-Time Practice Analytics & WIP", description: "Executive practice dashboards with work-in-progress (WIP) tracking, client recovery rates, and team capacity planning." }
    ],
    capiumComparisonHighlight: "100% workflow parity with Capium Practice Management plus automated deadline synchronizers, built-in risk scoring, and zero hidden add-on costs."
  },
  {
    id: 2,
    slug: "accounts-production",
    title: "Accounts Production (FRS 102/105)",
    shortDescription: "Statutory annual accounts for FRS 102 Section 1A, FRS 105 Micro-entities, with automated iXBRL tagging.",
    detailedDescription: "Prepare compliant statutory financial statements directly from trial balances. Full direct gateway integration with Companies House and HMRC for one-click digital submissions.",
    iconName: "Building2",
    category: "Accounting",
    badgeTag: "HMRC Recognized",
    sortOrder: 2,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "FRS 102 (1A) & FRS 105 Compliance",
      "Automated iXBRL Tagging & Validation Engine",
      "Direct One-Click Companies House Filing",
      "Dynamic Chart of Accounts Mapping",
      "Audit-Ready Detailed Notes & Disclosures"
    ],
    workflowSteps: [
      { step: 1, title: "Multi-Source Trial Balance Ingestion", description: "Import trial balance from Xero, QuickBooks, Sage, CSV, or live sync directly from SanSuite Bookkeeping." },
      { step: 2, title: "FRS 102 (1A) & FRS 105 Mapping", description: "Automated mapping to standardized UK Chart of Accounts with micro-entity and small entity disclosure checklists." },
      { step: 3, title: "Automated iXBRL Tagging & Diagnostics", description: "Built-in real-time validation engine against the latest FRC taxonomy with error diagnostics before submission." },
      { step: 4, title: "Dual Electronic Gateway Submission", description: "Simultaneous one-click digital filing to Companies House and HMRC with instant electronic delivery receipts." }
    ],
    capiumComparisonHighlight: "Dual-gateway filing matches Capium Accounts Production with enhanced ledger reconciliation and faster live iXBRL validation."
  },
  {
    id: 3,
    slug: "bookkeeping",
    title: "Bookkeeping & MTD VAT",
    shortDescription: "Intuitive digital sales invoicing, bill capture, bank statement imports, and MTD for VAT digital submissions.",
    detailedDescription: "Cloud bookkeeping built for seamless accountant-client collaboration. Clients can invoice on the go, while your firm gets pristine reconciled trial balance data with zero re-keying.",
    iconName: "FileSpreadsheet",
    category: "Accounting",
    badgeTag: "MTD Compliant",
    sortOrder: 3,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Automated Bank Feed Reconciliation",
      "MTD for VAT Direct HMRC Submission",
      "Digital Sales Invoicing & Purchase Bills",
      "CIS Deductions & Domestic Reverse Charge Support",
      "Multi-Currency & Real-Time Cash Flow Reports"
    ],
    workflowSteps: [
      { step: 1, title: "Direct UK Open Banking Feeds", description: "Connect bank accounts via FCA-regulated Open Banking with automated transaction feeds from major UK banks." },
      { step: 2, title: "Receipt Capture & Auto-Matching", description: "Scan receipts, extract line items, and match automatically using smart reconciliation rules and VAT categorization." },
      { step: 3, title: "9-Box MTD VAT Return Computation", description: "Automatic 9-box VAT calculation under standard accrual, cash accounting, or flat rate VAT schemes." },
      { step: 4, title: "Direct HMRC Making Tax Digital Submission", description: "Electronic filing directly through HMRC Making Tax Digital API with cryptographic receipt." }
    ],
    capiumComparisonHighlight: "Full functional alignment with Capium Bookkeeping plus instant UK open banking bank rule auto-matching."
  },
  {
    id: 4,
    slug: "corporation-tax",
    title: "Corporation Tax (CT600)",
    shortDescription: "Comprehensive CT600 tax returns with automatic computation linking directly from Accounts Production.",
    detailedDescription: "Save hours on company tax filings. Automatically pull figures from financial statements, calculate capital allowances, R&D credits, and submit the joint accounts & CT600 pack to HMRC.",
    iconName: "Calculator",
    category: "Tax",
    badgeTag: "HMRC Gateway",
    sortOrder: 4,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Automated Trial Balance to CT600 Link",
      "AIA & Capital Allowances Calculator",
      "Loss Relief Carry-Back & Allocation Tool",
      "Direct HMRC Tax Gateway Submission",
      "Detailed PDF Tax Computation Packs"
    ],
    workflowSteps: [
      { step: 1, title: "Direct Ingestion from Accounts Production", description: "Seamlessly pull net profit, balance sheet figures, and turnover directly from Accounts Production with zero duplicate data entry." },
      { step: 2, title: "Capital Allowances & Relief Calculations", description: "Calculate Annual Investment Allowance (AIA), Full Expensing, First Year Allowances, and SME R&D tax relief." },
      { step: 3, title: "Trading Loss Relief Modeling", description: "Model loss carry-backs, carry-forwards, group relief allocations, and marginal relief between 19% and 25% rates." },
      { step: 4, title: "One-Click HMRC Gateway E-Filing", description: "Generate tagged iXBRL computation and submit CT600 alongside tagged statutory accounts to HMRC." }
    ],
    capiumComparisonHighlight: "Equivalent CT600 computation rigor as Capium Corporation Tax with real-time tax liability forecasting."
  },
  {
    id: 5,
    slug: "self-assessment",
    title: "Self Assessment (SA100)",
    shortDescription: "Individual, partnership (SA800), and trust (SA900) tax return filing with instant tax calculation.",
    detailedDescription: "Streamline the January tax crunch. Capture employment, self-employment, UK/foreign property income, dividends, and capital gains with instant HMRC tax liability breakdown.",
    iconName: "UserCheck",
    category: "Tax",
    badgeTag: "HMRC Direct",
    sortOrder: 5,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "SA100, SA800, and SA900 Form Modules",
      "Employment & Property Schedules Aggregation",
      "Instant HMRC Tax Calculation Preview",
      "Client Digital Approval Integration",
      "HMRC Direct Online Filing with IRmark"
    ],
    workflowSteps: [
      { step: 1, title: "Income & Schedule Aggregation", description: "Aggregate employment (SA102), self-employment (SA103), UK property (SA105), dividends, and capital gains (SA108)." },
      { step: 2, title: "Reliefs, Deductions & Student Loans", description: "Model pension contributions, gift aid relief, Student Loan plans 1/2/4/Postgraduate, and high-income child benefit charges." },
      { step: 3, title: "Class 2 & Class 4 National Insurance", description: "Accurate NI calculations and Payments on Account forecasting for subsequent tax years." },
      { step: 4, title: "Live HMRC Digital Submission & IRMark", description: "Instant electronic filing to HMRC Government Gateway with official IRMark digital receipt." }
    ],
    capiumComparisonHighlight: "Complete SA100, SA800, and SA900 schedules matching Capium Self Assessment with digital IRMark confirmation."
  },
  {
    id: 6,
    slug: "payroll",
    title: "Payroll & RTI",
    shortDescription: "Automated pay runs, workplace pension auto-enrolment, CIS returns, P11D benefits, and RTI submissions.",
    detailedDescription: "Reliable cloud payroll for practices handling dozens of client payrolls. Run bulk payrolls in minutes, generate GDPR-compliant payslips, and dispatch RTI FPS/EPS automatically.",
    iconName: "Users",
    category: "Compliance",
    badgeTag: "RTI Certified",
    sortOrder: 6,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Full RTI FPS & EPS Direct Submissions",
      "Auto-Enrolment Nest, Smart & Now Pensions Sync",
      "CIS Monthly Return & Subcontractor Statements",
      "P11D Expenses & Benefits Generator",
      "Employee Self-Service Payslip Access"
    ],
    workflowSteps: [
      { step: 1, title: "Timesheet & Salary Ingestion", description: "Support weekly, fortnightly, four-weekly, and monthly payroll runs with multi-rate overtime and statutory pay." },
      { step: 2, title: "PAYE, NI & Workplace Pension Calculations", description: "Real-time tax code recalculations, student loans, and Nest, NOW: Pensions, The People Pension auto-enrolment." },
      { step: 3, title: "Automated FPS & EPS Gateway Filing", description: "Transmit Full Payment Submissions (FPS) on or before pay day and Employer Payment Summaries (EPS) directly to HMRC." },
      { step: 4, title: "Digital Payslip Portal for Employees", description: "Employees view and download password-protected PDF payslips and P60s through mobile self-service." }
    ],
    capiumComparisonHighlight: "Full HMRC-recognized RTI payroll matching Capium Payroll with auto-enrolment workplace pension integrations."
  },
  {
    id: 7,
    slug: "company-secretarial",
    title: "Company Secretarial (CoSec)",
    shortDescription: "Real-time Companies House synchronization, company incorporation, and Confirmation Statements (CS01).",
    detailedDescription: "Never miss a statutory filing. Seamlessly incorporate new UK limited companies, file CS01 Confirmation Statements with PSC verification, and produce board minutes and resolutions.",
    iconName: "Layers",
    category: "Compliance",
    badgeTag: "Companies House",
    sortOrder: 7,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Live Companies House Two-Way API Sync",
      "Company Incorporation in under 3 Hours",
      "Confirmation Statement (CS01) Direct Filing",
      "Statutory Register of Directors, PSC & Members",
      "Automated Board Minutes & Resolution Templates"
    ],
    workflowSteps: [
      { step: 1, title: "Live Companies House Synchronization", description: "Pull company officers, PSCs, share capital, and filing history directly from Companies House via live API." },
      { step: 2, title: "Confirmation Statement (CS01) Pre-Fill", description: "Pre-populate CS01 confirmation statements with one-click review and statutory fee payment handling." },
      { step: 3, title: "Officer Appointments & Share Reorganization", description: "Generate minutes, resolutions, share transfer forms (J30), and AP01/TM01/SH01 filings." },
      { step: 4, title: "Direct XML Filing to Companies House", description: "Direct electronic submission to Companies House with sub-minute approval verification." }
    ],
    capiumComparisonHighlight: "Full statutory compliance matching Capium Company Secretarial with live Companies House registry sync."
  },
  {
    id: 8,
    slug: "mtd-it",
    title: "MTD for Income Tax (MTD IT)",
    shortDescription: "Quarterly updates, cumulative progression tracking, bridging CSV templates, and End of Year final declarations.",
    detailedDescription: "Prepare your firm for the largest UK tax transition. Support sole traders and landlords with 3-month quarterly updates, client approval signatures, and annual final tax reconciliations.",
    iconName: "FileText",
    category: "Tax",
    badgeTag: "MTD IT Ready",
    sortOrder: 8,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Quarterly & Cumulative Progression Tracking",
      "Spreadsheet Bridging CSV Template Engine",
      "Capisign Client Approval Integration",
      "HMRC Sandbox & Live MTD IT Gateway",
      "End of Year Adjustments & Final Declaration"
    ],
    workflowSteps: [
      { step: 1, title: "Quarterly Income & Expense Aggregation", description: "Categorize self-employment and property transactions into quarterly digital records matching HMRC MTD schema." },
      { step: 2, title: "Four Quarterly Statutory Submissions", description: "Transmit cumulative quarterly updates directly to HMRC MTD APIs with digital receipt logging." },
      { step: 3, title: "End-of-Period Statement (EOPS) Reconciliation", description: "Make statutory accounting adjustments, claim capital allowances, and reconcile annual tax position." },
      { step: 4, title: "Final Declaration & Tax Liability Calculation", description: "Complete the year-end final declaration and compute total income tax liability through the digital gateway." }
    ],
    capiumComparisonHighlight: "Complete 2026 HMRC Making Tax Digital for Income Tax compliance with quarterly aggregation and EOPS."
  },
  {
    id: 9,
    slug: "capisign",
    title: "SanSuite Sign (Unlimited eSign)",
    shortDescription: "Unlimited legally binding electronic signatures with audit trail certificates and real-time tracking.",
    detailedDescription: "Eliminate printing, postage, and scanning. Send annual accounts, letters of engagement, and tax returns for digital signature on any device with legal compliance under eIDAS.",
    iconName: "Send",
    category: "Practice",
    badgeTag: "Unlimited",
    sortOrder: 9,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Unlimited Signatures Included in Every Plan",
      "Full Audit Trail with IP & Timestamp Verification",
      "Legally Binding under UK & EU eIDAS Regulations",
      "Customizable Signing Field Placement",
      "Automated Reminder Sequences for Faster Signing"
    ],
    workflowSteps: [
      { step: 1, title: "Drag-and-Drop Tag Placement", description: "Upload annual accounts, tax returns, or engagement letters and place signature, date, and initial tags." },
      { step: 2, title: "Automated Multi-Signer Routing", description: "Sequential or parallel signing workflows with automated email reminders and SMS OTP authentication." },
      { step: 3, title: "Legally-Binding Cryptographic Signatures", description: "eIDAS compliant with digital certificate stamping, tamper-evident hash sealing, and IP audit trails." },
      { step: 4, title: "Automatic Workflow Progression", description: "Once signed, documents automatically update Practice Management job status and trigger filing gateways." }
    ],
    capiumComparisonHighlight: "Unlimited electronic signatures compliant with UK eIDAS and EU regulations, built natively into all workflows."
  },
  {
    id: 10,
    slug: "client-portal-365",
    title: "Client Portal 365",
    shortDescription: "Modern white-label portal for SME clients to upload documents, review tax returns, and sign approvals.",
    detailedDescription: "Provide a modern 365 digital client experience. Eliminate unsecure email attachments, share statutory reports securely, and request missing documents with one click.",
    iconName: "Globe",
    category: "Practice",
    badgeTag: "White-Label",
    sortOrder: 10,
    isFeatured: true,
    isActive: true,
    bulletPoints: [
      "Fully Responsive 24/7 Client Mobile Access",
      "Secure Bank-Grade Document Vault",
      "One-Click Document Approval & Sign-Off",
      "Real-Time Tax Liability & Due Date Visibility",
      "Firm-Branded Experience with Custom Subdomain"
    ],
    workflowSteps: [
      { step: 1, title: "Custom Branded Practice Hub", description: "Your practice logo, subdomain, and colors for an ultra-professional client-facing experience." },
      { step: 2, title: "Secure Document Exchange & Vault", description: "End-to-end encrypted file sharing eliminating insecure email attachments of sensitive tax documents." },
      { step: 3, title: "Integrated Client Approvals & eSign", description: "Clients review draft accounts, approve tax computations, and e-sign directly from their smartphone." },
      { step: 4, title: "Real-Time Message Center & Deadlines", description: "Direct messaging and transparent deadline tracking so clients know exactly what is required from them." }
    ],
    capiumComparisonHighlight: "Branded white-label client collaboration portal with 256-bit SSL document vault and mobile responsiveness."
  }
];
