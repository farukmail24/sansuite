import { LayoutDashboard, Building2, Users, FileUp, Sliders } from "lucide-react";

export const portal365Sidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/365/dashboard" },
  { label: "Clients", icon: <Building2 size={15} />, route: "/365/clients" },
  { label: "Users", icon: <Users size={15} />, route: "/365/users" },
  { label: "Imports", icon: <FileUp size={15} />, route: "/365/imports" },
  { label: "Permissions", icon: <Sliders size={15} />, route: "/365/permissions" },
];
