import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Users, UserPlus, Shield, CheckCircle2, AlertCircle, Search,
  ArrowLeft, Download, UploadCloud, Lock, Key, Trash2, Edit3,
  Building2, Briefcase, FileText, Check, X, RefreshCw, Layers,
  Sliders, Info, UserCheck, UserX, ExternalLink, SlidersHorizontal,
  ChevronRight, ChevronDown, Save, FileSpreadsheet, Eye, HelpCircle, AlertTriangle,
  BookOpen, Calculator, Landmark, Timer, FileSignature, CheckSquare, XSquare, Plus,
  Link2, Smartphone
} from "lucide-react";

export interface CrudActionPerms {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface UserPermissions {
  autoAssign: boolean;
  hubAccess: boolean;
  bankFeedsAccess: boolean;
  amlOfficer: boolean;
  assignedClientIds: number[];
  clientManagerClientIds: number[];
  modulePermissions: Record<string, boolean>;
  crudPermissions?: Record<string, CrudActionPerms>;
}

export interface PracticeUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  prefix?: string;
  middleName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postCode?: string;
  permissions?: UserPermissions;
}

export interface PracticeClient {
  id: number;
  clientName: string;
  clientCode?: string;
  clientType: string;
  registrationNumber?: string;
  vatNumber?: string;
  isActive?: boolean;
}

export interface PracticeRoleItem {
  id: number;
  practiceId: number;
  roleName: string;
  roleCode: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
  baseTier?: string;
  permissionsJson?: string;
}

const DEFAULT_MODULE_PERMS: Record<string, boolean> = {
  portal_365: true,
  p365_workspace: true,
  p365_documents: true,
  p365_messaging: true,
  p365_approval: true,
  bookkeeping: true,
  bk_sales: true,
  bk_purchase: true,
  bk_assets: true,
  bk_tasks: true,
  bk_bank: true,
  bk_contacts: true,
  bk_schedule: true,
  bk_reports: true,
  bk_settings: true,
  bk_quick_entry: true,
  bk_vat: true,
  bk_cis: true,
  bk_inventory: true,
  payroll: true,
  pay_employees: true,
  pay_runs: true,
  pay_hmrc: true,
  pay_p60_p45: true,
  esign: true,
  es_envelopes: true,
  es_otp: true,
  es_audit_trail: true,
  mtd_vat: true,
  accounts_production: true,
  corporation_tax: true,
  self_assessment: true,
  practice_management: true,
  pm_tasks: true,
  pm_deadlines: true,
  pm_billing: true,
  pm_aml: true,
  company_secretarial: true,
  time_fees: true,
  tf_timesheets: true,
  tf_invoices: true,
  tf_rates: true,
  tf_expenses: true,
  aml: true,
  aml_screening: true,
  aml_risk_assess: true,
  aml_reports: true,
  onboarding: true,
  ob_checklist: true,
  ob_agent_auth: true,
  ob_clearance: true,
  mtd_it: true,
  mtd_it_updates: true,
  mtd_it_cryst: true,
  charity_accounts: false,
};

// Strict client preset: only client-authorized workspaces/modules are enabled
const DEFAULT_CLIENT_MODULE_PERMS: Record<string, boolean> = {
  portal_365: true,
  p365_workspace: true,
  p365_documents: true,
  p365_messaging: true,
  p365_approval: true,
  bookkeeping: true,
  bk_sales: true,
  bk_purchase: true,
  bk_assets: false,
  bk_tasks: false,
  bk_bank: true,
  bk_contacts: true,
  bk_schedule: false,
  bk_reports: true,
  bk_settings: false,
  bk_quick_entry: false,
  bk_vat: false,
  bk_cis: false,
  bk_inventory: false,
  payroll: true,
  pay_employees: false,
  pay_runs: false,
  pay_hmrc: false,
  pay_p60_p45: true,
  esign: true,
  es_envelopes: true,
  es_otp: true,
  es_audit_trail: true,
  practice_management: false,
  pm_tasks: false,
  pm_deadlines: false,
  pm_billing: false,
  pm_aml: false,
  time_fees: false,
  tf_timesheets: false,
  tf_invoices: false,
  tf_rates: false,
  tf_expenses: false,
  aml: false,
  aml_screening: false,
  aml_risk_assess: false,
  aml_reports: false,
  onboarding: false,
  ob_checklist: false,
  ob_agent_auth: false,
  ob_clearance: false,
  mtd_it: false,
  mtd_it_updates: false,
  mtd_it_cryst: false,
  accounts_production: false,
  corporation_tax: false,
  self_assessment: false,
  mtd_vat: false,
  company_secretarial: false,
  charity_accounts: false,
};

const getInitialModulePermsForRole = (role: string) => {
  if (role === "client") {
    return { ...DEFAULT_CLIENT_MODULE_PERMS };
  }
  return { ...DEFAULT_MODULE_PERMS };
};

export interface SubFeatureItem {
  id: string;
  label: string;
  desc: string;
}

export interface CrudModuleItem {
  key: string;
  name: string;
  category: "Compliance & Statutory" | "Operations & Practice" | "Finance & Invoicing";
  description: string;
  icon: any;
  subFeatures: SubFeatureItem[];
}

