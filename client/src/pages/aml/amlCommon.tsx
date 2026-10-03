import React from "react";
import { Shield, UserCheck, AlertTriangle, Search } from "lucide-react";

export interface AmlSidebarItem {
  label: string;
  icon: React.ReactNode;
  route: string;
}

export const amlSidebar: AmlSidebarItem[] = [
  { label: "AML Dashboard", icon: <Shield size={15} />, route: "/aml" },
  { label: "Identity Checks", icon: <UserCheck size={15} />, route: "/aml/identity-checks" },
  { label: "Risk Matrix", icon: <AlertTriangle size={15} />, route: "/aml/risk-matrix" },
  { label: "PEP & Sanctions", icon: <Search size={15} />, route: "/aml/sanctions" },
];
