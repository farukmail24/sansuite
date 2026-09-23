import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Users, CheckSquare, Clock, Activity, FileText,
  Search, ChevronRight, ArrowLeft, Download, Filter,
  Calendar, FileSpreadsheet, Printer, Mail, SlidersHorizontal,
  ChevronDown, CheckCircle2, AlertCircle, Eye, ShieldCheck,
  TrendingUp, Building2, UserCheck, Layers, HelpCircle, X,
  RefreshCw, FileCheck
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

// Report Types Definition for the Directory
interface ReportDefinition {
  id: string;
  category: "Clients" | "Tasks" | "Deadlines" | "Team" | "Timesheets";
  title: string;
  description: string;
  defaultColumns: string[];
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  // 1. Clients Reports
  { id: "clients-by-type", category: "Clients", title: "Clients by Type Report", description: "Comprehensive breakdown of clients grouped by UK entity structure (Limited, Sole Trader, LLP, Charity).", defaultColumns: ["Client ID", "Client Name", "Client Type", "Client Manager", "Client Contact", "Status", "UTR No", "Auth Code / Reg", "AML Result", "Next Due Date"] },
  { id: "clients-users", category: "Clients", title: "Clients Users & Contacts Report", description: "List of primary client contacts, directors, email addresses, and communication preferences.", defaultColumns: ["Client ID", "Client Name", "Primary Contact", "Email", "Phone", "Client Manager", "Trading Status", "Created Date"] },
  { id: "clients-services", category: "Clients", title: "Clients Services & Retainers Report", description: "Active accounting and tax services assigned to each client with monthly retainer values.", defaultColumns: ["Client ID", "Client Name", "Client Type", "Assigned Services", "Fee Structure", "Status", "Manager"] },
  { id: "clients-unassigned-deadlines", category: "Clients", title: "Clients by Unassigned Deadline Report", description: "Clients missing mandatory statutory filing deadlines (Accounts, CT600, CS01, VAT).", defaultColumns: ["Client ID", "Client Name", "Client Type", "Missing Deadlines", "Year End", "Trading Status", "Action Required"] },
  { id: "client-custom-fields", category: "Clients", title: "Client Custom Field & Metadata Report", description: "Custom practice parameters, partner tags, industry sector codes, and client notes.", defaultColumns: ["Client ID", "Client Name", "Industry Sector", "Partner In Charge", "Payroll Reference", "VAT Stagger", "Custom Notes"] },
  { id: "client-aml-status", category: "Clients", title: "AML Compliance & Risk Status Report", description: "Anti-money laundering verification status, PEP screening records, and next risk review dates.", defaultColumns: ["Client ID", "Client Name", "Entity Type", "AML Status", "Risk Score", "PEP Screening", "Next Check Date", "Verified By"] },

  // 2. Tasks Reports
  { id: "tasks-master", category: "Tasks", title: "Tasks Master Status Report", description: "All ongoing practice jobs, accounting tasks, and statutory workflow checklist progression.", defaultColumns: ["Task ID", "Task Title", "Client Name", "Service", "Assigned To", "Priority", "Status", "Due Date"] },
  { id: "tasks-users", category: "Tasks", title: "Tasks by Users & Staff Report", description: "Active workloads, job allocations, and task completion percentages by team accountant.", defaultColumns: ["Staff Member", "Role", "Assigned Tasks", "Pending Tasks", "Completed Tasks", "Overdue Tasks", "Workload %"] },
  { id: "tasks-notes-new", category: "Tasks", title: "Tasks Notes & Worklogs Report (New version)", description: "Recent team updates, checklist step completions, and client notes across all active jobs.", defaultColumns: ["Task ID", "Client Name", "Task Title", "Last Note", "Author", "Timestamp", "Task Status"] },
  { id: "tasks-notes-old", category: "Tasks", title: "Tasks Notes Report (Standard version)", description: "Historical task audit trail and legacy activity logs for completed practice engagements.", defaultColumns: ["Task ID", "Client Name", "Service Category", "Note Excerpt", "Logged By", "Log Date"] },
  { id: "tasks-overdue", category: "Tasks", title: "Overdue Tasks & Exception Report", description: "High-priority bottlenecks and past-due tasks requiring immediate managerial intervention.", defaultColumns: ["Task ID", "Task Title", "Client Name", "Assigned Staff", "Days Overdue", "Priority", "Status"] },