export const CRUD_MODULE_CATALOG: CrudModuleItem[] = [
  {
    key: "practice_management",
    name: "Practice Management",
    category: "Operations & Practice",
    description: "Client KYC/AML verification, firm deadlining, task workflows & staff allocation.",
    icon: Briefcase,
    subFeatures: [
      { id: "pm_tasks", label: "Tasks & Workflows", desc: "Staff task assignments, kanban workflows & review status" },
      { id: "pm_deadlines", label: "Statutory Deadlines", desc: "HMRC & Companies House auto-deadlines tracker" },
      { id: "pm_billing", label: "Practice Billing", desc: "Fee schedules, engagement letters & recurring billing" },
      { id: "pm_aml", label: "KYC & AML Compliance", desc: "Anti-money laundering risk scoring & ID checks" },
    ],
  },
  {
    key: "time_fees",
    name: "Time & Fees",
    category: "Operations & Practice",
    description: "Staff timesheet logging, stopwatch tracking, client hourly billing & Friday PFA review.",
    icon: Timer,
    subFeatures: [
      { id: "tf_timesheets", label: "Timesheets & Live Stopwatch", desc: "Real-time stopwatch & staff timesheet logging" },
      { id: "tf_invoices", label: "Invoices & WIP Billing", desc: "Unbilled WIP conversion to sales invoices" },
      { id: "tf_rates", label: "Staff Rates & Job Budgets", desc: "Staff chargeable rates and client project budgets" },
      { id: "tf_expenses", label: "Staff Expenses", desc: "Out-of-pocket expenses & client reimbursements" },
    ],
  },
  {
    key: "bookkeeping",
    name: "Bookkeeping & Bank Feeds",
    category: "Finance & Invoicing",
    description: "Sales invoices, purchase bills, bank transaction reconciliation, and ledger audit.",
    icon: Landmark,
    subFeatures: [
      { id: "bk_sales", label: "Sales Invoices & Credit Notes", desc: "Customer invoices, quotes & aged debtor ledger" },
      { id: "bk_purchase", label: "Purchase Bills & Receipts", desc: "Supplier bills, POs & aged creditor ledger" },
      { id: "bk_bank", label: "Bank Feeds & Reconciliation", desc: "Open banking feeds, rule matching & bank rec" },
      { id: "bk_assets", label: "Fixed Asset Register", desc: "Asset depreciation schedules & disposals" },
      { id: "bk_quick_entry", label: "Quick Batch Entry", desc: "Rapid keyboard-driven transaction entry" },
      { id: "bk_vat", label: "VAT Returns & MTD Bridge", desc: "Standard, flat rate & cash accounting returns" },
      { id: "bk_cis", label: "CIS Subcontractors", desc: "HMRC CIS deduction statements & monthly CIS300" },
      { id: "bk_inventory", label: "Stock & Inventory", desc: "Item valuation, stock movements & tracking" },
      { id: "bk_contacts", label: "Customers & Suppliers", desc: "Client, vendor & contractor master directory" },
      { id: "bk_schedule", label: "Recurring Schedules", desc: "Automated recurring journals & invoices" },
      { id: "bk_reports", label: "Management Reports", desc: "Profit & Loss, Balance Sheet & Trial Balance" },
      { id: "bk_settings", label: "Financial Settings & COA", desc: "Chart of accounts & financial year controls" },
    ],
  },
  {
    key: "accounts_production",
    name: "Accounts Production (FRS 102/105)",
    category: "Compliance & Statutory",
    description: "Trial balance import, statutory notes, balance sheet disclosures & Companies House filing.",
    icon: FileText,
    subFeatures: [
      { id: "ap_trial_balance", label: "Trial Balance Sync", desc: "Direct import from bookkeeping or CSV trial balance" },
      { id: "ap_disclosures", label: "Statutory Notes", desc: "Accounting policies, employee counts & director advances" },
      { id: "ap_filing", label: "Companies House Filing", desc: "Direct iXBRL electronic gateway submission" },
      { id: "ap_micro_entity", label: "FRS 102 1A / FRS 105", desc: "Small company and micro-entity statutory compliance" },
    ],
  },
  {
    key: "corporation_tax",
    name: "Corporation Tax (CT600)",
    category: "Compliance & Statutory",
    description: "CT600 computations, capital allowances, super-deduction & live HMRC CT filing.",
    icon: Calculator,
    subFeatures: [
      { id: "ct_computations", label: "CT600 Computations", desc: "Trading profit/loss adjustments and disallowables" },
      { id: "ct_allowances", label: "Capital Allowances", desc: "Annual Investment Allowance (AIA) & writing-down pool" },
      { id: "ct_hmrc_filing", label: "HMRC Online Gateway", desc: "CT600 computation XML + iXBRL accounts transmission" },
      { id: "ct_losses", label: "Loss Relief & Group", desc: "Carried-forward loss relief, terminal & group relief" },
    ],
  },
  {
    key: "payroll",
    name: "Payroll RTI & Pensions",
    category: "Compliance & Statutory",
    description: "PAYE pay runs, payslip generation, pension auto-enrolment & HMRC FPS/EPS transmissions.",
    icon: Users,
    subFeatures: [
      { id: "pay_employees", label: "Employees & CIS Workers", desc: "Employee directory, tax codes & starter details" },
      { id: "pay_runs", label: "Execute Pay Runs", desc: "Gross to net pay calculations & pension enrolment" },
      { id: "pay_hmrc", label: "HMRC RTI Filings", desc: "Live Full Payment Submission - FPS / EPS" },
      { id: "pay_p60_p45", label: "P60 & P45 Distribution", desc: "Year-end P60s and employee leaving forms" },
    ],
  },
  {
    key: "self_assessment",
    name: "Self Assessment (SA100)",
    category: "Compliance & Statutory",
    description: "Individual, partnership & trustee tax returns, payment on account & HMRC SA submission.",
    icon: FileSpreadsheet,
    subFeatures: [
      { id: "sa_sa100", label: "SA100 Individual Returns", desc: "Employment, sole trader, rental & dividend income" },
      { id: "sa_sa800", label: "SA800 Partnership Returns", desc: "Partnership statement and profit share allocation" },
      { id: "sa_sa302", label: "SA302 Tax Computation", desc: "Official HMRC tax calculation breakdown" },
      { id: "sa_hmrc_filing", label: "Live HMRC SA Submission", desc: "Online gateway transmission of personal returns" },
    ],
  },
  {
    key: "mtd_vat",
    name: "MTD for VAT",
    category: "Compliance & Statutory",
    description: "9-box VAT return generation, digital audit links & HMRC MTD submission.",
    icon: Landmark,
    subFeatures: [
      { id: "vat_returns", label: "9-Box VAT Returns", desc: "Automated digital calculation of Boxes 1 through 9" },
      { id: "vat_audit_links", label: "Digital Audit Trail", desc: "HM Revenue & Customs digital link compliance" },
      { id: "vat_hmrc_filing", label: "HMRC MTD Direct Gateway", desc: "Tokenized API submission of VAT returns" },
    ],
  },
  {
    key: "company_secretarial",
    name: "Company Secretarial",
    category: "Operations & Practice",
    description: "CS01 Confirmation statements, officer appointments, PSC registers & share capital.",
    icon: Building2,
    subFeatures: [
      { id: "cs_cs01", label: "Confirmation Statement (CS01)", desc: "Annual company statement to Companies House" },
      { id: "cs_officers", label: "Officers & PSC Registers", desc: "Director appointments, terminations & PSC changes" },
      { id: "cs_share_capital", label: "Share Capital Management", desc: "Share allotments, transfers & certificates" },
    ],
  },
  {
    key: "charity_accounts",
    name: "Charity Accounts (SORP)",
    category: "Compliance & Statutory",
    description: "Charity commission compliant SOFA statements and fund accounting schedules.",
    icon: BookOpen,
    subFeatures: [
      { id: "ca_sofa", label: "SOFA Statements", desc: "Statement of Financial Activities under Charities SORP" },
      { id: "ca_funds", label: "Fund Accounting", desc: "Restricted, unrestricted and endowment funds" },
      { id: "ca_commission", label: "Charity Commission Filing", desc: "Annual return and trustee report compliance" },
    ],
  },
  {
    key: "esign",
    name: "CapiSign / E-Signatures",
    category: "Operations & Practice",
    description: "Statutory client sign-off envelopes, SMS OTP verification and digital audit trail.",
    icon: FileSignature,
    subFeatures: [
      { id: "es_envelopes", label: "E-Signature Envelopes", desc: "Multi-signatory document dispatch" },
      { id: "es_otp", label: "SMS OTP Verification", desc: "Secure two-factor client authentication" },
      { id: "es_audit_trail", label: "Cryptographic Audit Trail", desc: "Legally binding certificate of completion" },
    ],
  },
  {
    key: "portal_365",
    name: "Client Portal 365",
    category: "Operations & Practice",
    description: "Client collaboration hub, SME self-service accounting, document repository & portal communications.",
    icon: Link2,
    subFeatures: [
      { id: "p365_workspace", label: "Client 365 Workspace", desc: "SME receipt capture, sales quotes & bank upload" },
      { id: "p365_documents", label: "Document Exchange", desc: "Upload and download client verification documents" },
      { id: "p365_messaging", label: "Portal Communications", desc: "Direct messaging between client and practice accountant" },
      { id: "p365_approval", label: "E-Approval Requests", desc: "Fast approval for draft tax returns & accounts" },
    ],
  },
  {
    key: "aml",
    name: "AML & Compliance",
    category: "Operations & Practice",
    description: "Automated PEP & Sanctions watchlist screening, photo ID verification and firm AML compliance registers.",
    icon: Shield,
    subFeatures: [
      { id: "aml_screening", label: "PEP & Sanctions Screening", desc: "Veriphy, OpenSanctions & Xama identity checks" },
      { id: "aml_risk_assess", label: "Firm AML Risk Assessment", desc: "Firm-wide & client risk scoring methodologies" },
      { id: "aml_reports", label: "AML Register & Reporting", desc: "Statutory compliance registers & audit inspection reports" },
    ],
  },
  {
    key: "onboarding",
    name: "Client Onboarding Hub",
    category: "Operations & Practice",
    description: "Client onboarding checklists, HMRC 64-8 agent authorizations, and professional clearance requests.",
    icon: UserPlus,
    subFeatures: [
      { id: "ob_checklist", label: "Onboarding Checklists", desc: "Engagement step completion & KYC document collection" },
      { id: "ob_agent_auth", label: "HMRC 64-8 Agent Authorisation", desc: "Agent auth codes & HMRC gateway linking" },
      { id: "ob_clearance", label: "Professional Clearance", desc: "Outgoing accountant handover & clearance requests" },
    ],
  },
  {
    key: "mtd_it",
    name: "MTD for Income Tax",
    category: "Compliance & Statutory",
    description: "Quarterly updates, digital record bridging and year-end crystallization submissions for HMRC ITSA.",
    icon: Smartphone,
    subFeatures: [
      { id: "mtd_it_updates", label: "Quarterly Periodic Updates", desc: "Three-month income and expense digital submissions" },
      { id: "mtd_it_cryst", label: "Year-End Final Declaration", desc: "Crystallisation statement and final tax position" },
    ],
  },
];

