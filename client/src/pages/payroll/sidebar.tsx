import {
  LayoutDashboard, Users, Building2, Calculator,
  Clock, Shield, Send, FileSpreadsheet, FileText,
  Settings, Award, Layers, CheckCircle2, DollarSign,
  Calendar, Briefcase, Car
} from "lucide-react";

export const practicePayrollSidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/payroll" },
  { label: "Bulk Payroll", icon: <Layers size={15} />, route: "/payroll/bulk" },
  { label: "Employees", icon: <Users size={15} />, route: "/payroll/employees" },
  { label: "Pay Runs", icon: <Calculator size={15} />, route: "/payroll/payruns" },
  { label: "Submissions (RTI)", icon: <CheckCircle2 size={15} />, route: "/payroll/rti" },
  { label: "Settings", icon: <Settings size={15} />, route: "/payroll/settings" },
];

export function getClientPayrollSidebar(clientId: string | number) {
  const cId = String(clientId);
  return [
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={15} />,
      route: `/payroll/${cId}/dashboard`
    },
    {
      label: "Manage Payroll",
      icon: <Briefcase size={15} />,
      children: [
        { label: "Employees", route: `/payroll/${cId}/employees` },
        { label: "Departments", route: `/payroll/${cId}/departments` },
        { label: "Additional Pay", route: `/payroll/${cId}/additional` },
        { label: "Leave & Holidays", route: `/payroll/${cId}/additional?tab=leave` },
        { label: "Timekeeping", route: `/payroll/${cId}/timekeeping` },
        { label: "Process Payroll", route: `/payroll/${cId}/payruns` },
        { label: "Payslips & BACS", route: `/payroll/${cId}/payruns?tab=payslips` }
      ]
    },
    {
      label: "Auto Enrolment",
      icon: <Shield size={15} />,
      route: `/payroll/${cId}/auto-enrolment`
    },
    {
      label: "Submissions",
      icon: <Send size={15} />,
      route: `/payroll/${cId}/submissions`
    },
    {
      label: "P11D & Benefits",
      icon: <Car size={15} />,
      route: `/payroll/${cId}/p11d`
    },
    {
      label: "Payroll Reports",
      icon: <FileSpreadsheet size={15} />,
      route: `/payroll/${cId}/reports`
    },
    {
      label: "Payroll Settings",
      icon: <Settings size={15} />,
      route: `/payroll/${cId}/settings`
    }
  ];
}
