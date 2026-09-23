import { 
  BarChart3, Clock, Briefcase, FileText, Receipt, TrendingUp, Settings 
} from "lucide-react";

export const timeFeesSidebar = [
  { label: "Dashboard", icon: <BarChart3 size={15} />, route: "/time-fees" },
  { label: "Timesheets", icon: <Clock size={15} />, route: "/time-fees/timesheets" },
  { label: "Jobs", icon: <Briefcase size={15} />, route: "/time-fees/jobs" },
  { label: "Invoices & Fees", icon: <FileText size={15} />, route: "/time-fees/invoices" },
  { label: "Expenses", icon: <Receipt size={15} />, route: "/time-fees/expenses" },
  { label: "Reports", icon: <TrendingUp size={15} />, route: "/time-fees/reports" },
  { label: "Settings", icon: <Settings size={15} />, route: "/time-fees/settings" },
];