  // 3. Deadlines Reports
  { id: "deadlines-master", category: "Deadlines", title: "Statutory Compliance Deadlines Report", description: "Companies House accounts, HMRC CT600, MTD VAT, CS01, and Self Assessment filings.", defaultColumns: ["Deadline ID", "Client Name", "Service Type", "Statutory Deadline", "Status", "Period Label", "Days Remaining", "Manager"] },
  { id: "client-deadlines", category: "Deadlines", title: "Client Deadlines Summary Report", description: "Client-by-client statutory filing roadmap with countdown indicators.", defaultColumns: ["Client Name", "Entity Type", "Accounts Due", "CT600 Due", "CS01 Due", "VAT Next Due", "Compliance Health"] },
  { id: "internal-deadlines", category: "Deadlines", title: "Internal Practice Deadlines Report", description: "Internal milestones and early-filing target dates configured by your firm.", defaultColumns: ["Client Name", "Workflow Name", "Internal Target Date", "Statutory Target Date", "Buffer Days", "Status"] },
  { id: "task-deadlines", category: "Deadlines", title: "Task-Linked Deadlines Report", description: "Cross-link between compliance deadlines and active task checklist completion.", defaultColumns: ["Deadline ID", "Client Name", "Filing Type", "Statutory Due Date", "Linked Task", "Task Progress", "Status"] },

  // 4. Team Reports
  { id: "team-activity", category: "Team", title: "Team Activity & Audit Report", description: "Recent operations, logins, client profile updates, and document generation by staff.", defaultColumns: ["Staff Member", "Activity Type", "Entity / Client", "Details", "IP / Device", "Timestamp"] },
  { id: "staff-capacity", category: "Team", title: "Staff Report & Resource Utilization", description: "Full directory of staff members, assigned portfolios, and capacity utilisation percentages.", defaultColumns: ["Staff ID", "Name", "Email", "Role", "Clients Assigned", "Active Jobs", "Capacity %"] },
  { id: "accountant-portfolio", category: "Team", title: "Accountant Client Portfolio Report", description: "Client revenue, statutory compliance rate, and job volume distributed by accountant.", defaultColumns: ["Accountant", "Total Clients", "Limited Co", "Sole Traders", "On-Time Filing %", "Total Retainers (£)"] },

  // 5. Timesheets Reports
  { id: "task-timesheets", category: "Timesheets", title: "Task Timesheet Report", description: "Hours tracked against specific client jobs, services, and compliance tasks.", defaultColumns: ["Timesheet ID", "Client Name", "Job / Service", "Staff Member", "Date", "Hours Worked", "Hourly Rate (£)", "Total Value (£)"] },
  { id: "user-timesheets", category: "Timesheets", title: "User Timesheet & Hours Report", description: "Individual staff timesheets, total weekly hours, overtime, and leave logging.", defaultColumns: ["Staff Member", "Period", "Standard Hours", "Overtime", "Billable Hours", "Non-Billable Hours", "Total Hours"] },
  { id: "client-timesheets", category: "Timesheets", title: "Client Timesheet & Billing Report", description: "Total billable time accumulated per client, cost rates, and WIP valuation.", defaultColumns: ["Timesheet ID", "Client Name", "Job / Service", "Staff Member", "Date", "Hours Worked", "Hourly Rate (£)", "Total Value (£)"] }
];

import { useSearch } from "wouter";

