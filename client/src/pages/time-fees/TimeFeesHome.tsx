import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { 
  Clock, Briefcase, Play, Pause, RotateCcw, Users, BarChart3, Settings, 
  FileText, ChevronRight, Receipt, TrendingUp, Calendar, AlertCircle, 
  CheckCircle2, ArrowUpRight, DollarSign, Plus, Filter, Send, X,
  LayoutGrid, Check, AlertTriangle, ArrowRight, UserCheck, ShieldAlert,
  PieChart, CreditCard, Activity, CalendarOff, Percent, Target, Layers, Maximize2
} from "lucide-react";
import { useStopwatch, formatTime } from "../../hooks/useStopwatch";

import { timeFeesSidebar } from "./sidebar";
export { timeFeesSidebar };

// Capium Article 9000235896: 19 Dashboard Widgets configuration
interface WidgetConfig {
  id: string;
  label: string;
  category: "time" | "fees";
  enabled: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Time Section Charts (9)
  { id: "timeSummary", label: "Timesheet Summary", category: "time", enabled: true },
  { id: "mostVsLeast", label: "Most vs Least by Profit & Working Hours", category: "time", enabled: true },
  { id: "taskWiseHours", label: "Task Wise Hours Details", category: "time", enabled: true },
  { id: "timeOffHours", label: "Time Off Hours by Users", category: "time", enabled: true },
  { id: "staffUtilization", label: "Staff Utilization & Billable Target", category: "time", enabled: true },
  { id: "billableVsNonBillable", label: "Billable vs Non-Billable Ratio", category: "time", enabled: true },
  { id: "jobStatusCounts", label: "Job Count by Status", category: "time", enabled: true },
  { id: "recentTimesheetActivity", label: "Recent Timesheet Activity", category: "time", enabled: true },

  // Fees Section Charts (10)
  { id: "feesSummary", label: "Fees & Realization Summary", category: "fees", enabled: true },
  { id: "topClientsRevenue", label: "Top 5 Clients by Invoice Amount", category: "fees", enabled: true },
  { id: "topClientsBalance", label: "Top 5 Clients with Outstanding Balance", category: "fees", enabled: true },
  { id: "incomeTrend", label: "Practice Revenue Flow", category: "fees", enabled: true },
  { id: "estimatesByStatus", label: "Estimates by Status and Amount", category: "fees", enabled: true },
  { id: "revenueByCategory", label: "Revenue by Invoice Category", category: "fees", enabled: true },
  { id: "invoicedByStatus", label: "Invoiced Amount by Status", category: "fees", enabled: true },
  { id: "paymentMethods", label: "Payment Methods Breakdown", category: "fees", enabled: true },
  { id: "invoicedVsDue", label: "Invoiced Amount vs Due Amount", category: "fees", enabled: true },
  { id: "debtorsAgingChart", label: "Aged Debtors Breakdown", category: "fees", enabled: true },
];

