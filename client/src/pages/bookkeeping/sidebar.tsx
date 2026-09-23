import {
  LayoutDashboard, FileText, ShoppingCart, Wallet, Users, BarChart2,
  Settings, CreditCard, Zap, Archive, Box, CheckSquare, Calendar, Globe,
  ShieldCheck, FileBarChart, History, ArrowLeft
} from "lucide-react";

// Global Practice Hub Sidebar (When no client is active)
export const bookkeepingSidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/bookkeeping" },
  {
    label: "Settings", icon: <Settings size={15} />, children: [
      { label: "Company Info", route: "/bookkeeping/company-info" },
      { label: "Accounting Periods", route: "/bookkeeping/accounting-periods" },
      { label: "Chart of Accounts", route: "/bookkeeping/chart-of-accounts" },
      { label: "Company Logo", route: "/bookkeeping/company-logo" },
      { label: "Invoice Templates", route: "/bookkeeping/template-settings" },
      { label: "Opening Balance", route: "/bookkeeping/opening-balance" },
      { label: "Currency", route: "/bookkeeping/currency" },
      { label: "Customise Sequence", route: "/bookkeeping/customise-sequence" },
    ]
  },
];

// Client Workspace Sidebar (Active after selecting a client)
export const getClientSidebar = (clientId: string) => [
  { label: "All Clients", icon: <ArrowLeft size={15} />, route: "/bookkeeping" },
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: `/bookkeeping/${clientId}` },

  { label: "SanSuite Pay", icon: <CreditCard size={15} />, route: `/bookkeeping/${clientId}/SanSuite-pay` },

  {
    label: "Sales", icon: <FileText size={15} />, children: [
      { label: "Dashboard", route: `/bookkeeping/${clientId}/sales` },
      { label: "Invoices", route: `/bookkeeping/${clientId}/invoices` },
      { label: "Quotations", route: `/bookkeeping/${clientId}/quotes` },
      { label: "Recurring Invoices", route: `/bookkeeping/${clientId}/recurring-invoices` },
      { label: "Receipts", route: `/bookkeeping/${clientId}/receipts` },
      { label: "Items", route: `/bookkeeping/${clientId}/items` },
    ]
  },
  {
    label: "Purchase", icon: <ShoppingCart size={15} />, children: [
      { label: "Dashboard", route: `/bookkeeping/${clientId}/purchase-dashboard` },
      { label: "Purchases", route: `/bookkeeping/${clientId}/purchases` },
      { label: "DocScan", route: `/bookkeeping/${clientId}/docscan` },
      { label: "Recurring Purchases", route: `/bookkeeping/${clientId}/recurring-purchases` },
      { label: "Payments", route: `/bookkeeping/${clientId}/purchase-payments` },
    ]
  },
  { label: "Quick Entry", icon: <Zap size={15} />, route: `/bookkeeping/${clientId}/quick-entry` },
  { label: "Fixed Assets", icon: <Archive size={15} />, route: `/bookkeeping/${clientId}/fixed-assets` },
  { label: "Inventory", icon: <Box size={15} />, route: `/bookkeeping/${clientId}/inventory` },
  {
    label: "Tasks", icon: <CheckSquare size={15} />, children: [
      { label: "Journals", route: `/bookkeeping/${clientId}/journals` },
      { label: "Budgeting", route: `/bookkeeping/${clientId}/budgeting` },
      { label: "Dividends", route: `/bookkeeping/${clientId}/dividends` },
      { label: "Bulk Edit", route: `/bookkeeping/${clientId}/bulk-edit` },
    ]
  },
  {
    label: "Bank", icon: <Wallet size={15} />, children: [
      { label: "Dashboard", route: `/bookkeeping/${clientId}/bank` },
      { label: "Cash Coding", route: `/bookkeeping/${clientId}/cash-coding` },
      { label: "Bank Rules", route: `/bookkeeping/${clientId}/bank-rules` },
      { label: "Bank Transfer", route: `/bookkeeping/${clientId}/bank-transfer` },
      { label: "Bank Feeds", route: `/bookkeeping/${clientId}/bank-feeds` },
    ]
  },
  {
    label: "Contacts", icon: <Users size={15} />, children: [
      { label: "Customers", route: `/bookkeeping/${clientId}/contacts?type=Customer` },
      { label: "Suppliers", route: `/bookkeeping/${clientId}/contacts?type=Supplier` },
      { label: "Directors", route: `/bookkeeping/${clientId}/contacts?type=Director` },
      { label: "Shareholders", route: `/bookkeeping/${clientId}/contacts?type=Shareholder` },
    ]
  },
  {
    label: "Schedule", icon: <Calendar size={15} />, children: [
      { label: "Minutes of Meetings", route: `/bookkeeping/${clientId}/minutes` },
      { label: "Notes", route: `/bookkeeping/${clientId}/notes` },
    ]
  },
  {
    label: "VAT", icon: <BarChart2 size={15} />, children: [
      { label: "Submit VAT", route: `/bookkeeping/${clientId}/vat` },
      { label: "VAT Return Report", route: `/bookkeeping/${clientId}/vat-report` },
      { label: "VAT Transactions Detail", route: `/bookkeeping/${clientId}/vat-transactions` },
      { label: "VAT Settings", route: `/bookkeeping/${clientId}/vat-settings` },
    ]
  },
  { label: "EC Sales List", icon: <Globe size={15} />, route: `/bookkeeping/${clientId}/ec-sales` },
  {
    label: "MTD", icon: <FileBarChart size={15} />, children: [
      { label: "Submit/Bridging/View", route: `/bookkeeping/${clientId}/mtd` },
    ]
  },
  {
    label: "CIS", icon: <ShieldCheck size={15} />, children: [
      { label: "Subcontractor", route: `/bookkeeping/${clientId}/cis-subcontractor` },
      { label: "CIS300", route: `/bookkeeping/${clientId}/cis-300` },
      { label: "Reports", route: `/bookkeeping/${clientId}/cis-reports` },
      { label: "Contractor Settings", route: `/bookkeeping/${clientId}/cis-settings` },
    ]
  },
  { label: "Reports", icon: <FileBarChart size={15} />, route: `/bookkeeping/${clientId}/reports` },
  { label: "Logs", icon: <History size={15} />, route: `/bookkeeping/${clientId}/logs` },
  {
    label: "Settings", icon: <Settings size={15} />, children: [
      { label: "Company Info", route: `/bookkeeping/${clientId}/company-info` },
      { label: "Accounting Periods", route: `/bookkeeping/${clientId}/accounting-periods` },
      { label: "Chart of Accounts", route: `/bookkeeping/${clientId}/chart-of-accounts` },
      { label: "Company Logo", route: `/bookkeeping/${clientId}/company-logo` },
      { label: "Invoice Templates", route: `/bookkeeping/${clientId}/template-settings` },
      { label: "Opening Balance", route: `/bookkeeping/${clientId}/opening-balance` },
      { label: "Currency", route: `/bookkeeping/${clientId}/currency` },
      { label: "Customise Sequence", route: `/bookkeeping/${clientId}/customise-sequence` },
    ]
  },
];
