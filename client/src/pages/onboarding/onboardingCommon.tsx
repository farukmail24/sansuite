import React from "react";
import { UserPlus, Database, ArrowRight, Download } from "lucide-react";

export interface OnboardingSidebarItem {
  label: string;
  icon: React.ReactNode;
  route: string;
}

export const onboardingSidebar: OnboardingSidebarItem[] = [
  { label: "Onboarding Hub", icon: <UserPlus size={15} />, route: "/onboarding" },
  { label: "Data Migration", icon: <Database size={15} />, route: "/onboarding/migration" },
  { label: "Onboarding Pipeline", icon: <ArrowRight size={15} />, route: "/onboarding/pipeline" },
  { label: "Import Templates", icon: <Download size={15} />, route: "/onboarding/templates" },
];
