import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  BarChart3, Clock, Briefcase, FileText, Settings, Receipt,
  PieChart, Download, Printer, Search, TrendingUp, DollarSign,
  Users, Layers, ArrowUpRight, CheckCircle2, AlertCircle, FileSpreadsheet,
  Calendar, Check, Filter, ShieldAlert, Sparkles
} from "lucide-react";

import { timeFeesSidebar } from "./sidebar";

export default function TimeFeesReportsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Active Tab: "time" | "expenses" | "debtors" | "profitability" | "wip" (Phase 6.2 4-Pillar Roadmap)
  const [activeTab, setActiveTab] = useState<"time" | "expenses" | "debtors" | "profitability" | "wip">("time");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Pillar 1: Time Report
  const [timePeriod, setTimePeriod] = useState("this_month");
  const [timeGroupBy, setTimeGroupBy] = useState("client"); // client, job, task, user, date
  const [timeFilterType, setTimeFilterType] = useState("all"); // all, billable, non_billable

  // Filters for Pillar 2: Expenses Report
  const [expensePeriod, setExpensePeriod] = useState("this_month");
  const [expenseGroupBy, setExpenseGroupBy] = useState("category"); // category, client, user, date

  // Filter for Profitability
  const [period, setPeriod] = useState<string>("this_month");

  // Query 1: Time Report
  const { data: timeReportData, isLoading: isLoadingTimeReport } = useQuery<{
    rows: any[];
    summary: any;
  }>({
    queryKey: ["/api/time-fees/reports/time", timePeriod, timeGroupBy, timeFilterType],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/time-fees/reports/time?period=${timePeriod}&groupBy=${timeGroupBy}&filterType=${timeFilterType}`
      );
      if (!res.ok) return { rows: [], summary: {} };
      return res.json();
    },
    enabled: activeTab === "time",
  });

  // Query 2: Expenses Report
  const { data: expenseReportData, isLoading: isLoadingExpenseReport } = useQuery<{
    rows: any[];
    summary: any;
  }>({
    queryKey: ["/api/time-fees/reports/expenses", expensePeriod, expenseGroupBy],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/time-fees/reports/expenses?period=${expensePeriod}&groupBy=${expenseGroupBy}`
      );
      if (!res.ok) return { rows: [], summary: {} };
      return res.json();
    },
    enabled: activeTab === "expenses",
  });

  // Query 3: Invoices & Aged Debtors
  const { data: debtorsReportData, isLoading: isLoadingDebtorsReport } = useQuery<{
    debtors: any[];
    agingSummary: any;
  }>({
    queryKey: ["/api/time-fees/reports/invoices-debtors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/reports/invoices-debtors");
      if (!res.ok) return { debtors: [], agingSummary: {} };
      return res.json();
    },
    enabled: activeTab === "debtors",
  });

  // Query 4: Profitability Data
  const { data: profitabilityData, isLoading: isLoadingProf } = useQuery<{
    summary: any;
    staffBreakdown: any[];
  }>({
    queryKey: ["/api/time-fees/reports/profitability", period],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/time-fees/reports/profitability?period=${period}`);
      if (!res.ok) return { summary: {}, staffBreakdown: [] };
      return res.json();
    },
    enabled: activeTab === "profitability",
  });

  // Query 5: WIP Ledger Data
  const { data: wipData, isLoading: isLoadingWip } = useQuery<{
    summary: any;
    wipLedger: any[];
  }>({
    queryKey: ["/api/time-fees/reports/wip"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/reports/wip");
      if (!res.ok) return { summary: {}, wipLedger: [] };
      return res.json();
    },
    enabled: activeTab === "wip",
  });

  // Multi-format CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = "";
    if (activeTab === "time") {
      csvContent = "Group,Total Hours,Billable Hours,Non-Billable Hours,Total Revenue (£),Total Cost (£),Gross Profit (£),Margin %\n";
      (timeReportData?.rows || []).forEach((r) => {
        csvContent += `"${r.groupKey}",${r.totalHours},${r.billableHours},${r.nonBillableHours},${r.totalRevenue},${r.totalCost},${r.grossProfit},${r.margin}%\n`;
      });
    } else if (activeTab === "expenses") {
      csvContent = "Group / Category,Claims Count,Billable (£),Non-Billable (£),Total Amount (£)\n";
      (expenseReportData?.rows || []).forEach((e) => {
        csvContent += `"${e.groupKey}",${e.count},${e.billableAmount},${e.nonBillableAmount},${e.totalAmount}\n`;
      });
    } else if (activeTab === "debtors") {
      csvContent = "Client Name,Invoice #,Date,Due Date,Total Amount (£),Due Amount (£),Aging Bucket\n";
      (debtorsReportData?.debtors || []).forEach((d) => {
        csvContent += `"${d.clientName}","${d.invoiceNumber}","${d.date}","${d.dueDate}",${d.totalAmount},${d.dueAmount},"${d.bucket}"\n`;
      });
    } else if (activeTab === "profitability") {
      csvContent = "Staff Member,Role,Total Hours,Billable Hours,Utilization %,Billable Revenue (£),Staff Cost (£),Gross Profit (£),Margin %\n";
      (profitabilityData?.staffBreakdown || []).forEach((s) => {
        csvContent += `"${s.name}","${s.role}",${s.totalHours},${s.billableHours},${s.utilizationRate}%,${s.billableAmount},${s.staffCost},${s.grossProfit},${s.margin}%\n`;
      });
    } else {
      csvContent = "Client,Job,Unbilled Hours,Rate/hr,Time WIP (£),Expenses WIP (£),Total WIP (£)\n";
      (wipData?.wipLedger || []).forEach((w) => {
        csvContent += `"${w.clientName}","${w.jobName}",${w.unbilledHours},${w.hourlyRate},${w.timeWip},${w.expensesWip},${w.totalWip}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SanSuite_${activeTab}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Export Complete", description: `Downloaded ${activeTab} report to your device.` });
  };

  const profSummary = profitabilityData?.summary || {};
  const staffList = (profitabilityData?.staffBreakdown || []).filter((s) =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wipSummary = wipData?.summary || {};
  const wipList = (wipData?.wipLedger || []).filter((w) =>
    !searchQuery || w.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || w.jobName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timeRows = (timeReportData?.rows || []).filter((r) =>
    !searchQuery || r.groupKey?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const expenseRows = (expenseReportData?.rows || []).filter((e) =>
    !searchQuery || e.groupKey?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const debtorsList = (debtorsReportData?.debtors || []).filter((d) =>
    !searchQuery || d.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || d.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-5 w-full">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="text-indigo-600" size={18} />
              Time & Fees Statutory Intelligence & 4-Pillar Reports
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Practice productivity analytics, staff cost vs billable revenue margins, aged debtors, and live WIP ledger balances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
              title="Print Report"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* 4-Pillar Tab Switcher: Time | Expenses | Invoices & Debtors | Profitability | WIP Ledger */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab("time")}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "time"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Clock size={13} />
              1. Time Report
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "expenses"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Receipt size={13} />
              2. Expenses Report
            </button>
            <button
              onClick={() => setActiveTab("debtors")}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "debtors"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText size={13} />
              3. Invoices & Aged Debtors
            </button>
            <button
              onClick={() => setActiveTab("profitability")}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "profitability"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users size={13} />
              4. Staff Profitability
            </button>
            <button
              onClick={() => setActiveTab("wip")}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "wip"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Layers size={13} />
              WIP Ledger
            </button>
          </div>

          {/* Contextual Filters */}
          <div className="flex items-center gap-2">
            {activeTab === "time" && (
              <>
                <select
                  value={timeGroupBy}
                  onChange={(e) => setTimeGroupBy(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="client">Group by Client</option>
                  <option value="job">Group by Job</option>
                  <option value="task">Group by Task</option>
                  <option value="user">Group by Staff Member</option>
                  <option value="date">Group by Date</option>
                </select>

                <select
                  value={timeFilterType}
                  onChange={(e) => setTimeFilterType(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="all">All Hours</option>
                  <option value="billable">Billable Hours Only</option>
                  <option value="non_billable">Non-Billable Only</option>
                </select>

                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Financial Year</option>
                  <option value="all">All Time</option>
                </select>
              </>
            )}

            {activeTab === "expenses" && (
              <>
                <select
                  value={expenseGroupBy}
                  onChange={(e) => setExpenseGroupBy(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="category">Group by Category</option>
                  <option value="client">Group by Client</option>
                  <option value="user">Group by Staff Member</option>
                  <option value="date">Group by Date</option>
                </select>

                <select
                  value={expensePeriod}
                  onChange={(e) => setExpensePeriod(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Financial Year</option>
                  <option value="all">All Time</option>
                </select>
              </>
            )}

            {activeTab === "profitability" && (
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
              >
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Financial Year</option>
                <option value="all">All Time</option>
              </select>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PILLAR 1: TIME REPORT */}
        {/* ========================================================================= */}
        {activeTab === "time" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Hours Tracked</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {isLoadingTimeReport ? "..." : `${timeReportData?.summary?.totalHours || "0.00"}h`}
                </p>
                <span className="text-[10px] text-indigo-600 font-medium">Aggregate Practice Timelogs</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Billable Fee Value</span>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {isLoadingTimeReport ? "..." : `£${timeReportData?.summary?.totalRevenue?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400">Rate Card Fee Value</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Staff Cost Equivalent</span>
                <p className="text-xl font-bold font-mono text-amber-600">
                  {isLoadingTimeReport ? "..." : `£${timeReportData?.summary?.totalCost?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400">Cost rate computation</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Net Operational Profit</span>
                <p className="text-xl font-bold font-mono text-indigo-600">
                  {isLoadingTimeReport ? "..." : `£${timeReportData?.summary?.grossProfit?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">Realized Margin</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock size={14} className="text-indigo-600" />
                  Time Report Breakdown by {timeGroupBy.toUpperCase()}
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder={`Filter by ${timeGroupBy}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {isLoadingTimeReport ? (
                <div className="p-12 text-center text-slate-400">Loading time metrics...</div>
              ) : timeRows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Clock size={28} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">No timelogs found for this period</p>
                  <p className="text-[11px]">Logged staff hours will be grouped here automatically.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">{timeGroupBy.toUpperCase()}</th>
                        <th className="py-3 px-4 text-right">Total Hours</th>
                        <th className="py-3 px-4 text-right">Billable Hours</th>
                        <th className="py-3 px-4 text-right">Non-Billable</th>
                        <th className="py-3 px-4 text-right">Revenue (£)</th>
                        <th className="py-3 px-4 text-right">Cost (£)</th>
                        <th className="py-3 px-4 text-right">Profit (£)</th>
                        <th className="py-3 px-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {timeRows.map((r: any, idx: number) => {
                        const m = parseFloat(r.margin || "0");
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{r.groupKey}</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">{r.totalHours}h</td>
                            <td className="py-3 px-4 text-right font-mono text-indigo-600 font-semibold">{r.billableHours}h</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">{r.nonBillableHours}h</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{r.totalRevenue.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">£{r.totalCost.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">£{r.grossProfit.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                m >= 40 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50" : m >= 20 ? "text-amber-700 bg-amber-50 dark:bg-amber-950/50" : "text-rose-700 bg-rose-50 dark:bg-rose-950/50"
                              }`}>
                                {r.margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PILLAR 2: EXPENSES REPORT */}
        {/* ========================================================================= */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Practice Claims</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {isLoadingExpenseReport ? "..." : expenseReportData?.summary?.count || 0}
                </p>
                <span className="text-[10px] text-slate-400">Rechargeable & Internal</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Rechargeable Client Value</span>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {isLoadingExpenseReport ? "..." : `£${expenseReportData?.summary?.billableAmount?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">Ready to bill to clients</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Gross Expense Value</span>
                <p className="text-xl font-bold font-mono text-indigo-600">
                  {isLoadingExpenseReport ? "..." : `£${expenseReportData?.summary?.totalAmount?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400">All disbursements & expenses</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt size={14} className="text-emerald-600" />
                  Expenses Breakdown by {expenseGroupBy.toUpperCase()}
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder={`Filter by ${expenseGroupBy}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {isLoadingExpenseReport ? (
                <div className="p-12 text-center text-slate-400">Loading expense metrics...</div>
              ) : expenseRows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Receipt size={28} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">No expenses recorded for this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">{expenseGroupBy.toUpperCase()}</th>
                        <th className="py-3 px-4 text-right">Claims Count</th>
                        <th className="py-3 px-4 text-right">Billable Recharges (£)</th>
                        <th className="py-3 px-4 text-right">Non-Billable (£)</th>
                        <th className="py-3 px-4 text-right">Total Amount (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {expenseRows.map((e: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{e.groupKey}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">{e.count}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">£{e.billableAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">£{e.nonBillableAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{e.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PILLAR 3: INVOICES & AGED DEBTORS */}
        {/* ========================================================================= */}
        {activeTab === "debtors" && (
          <div className="space-y-4">
            {/* Aging Buckets KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Debtors</span>
                <p className="text-base font-bold font-mono text-purple-600">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.totalDue?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400">
                  {debtorsReportData?.agingSummary?.debtorsCount || 0} clients
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Current (Not Due)</span>
                <p className="text-base font-bold font-mono text-emerald-600">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.current?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400">Within payment terms</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">1 - 30 Days</span>
                <p className="text-base font-bold font-mono text-amber-600">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.days1To30?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-amber-600 font-semibold">First reminder</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">31 - 60 Days</span>
                <p className="text-base font-bold font-mono text-orange-600">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.days31To60?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-orange-600 font-semibold">Second notice</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">61 - 90 Days</span>
                <p className="text-base font-bold font-mono text-rose-600">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.days61To90?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-rose-600 font-semibold">Escalation required</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">90+ Days Overdue</span>
                <p className="text-base font-bold font-mono text-rose-700">
                  {isLoadingDebtorsReport ? "..." : `£${debtorsReportData?.agingSummary?.days90Plus?.toFixed(2) || "0.00"}`}
                </p>
                <span className="text-[10px] text-rose-700 font-semibold">Credit hold / collections</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={14} className="text-indigo-600" />
                  Aged Debtors Ledger & Outstanding Balances
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Search debtor or invoice #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {isLoadingDebtorsReport ? (
                <div className="p-12 text-center text-slate-400">Loading aged debtors...</div>
              ) : debtorsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Zero Overdue Debtors</p>
                  <p className="text-[11px]">All practice client fee invoices are settled and up-to-date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Client Name</th>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Invoice Date</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Invoice Total (£)</th>
                        <th className="py-3 px-4 text-right">Balance Due (£)</th>
                        <th className="py-3 px-4 text-center">Aging Bucket</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {debtorsList.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{d.clientName}</td>
                          <td className="py-3 px-4 font-bold text-indigo-600">{d.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(d.date).toLocaleDateString("en-GB")}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(d.dueDate || d.date).toLocaleDateString("en-GB")}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">£{parseFloat(d.totalAmount || "0").toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">£{parseFloat(d.dueAmount || "0").toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.bucket === "Current"
                                ? "bg-emerald-100 text-emerald-800"
                                : d.bucket === "1-30"
                                ? "bg-amber-100 text-amber-800"
                                : d.bucket === "31-60"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {d.bucket}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => navigate("/time-fees/invoices")}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold rounded text-[10px] cursor-pointer"
                            >
                              Collect / Pay
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PILLAR 4: STAFF PROFITABILITY */}
        {/* ========================================================================= */}
        {activeTab === "profitability" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Practice Hours</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {isLoadingProf ? "..." : `${profSummary.totalHours || "0.00"} hrs`}
                </p>
                <span className="text-[10px] text-indigo-600 font-medium">
                  {profSummary.billableHours || "0.00"} Billable Hours ({profSummary.practiceUtilization || "0.0"}%)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Gross Billable Fee Value</span>
                <p className="text-xl font-bold font-mono text-indigo-600">
                  {isLoadingProf ? "..." : `£${profSummary.totalBillableAmount || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Based on hourly rates</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Staff Cost</span>
                <p className="text-xl font-bold font-mono text-amber-600">
                  {isLoadingProf ? "..." : `£${profSummary.totalStaffCost || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Internal payroll cost rates</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Net Gross Margin</span>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {isLoadingProf ? "..." : `£${profSummary.grossProfit || "0.00"}`}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  Practice Margin: {profSummary.practiceMargin || "0.0"}%
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users size={14} className="text-indigo-600" />
                  Staff Cost &amp; Fee Realization Breakdown
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Filter staff members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {isLoadingProf ? (
                <div className="p-12 text-center text-slate-400">Calculating staff metrics...</div>
              ) : staffList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <p>No timelogs recorded for this period.</p>
                  <p className="text-[11px]">Staff timelogs logged in &apos;Timesheets&apos; will populate this profitability matrix automatically.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Total Hours</th>
                        <th className="py-3 px-4 text-right">Billable Hours</th>
                        <th className="py-3 px-4 text-right">Utilization %</th>
                        <th className="py-3 px-4 text-right">Billable Value (£)</th>
                        <th className="py-3 px-4 text-right">Staff Cost (£)</th>
                        <th className="py-3 px-4 text-right">Gross Profit (£)</th>
                        <th className="py-3 px-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {staffList.map((s) => {
                        const marginNum = parseFloat(s.margin || "0");
                        const marginColor =
                          marginNum >= 40
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50"
                            : marginNum >= 20
                            ? "text-amber-600 bg-amber-50 dark:bg-amber-950/50"
                            : "text-rose-600 bg-rose-50 dark:bg-rose-950/50";

                        return (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                            <td className="py-3 px-4 text-slate-500 capitalize">{s.role}</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">{s.totalHours} hrs</td>
                            <td className="py-3 px-4 text-right font-mono text-indigo-600 font-semibold">{s.billableHours} hrs</td>
                            <td className="py-3 px-4 text-right font-mono font-medium">{s.utilizationRate}%</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{s.billableAmount}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">£{s.staffCost}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">£{s.grossProfit}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${marginColor}`}>
                                {s.margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORK IN PROGRESS (WIP) LEDGER */}
        {/* ========================================================================= */}
        {activeTab === "wip" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Unbilled Practice WIP</span>
                <p className="text-xl font-bold font-mono text-indigo-600">
                  {isLoadingWip ? "..." : `£${wipSummary.totalGrossWip || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {wipSummary.totalWipHours || "0.00"} unbilled hours ready for invoicing
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Unbilled Time Services</span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {isLoadingWip ? "..." : `£${wipSummary.totalTimeWip || "0.00"}`}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">Logged on client jobs</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Unbilled Client Disbursements</span>
                <p className="text-xl font-bold font-mono text-amber-600">
                  {isLoadingWip ? "..." : `£${wipSummary.totalExpensesWip || "0.00"}`}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Mileage, filing fees &amp; out-of-pocket</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers size={14} className="text-indigo-600" />
                  Unbilled WIP Balance by Client &amp; Job
                </h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Search client or job..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {isLoadingWip ? (
                <div className="p-12 text-center text-slate-400">Calculating unbilled WIP ledger...</div>
              ) : wipList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">No Unbilled WIP Outstanding</p>
                  <p className="text-[11px]">All logged billable hours and disbursements have been invoiced to clients.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Client Name</th>
                        <th className="py-3 px-4">Job / Project</th>
                        <th className="py-3 px-4 text-right">Unbilled Hours</th>
                        <th className="py-3 px-4 text-right">Rate / Hr</th>
                        <th className="py-3 px-4 text-right">Time WIP (£)</th>
                        <th className="py-3 px-4 text-right">Expenses WIP (£)</th>
                        <th className="py-3 px-4 text-right">Total WIP Value (£)</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {wipList.map((w) => (
                        <tr key={`${w.clientId}-${w.jobId}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{w.clientName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{w.jobName}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">{w.unbilledHours} hrs</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">£{w.hourlyRate}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">£{w.timeWip}</td>
                          <td className="py-3 px-4 text-right font-mono text-amber-600">£{w.expensesWip}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">£{w.totalWip}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => navigate("/time-fees/invoices")}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold rounded text-[10px] cursor-pointer transition-colors shadow-2xs"
                            >
                              Create Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
