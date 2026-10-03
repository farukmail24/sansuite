import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import {
  BookOpen, Users, Building2, BarChart3, Shield,
  HeartHandshake, Landmark, Calculator,
  ListChecks, FileSignature, Smartphone, Timer,
  FileText, Link2, Settings, CheckSquare, AlertTriangle,
  ChevronRight, ArrowUpRight, Lock, Clock, ShieldCheck
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import GlobalNavActions from "../../components/layout/GlobalNavActions";

interface ModuleItem {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  desc: string;
  color: string;
  route: string;
  moduleKey: string;
  disabled?: boolean;
}

interface ModuleSection {
  section: string;
  desc: string;
  badgeColor: string;
  items: ModuleItem[];
  isWideGrid?: boolean;
}

const MODULE_SECTIONS: ModuleSection[] = [
  {
    section: "Accounting & Statutory Compliance",
    desc: "Complete UK statutory accounts, corporation tax, personal tax, bookkeeping and payroll RTI",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    items: [
      {
        icon: <BarChart3 size={18} />,
        label: "Accounts Production",
        badge: "FRS 102 1A / 105",
        desc: "Trial balance sync, statutory notes and direct Companies House iXBRL submission.",
        color: "#00b894",
        route: "/accounts-production",
        moduleKey: "accounts_production",
      },
      {
        icon: <BookOpen size={18} />,
        label: "Bookkeeping",
        badge: "Bank Feeds & MTD",
        desc: "Customer invoices, purchase bills, bank rule matching and automated reconciliation.",
        color: "#0984e3",
        route: "/bookkeeping",
        moduleKey: "bookkeeping",
      },
      {
        icon: <HeartHandshake size={18} />,
        label: "Charity Accounts",
        badge: "Charities SORP",
        desc: "Statement of Financial Activities (SOFA), fund accounting and trustee reports.",
        color: "#e17055",
        route: "/charity-accounts",
        moduleKey: "charity_accounts",
      },
      {
        icon: <Landmark size={18} />,
        label: "Corporation Tax",
        badge: "CT600 Computations",
        desc: "Capital allowances, loss relief, trading adjustments and live HMRC filing gateway.",
        color: "#f39c12",
        route: "/corporation-tax",
        moduleKey: "corporation_tax",
      },
      {
        icon: <Calculator size={18} />,
        label: "Payroll & RTI",
        badge: "PAYE & Pensions",
        desc: "Pay runs, pension auto-enrolment, payslips, P60/P45 and live FPS/EPS transmissions.",
        color: "#6c5ce7",
        route: "/payroll",
        moduleKey: "payroll",
      },
      {
        icon: <FileText size={18} />,
        label: "Self Assessment",
        badge: "SA100 & SA800",
        desc: "Sole trader, partnership and director tax returns with official SA302 calculations.",
        color: "#8854d0",
        route: "/self-assessment",
        moduleKey: "self_assessment",
      },
    ],
  },
  {
    section: "Practice Operations & Statutory Governance",
    desc: "Centralized client management, statutory compliance deadlines, AML screening and corporate filings",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    items: [
      {
        icon: <ListChecks size={18} />,
        label: "Practice Management",
        badge: "Core Workflow",
        desc: "Central accounting portfolio, practice tasks, deadlines, letters of engagement and CRM.",
        color: "#6c5ce7",
        route: "/practice",
        moduleKey: "practice_management",
      },
      {
        icon: <Shield size={18} />,
        label: "AML Compliance",
        badge: "PEP & Sanctions",
        desc: "Automated sanctions watchlist screening, photo ID verification and firm risk assessment.",
        color: "#059669",
        route: "/aml",
        moduleKey: "aml",
      },
      {
        icon: <Users size={18} />,
        label: "Onboarding Hub",
        badge: "Client Setup",
        desc: "Statutory client onboarding checklist, 64-8 agent auth and clearance requests.",
        color: "#4f46e5",
        route: "/onboarding",
        moduleKey: "onboarding",
      },
      {
        icon: <Building2 size={18} />,
        label: "Company Secretarial",
        badge: "Companies House",
        desc: "Annual confirmation statements (CS01), director appointments and PSC register changes.",
        color: "#475569",
        route: "/company-secretarial",
        moduleKey: "company_secretarial",
      },
      {
        icon: <Timer size={18} />,
        label: "Time and Fees",
        badge: "WIP & Billing",
        desc: "Chargeable staff timesheets, client project budgets, unbilled WIP and sales fee billing.",
        color: "#00b894",
        route: "/time-fees",
        moduleKey: "time_fees",
      },
      {
        icon: <Landmark size={18} />,
        label: "MTD for VAT",
        badge: "9-Box VAT",
        desc: "Digital link compliance, digital VAT returns, audit links and direct HMRC submission.",
        color: "#0984e3",
        route: "/mtd-vat",
        moduleKey: "mtd_vat",
      },
    ],
  },
  {
    section: "Client Collaboration & Digital Services",
    desc: "Client portal communication, encrypted cryptographic sign-offs and MTD income tax gateway",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    isWideGrid: true,
    items: [
      {
        icon: <Link2 size={20} />,
        label: "365 Client Portal",
        badge: "Real-Time Collaboration",
        desc: "Empower your clients to upload bookkeeping receipts, access statutory documents, view outstanding sales invoices and communicate securely with your firm.",
        color: "#e17055",
        route: "/365",
        moduleKey: "portal_365",
      },
      {
        icon: <FileSignature size={20} />,
        label: "CapiSign / eSign",
        badge: "Cryptographic Audit Trail",
        desc: "Send statutory accounts, letters of engagement and tax declarations for legally binding digital signatures with SMS two-factor verification.",
        color: "#0984e3",
        route: "/esign",
        moduleKey: "esign",
      },
      {
        icon: <Smartphone size={20} />,
        label: "MTD for Income Tax",
        badge: "Upcoming HMRC ITSA",
        desc: "Prepare sole trader and landlord clients for Making Tax Digital with quarterly updates, digital record bridging and year-end crystallization submissions.",
        color: "#6c5ce7",
        route: "/mtd-it",
        moduleKey: "mtd_it",
      },
    ],
  },
];

export default function EcosystemDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { canAccessModule, canPerform, isSuperAdmin, canManageUsers } = usePermissions();

  // Instant redirect guard for client role users to their dedicated 365 workspace
  useEffect(() => {
    if (user?.role === "client" || user?.portalType === "365") {
      navigate("/365/workspace", { replace: true });
    }
  }, [user, navigate]);

  // Scoped practice stats (automatically respects assignedClientIds)
  const { data: stats } = useQuery({
    queryKey: ["/api/practice/stats"],
    queryFn: async () => {
      const [clientsRes, tasksRes, deadlinesRes] = await Promise.all([
        apiRequest("GET", "/api/practice/clients"),
        apiRequest("GET", "/api/practice/tasks"),
        apiRequest("GET", "/api/pm/deadlines"),
      ]);
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      const tasks = tasksRes.ok ? await tasksRes.json() : [];
      const deadlines = deadlinesRes.ok ? await deadlinesRes.json() : [];
      return {
        totalClients: Array.isArray(clients) ? clients.length : 0,
        openTasks: Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== "Completed").length : 0,
        highPriority: Array.isArray(tasks) ? tasks.filter((t: any) => t.priority === "High" && t.status !== "Completed").length : 0,
        pendingDeadlines: Array.isArray(deadlines) ? deadlines.filter((d: any) => d.status !== "Completed").length : 0,
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

  const checkItemAccess = (item: ModuleItem) => {
    if (item.disabled) return { allowed: false, reason: "Soon" };
    if (isSuperAdmin) return { allowed: true };
    if (item.moduleKey === "admin") {
      return { allowed: false, reason: "Admin Only" };
    }
    const hasModule = canAccessModule(item.moduleKey);
    const hasView = canPerform(item.moduleKey as any, "view");
    if (!hasModule || !hasView) {
      return { allowed: false, reason: "Deactivated" };
    }
    return { allowed: true };
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Top Navbar */}
      <nav className="SanSuite-navbar shrink-0">
        {/* Left: Firm Identity */}
        <div className="flex items-center gap-2.5">
          {firm?.logoUrl ? (
            <img src={firm.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover bg-white/10 p-0.5 border border-white/20" />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}>
              <Building2 size={14} className="text-white" />
            </div>
          )}
          <span className="text-white font-bold text-sm tracking-tight truncate max-w-[220px]">
            {firm?.firmName || (user as any)?.practiceName || "SAN Accounting Firm"}
          </span>
        </div>

        {/* Center: Flexible Spacer */}
        <div className="flex-1" />

        {/* Right: Actions */}
        <GlobalNavActions />
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-12">
        {/* Generous & Informative Header Bar */}
        <div className="px-6 lg:px-10 py-3.5 bg-white border-b border-slate-200/90 shadow-2xs shrink-0">
          <div className="w-full flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                  Welcome back, {firm?.firmName || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Accountant")}
                </h1>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Practice
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Centralized practice workspace and statutory accounting suite</p>
            </div>

            {/* Live Practice Scoped Stats & Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs transition-all">
                <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                  <Users size={13} />
                </div>
                <div>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Clients</p>
                  <p className="font-extrabold text-slate-900 text-xs mt-0.5 leading-none">{stats?.totalClients ?? 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs transition-all">
                <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                  <CheckSquare size={13} />
                </div>
                <div>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Open Tasks</p>
                  <p className="font-extrabold text-slate-900 text-xs mt-0.5 leading-none">{stats?.openTasks ?? 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs transition-all">
                <div className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0">
                  <Clock size={13} />
                </div>
                <div>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Deadlines</p>
                  <p className="font-extrabold text-slate-900 text-xs mt-0.5 leading-none">{stats?.pendingDeadlines ?? 0}</p>
                </div>
              </div>

              {(stats?.highPriority ?? 0) > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-rose-50/80 hover:bg-rose-100/50 border border-rose-200/80 rounded-xl shadow-2xs transition-all">
                  <div className="w-6 h-6 rounded-lg bg-rose-200/60 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={13} />
                  </div>
                  <div>
                    <p className="text-[9.5px] text-rose-500 font-bold uppercase tracking-wider leading-none">Urgent</p>
                    <p className="font-extrabold text-rose-700 text-xs mt-0.5 leading-none">{stats!.highPriority}</p>
                  </div>
                </div>
              )}

              {(isSuperAdmin || canManageUsers) && (
                <button
                  onClick={() => navigate("/admin")}
                  className="group flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer ml-1 border border-indigo-400/40"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                  }}
                >
                  <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                    <Settings size={12} className="text-white group-hover:rotate-45 transition-transform" />
                  </div>
                  <span>My Admin</span>
                  <ChevronRight size={13} className="text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width Balanced Module Sections */}
        <div className="w-full px-6 lg:px-10 py-6 lg:py-7 flex-1 flex flex-col justify-start space-y-6 lg:space-y-7">
          {MODULE_SECTIONS.map((group) => (
            <div key={group.section} className="space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-extrabold tracking-wider text-slate-800 uppercase">
                    {group.section}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${group.badgeColor}`}>
                    {group.items.length} Modules
                  </span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline font-medium">{group.desc}</span>
              </div>

              {/* Grid: 6 columns for standard sections, 3 wide cards (spanning 2 cols each) for Addons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {group.items.map((item) => {
                  const access = checkItemAccess(item);
                  const isBlocked = !access.allowed;

                  if (group.isWideGrid) {
                    // Wide 2-column span cards for Row 3 (Fills entire row width with zero gap on right)
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (!isBlocked && item.route) {
                            navigate(item.route);
                          }
                        }}
                        disabled={isBlocked}
                        title={isBlocked ? `Module ${access.reason || "Deactivated"}. Contact practice administrator.` : item.label}
                        className={`col-span-1 sm:col-span-2 md:col-span-1 xl:col-span-2 p-4.5 xl:p-5 rounded-2xl text-left transition-all border flex flex-col justify-between group relative overflow-hidden ${
                          isBlocked
                            ? "opacity-55 grayscale-[35%] bg-slate-50/70 border-dashed border-slate-300 cursor-not-allowed select-none shadow-none"
                            : "bg-white border-slate-200/90 hover:border-indigo-400/90 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer shadow-2xs"
                        }`}
                        style={{ minHeight: "162px" }}
                      >
                        {!isBlocked && (
                          <div
                            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: item.color }}
                          />
                        )}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                  isBlocked ? "opacity-60" : "group-hover:scale-105"
                                }`}
                                style={{ background: item.color + "18", color: item.color, border: `1px solid ${item.color}25` }}
                              >
                                {item.icon}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm leading-tight">
                                  {item.label}
                                </p>
                                {item.badge && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded mt-0.5 inline-block">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isBlocked ? (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                <Lock size={10} className="text-slate-400" /> {access.reason || "Locked"}
                              </span>
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-indigo-600">
                                <ArrowUpRight size={15} />
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed mt-2 line-clamp-3">
                            {item.desc}
                          </p>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          {isBlocked ? (
                            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                              <Lock size={10} /> Deactivated for staff role
                            </span>
                          ) : (
                            <>
                              <span className="font-bold text-xs" style={{ color: item.color }}>Launch Platform</span>
                              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" style={{ color: item.color }} />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  }

                  // Standard 1-column cards for Row 1 & Row 2
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (!isBlocked && item.route) {
                          navigate(item.route);
                        }
                      }}
                      disabled={isBlocked}
                      title={isBlocked ? `Module ${access.reason || "Deactivated"}. Contact practice administrator.` : item.label}
                      className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between group relative overflow-hidden ${
                        isBlocked
                          ? "opacity-55 grayscale-[35%] bg-slate-50/70 border-dashed border-slate-300 cursor-not-allowed select-none shadow-none"
                          : "bg-white border-slate-200/90 hover:border-indigo-400/90 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer shadow-2xs"
                      }`}
                      style={{ minHeight: "162px" }}
                    >
                      {!isBlocked && (
                        <div
                          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: item.color }}
                        />
                      )}
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                              isBlocked ? "opacity-60" : "group-hover:scale-105"
                            }`}
                            style={{ background: item.color + "18", color: item.color, border: `1px solid ${item.color}25` }}
                          >
                            {item.icon}
                          </div>

                          {isBlocked ? (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                              <Lock size={10} className="text-slate-400" /> {access.reason || "Locked"}
                            </span>
                          ) : item.badge ? (
                            <span className="text-[9px] font-semibold text-slate-600 bg-slate-100/80 border border-slate-200/80 px-1.5 py-0.5 rounded shrink-0">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>

                        <p className="font-bold text-slate-900 text-xs xl:text-[13px] leading-tight mb-1 truncate group-hover:text-indigo-950 transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[11.5px] text-slate-500 leading-snug line-clamp-3">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        {isBlocked ? (
                          <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                            <Lock size={10} /> Deactivated
                          </span>
                        ) : (
                          <>
                            <span className="font-bold text-[11px]" style={{ color: item.color }}>Launch</span>
                            <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" style={{ color: item.color }} />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
