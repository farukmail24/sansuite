import type { NavItem } from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, Users, FileSpreadsheet, Layers, FileText,
  Calculator, FileSignature, Send, Shield, ListTree, Printer,
  Settings, Building2, CheckSquare, History
} from "lucide-react";

/**
 * Centralized Single Source of Truth for Accounts Production Workspace Navigation.
 * Any updates, additions, or re-ordering of sidebar items here will automatically
 * reflect across all Accounts Production pages without duplicating code.
 */
export function getAccountsProductionSidebar(clientId: string | number): NavItem[] {
  const cId = String(clientId);

  return [
    // Section 1: Statutory Preparation Pipeline (Sequential Steps 1 to 7)
    { label: "Statutory Pipeline", isHeader: true },
    { label: "Dashboard", icon: <LayoutDashboard size={14} />, route: `/accounts-production/${cId}/dashboard` },
    { label: "Update CH Directors", icon: <Users size={14} />, route: `/accounts-production/${cId}/directors` },
    { label: "Trial Balance & Mapping", icon: <FileSpreadsheet size={14} />, route: `/accounts-production/${cId}/trial-balance` },
    { label: "Accounting Policies", icon: <Layers size={14} />, route: `/accounts-production/${cId}/accounting-policies` },
    { label: "Statutory Notes", icon: <FileText size={14} />, route: `/accounts-production/${cId}/statutory-notes` },
    { label: "Financial Statements", icon: <Calculator size={14} />, route: `/accounts-production/${cId}/statements` },
    { label: "eSign", icon: <FileSignature size={14} />, route: `/accounts-production/${cId}/esign` },
    { label: "Accounts Submission", icon: <Send size={14} />, route: `/accounts-production/${cId}/submit` },
    { label: "iXBRL Filing Console", icon: <Shield size={14} />, route: `/accounts-production/${cId}/ixbrl-filing` },

    // Section 2: Workspace Tools & Administration (Management, Reference & Export Tools)
    { label: "Tools & Settings", isHeader: true },
    { label: "Chart of Accounts", icon: <ListTree size={14} />, route: `/accounts-production/${cId}/chart-of-accounts` },
    { label: "Reports & Accounts Pack", icon: <Printer size={14} />, route: `/accounts-production/${cId}/reports` },
    { label: "Report Settings", icon: <Settings size={14} />, route: `/accounts-production/${cId}/settings` },
    { label: "CH API'S Integration", icon: <Building2 size={14} />, route: `/accounts-production/${cId}/ch-api` },
    { label: "Tasks", icon: <CheckSquare size={14} />, route: `/accounts-production/${cId}/tasks` },
    { label: "Logs", icon: <History size={14} />, route: `/accounts-production/${cId}/logs` },
  ];
}

/**
 * Utility sections list where the top statutory wizard bar is suppressed
 */
export const AP_UTILITY_SECTIONS = [
  "Chart of Accounts",
  "Reports & Accounts Pack",
  "Report Settings",
  "CH API'S Integration",
  "Tasks",
  "Logs",
  "Audit Logs",
];

/**
 * Helper to identify whether a URL location belongs to a tool or utility route
 */
export function isAccountsProductionUtilityRoute(location: string): boolean {
  return (
    location.includes("/chart-of-accounts") ||
    location.includes("/reports") ||
    location.includes("/settings") ||
    location.includes("/ch-api") ||
    location.includes("/tasks") ||
    location.includes("/logs")
  );
}