export const DEFAULT_CRUD_PERMS: Record<string, CrudActionPerms> = {
  practice_management: { view: true, create: true, edit: true, delete: false, approve: false },
  time_fees: { view: true, create: true, edit: true, delete: false, approve: false },
  bookkeeping: { view: true, create: true, edit: true, delete: false, approve: false },
  accounts_production: { view: true, create: true, edit: true, delete: false, approve: false },
  corporation_tax: { view: true, create: true, edit: true, delete: false, approve: false },
  payroll: { view: true, create: true, edit: true, delete: false, approve: false },
  self_assessment: { view: true, create: true, edit: true, delete: false, approve: false },
  mtd_vat: { view: true, create: true, edit: true, delete: false, approve: false },
  company_secretarial: { view: true, create: true, edit: true, delete: false, approve: false },
  charity_accounts: { view: false, create: false, edit: false, delete: false, approve: false },
  esign: { view: true, create: true, edit: true, delete: false, approve: false },
  portal_365: { view: true, create: true, edit: true, delete: false, approve: false },
  aml: { view: true, create: true, edit: true, delete: false, approve: false },
  onboarding: { view: true, create: true, edit: true, delete: false, approve: false },
  mtd_it: { view: true, create: true, edit: true, delete: false, approve: false },
};

export const ROLE_PRESETS = [
  {
    id: "super_accountant",
    name: "Super Accountant",
    badge: "Full Practice Authority",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full administrative control. Can View, Create, Edit, Delete, and legally Approve / Sign-Off across all practice modules.",
    getPermissions: (): Record<string, CrudActionPerms> => {
      const map: Record<string, CrudActionPerms> = {};
      CRUD_MODULE_CATALOG.forEach((m) => {
        map[m.key] = { view: true, create: true, edit: true, delete: true, approve: true };
      });
      return map;
    },
    getModuleAccess: (): Record<string, boolean> => ({ ...DEFAULT_MODULE_PERMS }),
  },
  {
    id: "accountant",
    name: "Accountant",
    badge: "Review & Sign-Off",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Production and review access with Sign-Off / Approval rights across assigned client accounts. Cannot delete master firm configurations.",
    getPermissions: (): Record<string, CrudActionPerms> => {
      const map: Record<string, CrudActionPerms> = {};
      CRUD_MODULE_CATALOG.forEach((m) => {
        map[m.key] = {
          view: true,
          create: true,
          edit: true,
          delete: m.key !== "practice_management" && m.key !== "charity_accounts",
          approve: true,
        };
      });
      return map;
    },
    getModuleAccess: (): Record<string, boolean> => ({ ...DEFAULT_MODULE_PERMS }),
  },
  {
    id: "staff",
    name: "Staff",
    badge: "Preparation & Data Entry",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Data entry, draft filings, and timesheet logging. Restricted from permanent record Deletion and cannot self-Approve / Sign-Off.",
    getPermissions: (): Record<string, CrudActionPerms> => {
      const map: Record<string, CrudActionPerms> = {};
      CRUD_MODULE_CATALOG.forEach((m) => {
        const isCharity = m.key === "charity_accounts";
        map[m.key] = {
          view: !isCharity,
          create: !isCharity,
          edit: !isCharity,
          delete: false,
          approve: false,
        };
      });
      return map;
    },
    getModuleAccess: (): Record<string, boolean> => ({
      ...DEFAULT_MODULE_PERMS,
      charity_accounts: false,
    }),
  },
  {
    id: "client",
    name: "Client",
    badge: "Client Portal 365",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Client Portal 365 access for bookkeeping receipts, sales invoices, payroll records, and electronic document sign-offs.",
    getPermissions: (): Record<string, CrudActionPerms> => {
      const map: Record<string, CrudActionPerms> = {};
      CRUD_MODULE_CATALOG.forEach((m) => {
        const isClientModule = m.key === "portal_365" || m.key === "bookkeeping" || m.key === "payroll" || m.key === "esign";
        map[m.key] = {
          view: isClientModule,
          create: isClientModule && m.key !== "payroll",
          edit: isClientModule && m.key !== "payroll",
          delete: false,
          approve: false,
        };
      });
      return map;
    },
    getModuleAccess: (): Record<string, boolean> => ({ ...DEFAULT_CLIENT_MODULE_PERMS }),
  },
];

