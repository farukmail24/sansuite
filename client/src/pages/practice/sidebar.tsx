import {
  LayoutDashboard, FolderKanban, Briefcase, UserCheck,
  BarChart2, Settings, FileSignature, MessageSquare,
  FileCheck, ShieldAlert, SlidersHorizontal, Layers,
  Calendar, CheckSquare, Users, Activity, Mail
} from "lucide-react";

export const practiceSidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/practice" },
  {
    label: "Workspace",
    icon: <FolderKanban size={15} />,
    children: [
      { label: "Clients", route: "/practice/clients" },
      { label: "Tasks", route: "/practice/tasks" },
      { label: "Deadlines", route: "/practice/deadlines" },
      { label: "Schedule", route: "/practice/schedule" },
      { label: "Client Requests", route: "/practice/documents" },
      { label: "Communication", route: "/practice/communication" },
      { label: "Conversations", route: "/practice/conversations" },
      { label: "Activity", route: "/practice/activity" },
    ],
  },
  {
    label: "Practice",
    icon: <Briefcase size={15} />,
    children: [
      { label: "Team", route: "/practice/team" },
      { label: "Record Time", route: "/practice/record-time" },
      { label: "Invoices", route: "/practice/invoices" },
      { label: "eSign", route: "/practice/esign" },
      { label: "Calendar", route: "/practice/calendar" },
    ],
  },
  {
    label: "CRM",
    icon: <UserCheck size={15} />,
    children: [
      { label: "Dashboard", route: "/practice/crm" },
      { label: "Connections", route: "/practice/crm/connections" },
      { label: "Communications", route: "/practice/crm/communications" },
    ],
  },
  { label: "Reports & Analytics", icon: <BarChart2 size={15} />, route: "/practice/reports" },
  {
    label: "Practice Settings",
    icon: <Settings size={15} />,
    children: [
      { label: "Services", route: "/practice/settings?tab=services" },
      { label: "Custom Fields", route: "/practice/settings?tab=custom_fields" },
      { label: "Email Templates", route: "/practice/settings?tab=email_templates" },
      { label: "Document Templates", route: "/practice/settings?tab=document_templates" },
      { label: "Invoice Templates", route: "/practice/settings?tab=invoice_templates" },
      { label: "Onboarding and KYC", route: "/practice/settings?tab=onboarding" },
      { label: "Risk Assessment", route: "/practice/settings?tab=risk_assessment" },
      { label: "Firm Details & Branding", route: "/practice/settings?tab=firm_profile" },
    ],
  },
];
