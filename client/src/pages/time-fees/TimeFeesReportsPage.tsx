import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  BarChart3, Clock, Briefcase, FileText, Settings, Receipt,
  PieChart, Download, Printer, Search, TrendingUp, DollarSign,
  Users, Layers, ArrowUpRight, CheckCircle2, AlertCircle, FileSpreadsheet
} from "lucide-react";

import { timeFeesSidebar } from "./sidebar";

export default function TimeFeesReportsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Tab: "profitability" | "wip"
  const [activeTab, setActiveTab] = useState<"profitability" | "wip">("profitability");
  const [period, setPeriod] = useState<string>("this_month");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Profitability Data
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

  // Fetch WIP Ledger Data
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

  // Export to CSV helper
  const handleExportCSV = () => {
    let csvContent = "";
    if (activeTab === "profitability") {
      csvContent = "Staff Member,Role,Total Hours,Billable Hours,Utilization %,Billable Revenue,Staff Cost,Gross Profit,Margin %\n";
      (profitabilityData?.staffBreakdown || []).forEach((s) => {
        csvContent += `"${s.name}","${s.role}",${s.totalHours},${s.billableHours},${s.utilizationRate}%,${s.billableAmount},${s.staffCost},${s.grossProfit},${s.margin}%\n`;
      });
    } else {
      csvContent = "Client,Job,Unbilled Hours,Rate/hr,Time WIP,Expenses WIP,Total WIP\n";
      (wipData?.wipLedger || []).forEach((w) => {
        csvContent += `"${w.clientName}","${w.jobName}",${w.unbilledHours},${w.hourlyRate},${w.timeWip},${w.expensesWip},${w.totalWip}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SanSuite_${activeTab}_Report_${new Date().toISOString().split("T")[0]}.csv`);
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

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-5 w-full">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="text-indigo-600" size={18} />
              Time & Fees Statutory Intelligence & WIP Reports
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Practice productivity analytics, staff cost vs billable revenue margins, and live WIP ledger balances.
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

        {/* Tab Switcher: Profitability vs WIP */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("profitability")}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                activeTab === "profitability"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Staff & Practice Profitability
            </button>
            <button
              onClick={() => setActiveTab("wip")}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                activeTab === "wip"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              WIP (Work In Progress) Ledger
            </button>
          </div>

          {/* Period Filter for Profitability */}
          {activeTab === "profitability" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Period:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
              >
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Financial Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          )}
        </div>

        {/* REPORT 1: PROFITABILITY */}
        {activeTab === "profitability" && (
          <div className="space-y-4">
            {/* 4 Summary Cards */}
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

            {/* Staff Profitability Breakdown Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users size={14} className="text-indigo-600" />
                  Staff Cost & Fee Realization Breakdown
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

        {/* REPORT 2: WORK IN PROGRESS (WIP) LEDGER */}
        {activeTab === "wip" && (
          <div className="space-y-4">
            {/* 3 WIP Summary Cards */}
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
                <span className="text-[10px] text-slate-400 font-medium">Mileage, filing fees & out-of-pocket</span>
              </div>
            </div>

            {/* WIP Breakdown Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers size={14} className="text-indigo-600" />
                  Unbilled WIP Balance by Client & Job
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
