import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import {
  BookOpen, Users, Building2, BarChart3, Shield,
  HeartHandshake, Landmark, Calculator,
  ListChecks, FileSignature, Smartphone, Timer,
  FileText, Link2, Settings, CheckSquare, AlertTriangle, ChevronRight
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import GlobalNavActions from "../../components/layout/GlobalNavActions";

// ─── Module grid (main page) ─────────────────────────────────────────────────
const launcherItems = [
  {
    icon: <BarChart3 size={22} />,
    label: "Accounts Production",
    desc: "Fast, integrated accounts filing.",
    color: "#00b894",
    bg: "#00b89415",
    route: "/accounts-production",
  },
  {
    icon: <BookOpen size={22} />,
    label: "Bookkeeping",
    desc: "Track your purchases and sales.",
    color: "#0984e3",
    bg: "#0984e315",
    route: "/bookkeeping",
  },
  {
    icon: <HeartHandshake size={22} />,
    label: "Charity Accounts",
    desc: "SORP-compliant reporting.",
    color: "#e17055",
    bg: "#e1705515",
    route: "/charity-accounts",
  },
  {
    icon: <Landmark size={22} />,
    label: "Corporation Tax",
    desc: "Auto-filled CT600 & iXBRL.",
    color: "#f39c12",
    bg: "#f39c1215",
    route: "/corporation-tax",
  },
  {
    icon: <Calculator size={22} />,
    label: "Payroll",
    desc: "Accurate and timely payroll management.",
    color: "#6c5ce7",
    bg: "#6c5ce715",
    route: "/payroll",
  },
  {
    icon: <FileText size={22} />,
    label: "Self Assessment",
    desc: "Seamlessly submit your own tax returns.",
    color: "#a29bfe",
    bg: "#a29bfe15",
    route: "/self-assessment",
  },
  {
    icon: <ListChecks size={22} />,
    label: "Practice Management",
    desc: "Manage your deadlines and tasks.",
    color: "#6c5ce7",
    bg: "#6c5ce715",
    route: "/practice",
  },
  {
    icon: <Shield size={22} />,
    label: "AML Compliance",
    desc: "ID verification, PEP & Sanctions check.",
    color: "#059669",
    bg: "#05966915",
    route: "/aml",
  },
  {
    icon: <Users size={22} />,
    label: "Onboarding Hub",
    desc: "Client onboarding & data migration.",
    color: "#4f46e5",
    bg: "#4f46e515",
    route: "/onboarding",
  },
  {
    icon: <FileSignature size={22} />,
    label: "eSign",
    desc: "Secure electronic signature solution.",
    color: "#0984e3",
    bg: "#0984e315",
    route: "/esign",
  },
  {
    icon: <Link2 size={22} />,
    label: "365 Client Portal",
    desc: "Communicate and collaborate with clients.",
    color: "#e17055",
    bg: "#e1705515",
    route: "/365",
  },
  {
    icon: <Building2 size={22} />,
    label: "Company Secretarial",
    desc: "Formations, CS01 & compliance reminders.",
    color: "#475569",
    bg: "#47556915",
    route: "/company-secretarial",
  },
  {
    icon: <Timer size={22} />,
    label: "Time and Fees",
    desc: "Track staff timesheets, WIP & billing.",
    color: "#00b894",
    bg: "#00b89415",
    route: "/time-fees",
  },
  {
    icon: <Smartphone size={22} />,
    label: "MTD IT",
    desc: "Prepare and submit quarterly submissions.",
    color: "#6c5ce7",
    bg: "#6c5ce715",
    route: "/mtd-it",
  },
  {
    icon: <Settings size={22} />,
    label: "My Admin",
    desc: "Control Panel — Users, Firm, Billing.",
    color: "#636e72",
    bg: "#636e7215",
    route: "/admin",
  },
];

// ─── Module grid (main page) ─────────────────────────────────────────────────
const modules = [
  {
    section: "ACCOUNTING",
    desc: "Simplify compliance, optimise finances and elevate your Practice",
    items: [
      { icon: <BarChart3 size={20} />, label: "Accounts Production", desc: "Fast, integrated accounts filing.", color: "#00b894", route: "/accounts-production" },
      { icon: <BookOpen size={20} />, label: "Bookkeeping", desc: "Track client finances.", color: "#0984e3", route: "/bookkeeping" },
      { icon: <HeartHandshake size={20} />, label: "Charity Accounts", desc: "Easy SORP-compliant reporting.", color: "#e17055", route: "/charity-accounts" },
      { icon: <Landmark size={20} />, label: "Corporation Tax", desc: "Auto-filled CT600 & iXBRL.", color: "#f39c12", route: "/corporation-tax" },
      { icon: <Calculator size={20} />, label: "Payroll", desc: "Fully automated, compliant payroll.", color: "#6c5ce7", route: "/payroll" },
      { icon: <FileText size={20} />, label: "Self Assessment", desc: "Quick tax returns with HMRC data.", color: "#a29bfe", route: "/self-assessment" },
    ],
  },
  {
    section: "MY PRACTICE",
    desc: "Manage communication, records and deadlines within Practice",
    items: [
      { icon: <ListChecks size={20} />, label: "Practice Management", desc: "Simplified deadlines & client tasks.", color: "#6c5ce7", route: "/practice" },
      { icon: <Shield size={20} />, label: "AML Compliance", desc: "ID Verification & PEP Screening.", color: "#059669", route: "/aml" },
      { icon: <Users size={20} />, label: "Onboarding & Migration", desc: "Client setup & software import.", color: "#4f46e5", route: "/onboarding" },
      { icon: <Building2 size={20} />, label: "Company Secretarial", desc: "Smooth formations & compliance.", color: "#475569", route: "/company-secretarial" },
      { icon: <Timer size={20} />, label: "Time and Fees", desc: "Track time, bill, and get paid.", color: "#00b894", route: "/time-fees" },
    ],
  },
  {
    section: "ADDONS",
    desc: "Which elevates what it gets added to",
    items: [
      { icon: <Link2 size={20} />, label: "365 Client Portal", desc: "Communicate and collaborate with clients.", color: "#e17055", route: "/365" },
      { icon: <FileSignature size={20} />, label: "eSign", desc: "A secure electronic signature solution.", color: "#0984e3", route: "/esign" },
    ],
  },
  {
    section: "NEW",
    desc: "New featured modules",
    items: [
      { icon: <Smartphone size={20} />, label: "MTD IT", desc: "Prepare and submit quarterly submissions.", color: "#6c5ce7", route: "/mtd-it" },
    ],
  },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function EcosystemDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/practice/stats"],
    queryFn: async () => {
      const [clientsRes, tasksRes] = await Promise.all([
        apiRequest("GET", "/api/practice/clients"),
        apiRequest("GET", "/api/practice/tasks"),
      ]);
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const tasks = tasksRes.ok ? await tasksRes.json() : [];
      return {
        totalClients: clients.length,
        openTasks: tasks.filter((t: any) => t.status !== "Completed").length,
        highPriority: tasks.filter((t: any) => t.priority === "High" && t.status !== "Completed").length,
      };
    },
  });

  const { data: firm } = useQuery({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5" }}>
      {/* Top Navbar */}
      <nav className="SanSuite-navbar">
        {/* Left: Logo + Firm Name */}
        <div className="flex items-center gap-2.5">
          {firm?.logoUrl ? (
            <img src={firm.logoUrl} alt="Logo" className="w-7 h-7 rounded object-cover bg-white/10 p-0.5" />
          ) : (
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}>
              <Building2 size={14} className="text-white" />
            </div>
          )}
          <span className="text-white font-bold text-sm">
            {firm?.firmName || (user as any)?.practiceName || "SAN Accounting Firm"}
          </span>
        </div>

        {/* Center: Nav Links */}
        <div className="flex-1 flex items-center justify-center gap-8">
          {[
            { label: "Dashboard", route: "/" },
            { label: "Practice", route: "/practice" },
            { label: "Bookkeeping", route: "/bookkeeping" },
            { label: "Payroll", route: "/payroll" },
            { label: "Admin", route: "/admin" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className="text-gray-300 hover:text-white text-sm transition-colors font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <GlobalNavActions />
      </nav>

      <div className="pt-12">
        {/* Welcome Bar */}
        <div className="px-8 py-5 bg-white border-b">
          <div className="w-full mx-auto flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Welcome back, {firm?.firmName || (user?.firstName ? `${user.firstName} ${user.lastName}` : "SAN Accounting Firm")}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Select a module to get started</p>
            </div>
            {/* Live Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <Users size={14} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-400 leading-none">Clients</p>
                  <p className="font-bold text-blue-700 text-sm">{stats?.totalClients ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
                <CheckSquare size={14} className="text-orange-500" />
                <div>
                  <p className="text-xs text-gray-400 leading-none">Open Tasks</p>
                  <p className="font-bold text-orange-600 text-sm">{stats?.openTasks ?? 0}</p>
                </div>
              </div>
              {(stats?.highPriority ?? 0) > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
                  <AlertTriangle size={14} className="text-red-500" />
                  <div>
                    <p className="text-xs text-gray-400 leading-none">High Priority</p>
                    <p className="font-bold text-red-600 text-sm">{stats!.highPriority}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: "#6c5ce7" }}
              >
                <Settings size={14} />
                My Admin
              </button>
            </div>
          </div>
        </div>

        {/* Module Grid */}
        <div className="w-full mx-auto px-8 py-8 space-y-8">
          {modules.map((group) => (
            <div key={group.section}>
              <div className="mb-4">
                <h2 className="text-xs font-bold tracking-widest text-gray-400 uppercase">{group.section}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{group.desc}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {group.items.map((item: any) => (
                  <button
                    key={item.label}
                    onClick={() => item.route && !item.disabled && navigate(item.route)}
                    disabled={item.disabled}
                    className={`SanSuite-card p-4 text-left transition-all group ${item.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                      style={{ background: item.color + "20", color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-1 leading-snug">{item.desc}</p>
                    {!item.disabled && (
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color: item.color }}>
                        Open <ChevronRight size={10} />
                      </div>
                    )}
                    {item.disabled && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                          Coming Soon
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
