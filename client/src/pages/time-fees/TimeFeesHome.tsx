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
  LayoutGrid, Check, AlertTriangle, ArrowRight, UserCheck, ShieldAlert
} from "lucide-react";

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
  // Time Section Charts
  { id: "timeSummary", label: "Timesheet Summary", category: "time", enabled: true },
  { id: "mostVsLeast", label: "Most vs Least by Profit & Working Hours", category: "time", enabled: true },
  { id: "taskWiseHours", label: "Task Wise Hours Details", category: "time", enabled: true },
  { id: "timer", label: "Live Work Timer", category: "time", enabled: true },
  { id: "jobStatusCounts", label: "Job Count by Status", category: "time", enabled: true },
  // Fees Section Charts
  { id: "feesSummary", label: "Fees Summary", category: "fees", enabled: true },
  { id: "topClientsRevenue", label: "Top 5 Clients by Invoice Amount", category: "fees", enabled: true },
  { id: "topClientsBalance", label: "Top 5 Clients with Balance", category: "fees", enabled: true },
  { id: "incomeTrend", label: "Practice Revenue Flow", category: "fees", enabled: true },
  { id: "estimatesByStatus", label: "Estimates by Status and Amount", category: "fees", enabled: true },
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
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_WIDGETS;
  });
  const [modalWidgets, setModalWidgets] = useState<WidgetConfig[]>(widgets);

  // Live Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerClientId, setTimerClientId] = useState("");
  const [timerJobId, setTimerJobId] = useState("");
  const [timerTaskName, setTimerTaskName] = useState("Statutory Accounts Review");
  const [timerDescription, setTimerDescription] = useState("");
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setElapsedSeconds(0);
  };

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

  const clientJobs = jobs.filter((j: any) => j.clientId === parseInt(timerClientId));

  // Mutation to log timer time
  const saveTimerMutation = useMutation({
    mutationFn: async () => {
      if (!timerClientId) throw new Error("Please select a client for this time entry");
      const hoursToSave = Math.max(0.1, parseFloat((elapsedSeconds / 3600).toFixed(2)));
      
      const res = await apiRequest("POST", "/api/time-fees/timesheets", {
        clientId: parseInt(timerClientId),
        jobId: timerJobId ? parseInt(timerJobId) : null,
        taskName: timerTaskName,
        hours: hoursToSave,
        date: new Date().toISOString().split('T')[0],
        description: timerDescription || `Recorded from live stopwatch timer (${formatStopwatch(elapsedSeconds)})`,
        billable: true,
        status: "Unsubmitted",
      });
      if (!res.ok) throw new Error("Failed to save time entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Time Entry Saved", description: "Your billable time has been logged to your timesheet." });
      handleResetTimer();
      setTimerDescription("");
    },
    onError: (err: any) => {
      toast({ title: "Save Error", description: err.message || "Failed to save timer entry", type: "error" });
    }
  });

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

        <div className="p-6 w-full mx-auto space-y-6 max-w-7xl">
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

          {/* 2-Column Section: Task Wise Hours Details (Stacked Chart) & Timer Widget (Capium img_1.png) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WIDGET 3: Task Wise Hours Details (Capium img_1.png Daily Stacked Chart) */}
            {isWidgetEnabled("taskWiseHours") && (
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
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
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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
                              <div className="w-8 rounded-t-md overflow-hidden flex flex-col justify-end transition-all shadow-2xs">
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
                              <div className="w-8 h-1 bg-slate-100 rounded-full" />
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

            {/* WIDGET 4: Timer Widget (Capium img_1.png) */}
            {isWidgetEnabled("timer") && (
              <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={15} className="text-indigo-600" /> Work Timer
                  </h3>
                  <button
                    onClick={() => handleHideWidget("timer")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="text-center py-2 space-y-2">
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-100 bg-indigo-50/50 mx-auto flex items-center justify-center relative">
                    <Clock size={36} className={`${isTimerRunning ? 'text-indigo-600 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '6s' }} />
                    <span className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white ${isTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>

                  <div className="text-2xl font-black font-mono tracking-wider text-slate-900">
                    {formatStopwatch(elapsedSeconds)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isTimerRunning ? "Actively logging task time..." : "Click start to begin session"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {!isTimerRunning ? (
                      <button
                        onClick={() => setIsTimerRunning(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play size={14} /> Start Timer
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsTimerRunning(false)}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Pause size={14} /> Pause
                      </button>
                    )}
                    <button
                      onClick={handleResetTimer}
                      title="Reset Timer"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Timer Setup Drawer (Shown when timer has recorded time) */}
          {elapsedSeconds > 0 && (
            <div className="bg-white border-2 border-indigo-400/40 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Clock size={16} className="text-indigo-600" />
                Assign &amp; Log Timer Time ({formatStopwatch(elapsedSeconds)}):
              </div>

              <div className="flex-1 min-w-[200px]">
                <select
                  value={timerClientId}
                  onChange={(e) => setTimerClientId(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Client * --</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <select
                  value={timerJobId}
                  onChange={(e) => setTimerJobId(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Job (Optional) --</option>
                  {clientJobs.map((j: any) => (
                    <option key={j.id} value={j.id}>{j.jobName}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Task Name (e.g. Accounts Production)"
                  value={timerTaskName}
                  onChange={(e) => setTimerTaskName(e.target.value)}
                  className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                onClick={() => saveTimerMutation.mutate()}
                disabled={!timerClientId || saveTimerMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {saveTimerMutation.isPending ? "Logging..." : "Confirm & Save to Timesheet"}
              </button>
            </div>
          )}

          {/* Fees Summary & Job Status (Capium img_2.png) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 5: Fees Summary */}
            {isWidgetEnabled("feesSummary") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} className="text-emerald-600" /> Fees &amp; Realization Summary
                  </h3>
                  <button
                    onClick={() => handleHideWidget("feesSummary")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title="Remove widget"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
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

            {/* WIDGET 6: Job Count by Status */}
            {isWidgetEnabled("jobStatusCounts") && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={15} className="text-indigo-600" /> Job Count by Status
                  </h3>
                  <button
                    onClick={() => handleHideWidget("jobStatusCounts")}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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

          {/* Top Clients by Revenue & Balance (Capium img_2.png) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 7: Top 5 Clients by Invoice Amount */}
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
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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
                    <p>No invoices issued in this period yet.</p>
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

            {/* WIDGET 8: Top 5 Clients with Balance */}
            {isWidgetEnabled("topClientsBalance") && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-600" /> Top 5 Clients with Balance
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
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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

          {/* WIDGET 9: Practice Revenue Flow Trend (6 Months Chart) */}
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
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
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

          {/* WIDGET 10: Estimates by Status and Amount */}
          {isWidgetEnabled("estimatesByStatus") && stats?.estimatesSummary && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={15} className="text-indigo-600" /> Estimates by Status and Amount
                </h3>
                <button
                  onClick={() => handleHideWidget("estimatesByStatus")}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Remove widget"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block">Draft Quotes</span>
                  <span className="text-lg font-black font-mono text-slate-900 mt-1 block">{stats.estimatesSummary.draft}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 text-center">
                  <span className="text-[11px] font-medium text-blue-700 block">Sent to Client</span>
                  <span className="text-lg font-black font-mono text-blue-900 mt-1 block">{stats.estimatesSummary.sent}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 text-center">
                  <span className="text-[11px] font-medium text-emerald-700 block">Accepted</span>
                  <span className="text-lg font-black font-mono text-emerald-900 mt-1 block">{stats.estimatesSummary.accepted}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 text-center">
                  <span className="text-[11px] font-medium text-purple-700 block">Converted to Invoice</span>
                  <span className="text-lg font-black font-mono text-purple-900 mt-1 block">{stats.estimatesSummary.converted}</span>
                </div>
              </div>
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