export default function UsersAndRolesManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Navigation Views: "list" | "edit" | "import"
  const [view, setView] = useState<"list" | "edit" | "import">("list");
  const [selectedUser, setSelectedUser] = useState<PracticeUser | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Split-Screen Editor Tab: 1: "companies" | 2: "modules_permissions" (Unified CRUD + Sub-Features)
  const [editorPermTab, setEditorPermTab] = useState<"companies" | "modules_permissions">("companies");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    bookkeeping: true,
    payroll: false,
    practice_management: false,
    time_fees: false,
  });
  const [companySearch, setCompanySearch] = useState("");

  // Split-Screen Form State
  const [userForm, setUserForm] = useState<{
    id?: number;
    email: string;
    role: string;
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postCode: string;
    password?: string;
    permissions: UserPermissions;
  }>({
    email: "",
    role: "staff",
    prefix: "Mr",
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    password: "",
    permissions: {
      autoAssign: false,
      hubAccess: true,
      bankFeedsAccess: false,
      amlOfficer: false,
      assignedClientIds: [],
      clientManagerClientIds: [],
      modulePermissions: { ...DEFAULT_MODULE_PERMS },
      crudPermissions: { ...DEFAULT_CRUD_PERMS },
    },
  });

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // CSV Import State (Matching img_3.png)
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [parsedCsvUsers, setParsedCsvUsers] = useState<any[]>([]);

  // Custom Role Modal & Creation State
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState({
    roleName: "",
    description: "",
    baseTier: "staff",
    useCurrentMatrix: true,
  });

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<PracticeUser[]>({
    queryKey: ["/api/myadmin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/users");
      return res.json();
    },
  });

  const { data: clientsList = [], isLoading: isLoadingClients } = useQuery<PracticeClient[]>({
    queryKey: ["/api/myadmin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/clients");
      return res.json();
    },
  });

  const { data: customRoles = [] } = useQuery<PracticeRoleItem[]>({
    queryKey: ["/api/myadmin/roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/roles");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Custom Role Mutations
  const createCustomRoleMutation = useMutation({
    mutationFn: async (payload: { roleName: string; description: string; baseTier: string; permissionsJson: any }) => {
      const res = await apiRequest("POST", "/api/myadmin/roles", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create custom role");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/roles"] });
      toast({ title: "Custom Role Template Saved", description: `Role '${data.roleName}' is now active for your practice.` });
      setShowCustomRoleModal(false);
      setCustomRoleForm({ roleName: "", description: "", baseTier: "staff", useCurrentMatrix: true });
      setUserForm((p) => ({ ...p, role: data.roleCode }));
    },
    onError: (err: any) => {
      toast({ title: "Failed to Save Role", description: err.message, type: "error" });
    },
  });

  const deleteCustomRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/myadmin/roles/${id}`);
      if (!res.ok) throw new Error("Failed to delete role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/roles"] });
      toast({ title: "Custom Role Deleted", description: "The practice role template has been removed." });
    },
  });

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (!userForm.email || !userForm.firstName) {
        throw new Error("First name and email are mandatory.");
      }

      if (userForm.id) {
        // Update existing user
        const res = await apiRequest("PATCH", `/api/myadmin/users/${userForm.id}`, {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          phone: userForm.phone,
          role: userForm.role,
          permissions: userForm.permissions,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update user");
        }
        return res.json();
      } else {
        // Create new user
        const res = await apiRequest("POST", "/api/myadmin/users", {
          ...userForm,
          password: userForm.password || "SanSuite@2026",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create user");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({
        title: userForm.id ? "User Permissions Updated" : "User Created Successfully",
        description: `Access profile and module allocations for ${userForm.firstName} ${userForm.lastName} have been saved.`,
      });
      setView("list");
      setSelectedUser(null);
    },
    onError: (e: any) => {
      toast({ title: "Operation Failed", description: e.message, type: "error" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/myadmin/users/${id}`, { isActive });
      if (!res.ok) throw new Error("Failed to change user status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({ title: "Status Changed", description: "User login authorization updated." });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/myadmin/users/${id}`);
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({ title: "User Removed", description: "The staff account has been deleted from practice." });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (usersToImport: any[]) => {
      const res = await apiRequest("POST", "/api/myadmin/users/import-csv", { usersList: usersToImport });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import users");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({
        title: "Bulk Import Complete",
        description: data.message || `Imported ${data.importedCount} users.`,
      });
      setView("list");
      setImportStep(1);
      setCsvText("");
      setParsedCsvUsers([]);
    },
    onError: (e: any) => {
      toast({ title: "Import Error", description: e.message, type: "error" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, pass }: { id: number; pass: string }) => {
      if (!pass || pass.length < 6) throw new Error("Password must be at least 6 characters.");
      const res = await apiRequest("PATCH", `/api/myadmin/users/${id}`, { password: pass });
      if (!res.ok) throw new Error("Failed to update password");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "User password has been updated securely." });
      setShowPasswordModal(false);
      setNewPassword("");
    },
    onError: (e: any) => {
      toast({ title: "Password Error", description: e.message, type: "error" });
    },
  });

  // Open Edit User & Permissions View
  const handleOpenEdit = (user?: PracticeUser) => {
    if (user) {
      setSelectedUser(user);
      const userRole = user.role || "staff";
      const preset = ROLE_PRESETS.find((p) => p.id === userRole);
      let defaultCrud = preset ? preset.getPermissions() : { ...DEFAULT_CRUD_PERMS };

      const customMatch = customRoles.find((c) => c.roleCode === userRole);
      if (customMatch?.permissionsJson) {
        try {
          const parsed = JSON.parse(customMatch.permissionsJson);
          if (parsed.crudPermissions) defaultCrud = parsed.crudPermissions;
        } catch (e) {}
      }

      setUserForm({
        id: user.id,
        email: user.email,
        role: userRole,
        prefix: user.prefix || "Mr",
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        addressLine1: user.addressLine1 || "",
        addressLine2: user.addressLine2 || "",
        city: user.city || "",
        postCode: user.postCode || "",
        permissions: {
          autoAssign: user.permissions?.autoAssign ?? (user.role === "admin" || user.role === "accountant" || user.role === "super_accountant"),
          hubAccess: user.permissions?.hubAccess ?? true,
          bankFeedsAccess: user.permissions?.bankFeedsAccess ?? (user.role === "admin" || user.role === "accountant" || user.role === "super_accountant"),
          amlOfficer: user.permissions?.amlOfficer ?? (user.role === "admin" || user.role === "super_accountant"),
          assignedClientIds: Array.isArray(user.permissions?.assignedClientIds) ? user.permissions.assignedClientIds : [],
          clientManagerClientIds: Array.isArray(user.permissions?.clientManagerClientIds) ? user.permissions.clientManagerClientIds : [],
          modulePermissions: {
            ...getInitialModulePermsForRole(userRole),
            ...(user.permissions?.modulePermissions || {}),
          },
          crudPermissions: {
            ...defaultCrud,
            ...(user.permissions?.crudPermissions || {}),
          },
        },
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        email: "",
        role: "staff",
        prefix: "Mr",
        firstName: "",
        middleName: "",
        lastName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        postCode: "",
        password: "SanSuite@2026",
        permissions: {
          autoAssign: false,
          hubAccess: true,
          bankFeedsAccess: false,
          amlOfficer: false,
          assignedClientIds: [],
          clientManagerClientIds: [],
          modulePermissions: { ...DEFAULT_MODULE_PERMS },
          crudPermissions: { ...DEFAULT_CRUD_PERMS },
        },
      });
    }
    setView("edit");
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && (u.role === "admin" || u.role === "super_accountant")) ||
        u.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Filtered Clients in Split Screen Editor
  const filteredCompanies = useMemo(() => {
    return clientsList.filter((c) => {
      if (!companySearch) return true;
      return (
        c.clientName.toLowerCase().includes(companySearch.toLowerCase()) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(companySearch.toLowerCase())) ||
        (c.registrationNumber && c.registrationNumber.toLowerCase().includes(companySearch.toLowerCase()))
      );
    });
  }, [clientsList, companySearch]);

  // Parse CSV for bulk user import
  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsedCsvUsers([]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const parsed: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length >= 3) {
        parsed.push({
          userType: cols[0] || "Staff",
          prefix: cols[1] || "Mr",
          firstName: cols[2] || "",
          middleName: cols[3] || "",
          lastName: cols[4] || "",
          email: cols[5] || "",
          phone: cols[6] || "",
          address: cols[7] || "",
          city: cols[8] || "",
          postCode: cols[9] || "",
          role: (cols[0] || "staff").toLowerCase().replace(" ", "_"),
        });
      }
    }
    setParsedCsvUsers(parsed);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "User Type,Prefix,First Name,Middle Name,Last Name,Email,Phone No,Address,City/Town,Post Code\n" +
      "Accountant,Mr,Kwasi,,Kwarteng,kwasi@example.co.uk,07700900123,10 Downing St,London,SW1A 2AA\n" +
      "Staff,Mr,Rishi,,Sunak,rishi@example.co.uk,07700900456,11 Downing St,London,SW1A 2AA\n" +
      "Client,Ms,Victoria,,Starmer,client@example.co.uk,07700900789,1 High Street,Manchester,M1 1AA";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "SanSuite_Users_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Action & Title Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Users & Permissions Control Center
            </h2>
            <p className="text-xs text-slate-500">
              Manage practice user types, module privileges, and client company allocations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view !== "list" ? (
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <ArrowLeft size={15} /> Back to Users List
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setView("import");
                  setImportStep(1);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <UploadCloud size={15} className="text-slate-600" /> Import Users (CSV)
              </button>

              <button
                onClick={() => handleOpenEdit()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <UserPlus size={15} /> + New User
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: MASTER USERS LISTING & ROLE DIRECTORY (img_1.png) */}
      {/* ========================================================= */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Practice Users</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Staff members & clients</div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Super Admins / Accountants</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {users.filter((u) => u.role === "admin" || u.role === "super_accountant" || u.role === "accountant").length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Full firm managers</div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Shield size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff Members</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {users.filter((u) => u.role === "staff").length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Assigned portfolios</div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Briefcase size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Login Status</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {users.filter((u) => u.isActive).length} / {users.length}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">Authorized for login</div>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <UserCheck size={22} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Quick Search user name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All User Types</option>
                <option value="admin">Super Accountant / Admin</option>
                <option value="accountant">Accountant</option>
                <option value="staff">Staff</option>
                <option value="client">Client</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
                }}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm transition"
                title="Refresh user list"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Master Users Table (Matching img_1.png) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="py-3.5 px-3 w-12 text-slate-400">#</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Email</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Created On</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">User Type</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Status</th>
                    <th className="py-3.5 px-4 text-right font-semibold text-slate-800">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={18} className="animate-spin text-indigo-600" />
                          <span>Loading practice staff and permission registries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <Users size={32} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700">No users found matching your filters</p>
                          <p className="text-xs text-slate-400">
                            Click &quot;+ New User&quot; to invite practice accountants, staff, or clients.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, user.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="hover:text-indigo-600 text-left font-semibold flex items-center gap-2 group"
                          >
                            <span>
                              {user.prefix ? `${user.prefix} ` : ""}
                              {user.firstName} {user.lastName}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{user.email}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${user.role === "admin" || user.role === "super_accountant"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : user.role === "accountant"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : user.role === "client"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                              }`}
                          >
                            {user.role === "super_accountant" ? "Super Accountant" : user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${user.isActive ? "text-emerald-600" : "text-rose-600"
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                            />
                            {user.isActive ? "Active" : "In Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                              title="Edit Contact & Permissions"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                              title="Change User Password"
                            >
                              <Key size={15} />
                            </button>

                            <button
                              onClick={() => {
                                toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive });
                              }}
                              className={`p-1.5 rounded-md transition ${user.isActive
                                  ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                              title={user.isActive ? "Deactivate User" : "Activate User"}
                            >
                              {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>

                            <button
                              onClick={async () => {
                                if (await confirm({
                                  title: "Delete User",
                                  description: `Are you sure you want to delete user "${user.firstName} ${user.lastName || ""}"? This action cannot be undone.`,
                                  confirmText: "Delete User",
                                  variant: "danger"
                                })) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Interactive Pagination */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Displaying <strong>{filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(filteredUsers.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{filteredUsers.length}</strong> Users
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SPLIT-SCREEN USER CONTACT DETAILS & PERMISSIONS (img_4, 5, 6)     */}
      {/* ========================================================================= */}
      {view === "edit" && (
        <div className="space-y-6">
          {/* Back / Title / Save Header */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userForm.id ? `Edit Profile & Permissions: ${userForm.firstName} ${userForm.lastName}` : "Create New User & Allocate Permissions"}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure personal contact information, module accessibility, and client assignments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("list")}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>

              <button
                onClick={() => saveUserMutation.mutate()}
                disabled={saveUserMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                {saveUserMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Two-Column Split Screen Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: USER CONTACT DETAILS (img_4.png left panel) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" /> User Contact Details
                </h3>
                {userForm.id && (
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-sm transition"
                  >
                    Change Password
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    User Name (Official Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. user@practice.co.uk"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      User Type / Role <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomRoleModal(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} />
                      <span>+ Custom Role</span>
                    </button>
                  </div>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const preset = ROLE_PRESETS.find((p) => p.id === newRole);
                      if (preset) {
                        setUserForm((p) => ({
                          ...p,
                          role: newRole,
                          permissions: {
                            ...p.permissions,
                            autoAssign: newRole === "admin" || newRole === "accountant" || newRole === "super_accountant",
                            bankFeedsAccess: newRole === "admin" || newRole === "accountant" || newRole === "super_accountant",
                            amlOfficer: newRole === "admin" || newRole === "super_accountant",
                            crudPermissions: preset.getPermissions(),
                            modulePermissions: (preset as any).getModuleAccess ? (preset as any).getModuleAccess() : p.permissions.modulePermissions,
                          },
                        }));
                        return;
                      }

                      const custom = customRoles.find((c) => c.roleCode === newRole);
                      if (custom && custom.permissionsJson) {
                        try {
                          const parsed = JSON.parse(custom.permissionsJson);
                          setUserForm((p) => ({
                            ...p,
                            role: newRole,
                            permissions: {
                              ...p.permissions,
                              crudPermissions: parsed.crudPermissions || p.permissions.crudPermissions,
                              modulePermissions: parsed.modulePermissions || p.permissions.modulePermissions,
                              autoAssign: parsed.autoAssign ?? p.permissions.autoAssign,
                              bankFeedsAccess: parsed.bankFeedsAccess ?? p.permissions.bankFeedsAccess,
                              amlOfficer: parsed.amlOfficer ?? p.permissions.amlOfficer,
                            },
                          }));
                          return;
                        } catch (e) {}
                      }

                      setUserForm((p) => ({ ...p, role: newRole }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <optgroup label="Standard Practice Roles (Default)">
                      <option value="super_accountant">Super Accountant (Full Practice Authority)</option>
                      <option value="accountant">Accountant (Reviewer & Sign-Off Authority)</option>
                      <option value="staff">Staff (Preparation & Data Entry Only)</option>
                      <option value="client">Client (Client Portal 365 / Bookkeeping / Payroll)</option>
                    </optgroup>
                    {customRoles.length > 0 && (
                      <optgroup label="Custom Practice Roles (Firm Templates)">
                        {customRoles.map((cr) => (
                          <option key={cr.id} value={cr.roleCode}>
                            {cr.roleName} ({cr.badge || "Custom"})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                    <select
                      value={userForm.prefix}
                      onChange={(e) => setUserForm((p) => ({ ...p, prefix: e.target.value }))}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Sir">Sir</option>
                      <option value="Lord">Lord</option>
                      <option value="Lady">Lady</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="First Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={userForm.middleName}
                      onChange={(e) => setUserForm((p) => ({ ...p, middleName: e.target.value }))}
                      placeholder="Middle Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Last Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 07700 900123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {!userForm.id && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Temporary password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={userForm.addressLine1}
                    onChange={(e) => setUserForm((p) => ({ ...p, addressLine1: e.target.value }))}
                    placeholder="Type in Address Line 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={userForm.addressLine2}
                    onChange={(e) => setUserForm((p) => ({ ...p, addressLine2: e.target.value }))}
                    placeholder="Type in Address Line 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      value={userForm.city}
                      onChange={(e) => setUserForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Type in City / Town"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Post Code</label>
                    <input
                      type="text"
                      value={userForm.postCode}
                      onChange={(e) => setUserForm((p) => ({ ...p, postCode: e.target.value }))}
                      placeholder="e.g. RM13 8LH"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: USER PERMISSIONS (img_4.png & img_6.png right panel) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-600" /> User Permissions
                </h3>

                {/* Top Global Authority Toggles (Auto Assign, Hub, Bank Feeds, AML Officer) */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.autoAssign}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, autoAssign: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Auto Assign</span>
                    <span title="Automatically assign all future clients created in practice to this user">
                      <Info size={13} className="text-slate-400" />
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.hubAccess}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, hubAccess: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hub</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.bankFeedsAccess}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, bankFeedsAccess: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Bank feeds</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.amlOfficer}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, amlOfficer: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>AML Officer</span>
                    <span title="Authorized to approve Money Laundering risk assessments">
                      <Info size={13} className="text-slate-400" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Sub-Tabs: 1: Companies, 2: Module Permissions & CRUD Matrix (Unified per user request) */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditorPermTab("companies")}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                    editorPermTab === "companies"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Building2 size={15} />
                  <span>Companies ({(userForm.permissions?.assignedClientIds || []).length} Assigned)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorPermTab("modules_permissions")}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                    editorPermTab === "modules_permissions"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Key size={15} />
                  <span>Module Permissions & Feature Access</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    CRUD + Sub-Features
                  </span>
                </button>
              </div>

              {/* TAB 2: UNIFIED MODULE PERMISSIONS & CRUD MATRIX WITH ACCORDION SUB-FEATURES */}
              {editorPermTab === "modules_permissions" && (
                <div className="space-y-4">
                  {/* Preset Selector Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 rounded-xl border border-indigo-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <SlidersHorizontal size={14} className="text-indigo-600" />
                          <span>Practice Role Presets & Fast Apply</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Click any role preset below to quickly apply standard permissions across all modules, or create custom role templates for your firm.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCustomRoleModal(true)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg shadow-sm transition flex items-center gap-1.5"
                        >
                          <Plus size={13} />
                          <span>Create Custom Role</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {ROLE_PRESETS.map((preset) => {
                        const isCurrent = userForm.role === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setUserForm((p) => {
                                const newCrud = preset.getPermissions();
                                const newModulePerms = (preset as any).getModuleAccess ? (preset as any).getModuleAccess() : { ...p.permissions.modulePermissions };
                                return {
                                  ...p,
                                  role: preset.id,
                                  permissions: {
                                    ...p.permissions,
                                    autoAssign: preset.id === "super_accountant" || preset.id === "accountant",
                                    bankFeedsAccess: preset.id === "super_accountant" || preset.id === "accountant",
                                    amlOfficer: preset.id === "super_accountant",
                                    crudPermissions: newCrud,
                                    modulePermissions: newModulePerms,
                                  },
                                };
                              });
                              toast({
                                title: `Preset Applied: ${preset.name}`,
                                description: `Configured for ${preset.badge}. You can fine-tune specific actions below.`,
                              });
                            }}
                            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                              isCurrent
                                ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500"
                                : "bg-white/80 border-slate-200 hover:border-indigo-300 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-800">{preset.name}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${preset.badgeColor}`}>
                                {preset.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight">
                              {preset.description}
                            </p>
                          </button>
                        );
                      })}

                      {/* Custom Practice Role Cards */}
                      {customRoles.map((cr) => {
                        const isCurrent = userForm.role === cr.roleCode;
                        let parsedPerms: any = null;
                        try {
                          if (cr.permissionsJson) parsedPerms = JSON.parse(cr.permissionsJson);
                        } catch (e) {}

                        return (
                          <div
                            key={cr.id}
                            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between relative group ${
                              isCurrent
                                ? "bg-white border-teal-500 shadow-sm ring-1 ring-teal-500"
                                : "bg-white/80 border-slate-200 hover:border-teal-300 hover:bg-white"
                            }`}
                          >
                            <div
                              className="cursor-pointer"
                              onClick={() => {
                                if (parsedPerms) {
                                  setUserForm((p) => ({
                                    ...p,
                                    role: cr.roleCode,
                                    permissions: {
                                      ...p.permissions,
                                      ...parsedPerms,
                                    },
                                  }));
                                  toast({
                                    title: `Custom Preset Applied: ${cr.roleName}`,
                                    description: `Applied practice-specific role permissions template.`,
                                  });
                                }
                              }}
                            >
                              <div className="flex items-center justify-between mb-1 pr-6">
                                <span className="font-bold text-xs text-slate-800">{cr.roleName}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-teal-50 text-teal-800 border-teal-200">
                                  {cr.badge || "Custom"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-tight">
                                {cr.description || "Practice tailored role template"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirm({
                                  title: "Delete Custom Role Template?",
                                  description: `Are you sure you want to remove '${cr.roleName}'? Existing users with this role will keep their current permissions.`,
                                  confirmText: "Delete Role",
                                  variant: "danger",
                                });
                                if (ok) {
                                  deleteCustomRoleMutation.mutate(cr.id);
                                }
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition"
                              title="Delete custom role template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bulk Column Controls & Expand/Collapse Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5 mr-1">
                        <Sliders size={13} className="text-slate-500" />
                        Bulk Column:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => {
                            const cur = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                            const allOn = CRUD_MODULE_CATALOG.every((m) => cur[m.key]?.view);
                            CRUD_MODULE_CATALOG.forEach((m) => {
                              cur[m.key] = { ...(cur[m.key] || DEFAULT_CRUD_PERMS[m.key]), view: !allOn };
                            });
                            return { ...p, permissions: { ...p.permissions, crudPermissions: cur } };
                          });
                        }}
                        className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 font-medium"
                      >
                        Toggle View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => {
                            const cur = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                            const allOn = CRUD_MODULE_CATALOG.every((m) => cur[m.key]?.create);
                            CRUD_MODULE_CATALOG.forEach((m) => {
                              cur[m.key] = { ...(cur[m.key] || DEFAULT_CRUD_PERMS[m.key]), create: !allOn };
                            });
                            return { ...p, permissions: { ...p.permissions, crudPermissions: cur } };
                          });
                        }}
                        className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 font-medium"
                      >
                        Toggle Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => {
                            const cur = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                            const allOn = CRUD_MODULE_CATALOG.every((m) => cur[m.key]?.edit);
                            CRUD_MODULE_CATALOG.forEach((m) => {
                              cur[m.key] = { ...(cur[m.key] || DEFAULT_CRUD_PERMS[m.key]), edit: !allOn };
                            });
                            return { ...p, permissions: { ...p.permissions, crudPermissions: cur } };
                          });
                        }}
                        className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700 font-medium"
                      >
                        Toggle Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => {
                            const cur = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                            const allOn = CRUD_MODULE_CATALOG.every((m) => cur[m.key]?.delete);
                            CRUD_MODULE_CATALOG.forEach((m) => {
                              cur[m.key] = { ...(cur[m.key] || DEFAULT_CRUD_PERMS[m.key]), delete: !allOn };
                            });
                            return { ...p, permissions: { ...p.permissions, crudPermissions: cur } };
                          });
                        }}
                        className="px-2 py-1 text-[11px] bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 text-rose-700 font-medium"
                      >
                        Toggle Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => {
                            const cur = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                            const allOn = CRUD_MODULE_CATALOG.every((m) => cur[m.key]?.approve);
                            CRUD_MODULE_CATALOG.forEach((m) => {
                              cur[m.key] = { ...(cur[m.key] || DEFAULT_CRUD_PERMS[m.key]), approve: !allOn };
                            });
                            return { ...p, permissions: { ...p.permissions, crudPermissions: cur } };
                          });
                        }}
                        className="px-2 py-1 text-[11px] bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 text-purple-700 font-medium"
                      >
                        Toggle Sign-Off
                      </button>
                    </div>

                    {/* Expand All / Collapse All Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const allExpanded = CRUD_MODULE_CATALOG.every((m) => expandedModules[m.key]);
                        const next: Record<string, boolean> = {};
                        CRUD_MODULE_CATALOG.forEach((m) => {
                          next[m.key] = !allExpanded;
                        });
                        setExpandedModules(next);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    >
                      {CRUD_MODULE_CATALOG.every((m) => expandedModules[m.key]) ? (
                        <>
                          <ChevronDown size={13} className="text-indigo-600" />
                          <span>Collapse All Options</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight size={13} className="text-indigo-600" />
                          <span>Expand All Options</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Hierarchical Accordion CRUD & Sub-Features Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Module & Granular Options (Click to Expand)</th>
                          <th className="py-2.5 px-2 text-center w-20">Access</th>
                          <th className="py-2.5 px-2 text-center w-16">View</th>
                          <th className="py-2.5 px-2 text-center w-16">Create</th>
                          <th className="py-2.5 px-2 text-center w-16">Edit</th>
                          <th className="py-2.5 px-2 text-center w-16 text-rose-700 bg-rose-50/50">Delete</th>
                          <th className="py-2.5 px-2 text-center w-24 text-purple-700 bg-purple-50/50">Sign-Off</th>
                          <th className="py-2.5 px-2 text-right pr-3 w-28">Row Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {CRUD_MODULE_CATALOG.map((mod) => {
                          const IconComp = mod.icon;
                          const hasModuleAccess = userForm.permissions.modulePermissions[mod.key] !== false;
                          const isExpanded = !!expandedModules[mod.key];
                          const currentCrud = userForm.permissions.crudPermissions?.[mod.key] || DEFAULT_CRUD_PERMS[mod.key] || {
                            view: true,
                            create: true,
                            edit: true,
                            delete: false,
                            approve: false,
                          };

                          const updateAction = (action: keyof CrudActionPerms, val: boolean) => {
                            setUserForm((p) => {
                              const curMap = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                              const itemPerms = { ...(curMap[mod.key] || DEFAULT_CRUD_PERMS[mod.key]), [action]: val };
                              const updatedModulePerms = { ...p.permissions.modulePermissions };

                              if ((action === "create" || action === "edit" || action === "approve" || action === "delete") && val) {
                                itemPerms.view = true;
                                updatedModulePerms[mod.key] = true;
                              }
                              if (action === "view") {
                                if (!val) {
                                  itemPerms.create = false;
                                  itemPerms.edit = false;
                                  itemPerms.delete = false;
                                  itemPerms.approve = false;
                                  updatedModulePerms[mod.key] = false;
                                  mod.subFeatures.forEach((sub) => {
                                    updatedModulePerms[sub.id] = false;
                                  });
                                } else {
                                  updatedModulePerms[mod.key] = true;
                                }
                              }

                              curMap[mod.key] = itemPerms;
                              return {
                                ...p,
                                permissions: {
                                  ...p.permissions,
                                  modulePermissions: updatedModulePerms,
                                  crudPermissions: curMap,
                                },
                              };
                            });
                          };

                          const toggleModuleAccess = (val: boolean) => {
                            setUserForm((p) => {
                              const updatedModulePerms = { ...p.permissions.modulePermissions, [mod.key]: val };
                              mod.subFeatures.forEach((sub) => {
                                updatedModulePerms[sub.id] = val;
                              });
                              const curMap = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                              if (!val) {
                                curMap[mod.key] = { view: false, create: false, edit: false, delete: false, approve: false };
                              } else {
                                curMap[mod.key] = {
                                  view: true,
                                  create: true,
                                  edit: true,
                                  delete: curMap[mod.key]?.delete || false,
                                  approve: curMap[mod.key]?.approve || false,
                                };
                              }
                              return {
                                ...p,
                                permissions: {
                                  ...p.permissions,
                                  modulePermissions: updatedModulePerms,
                                  crudPermissions: curMap,
                                },
                              };
                            });
                          };

                          return (
                            <>
                              {/* PARENT MODULE ROW */}
                              <tr
                                key={mod.key}
                                className={`transition ${
                                  !hasModuleAccess
                                    ? "bg-slate-50/60 opacity-60"
                                    : isExpanded
                                    ? "bg-indigo-50/20"
                                    : "hover:bg-slate-50/80"
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="flex items-start gap-2">
                                    {/* Expand/Collapse Chevron Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedModules((prev) => ({
                                          ...prev,
                                          [mod.key]: !prev[mod.key],
                                        }))
                                      }
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition mt-0.5"
                                      title={isExpanded ? "Collapse sub-features" : "Expand sub-features"}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={15} className="text-indigo-600" />
                                      ) : (
                                        <ChevronRight size={15} />
                                      )}
                                    </button>

                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        hasModuleAccess ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-500"
                                      }`}
                                    >
                                      <IconComp size={15} />
                                    </div>

                                    <div
                                      className="cursor-pointer"
                                      onClick={() =>
                                        setExpandedModules((prev) => ({
                                          ...prev,
                                          [mod.key]: !prev[mod.key],
                                        }))
                                      }
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900">{mod.name}</span>
                                        <span
                                          className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                            mod.category === "Compliance & Statutory"
                                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                                              : mod.category === "Finance & Invoicing"
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : "bg-slate-100 text-slate-700 border border-slate-200"
                                          }`}
                                        >
                                          {mod.category}
                                        </span>
                                        <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                                          {mod.subFeatures.length} options {isExpanded ? "▲" : "▼"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5 max-w-sm">
                                        {mod.description}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Access Toggle */}
                                <td className="py-2.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={hasModuleAccess}
                                    onChange={(e) => toggleModuleAccess(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    title={hasModuleAccess ? "Module Enabled" : "Module Deactivated"}
                                  />
                                </td>

                                {/* View */}
                                <td className="py-2.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={!hasModuleAccess}
                                    checked={hasModuleAccess && currentCrud.view}
                                    onChange={(e) => updateAction("view", e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>

                                {/* Create */}
                                <td className="py-2.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={!hasModuleAccess}
                                    checked={hasModuleAccess && currentCrud.create}
                                    onChange={(e) => updateAction("create", e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>

                                {/* Edit */}
                                <td className="py-2.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={!hasModuleAccess}
                                    checked={hasModuleAccess && currentCrud.edit}
                                    onChange={(e) => updateAction("edit", e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>

                                {/* Delete */}
                                <td className="py-2.5 px-2 text-center bg-rose-50/20">
                                  <input
                                    type="checkbox"
                                    disabled={!hasModuleAccess}
                                    checked={hasModuleAccess && currentCrud.delete}
                                    onChange={(e) => updateAction("delete", e.target.checked)}
                                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                    title="Caution: Authorizes permanent record deletion"
                                  />
                                </td>

                                {/* Sign-Off / Approval */}
                                <td className="py-2.5 px-2 text-center bg-purple-50/20">
                                  <input
                                    type="checkbox"
                                    disabled={!hasModuleAccess}
                                    checked={hasModuleAccess && currentCrud.approve}
                                    onChange={(e) => updateAction("approve", e.target.checked)}
                                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                    title="Legal Sign-Off / HMRC Submission / Timesheet Approval"
                                  />
                                </td>

                                {/* Row Quick Action */}
                                <td className="py-2.5 px-2 text-right pr-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserForm((p) => {
                                          const curMap = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                                          curMap[mod.key] = { view: true, create: true, edit: true, delete: true, approve: true };
                                          const updatedModulePerms = { ...p.permissions.modulePermissions, [mod.key]: true };
                                          mod.subFeatures.forEach((sub) => {
                                            updatedModulePerms[sub.id] = true;
                                          });
                                          return {
                                            ...p,
                                            permissions: {
                                              ...p.permissions,
                                              crudPermissions: curMap,
                                              modulePermissions: updatedModulePerms,
                                            },
                                          };
                                        });
                                      }}
                                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                                      title="Grant full CRUD and sign-off for this module"
                                    >
                                      All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserForm((p) => {
                                          const curMap = { ...(p.permissions.crudPermissions || DEFAULT_CRUD_PERMS) };
                                          curMap[mod.key] = { view: false, create: false, edit: false, delete: false, approve: false };
                                          const updatedModulePerms = { ...p.permissions.modulePermissions, [mod.key]: false };
                                          mod.subFeatures.forEach((sub) => {
                                            updatedModulePerms[sub.id] = false;
                                          });
                                          return {
                                            ...p,
                                            permissions: {
                                              ...p.permissions,
                                              crudPermissions: curMap,
                                              modulePermissions: updatedModulePerms,
                                            },
                                          };
                                        });
                                      }}
                                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 font-medium"
                                      title="Revoke all actions for this module"
                                    >
                                      None
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* ACCORDION COLLAPSIBLE SUB-FEATURES PANEL */}
                              {isExpanded && (
                                <tr key={mod.key + "_subpanel"}>
                                  <td colSpan={8} className="p-0 border-t border-b border-indigo-100/70 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50">
                                    <div className="p-4 pl-12 pr-6 space-y-3">
                                      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
                                        <div className="flex items-center gap-2">
                                          <Layers size={14} className="text-indigo-600" />
                                          <span className="text-xs font-bold text-slate-800">
                                            Granular Feature & Sub-Module Toggles for {mod.name}
                                          </span>
                                          <span className="text-[10px] text-slate-500">
                                            ({mod.subFeatures.filter((s) => userForm.permissions.modulePermissions[s.id] !== false).length} of {mod.subFeatures.length} active)
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setUserForm((p) => {
                                                const updated = { ...p.permissions.modulePermissions };
                                                mod.subFeatures.forEach((s) => {
                                                  updated[s.id] = true;
                                                });
                                                return {
                                                  ...p,
                                                  permissions: {
                                                    ...p.permissions,
                                                    modulePermissions: updated,
                                                  },
                                                };
                                              });
                                            }}
                                            className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium"
                                          >
                                            Select All Features
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setUserForm((p) => {
                                                const updated = { ...p.permissions.modulePermissions };
                                                mod.subFeatures.forEach((s) => {
                                                  updated[s.id] = false;
                                                });
                                                return {
                                                  ...p,
                                                  permissions: {
                                                    ...p.permissions,
                                                    modulePermissions: updated,
                                                  },
                                                };
                                              });
                                            }}
                                            className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 font-medium"
                                          >
                                            Clear All
                                          </button>
                                        </div>
                                      </div>

                                      {!hasModuleAccess ? (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                                          <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                          <span>
                                            Access to <strong>{mod.name}</strong> is turned off above. Enable module access to activate and assign its sub-features.
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                          {mod.subFeatures.map((sub) => {
                                            const isChecked = userForm.permissions.modulePermissions[sub.id] !== false;
                                            return (
                                              <label
                                                key={sub.id}
                                                className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer select-none ${
                                                  isChecked
                                                    ? "bg-white border-indigo-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                                                    : "bg-slate-100/60 border-slate-200/80 opacity-60"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                    const val = e.target.checked;
                                                    setUserForm((p) => ({
                                                      ...p,
                                                      permissions: {
                                                        ...p.permissions,
                                                        modulePermissions: {
                                                          ...p.permissions.modulePermissions,
                                                          [sub.id]: val,
                                                          [mod.key]: val ? true : p.permissions.modulePermissions[mod.key],
                                                        },
                                                      },
                                                    }));
                                                  }}
                                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 mt-0.5"
                                                />
                                                <div className="flex-1">
                                                  <div className="font-semibold text-slate-800 text-xs">
                                                    {sub.label}
                                                  </div>
                                                  {sub.desc && (
                                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                      {sub.desc}
                                                    </div>
                                                  )}
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Legend */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <CheckCircle2 size={13} className="text-indigo-600" />
                        Role Matrix Legend:
                      </span>
                      <span><strong>View:</strong> Inspect reports & ledger records</span>
                      <span><strong>Create/Edit:</strong> Draft entries & workflows</span>
                      <span className="text-rose-700"><strong>Delete:</strong> Permanent purge authority</span>
                      <span className="text-purple-700"><strong>Sign-Off:</strong> Legal HMRC / Timesheet sign-off</span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Standard UK Practice Multi-Tier Authorization
                    </span>
                  </div>
                </div>
              )}

              {/* SUB-TAB 1: COMPANIES CLIENT ALLOCATION (img_4 & img_5) */}
              {editorPermTab === "companies" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Quick Search company name or client code..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = clientsList.map((c) => c.id);
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              assignedClientIds: allIds,
                            },
                          }));
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              assignedClientIds: [],
                              clientManagerClientIds: [],
                            },
                          }));
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Companies Allocation Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Company Name</th>
                          <th className="py-2.5 px-3 text-center w-32">Assigned Clients</th>
                          <th className="py-2.5 px-3 text-center w-32">Client Manager</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400">
                              No companies found
                            </td>
                          </tr>
                        ) : (
                          filteredCompanies.map((comp) => {
                            const isAssigned = (userForm.permissions?.assignedClientIds || []).includes(comp.id);
                            const isManager = (userForm.permissions?.clientManagerClientIds || []).includes(comp.id);

                            return (
                              <tr key={comp.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-800">{comp.clientName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {comp.clientCode ? `Code: ${comp.clientCode} | ` : ""}
                                    {comp.clientType}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setUserForm((p) => {
                                        const cur = p.permissions?.assignedClientIds || [];
                                        const updated = checked
                                          ? [...cur, comp.id]
                                          : cur.filter((id) => id !== comp.id);

                                        // If unassigning, also remove client manager
                                        const curMgr = p.permissions?.clientManagerClientIds || [];
                                        const updatedMgr = checked
                                          ? curMgr
                                          : curMgr.filter((id) => id !== comp.id);

                                        return {
                                          ...p,
                                          permissions: {
                                            ...p.permissions,
                                            assignedClientIds: updated,
                                            clientManagerClientIds: updatedMgr,
                                          },
                                        };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isManager}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setUserForm((p) => {
                                        const curMgr = p.permissions?.clientManagerClientIds || [];
                                        const updatedMgr = checked
                                          ? [...curMgr, comp.id]
                                          : curMgr.filter((id) => id !== comp.id);

                                        // If making manager, ensure also assigned
                                        const cur = p.permissions?.assignedClientIds || [];
                                        const updated = checked && !cur.includes(comp.id)
                                          ? [...cur, comp.id]
                                          : cur;

                                        return {
                                          ...p,
                                          permissions: {
                                            ...p.permissions,
                                            assignedClientIds: updated,
                                            clientManagerClientIds: updatedMgr,
                                          },
                                        };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: 3-STEP CSV USER BULK IMPORTER (img_3.png)                        */}
      {/* ========================================================================= */}
      {view === "import" && (
        <div className="space-y-6">
          {/* Stepper Header (1 -> 2 -> 3) matching img_3.png */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-center gap-4 max-w-xl mx-auto mb-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 1
                      ? "bg-indigo-600 text-white"
                      : importStep > 1
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {importStep > 1 ? <Check size={16} /> : "1"}
                </div>
                <span className="text-xs font-semibold text-slate-700">Download Template</span>
              </div>

              <div className="w-16 h-0.5 bg-slate-200" />

              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 2
                      ? "bg-indigo-600 text-white"
                      : importStep > 2
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {importStep > 2 ? <Check size={16} /> : "2"}
                </div>
                <span className="text-xs font-semibold text-slate-700">Upload CSV</span>
              </div>

              <div className="w-16 h-0.5 bg-slate-200" />

              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 3 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                >
                  3
                </div>
                <span className="text-xs font-semibold text-slate-700">Confirm & Import</span>
              </div>
            </div>

            {/* STEP 1: DOWNLOAD TEMPLATE & FIELD SPECS (img_3.png) */}
            {importStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 border border-slate-200 rounded-xl p-6 space-y-4 bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900">Import Users</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Step 1: Download CSV template</strong>
                    <br />
                    Start by downloading our users CSV (Comma Separated Values) template file. This file has the correct column headings required to import user access seamlessly into SanSuite.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>Note: Please don&apos;t include any commas inside cell fields as it is a Comma Separated Value (CSV) file.</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleDownloadCsvTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      <Download size={15} /> Download CSV Template
                    </button>
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      Next Step
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 border border-slate-200 rounded-xl p-6 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Available Fields & Formats</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Field Name</th>
                          <th className="py-2.5 px-3">Required</th>
                          <th className="py-2.5 px-3">Notes</th>
                          <th className="py-2.5 px-3">Supported Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">User Type</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Role level</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Accountant, Staff, Client</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Prefix</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Salutation</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Mr, Mrs, Miss, Ms, Dr, Sir</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">First Name</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">First Name of User</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Last Name</td>
                          <td className="py-2 px-3 text-slate-400">No</td>
                          <td className="py-2 px-3 text-slate-500">Surname</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Email</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Official Login ID</td>
                          <td className="py-2 px-3 font-mono text-[11px]">e.g. user@domain.com</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Phone No</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Contact Number</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: UPLOAD CSV FILE OR PASTE */}
            {importStep === 2 && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Step 2: Upload or Paste CSV Data</h3>
                  <p className="text-xs text-slate-500">
                    Upload your completed CSV file or paste the comma-separated contents below.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/50 transition">
                  <UploadCloud size={36} className="mx-auto text-indigo-600" />
                  <div>
                    <label className="cursor-pointer text-sm font-semibold text-indigo-600 hover:underline">
                      <span>Click to browse CSV file</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              handleParseCsv(text);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">Supported format: .CSV</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Or Paste CSV Raw Text</label>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => handleParseCsv(e.target.value)}
                    placeholder="User Type,Prefix,First Name,Middle Name,Last Name,Email,Phone No,Address,City/Town,Post Code&#10;Accountant,Mr,John,,Doe,john@example.com,07700900123,1 High St,London,EC1A 1BB"
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (parsedCsvUsers.length === 0) {
                        toast({ title: "No Users Found", description: "Please upload or paste valid CSV data with users.", type: "error" });
                        return;
                      }
                      setImportStep(3);
                    }}
                    disabled={parsedCsvUsers.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Preview & Verify ({parsedCsvUsers.length} Users)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW AND CONFIRM IMPORT */}
            {importStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Step 3: Confirm & Import Users</h3>
                    <p className="text-xs text-slate-500">
                      Review the parsed staff and client profiles below before completing import.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => bulkImportMutation.mutate(parsedCsvUsers)}
                      disabled={bulkImportMutation.isPending}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      {bulkImportMutation.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                      Confirm & Import ({parsedCsvUsers.length} Users)
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">User Type</th>
                        <th className="py-2.5 px-3">City & Postcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedCsvUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {u.prefix} {u.firstName} {u.lastName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                          <td className="py-2.5 px-3 text-slate-600">{u.phone}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {u.userType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {u.city} {u.postCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <Key size={18} />
                <span>Change Password</span>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Reset login password for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email}).
              </p>
              <p className="text-slate-400">The user will be required to use this new password on next login.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  changePasswordMutation.mutate({ id: selectedUser.id, pass: newPassword });
                }}
                disabled={changePasswordMutation.isPending || !newPassword}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM ROLE TEMPLATE MODAL */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Custom Practice Role</h3>
                  <p className="text-[11px] text-slate-500">Save a reusable role template tailored to your firm</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Title / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customRoleForm.roleName}
                  onChange={(e) => setCustomRoleForm((p) => ({ ...p, roleName: e.target.value }))}
                  placeholder="e.g. VAT Compliance Officer, Trainee Bookkeeper"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Authority Tier</label>
                <select
                  value={customRoleForm.baseTier}
                  onChange={(e) => setCustomRoleForm((p) => ({ ...p, baseTier: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="staff">Staff (Preparation & Data Entry Only - restricted delete/sign-off)</option>
                  <option value="accountant">Accountant (Reviewer & Sign-off authority)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description</label>
                <textarea
                  rows={2}
                  value={customRoleForm.description}
                  onChange={(e) => setCustomRoleForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Responsible for quarterly client VAT returns and bank ledger reconciliation."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs text-teal-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-teal-700" />
                  <span>Includes Current Permissions Matrix</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  The role template will snapshot all module access checkboxes and CRUD permissions currently selected on this screen.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomRoleModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!customRoleForm.roleName.trim()) {
                    toast({ title: "Name Required", description: "Please enter a role name.", type: "error" });
                    return;
                  }
                  createCustomRoleMutation.mutate({
                    roleName: customRoleForm.roleName,
                    description: customRoleForm.description,
                    baseTier: customRoleForm.baseTier,
                    permissionsJson: {
                      crudPermissions: userForm.permissions.crudPermissions,
                      modulePermissions: userForm.permissions.modulePermissions,
                      autoAssign: customRoleForm.baseTier === "accountant",
                      bankFeedsAccess: true,
                      amlOfficer: false,
                    },
                  });
                }}
                disabled={createCustomRoleMutation.isPending || !customRoleForm.roleName.trim()}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {createCustomRoleMutation.isPending ? "Saving..." : "Save Role Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