export default function TimeFeesHome() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Period filter state (Capium Article 9000235896: This Week, Last Week, This Month, Last Month, This Quarter, Last Quarter, This Year, Last Year, Custom)
  const [period, setPeriod] = useState<string>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Widget customizer modal state
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem("sansuite_timefees_widgets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map(parsed.map((w: any) => [w.id, w.enabled]));
          return DEFAULT_WIDGETS.map(def => ({
            ...def,
            enabled: map.has(def.id) ? Boolean(map.get(def.id)) : def.enabled,
          }));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WIDGETS;
  });
  const [modalWidgets, setModalWidgets] = useState<WidgetConfig[]>(widgets);

  // Junior Accountant 4-Step Guided Workflow State (persisted in localStorage)
  const [showJuniorGuide, setShowJuniorGuide] = useState(() => {
    try {
      return localStorage.getItem("sansuite_tf_junior_guide") !== "false";
    } catch {
      return true;
    }
  });

  // Unified Live Stopwatch hook (shared across Floating Timer, Jobs List, and Dashboard)
  const stopwatch = useStopwatch();
  const { 
    currentSeconds, 
    state: stopwatchState, 
    start: startStopwatch, 
    pause: pauseStopwatch, 
    reset: resetStopwatch, 
    updateDetails: updateStopwatchDetails, 
    saveToTimesheet, 
    setOpen: setStopwatchOpen, 
    setMinimized: setStopwatchMinimized 
  } = stopwatch;

  const [isSavingDrawerTimer, setIsSavingDrawerTimer] = useState(false);

  // Queries
  const statsQueryUrl = period === "custom" && customStart && customEnd
    ? `/api/time-fees/dashboard-stats?period=custom&customStart=${customStart}&customEnd=${customEnd}`
    : `/api/time-fees/dashboard-stats?period=${period}`;

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/time-fees/dashboard-stats", period, customStart, customEnd],
    queryFn: async () => {
      const res = await apiRequest("GET", statsQueryUrl);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/time-fees/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/jobs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const clientJobs = jobs.filter((j: any) => j.clientId === (stopwatchState.clientId || 0));

  // Approve / Reject Handlers for Dashboard PFA Review
  const [isApproving, setIsApproving] = useState(false);
  const handleApproveTimesheet = async (id: number) => {
    try {
      setIsApproving(true);
      const res = await apiRequest("POST", "/api/time-fees/timesheets/approve", { ids: [id] });
      if (!res.ok) throw new Error("Failed to approve timesheet");
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Timesheet Approved", description: "Timesheet has been approved and moved to billable WIP." });
    } catch (err: any) {
      toast({ title: "Approval Failed", description: err.message || "Failed to approve timesheet", type: "error" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleBulkApprove = async () => {
    const list = alerts?.pendingTimesheetsList || [];
    if (list.length === 0) return;
    try {
      setIsApproving(true);
      const res = await apiRequest("POST", "/api/time-fees/timesheets/approve", { ids: list.map((t: any) => t.id) });
      if (!res.ok) throw new Error("Failed to approve timesheets");
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "All Timesheets Approved", description: `${list.length} timesheets approved.` });
    } catch (err: any) {
      toast({ title: "Bulk Approval Failed", description: err.message || "Failed to approve", type: "error" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectTimesheet = async (id: number) => {
    const reason = window.prompt("Please enter rejection feedback reason for staff member:") || "Requires revision";
    try {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/reject", { ids: [id], reason });
      if (!res.ok) throw new Error("Failed to reject timesheet");
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Timesheet Returned", description: "Timesheet returned to staff member for amendment." });
    } catch (err: any) {
      toast({ title: "Rejection Failed", description: err.message || "Failed to reject", type: "error" });
    }
  };

  // Widget management helpers
  const isWidgetEnabled = (id: string) => widgets.find(w => w.id === id)?.enabled ?? true;

  const handleHideWidget = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: false } : w);
    setWidgets(updated);
    try {
      localStorage.setItem("sansuite_timefees_widgets", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast({ title: "Widget Removed", description: "You can re-enable this widget anytime via '+ Add Widget'." });
  };

  const handleSaveModalWidgets = () => {
    setWidgets(modalWidgets);
    try {
      localStorage.setItem("sansuite_timefees_widgets", JSON.stringify(modalWidgets));
    } catch {
      // ignore
    }
    setShowAddWidgetModal(false);
    toast({ title: "Dashboard Layout Saved", description: "Your customized Action Station view has been updated." });
  };

  const handleResetWidgetsDefault = () => {
    setModalWidgets(DEFAULT_WIDGETS);
    setWidgets(DEFAULT_WIDGETS);
    try {
      localStorage.removeItem("sansuite_timefees_widgets");
    } catch {
      // ignore
    }
    setShowAddWidgetModal(false);
    toast({ title: "Widgets Reset", description: "Dashboard widgets restored to default layout." });
  };

  const alerts = stats?.operationalAlerts;
  const timeSummary = stats?.timeSummary;
  const mostVsLeast = stats?.mostVsLeast;
  const dailyHours = stats?.dailyHours || [];

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50/60 min-h-screen">
        {/* Top Control Bar with Capium "+ Add Widget" & Comprehensive Period Filters */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalWidgets(widgets);
                setShowAddWidgetModal(true);
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Widget
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-700">Time &amp; Fees Action Station</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Capium Article 9000235896 Period Selector */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <Calendar size={14} className="text-slate-500 ml-1.5" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-hidden pr-2 cursor-pointer"
              >
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="all">All Records</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Date Inputs if Custom is selected */}
            {period === "custom" && (
              <div className="flex items-center gap-1.5 text-xs animate-in fade-in duration-150">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="p-1 border border-slate-300 rounded-lg text-[11px]"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="p-1 border border-slate-300 rounded-lg text-[11px]"
                />
              </div>
            )}

            <button
              onClick={() => navigate("/time-fees/timesheets")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Clock size={14} /> Timesheets
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6 max-w-full">
          {/* Junior Accountant Quick Start & Operational Flow (4-Step Guided Lifecycle) */}
          <div className="bg-white rounded-2xl border border-purple-200/90 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 px-5 py-3.5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                      Junior Accountant Workflow &amp; Standard Operating Procedure
                    </h2>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      4-STEP GUIDE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Clear step-by-step path from job allocation, live time tracking, Friday timesheet sign-off, to expense reimbursement.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const nextState = !showJuniorGuide;
                  setShowJuniorGuide(nextState);
                  try {
                    localStorage.setItem("sansuite_tf_junior_guide", String(nextState));
                  } catch {
                    // ignore
                  }
                }}
                className="text-xs font-semibold text-purple-800 hover:text-purple-950 px-3 py-1.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-100/60 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0 shadow-2xs"
              >
                {showJuniorGuide ? (
                  <>Minimize Guide <ChevronRight size={14} className="rotate-90" /></>
                ) : (
                  <>Expand Guide <ChevronRight size={14} /></>
                )}
              </button>
            </div>

            {showJuniorGuide && (
              <div className="p-5 bg-gradient-to-b from-purple-50/20 to-white border-t border-purple-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Step 1: Jobs & Budgets */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono">
                          STEP 01
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Briefcase size={16} />
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">
                        Review Assigned Jobs
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        Check your allocated client engagements, budgeted hours, milestone checklists, and statutory filing deadlines.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/time-fees/jobs")}
                      className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Jobs Workspace</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Step 2: Track Billable Time */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono">
                          STEP 02
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Clock size={16} />
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">
                        Log Billable Work Time
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        Run the unified Live Stopwatch while performing accounts or tax work. Every second maps directly to client WIP.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setStopwatchOpen(true);
                        setStopwatchMinimized(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play size={13} />
                      <span>Launch Live Stopwatch</span>
                    </button>
                  </div>

                  {/* Step 3: Weekly Submission (PFA) */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono">
                          STEP 03
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Send size={16} />
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">
                        Submit Weekly Timesheet
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        Every Friday, audit your Monday-to-Sunday matrix entries and click "Submit for Approval" (PFA) for partner sign-off.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/time-fees/timesheets")}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Weekly Timesheet Matrix</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Step 4: Expense Claims */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono">
                          STEP 04
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Receipt size={16} />
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">
                        Claim Travel &amp; Expenses
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        Claim HMRC statutory business mileage (45p/mi) or client out-of-pocket expenses with attached receipts.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/time-fees/expenses")}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Log Expense Claim</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                    <span><strong>Senior Tip:</strong> Keep timers running in real-time or log daily. Time unrecorded within the statutory period cannot be recovered.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">Practice Billable Target: <span className="font-mono text-emerald-700 font-bold">75%+</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Station Operational Alerts & Quick Links Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Alert 1: Pending Timesheets (PFA) */}
            <div 
              onClick={() => navigate("/time-fees/timesheets")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                (alerts?.pendingTimesheets || 0) > 0 
                  ? "bg-amber-50/80 border-amber-200 hover:bg-amber-100/70" 
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${
                  (alerts?.pendingTimesheets || 0) > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                }`}>
                  <Clock size={16} />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-800">Timesheets PFA</div>
                  <div className="text-[11px] text-slate-500">Pending manager sign-off</div>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                (alerts?.pendingTimesheets || 0) > 0 ? "bg-amber-200 text-amber-900 font-mono" : "bg-slate-100 text-slate-600 font-mono"
              }`}>
                {alerts?.pendingTimesheets || 0}
              </span>
            </div>

            {/* Alert 2: Pending Expenses (PFA) */}
            <div 
              onClick={() => navigate("/time-fees/expenses")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                (alerts?.pendingExpenses || 0) > 0 
                  ? "bg-purple-50/80 border-purple-200 hover:bg-purple-100/70" 
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${
                  (alerts?.pendingExpenses || 0) > 0 ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-500"
                }`}>
                  <Receipt size={16} />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-800">Expenses PFA</div>
                  <div className="text-[11px] text-slate-500">Awaiting approval</div>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                (alerts?.pendingExpenses || 0) > 0 ? "bg-purple-200 text-purple-900 font-mono" : "bg-slate-100 text-slate-600 font-mono"
              }`}>
                {alerts?.pendingExpenses || 0}
              </span>
            </div>

            {/* Alert 3: Overdue Invoices */}
            <div 
              onClick={() => navigate("/time-fees/invoices")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                (alerts?.overdueInvoicesCount || 0) > 0 
                  ? "bg-rose-50/80 border-rose-200 hover:bg-rose-100/70" 
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${
                  (alerts?.overdueInvoicesCount || 0) > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"
                }`}>
                  <AlertTriangle size={16} />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-800">Overdue Invoices</div>
                  <div className="text-[11px] text-slate-500">£{(alerts?.overdueInvoicesAmount || 0).toLocaleString("en-GB", { minimumFractionDigits: 0 })} unsettled</div>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                (alerts?.overdueInvoicesCount || 0) > 0 ? "bg-rose-200 text-rose-900 font-mono" : "bg-slate-100 text-slate-600 font-mono"
              }`}>
                {alerts?.overdueInvoicesCount || 0}
              </span>
            </div>

            {/* Alert 4: Estimates Pipeline */}
            <div 
              onClick={() => navigate("/time-fees/invoices")}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <DollarSign size={16} />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-800">Open Quotes</div>
                  <div className="text-[11px] text-slate-500">{alerts?.acceptedEstimates || 0} Accepted / {alerts?.pendingEstimates || 0} Sent</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>

          {/* PROMINENT PFA TIMESHEET APPROVAL ACTION CARD FOR ADMIN / FIRM */}
          {(alerts?.pendingTimesheets || 0) > 0 && (
            <div className="bg-white rounded-2xl border-2 border-amber-300/80 shadow-md overflow-hidden animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 px-5 py-3.5 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-amber-950">
                        Timesheets Pending Partner Sign-Off ({alerts?.pendingTimesheets || 0} Awaiting Review)
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                        ACTION REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/80 mt-0.5">
                      Staff members have submitted their weekly hours for sign-off. Approve to unlock client billing, or return for revision.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleBulkApprove()}
                    disabled={isApproving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} /> Approve All PFA
                  </button>
                  <button
                    onClick={() => navigate("/time-fees/timesheets?status=PFA")}
                    className="bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Full Matrix</span> <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* List of Pending Timesheets */}
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Client Engagement</th>
                      <th className="py-2.5 px-3">Task &amp; Activity</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      <th className="py-2.5 px-3 text-center">Billable</th>
                      <th className="py-2.5 px-3 text-right">Partner Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(alerts?.pendingTimesheetsList || []).map((t: any) => (
                      <tr key={t.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                          <Users size={14} className="text-slate-400" />
                          <span>{t.userName || "Staff Member"}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {new Date(t.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {t.clientName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {t.taskName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {t.hours}h
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {t.billable ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Yes (£{t.ratePerHour}/h)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              Non-billable
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveTimesheet(t.id)}
                              disabled={isApproving}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Approve Timesheet"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectTimesheet(t.id)}
                              disabled={isApproving}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Reject Timesheet"
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WIDGET 1: Time Summary (Capium img_1.png) */}
          {isWidgetEnabled("timeSummary") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-purple-600" /> Time Summary
                </h3>
                <button
                  onClick={() => handleHideWidget("timeSummary")}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Remove widget"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* 1. Clients Worked on */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">No. of Clients Worked on</div>
                    <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                      {timeSummary?.clientsWorkedOn || 0} <span className="text-xs text-slate-400 font-normal">/ {timeSummary?.totalClients || 0}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> Active in selected period
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                </div>

                {/* 2. Tasks Worked on */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">No. of Tasks Worked on</div>
                    <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                      {timeSummary?.tasksWorkedOn || 0} <span className="text-xs text-slate-400 font-normal">/ {timeSummary?.totalTasks || 16}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> Chargeable service tasks
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                </div>

                {/* 3. Users Worked */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">No. of Users Worked</div>
                    <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                      {timeSummary?.usersWorked || 0} <span className="text-xs text-slate-400 font-normal">/ {timeSummary?.totalUsers || 1}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> Staff members active
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                </div>

                {/* 4. Total Time Spent */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Total Time Spent</div>
                    <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                      {timeSummary?.hoursSpentText || "0h 0m"} <span className="text-xs text-slate-400 font-normal">/ {timeSummary?.capacityText || "37h 30m"}</span>
                    </div>
                    <div className="text-[10px] text-purple-600 font-bold mt-1">
                      {stats?.billableRatio || 0}% Billable Utilization
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WIDGET 2: Most vs Least by Profit & Working Hours (Capium img_1.png) */}
          {isWidgetEnabled("mostVsLeast") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={15} className="text-indigo-600" /> Most vs Least by Profit &amp; Working Hours
                </h3>
                <button
                  onClick={() => handleHideWidget("mostVsLeast")}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Remove widget"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                      <th className="py-2.5 px-4 text-left font-bold">Category</th>
                      <th className="py-2.5 px-4 text-left font-bold text-emerald-700 bg-emerald-50/50">Most (GBP Profit)</th>
                      <th className="py-2.5 px-4 text-left font-bold text-rose-700 bg-rose-50/50">Least (GBP Profit)</th>
                      <th className="py-2.5 px-4 text-left font-bold text-emerald-700 bg-emerald-50/30">Most (Working Hours)</th>
                      <th className="py-2.5 px-4 text-left font-bold text-amber-700 bg-amber-50/30">Least (Working Hours)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Row 1: Task */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" /> Task
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                        {mostVsLeast?.task?.mostProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.task?.mostProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                        {mostVsLeast?.task?.leastProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.task?.leastProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.task?.mostHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.task?.mostHours?.hours})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.task?.leastHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.task?.leastHours?.hours})</span>
                      </td>
                    </tr>

                    {/* Row 2: Client */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase size={14} className="text-slate-400" /> Client
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                        {mostVsLeast?.client?.mostProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.client?.mostProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                        {mostVsLeast?.client?.leastProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.client?.leastProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.client?.mostHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.client?.mostHours?.hours})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.client?.leastHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.client?.leastHours?.hours})</span>
                      </td>
                    </tr>

                    {/* Row 3: User */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <Users size={14} className="text-slate-400" /> User
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                        {mostVsLeast?.user?.mostProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.user?.mostProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                        {mostVsLeast?.user?.leastProfit?.name} <span className="font-normal text-slate-500">({mostVsLeast?.user?.leastProfit?.amount})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.user?.mostHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.user?.mostHours?.hours})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {mostVsLeast?.user?.leastHours?.name} <span className="font-normal text-slate-500">({mostVsLeast?.user?.leastHours?.hours})</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WIDGET 3: Task Wise Hours Details (Daily Stacked Bar Chart) */}
          {isWidgetEnabled("taskWiseHours") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 size={15} className="text-purple-600" /> Task Wise Hours Details
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Daily breakdown of Billable vs Non-Billable staff hours</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block" /> Billable: <strong className="text-emerald-700">{stats?.billableHours || 0}h</strong>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 bg-blue-400 rounded-xs inline-block" /> Non-Billable: <strong className="text-blue-700">{stats?.nonBillableHours || 0}h</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => handleHideWidget("taskWiseHours")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Daily Stacked Bar Chart */}
              <div className="pt-4 pb-2">
                <div className="h-44 flex items-end justify-around gap-2 px-2 border-b border-slate-100 pb-2">
                  {dailyHours.map((d: any, idx: number) => {
                    const maxDaily = Math.max(...dailyHours.map((x: any) => x.total), 8);
                    const billablePx = Math.round((d.billable / maxDaily) * 130);
                    const nonBillablePx = Math.round((d.nonBillable / maxDaily) * 130);

                    return (
                      <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 group">
                        <div className="w-full flex flex-col items-center justify-end h-36">
                          {d.total > 0 ? (
                            <div className="w-10 rounded-t-md overflow-hidden flex flex-col justify-end transition-all shadow-2xs">
                              {/* Top portion: Non-Billable (Blue) */}
                              {d.nonBillable > 0 && (
                                <div 
                                  title={`Non-Billable: ${d.nonBillable} hrs`}
                                  className="bg-blue-400 hover:bg-blue-500 transition-colors" 
                                  style={{ height: `${nonBillablePx}px` }} 
                                />
                              )}
                              {/* Bottom portion: Billable (Emerald) */}
                              {d.billable > 0 && (
                                <div 
                                  title={`Billable: ${d.billable} hrs`}
                                  className="bg-emerald-500 hover:bg-emerald-600 transition-colors" 
                                  style={{ height: `${billablePx}px` }} 
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-1 bg-slate-100 rounded-full" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">{d.day}</span>
                        <span className="text-[10px] font-mono text-slate-400">{d.total > 0 ? `${d.total}h` : "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TIME SECTION: Time Off Hours & Staff Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 5: Time Off Hours by Users */}
            {isWidgetEnabled("timeOffHours") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <CalendarOff size={15} className="text-amber-600" /> Time Off Hours by Users
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      Total: {stats?.timeOffHours?.totalLeaveHours || 0}h
                    </span>
                  </div>
                  <button
                    onClick={() => handleHideWidget("timeOffHours")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading leave data...</div>
                ) : !stats?.timeOffHours?.byUser || stats.timeOffHours.byUser.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <CheckCircle2 className="mx-auto text-emerald-500" size={24} />
                    <p className="font-semibold text-slate-700">No Time Off or Leave Logged</p>
                    <p className="text-[11px] text-slate-400">Staff have zero holiday or sickness absences recorded in this period.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.timeOffHours.byUser.map((u: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800">{u.userName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {u.holidayHours > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                              Holiday: {u.holidayHours}h
                            </span>
                          )}
                          {u.sickHours > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                              Sick: {u.sickHours}h
                            </span>
                          )}
                          {u.otherLeaveHours > 0 && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              Other: {u.otherLeaveHours}h
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-900 ml-1">
                            {u.totalHours}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WIDGET 6: Staff Utilization & Billable Target */}
            {isWidgetEnabled("staffUtilization") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Target size={15} className="text-indigo-600" /> Staff Utilization &amp; Billable Target
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Target: 75%
                    </span>
                  </div>
                  <button
                    onClick={() => handleHideWidget("staffUtilization")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading utilization metrics...</div>
                ) : !stats?.staffUtilization || stats.staffUtilization.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <Users className="mx-auto text-slate-400" size={24} />
                    <p className="font-semibold text-slate-700">No Staff Activity Recorded</p>
                    <p className="text-[11px] text-slate-400">Log timesheets to analyze billable capacity and utilization rates.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {stats.staffUtilization.map((u: any, idx: number) => {
                      const util = Math.min(100, Math.round(u.utilizationPct));
                      const onTarget = u.isOnTarget;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{u.userName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500">
                                {u.billableHours}h / {u.capacityHours}h
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${onTarget ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {u.utilizationPct}% {onTarget ? 'On Target' : 'Below Target'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${onTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${util}%` }}
                            />
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-400" 
                              style={{ left: '75%' }}
                              title="Target: 75%"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TIME SECTION: Billable vs Non-Billable Ratio & Job Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 7: Billable vs Non-Billable Ratio */}
            {isWidgetEnabled("billableVsNonBillable") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Percent size={15} className="text-purple-600" /> Billable vs Non-Billable Ratio
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      Total: {stats?.billableVsNonBillable?.totalHours || 0}h
                    </span>
                  </div>
                  <button
                    onClick={() => handleHideWidget("billableVsNonBillable")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Two-tone split bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-2xs">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${stats?.billableVsNonBillable?.billableRatio || 0}%` }}
                        title={`Billable: ${stats?.billableVsNonBillable?.billableRatio || 0}%`}
                      />
                      <div 
                        className="bg-blue-400 h-full transition-all duration-500" 
                        style={{ width: `${stats?.billableVsNonBillable?.nonBillableRatio || 0}%` }}
                        title={`Non-Billable: ${stats?.billableVsNonBillable?.nonBillableRatio || 0}%`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                        Billable: {stats?.billableVsNonBillable?.billableRatio || 0}%
                      </span>
                      <span className="text-blue-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-blue-400 inline-block" />
                        Non-Billable: {stats?.billableVsNonBillable?.nonBillableRatio || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Chargeable Hours</span>
                      <span className="text-xl font-black text-emerald-900 font-mono mt-0.5 block">
                        {stats?.billableVsNonBillable?.billableHours || 0}h
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">Direct client work</span>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Internal Practice</span>
                      <span className="text-xl font-black text-blue-900 font-mono mt-0.5 block">
                        {stats?.billableVsNonBillable?.nonBillableHours || 0}h
                      </span>
                      <span className="text-[10px] text-blue-600 block mt-0.5">Admin, training &amp; CPD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 8: Job Count by Status */}
            {isWidgetEnabled("jobStatusCounts") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={15} className="text-indigo-600" /> Job Count by Status
                  </h3>
                  <button
                    onClick={() => handleHideWidget("jobStatusCounts")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Active</span>
                    <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">{stats?.jobStatusCounts?.active || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">In Progress</span>
                    <span className="text-lg font-black text-indigo-900 font-mono mt-0.5 block">{stats?.jobStatusCounts?.inProgress || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Completed</span>
                    <span className="text-lg font-black text-emerald-900 font-mono mt-0.5 block">{stats?.jobStatusCounts?.completed || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">On Hold</span>
                    <span className="text-lg font-black text-amber-900 font-mono mt-0.5 block">{stats?.jobStatusCounts?.onHold || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TIME SECTION: Recent Timesheets Activity */}
          {isWidgetEnabled("recentTimesheetActivity") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={15} className="text-emerald-600" /> Recent Timesheet Activity
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    Latest Logs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/time-fees/timesheets")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View All Timesheets <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => handleHideWidget("recentTimesheetActivity")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {isLoadingStats ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading timesheet records...</div>
              ) : !stats?.recentTimesheets || stats.recentTimesheets.length === 0 ? (
                <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                  <Clock className="mx-auto text-slate-400" size={24} />
                  <p className="font-semibold text-slate-700">No Recent Timesheets Logged</p>
                  <p className="text-[11px] text-slate-400">Start logging time or use the live timer to populate timesheet activity.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <th className="py-2.5 px-3 text-left font-bold">Date</th>
                        <th className="py-2.5 px-3 text-left font-bold">Staff</th>
                        <th className="py-2.5 px-3 text-left font-bold">Client</th>
                        <th className="py-2.5 px-3 text-left font-bold">Task</th>
                        <th className="py-2.5 px-3 text-right font-bold">Hours</th>
                        <th className="py-2.5 px-3 text-center font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentTimesheets.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600">{String(t.date).slice(0, 10)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{t.userName}</td>
                          <td className="py-2.5 px-3 text-slate-700">{t.clientName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{t.taskName}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{t.hours}h</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              t.status === "PFA" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                              t.status === "Billed" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* FEES SECTION (Billing, Invoices, Realization & Debtors) */}
          {/* ========================================================================= */}
          
          {/* WIDGET 10: Fees Summary */}
          {isWidgetEnabled("feesSummary") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={15} className="text-emerald-600" /> Fees &amp; Realization Summary
                </h3>
                <button
                  onClick={() => handleHideWidget("feesSummary")}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                  title="Remove widget"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <span className="text-[11px] text-slate-500 block font-medium">Total Invoiced</span>
                  <span className="text-lg font-black text-slate-900 font-mono block mt-0.5">
                    £{(stats?.totalInvoiced || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <span className="text-[11px] text-emerald-700 block font-medium">Collected Cash</span>
                  <span className="text-lg font-black text-emerald-800 font-mono block mt-0.5">
                    £{(stats?.totalPaid || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                  <span className="text-[11px] text-amber-700 block font-medium">Balance Due</span>
                  <span className="text-lg font-black text-amber-800 font-mono block mt-0.5">
                    £{(stats?.totalDue || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top Clients by Revenue & Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 11: Top 5 Clients by Invoice Amount */}
            {isWidgetEnabled("topClientsRevenue") && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={15} className="text-indigo-600" /> Top 5 Clients by Invoice Amount
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate("/time-fees/invoices")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      View Invoices <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => handleHideWidget("topClientsRevenue")}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                      title="Remove widget"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading clients...</div>
                ) : !stats?.topClientsByRevenue || stats.topClientsByRevenue.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <Briefcase className="mx-auto text-slate-400" size={24} />
                    <p className="font-semibold text-slate-700">No Invoices Issued</p>
                    <p className="text-[11px] text-slate-400">Issue fee invoices to see your highest revenue generating clients.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topClientsByRevenue.map((c: any, idx: number) => {
                      const maxRevenue = stats.topClientsByRevenue[0]?.invoiced || 1;
                      const pct = Math.min(100, Math.round((c.invoiced / maxRevenue) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800 truncate max-w-[240px]">{c.name}</span>
                            <span className="text-slate-900 font-mono">£{c.invoiced.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WIDGET 12: Top 5 Clients with Outstanding Balance */}
            {isWidgetEnabled("topClientsBalance") && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-600" /> Top 5 Clients with Outstanding Balance
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate("/time-fees/invoices")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Debtor Ledger <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => handleHideWidget("topClientsBalance")}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                      title="Remove widget"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading debt breakdown...</div>
                ) : !stats?.topClientsWithBalance || stats.topClientsWithBalance.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <CheckCircle2 className="mx-auto text-emerald-500" size={24} />
                    <p className="font-bold text-slate-700">Zero Overdue Client Balance!</p>
                    <p className="text-[11px] text-slate-400">All practice invoices are settled or fully up to date.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topClientsWithBalance.map((c: any, idx: number) => {
                      const maxBal = stats.topClientsWithBalance[0]?.balance || 1;
                      const pct = Math.min(100, Math.round((c.balance / maxBal) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800 truncate max-w-[240px]">{c.name}</span>
                            <span className="text-amber-700 font-mono">£{c.balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })} Due</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Revenue by Invoice Category & Invoiced Amount by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 13: Revenue by Invoice Category */}
            {isWidgetEnabled("revenueByCategory") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={15} className="text-indigo-600" /> Revenue by Invoice Category
                  </h3>
                  <button
                    onClick={() => handleHideWidget("revenueByCategory")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading service revenue...</div>
                ) : !stats?.revenueByCategory || stats.revenueByCategory.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <Layers className="mx-auto text-slate-400" size={24} />
                    <p className="font-semibold text-slate-700">No Category Breakdown Available</p>
                    <p className="text-[11px] text-slate-400">Generate fee invoices with service descriptions to track departmental revenue.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.revenueByCategory.map((c: any, idx: number) => {
                      const maxAmt = stats.revenueByCategory[0]?.amount || 1;
                      const pct = Math.min(100, Math.round((c.amount / maxAmt) * 100));
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                              {c.category}
                              <span className="font-normal text-slate-400 text-[10px]">({c.invoiceCount} inv)</span>
                            </span>
                            <span className="text-slate-900 font-mono">
                              £{c.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">({c.percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* WIDGET 14: Invoiced Amount by Status */}
            {isWidgetEnabled("invoicedByStatus") && stats?.invoicedByStatus && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-purple-600" /> Invoiced Amount by Status
                  </h3>
                  <button
                    onClick={() => handleHideWidget("invoicedByStatus")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Draft ({stats.invoicedByStatus.draft.count})</span>
                    <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
                      £{stats.invoicedByStatus.draft.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Sent ({stats.invoicedByStatus.sent.count})</span>
                    <span className="text-xs font-black font-mono text-blue-900 mt-1 block">
                      £{stats.invoicedByStatus.sent.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Paid ({stats.invoicedByStatus.paid.count})</span>
                    <span className="text-xs font-black font-mono text-emerald-900 mt-1 block">
                      £{stats.invoicedByStatus.paid.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-700 block">Partial ({stats.invoicedByStatus.partial.count})</span>
                    <span className="text-xs font-black font-mono text-purple-900 mt-1 block">
                      £{stats.invoicedByStatus.partial.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Overdue ({stats.invoicedByStatus.overdue.count})</span>
                    <span className="text-xs font-black font-mono text-rose-900 mt-1 block">
                      £{stats.invoicedByStatus.overdue.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Methods Breakdown & Invoiced vs Due Amount */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 15: Payment Methods Breakdown */}
            {isWidgetEnabled("paymentMethods") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={15} className="text-emerald-600" /> Payment Methods Breakdown
                  </h3>
                  <button
                    onClick={() => handleHideWidget("paymentMethods")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isLoadingStats ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading payment methods...</div>
                ) : !stats?.paymentMethods || stats.paymentMethods.length === 0 ? (
                  <div className="py-8 text-center space-y-1 text-slate-400 text-xs">
                    <CreditCard className="mx-auto text-slate-400" size={24} />
                    <p className="font-semibold text-slate-700">No Payments Recorded</p>
                    <p className="text-[11px] text-slate-400">Collect fees via Bank Transfer, Card, or Direct Debit to see payment distributions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.paymentMethods.map((m: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-800 flex items-center gap-1.5">
                            <CreditCard size={13} className="text-slate-400" />
                            {m.method}
                            <span className="font-normal text-slate-400 text-[10px]">({m.count} payments)</span>
                          </span>
                          <span className="text-slate-900 font-mono">
                            £{m.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({m.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${m.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WIDGET 16: Invoiced Amount vs Due Amount */}
            {isWidgetEnabled("invoicedVsDue") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign size={15} className="text-blue-600" /> Invoiced Amount vs Due Amount
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {stats?.invoicedVsDue?.collectionEfficiency || 0}% Recovery
                    </span>
                  </div>
                  <button
                    onClick={() => handleHideWidget("invoicedVsDue")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Invoiced</span>
                    <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                      £{(stats?.invoicedVsDue?.totalInvoiced || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Collected</span>
                    <span className="text-base font-black font-mono text-emerald-900 mt-1 block">
                      £{(stats?.invoicedVsDue?.totalPaid || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Outstanding</span>
                    <span className="text-base font-black font-mono text-amber-900 mt-1 block">
                      £{(stats?.invoicedVsDue?.totalDue || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aged Debtors Breakdown & Estimates by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 17: Aged Debtors Breakdown */}
            {isWidgetEnabled("debtorsAgingChart") && stats?.debtorsAging && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={15} className="text-rose-600" /> Aged Debtors Breakdown
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      £{stats.debtorsAging.totalOutstanding.toLocaleString("en-GB", { minimumFractionDigits: 2 })} Due
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/time-fees/reports")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      Debtors Report <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => handleHideWidget("debtorsAgingChart")}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                      title="Remove widget"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Current</span>
                    <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
                      £{stats.debtorsAging.current.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">1-30d</span>
                    <span className="text-xs font-black font-mono text-amber-900 mt-1 block">
                      £{stats.debtorsAging.days1To30.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-orange-100 bg-orange-50/50">
                    <span className="text-[10px] uppercase font-bold text-orange-700 block">31-60d</span>
                    <span className="text-xs font-black font-mono text-orange-900 mt-1 block">
                      £{stats.debtorsAging.days31To60.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">61-90d</span>
                    <span className="text-xs font-black font-mono text-rose-900 mt-1 block">
                      £{stats.debtorsAging.days61To90.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-100/50 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">90d+</span>
                    <span className="text-xs font-black font-mono text-rose-900 mt-1 block">
                      £{stats.debtorsAging.days90Plus.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 18: Estimates by Status and Amount */}
            {isWidgetEnabled("estimatesByStatus") && stats?.estimatesSummary && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} className="text-indigo-600" /> Estimates by Status and Amount
                  </h3>
                  <button
                    onClick={() => handleHideWidget("estimatesByStatus")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Draft Quotes</span>
                    <span className="text-lg font-black font-mono text-slate-900 mt-1 block">{stats.estimatesSummary.draft}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-center">
                    <span className="text-[11px] font-medium text-blue-700 block">Sent to Client</span>
                    <span className="text-lg font-black font-mono text-blue-900 mt-1 block">{stats.estimatesSummary.sent}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-center">
                    <span className="text-[11px] font-medium text-emerald-700 block">Accepted</span>
                    <span className="text-lg font-black font-mono text-emerald-900 mt-1 block">{stats.estimatesSummary.accepted}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 text-center">
                    <span className="text-[11px] font-medium text-purple-700 block">Converted</span>
                    <span className="text-lg font-black font-mono text-purple-900 mt-1 block">{stats.estimatesSummary.converted}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WIDGET 19: Practice Revenue Flow Trend (6 Months Chart) */}
          {isWidgetEnabled("incomeTrend") && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-600" /> Revenue Flow &amp; Income Trend (Past 6 Months)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Comparison between total fees billed versus cash collected.</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" /> Invoiced (£)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Collected (£)</span>
                  </div>

                  <button
                    onClick={() => handleHideWidget("incomeTrend")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {isLoadingStats ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading revenue trend...</div>
              ) : !stats?.incomeTrend || stats.incomeTrend.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No revenue data available yet.</div>
              ) : (
                <div className="grid grid-cols-6 gap-3 pt-6 pb-2">
                  {stats.incomeTrend.map((m: any, idx: number) => {
                    const maxVal = Math.max(...stats.incomeTrend.map((x: any) => Math.max(x.invoiced, x.paid)), 1000);
                    const invHeight = Math.max(8, Math.round((m.invoiced / maxVal) * 120));
                    const paidHeight = Math.max(8, Math.round((m.paid / maxVal) * 120));

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="h-36 flex items-end gap-1.5 w-full justify-center">
                          <div 
                            title={`Invoiced: £${m.invoiced}`}
                            className="w-5 bg-indigo-600 rounded-t-md transition-all duration-500 hover:bg-indigo-700" 
                            style={{ height: `${invHeight}px` }} 
                          />
                          <div 
                            title={`Collected: £${m.paid}`}
                            className="w-5 bg-emerald-500 rounded-t-md transition-all duration-500 hover:bg-emerald-600" 
                            style={{ height: `${paidHeight}px` }} 
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">{m.month}</span>
                        <span className="text-[10px] font-mono text-slate-500">£{Math.round(m.invoiced)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Capium "+ Add Widget" Customization Modal (Capium img_2.png) */}
      {showAddWidgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LayoutGrid size={18} className="text-purple-600" /> Customize Dashboard Widgets
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Toggle widgets on or off based on your practice requirements</p>
              </div>
              <button
                onClick={() => setShowAddWidgetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Left Column: Time Section Charts */}
              <div className="space-y-3">
                <div className="font-bold text-purple-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Clock size={14} /> Time Section Charts
                </div>
                <div className="space-y-2">
                  {modalWidgets.filter(w => w.category === "time").map(w => (
                    <label key={w.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={w.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setModalWidgets(prev => prev.map(item => item.id === w.id ? { ...item, enabled: checked } : item));
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className={`font-semibold ${w.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{w.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right Column: Fees Section Charts */}
              <div className="space-y-3">
                <div className="font-bold text-emerald-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                  <DollarSign size={14} /> Fees Section Charts
                </div>
                <div className="space-y-2">
                  {modalWidgets.filter(w => w.category === "fees").map(w => (
                    <label key={w.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={w.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setModalWidgets(prev => prev.map(item => item.id === w.id ? { ...item, enabled: checked } : item));
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className={`font-semibold ${w.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{w.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={handleResetWidgetsDefault}
                className="text-xs text-slate-500 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={13} /> Reset to Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddWidgetModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModalWidgets}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