export default function PracticeReportsPage() {
  const { toast } = useToast();
  const searchString = useSearch();

  const getInitialReport = () => {
    const params = new URLSearchParams(searchString || window.location.search);
    return params.get("report") || null;
  };

  const [selectedReportId, setSelectedReportId] = useState<string | null>(getInitialReport());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouping">("list");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [tableSearch, setTableSearch] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("Weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");

  // Fetch Live Dynamic Report Data from the Backend Engine
  const { data: dynamicReportResponse, isLoading: isLoadingReport, refetch } = useQuery<any>({
    queryKey: ["/api/pm/reports", selectedReportId, filterType, filterStatus, tableSearch],
    queryFn: async () => {
      if (!selectedReportId) return null;
      const params = new URLSearchParams();
      if (filterType !== "All") params.append("type", filterType);
      if (filterStatus !== "All") params.append("status", filterStatus);
      if (tableSearch) params.append("search", tableSearch);

      const res = await fetch(`/api/pm/reports/${selectedReportId}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      return res.json();
    },
    enabled: !!selectedReportId,
  });

  // Active Report Definition
  const activeReport = useMemo(() => {
    return REPORT_DEFINITIONS.find((r) => r.id === selectedReportId) || null;
  }, [selectedReportId]);

  // Master Categories for Directory View
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const categories: Record<string, ReportDefinition[]> = {
      Clients: [],
      Tasks: [],
      Deadlines: [],
      Team: [],
      Timesheets: []
    };

    REPORT_DEFINITIONS.forEach((r) => {
      if (!q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) {
        categories[r.category].push(r);
      }
    });

    return categories;
  }, [searchQuery]);

  // Live Columns and Rows from API
  const reportColumns = dynamicReportResponse?.columns || activeReport?.defaultColumns || [];
  const reportRows = dynamicReportResponse?.data || [];

  // Grouped Data for Grouping View Mode
  const groupedData = useMemo(() => {
    if (viewMode !== "grouping" || reportRows.length === 0) return {};
    const groups: Record<string, any[]> = {};
    reportRows.forEach((r: any) => {
      const groupKey = r.col3 || "General / Unassigned";
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(r);
    });
    return groups;
  }, [viewMode, reportRows]);

  // Handle CSV Export
  const handleExportCsv = () => {
    if (!activeReport || reportRows.length === 0) {
      toast({ title: "No Data", description: "No records to export in the current view." });
      return;
    }

    const headers = reportColumns;
    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(","),
      ...reportRows.map((r: any) => [r.col1, `"${r.col2}"`, `"${r.col3}"`, `"${r.col4}"`, `"${r.col5}"`, `"${r.col6}"`, `"${r.col7}"`, `"${r.col8}"`, `"${r.col9}"`, `"${r.col10}"`].slice(0, headers.length).join(","))
    ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeReport.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Complete", description: `${activeReport.title} exported as CSV.` });
  };

  // Handle Schedule Report Submit — Persists to MySQL database
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("POST", "/api/pm/reports/schedule", {
        reportId: activeReport?.id,
        reportTitle: activeReport?.title,
        frequency: scheduleFrequency,
        recipientEmail: scheduleEmail,
      });
      setIsScheduleModalOpen(false);
      toast({
        title: "Report Scheduled Successfully",
        description: `${activeReport?.title} will be emailed ${scheduleFrequency.toLowerCase()} to ${scheduleEmail || "your registered email"}.`
      });
    } catch {
      toast({ title: "Error", description: "Failed to schedule report.", variant: "destructive" });
    }
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full">
        
        {/* VIEW 1: MASTER REPORTS DIRECTORY (Matches Capium Screenshot 1) */}
        {!selectedReportId ? (
          <div className="space-y-6">
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="text-indigo-600 dark:text-indigo-400" size={18} />
                  Practice Reports Directory
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  UK accounting compliance, client portfolios, statutory deadlines, team activity & timesheet reporting.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search Reports by title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 5 Capium-Style Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Clients Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
                      <Users size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Clients Reports</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{filteredCategories.Clients.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {filteredCategories.Clients.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">{report.title}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Tasks Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                      <CheckSquare size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Tasks Reports</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{filteredCategories.Tasks.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {filteredCategories.Tasks.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">{report.title}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Deadlines Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                      <Clock size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Deadlines Reports</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{filteredCategories.Deadlines.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {filteredCategories.Deadlines.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">{report.title}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Team Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                      <Activity size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Team & Staff Reports</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{filteredCategories.Team.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {filteredCategories.Team.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">{report.title}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Timesheets Category */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-600">
                      <FileSpreadsheet size={15} />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Timesheets & Billing</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{filteredCategories.Timesheets.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                  {filteredCategories.Timesheets.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className="w-full text-left px-4 py-3 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">{report.title}</p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-1">{report.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-sky-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: DYNAMIC DETAILED REPORT VIEWER (Matches Capium Screenshot 2) */
          <div className="space-y-4">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedReportId(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Reports Directory
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeReport?.title}</h2>
                  <p className="text-[10.5px] text-slate-400">{activeReport?.category} Category • {reportRows.length} Live Records</p>
                </div>
              </div>

              {/* Report Switcher Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {REPORT_DEFINITIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>

                <button
                  onClick={() => refetch()}
                  disabled={isLoadingReport}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Live Data"
                >
                  <RefreshCw size={13} className={isLoadingReport ? "animate-spin" : ""} />
                </button>

                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mail size={12} /> Schedule Report
                </button>
              </div>
            </div>

            {/* Filter Toolbar (Capium Style: List View / Grouping, Entity Filter, Status Filter, Export) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: View Mode Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === "list" ? "bg-white dark:bg-slate-900 text-indigo-600 font-bold shadow-xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    List View
                  </button>
                  <button
                    onClick={() => setViewMode("grouping")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      viewMode === "grouping" ? "bg-white dark:bg-slate-900 text-indigo-600 font-bold shadow-xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Grouping Summary
                  </button>
                </div>

                {/* Right: Filters & Export */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Entity Type Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium">Type:</span>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="All">All Types</option>
                      <option value="Limited">Limited Company</option>
                      <option value="Sole Trader">Sole Trader</option>
                      <option value="LLP">LLP</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Charity">Charity</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Trading">Trading / Active</option>
                      <option value="Due">Due Soon</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Dormant">Dormant</option>
                    </select>
                  </div>

                  {/* Quick Filter Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick Search..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-2.5 pr-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-32 focus:w-44 transition-all"
                    />
                  </div>

                  {/* Export Options */}
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={12} /> Export CSV
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                    title="Print Report"
                  >
                    <Printer size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode: List View Grid or Grouping Summary */}
            {viewMode === "list" ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {reportColumns.map((col: string, idx: number) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {isLoadingReport ? (
                        <tr>
                          <td colSpan={reportColumns.length || 8} className="py-8 text-center text-slate-400">
                            <RefreshCw size={18} className="animate-spin inline-block mr-2 text-indigo-600" />
                            Loading live report dataset from practice database...
                          </td>
                        </tr>
                      ) : reportRows.length === 0 ? (
                        <tr>
                          <td colSpan={reportColumns.length || 8} className="py-8 text-center text-slate-400">
                            No records match the current filter selection.
                          </td>
                        </tr>
                      ) : (
                        reportRows.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">{row.col1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{row.col2}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {row.col3}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.col4}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.col5}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                row.col6?.includes("Active") || row.col6?.includes("Trading") || row.col6?.includes("Compliant") || row.col6?.includes("Completed")
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : row.col6?.includes("Overdue") || row.col6?.includes("High")
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                {row.col6}
                              </span>
                            </td>
                            {reportColumns.length > 6 && (
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{row.col7}</td>
                            )}
                            {reportColumns.length > 7 && (
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{row.col8}</td>
                            )}
                            {reportColumns.length > 8 && (
                              <td className="py-2.5 px-3">
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <ShieldCheck size={11} /> {row.col9}
                                </span>
                              </td>
                            )}
                            {reportColumns.length > 9 && (
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">{row.col10}</td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer & Pagination */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Displaying 1 to {reportRows.length} out of {reportRows.length} Records</span>
                  <div className="flex items-center gap-1">
                    <button disabled className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">Previous</button>
                    <span className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold">1</span>
                    <button disabled className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              /* Grouping View Mode */
              <div className="space-y-4">
                {Object.entries(groupedData).map(([groupName, items]: [string, any[]]) => (
                  <div key={groupName} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-indigo-600" />
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{groupName}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {items.length} Records
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((row: any) => (
                        <div key={row.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.col2}</p>
                            <p className="text-[11px] text-slate-400">{row.col1} • {row.col4 || "Primary Detail"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 font-mono">{row.col7 || row.col5}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {row.col6}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule Report Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="text-purple-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Schedule Automated Report Dispatch</h3>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Report Name</label>
                  <input type="text" readOnly value={activeReport?.title || "Practice Report"} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Dispatch Frequency</label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Daily">Daily (Every morning at 08:00 AM)</option>
                    <option value="Weekly">Weekly (Every Monday morning)</option>
                    <option value="Monthly">Monthly (1st of each month)</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="partner@accountingfirm.co.uk"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    Confirm Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
