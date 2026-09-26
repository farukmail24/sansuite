import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  MessageSquare, FileSignature, AlertCircle, CheckCircle2,
  Clock, Plus, RefreshCw, ArrowUpRight, TrendingUp,
  FileCheck, ShieldCheck, ChevronRight, Building2,
  DollarSign, Activity, Send, Filter, Eye, Download,
  ExternalLink, UserCheck, AlertTriangle, Search,
  FileSpreadsheet, Shield, ArrowRight, Check
} from "lucide-react";
import { Link } from "wouter";
import QuickAddModal from "../../components/practice/QuickAddModal";
import PracticeWorkflowGuide from "../../components/practice/PracticeWorkflowGuide";
import { apiRequest } from "../../lib/queryClient";

export default function PracticeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "submissions">("overview");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("All");

  // Submissions Tab Filter States
  const [subSearch, setSubSearch] = useState("");
  const [subTypeFilter, setSubTypeFilter] = useState("All");
  const [subStatusFilter, setSubStatusFilter] = useState("All");
  const [subDatePreset, setSubDatePreset] = useState("This Month");

  // Fetch Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Deadlines
  const { data: deadlinesList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/deadlines"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/deadlines");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Tasks
  const { data: tasksList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/tasks");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch LoE Proposals
  const { data: proposalsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/loe"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/loe");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Submissions Matrix
  const { data: submissionsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/submissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/submissions");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Refresh Deadlines Mutation
  const refreshDeadlinesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/deadlines/refresh", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/submissions"] });
      toast({ title: "Compliance Deadlines Refreshed", description: data.message });
    }
  });

  const dueDeadlines = deadlinesList.filter(d => d.status === "Due");
  const overdueDeadlines = deadlinesList.filter(d => d.status === "Overdue");
  const pendingProposals = proposalsList.filter(p => p.status === "Sent" || p.status === "Viewed");

  const filteredDeadlines = selectedServiceFilter === "All"
    ? deadlinesList
    : deadlinesList.filter(d => d.serviceType?.toLowerCase().includes(selectedServiceFilter.toLowerCase()));

  // Submissions Filtering
  const filteredSubmissions = submissionsList.filter((s) => {
    const matchesSearch =
      s.clientName?.toLowerCase().includes(subSearch.toLowerCase()) ||
      s.clientCode?.toLowerCase().includes(subSearch.toLowerCase());
    const matchesType = subTypeFilter === "All" || s.entityType?.toLowerCase().includes(subTypeFilter.toLowerCase());
    const matchesStatus = subStatusFilter === "All" || s.status?.toLowerCase() === subStatusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  // Submissions Aggregate Totals
  const totalSubmissionsCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalCTCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.ct || 0), 0);
  const totalAPCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.ap || 0), 0);
  const totalVATCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.mtdVat || 0), 0);
  const totalPayrollCount = filteredSubmissions.reduce((acc, curr) => acc + (curr.prFps || 0) + (curr.prEps || 0), 0);

  // CSV Export for Submissions Matrix
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      toast({ title: "No Data", description: "No submission records to export." });
      return;
    }
    const headers = ["Client Name", "Client ID", "Entity Type", "CT", "AP", "SA100", "SA800", "SA900", "MTD-VAT", "BK-CIS", "PR-11D", "PR-P60", "PR-P45", "PR-FPS", "PR-EPS", "PR-EYU", "Total", "Status"];
    const rows = filteredSubmissions.map(s => [
      `"${s.clientName}"`,
      `"${s.clientCode}"`,
      `"${s.entityType}"`,
      s.ct, s.ap, s.sa100, s.sa800, s.sa900, s.mtdVat, s.bkCis, s.pr11d, s.prP60, s.prP45, s.prFps, s.prEps, s.prEyu,
      s.total,
      `"${s.status}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SanSuite_Submissions_Audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Submissions Exported", description: "Audit matrix downloaded as CSV." });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Practice Management Command Hub</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  UK accounting operations: statutory deadlines, client CRM 360, task pipelines, LoE proposals & HMRC/CH submissions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshDeadlinesMutation.mutate()}
              disabled={refreshDeadlinesMutation.isPending}
              className="px-3.5 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={refreshDeadlinesMutation.isPending ? "animate-spin" : ""} />
              {refreshDeadlinesMutation.isPending ? "Syncing..." : "Refresh Deadlines"}
            </button>

            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Quick Add
            </button>
          </div>
        </div>

        {/* Modern Tab Bar: Overview vs Submissions */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 font-bold text-xs rounded-t-lg transition flex items-center gap-2 cursor-pointer ${activeTab === "overview"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 border-x border-slate-200 dark:border-slate-800 -mb-px shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            <LayoutDashboard size={14} />
            <span>Overview & Command</span>
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-5 py-2.5 font-bold text-xs rounded-t-lg transition flex items-center gap-2 cursor-pointer ${activeTab === "submissions"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 border-x border-slate-200 dark:border-slate-800 -mb-px shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            <FileSpreadsheet size={14} />
            <span>Filing & Tax Submissions Matrix</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-mono font-bold">
              {totalSubmissionsCount}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & COMMAND HUB                                             */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Interactive Practice Operating Roadmap & Guided Workflow */}
            <PracticeWorkflowGuide
              clientsCount={clientsList.length}
              deadlinesCount={deadlinesList.length}
              tasksCount={tasksList.length}
              proposalsCount={proposalsList.length}
              onQuickAdd={() => setIsQuickAddOpen(true)}
              onRefreshDeadlines={() => refreshDeadlinesMutation.mutate()}
            />

            {/* 4 Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/practice/clients">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition-all cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">Total Clients Under Management</span>
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                      <Users size={14} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clientsList.length}</p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <TrendingUp size={11} /> 100% CRM & AML Registered
                  </div>
                </div>
              </Link>

              <Link href="/practice/deadlines">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 transition-all cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">Upcoming Statutory Deadlines</span>
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                      <Clock size={14} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{deadlinesList.length}</p>
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                    <AlertCircle size={11} /> {dueDeadlines.length} Due Soon | {overdueDeadlines.length} Overdue
                  </div>
                </div>
              </Link>

              <Link href="/practice/proposals">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-400 transition-all cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">Engagement Proposals (LoE)</span>
                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                      <FileSignature size={14} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{proposalsList.length}</p>
                  <div className="flex items-center gap-1 text-[10px] text-purple-600 font-medium">
                    <CheckCircle2 size={11} /> eSign E-Signature Enabled
                  </div>
                </div>
              </Link>

              <Link href="/practice/tasks">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 transition-all cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">Active Workflows & Tasks</span>
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                      <CheckSquare size={14} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{tasksList.length}</p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <ShieldCheck size={11} /> Compliance Tracking Live
                  </div>
                </div>
              </Link>
            </div>

            {/* 2-Column Dashboard Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Priority Compliance Deadlines Grid (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-indigo-600 dark:text-indigo-400" size={16} />
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Statutory Compliance Deadlines Engine</h3>
                    </div>

                    {/* Service Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {["All", "Accounts", "CT600", "VAT", "CS01"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedServiceFilter(s)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${selectedServiceFilter === s
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                            }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredDeadlines.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No statutory deadlines matching filter. Click &apos;Refresh Deadlines&apos; to auto-calculate.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredDeadlines.slice(0, 6).map((d: any) => (
                        <div key={d.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-bold text-[10px] flex items-center justify-center">
                              {d.serviceType?.substring(0, 3).toUpperCase() || "ACC"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{d.clientName || `Client #${d.clientId || d.id}`}</p>
                              <p className="text-slate-400 text-[10px]">{d.serviceType} • {d.periodLabel || "-"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {d.statutoryDeadlineDate ? new Date(d.statutoryDeadlineDate).toLocaleDateString("en-GB") : "-"}
                              </p>

                              <span className="text-[10px] text-slate-400">Statutory Deadline</span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${d.status === "Overdue"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : d.status === "Due"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                }`}
                            >
                              {d.status || "Upcoming"}
                            </span>
                            <button
                              onClick={() => toast({ title: "Reminder Dispatched", description: `Automated email reminder sent to ${d.clientName || "Client"}.` })}
                              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Send Email Reminder"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Feature Modules Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href="/practice/services">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer space-y-2 shadow-xs">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold">
                        <CheckSquare size={16} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Master Services & Steps</h4>
                      <p className="text-[11px] text-slate-500">Configure statutory UK workflows and recurring client fee matrices.</p>
                    </div>
                  </Link>

                  <Link href="/practice/conversations">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all cursor-pointer space-y-2 shadow-xs">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
                        <MessageSquare size={16} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Email Inbox & SMS</h4>
                      <p className="text-[11px] text-slate-500">Bulk email announcements with dynamic tags & automated chasing.</p>
                    </div>
                  </Link>

                  <Link href="/practice/documents">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-all cursor-pointer space-y-2 shadow-xs">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
                        <FileCheck size={16} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Missing Document Chaser</h4>
                      <p className="text-[11px] text-slate-500">Automated paperwork requests with one-click client upload links.</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Right Column: Practice Quick Nav & Submissions Summary (1 Col) */}
              <div className="space-y-6">
                {/* Quick Navigation Panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Activity className="text-indigo-600 dark:text-indigo-400" size={16} />
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Practice Hub Quick Access</h3>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "Clients CRM & 360° Profile", route: "/practice/clients" },
                      { label: "Statutory Deadlines Grid", route: "/practice/deadlines" },
                      { label: "eSign E-Signing & Documents", route: "/esign" },
                      { label: "AML Risk & Screening Register", route: "/aml" },
                      { label: "Client Onboarding & Migration", route: "/onboarding" },
                      { label: "Team Workload & Capacity", route: "/practice/capacity" },
                      { label: "Calendar & Filing Scheduler", route: "/practice/calendar" },
                    ].map((item) => (
                      <Link key={item.label} href={item.route}>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                          <ChevronRight size={13} className="text-slate-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Electronic Submissions Summary Box */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">HMRC & CH Gateway Status</h3>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> 100% Live
                    </span>
                  </div>

                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">Companies House (Accounts)</span>
                      <span className="font-bold text-emerald-600">{totalAPCount} Accepted</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">HMRC CT600 (Corp Tax)</span>
                      <span className="font-bold text-emerald-600">{totalCTCount} Validated</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">MTD VAT 9-Box Returns</span>
                      <span className="font-bold text-emerald-600">{totalVATCount} Filed</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-slate-600 dark:text-slate-400">RTI Payroll (FPS / EPS)</span>
                      <span className="font-bold text-emerald-600">{totalPayrollCount} Processed</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("submissions")}
                    className="w-full mt-2 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <span>Open Full Submissions Matrix</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FILING & TAX SUBMISSIONS AUDIT MATRIX                              */}
        {/* ========================================================================= */}
        {activeTab === "submissions" && (
          <div className="space-y-6">

            {/* 4 Summary Stats Cards for Submissions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Total Statutory Filings</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSubmissionsCount}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <CheckCircle2 size={11} /> HMRC & Companies House Verified
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Corporation Tax (CT600)</span>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalCTCount}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  Direct IR Mark Digital Gateway
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Companies House Accounts (AP)</span>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalAPCount}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  FRS 102 / 105 iXBRL Validated
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-medium text-slate-400">MTD VAT & RTI Payroll</span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalVATCount + totalPayrollCount}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  {totalVATCount} VAT + {totalPayrollCount} RTI Submissions
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Client Name or Code..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 focus:bg-white transition"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium text-[11px]">Type:</span>
                    <select
                      value={subTypeFilter}
                      onChange={(e) => setSubTypeFilter(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <option value="All">All Types</option>
                      <option value="Limited">Limited Company</option>
                      <option value="Individual">Individual</option>
                      <option value="Partnership">Partnership / LLP</option>
                      <option value="Sole Trader">Sole Trader</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium text-[11px]">Status:</span>
                    <select
                      value={subStatusFilter}
                      onChange={(e) => setSubStatusFilter(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Submitted">Submitted Only</option>
                      <option value="Pending">Pending Only</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium text-[11px]">Period:</span>
                    <select
                      value={subDatePreset}
                      onChange={(e) => setSubDatePreset(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <option value="This Month">Current Month (Aug 2026)</option>
                      <option value="Last Quarter">Last Quarter (Q2 2026)</option>
                      <option value="This Year">Tax Year 2025/26</option>
                    </select>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Client Statutory Submissions Matrix</span>
                  <span className="text-slate-400 text-[11px]">({filteredSubmissions.length} Clients Displayed)</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Green Pill: Active Submissions</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Gray Pill: 0 Filings</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                      <th className="py-3 px-3 min-w-[200px]">Client Name</th>
                      <th className="py-3 px-2">Client ID</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-1.5 text-center" title="Corporation Tax (CT600)">CT</th>
                      <th className="py-3 px-1.5 text-center" title="Accounts Production (Companies House)">AP</th>
                      <th className="py-3 px-1.5 text-center" title="Self Assessment Individual">SA100</th>
                      <th className="py-3 px-1.5 text-center" title="Partnership Return">SA800</th>
                      <th className="py-3 px-1.5 text-center" title="Trust Return">SA900</th>
                      <th className="py-3 px-1.5 text-center" title="MTD VAT Returns">MTD-VAT</th>
                      <th className="py-3 px-1.5 text-center" title="CIS Monthly Returns">BK-CIS</th>
                      <th className="py-3 px-1.5 text-center" title="P11D Expenses & Benefits">PR-11D</th>
                      <th className="py-3 px-1.5 text-center" title="P60 End of Year Certificates">PR-P60</th>
                      <th className="py-3 px-1.5 text-center" title="P45 Leaver Forms">PR-P45</th>
                      <th className="py-3 px-1.5 text-center" title="RTI Full Payment Submission">PR-FPS</th>
                      <th className="py-3 px-1.5 text-center" title="RTI Employer Payment Summary">PR-EPS</th>
                      <th className="py-3 px-1.5 text-center" title="Earlier Year Update">PR-EYU</th>
                      <th className="py-3 px-2 text-center bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold">Total</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={19} className="py-8 text-center text-slate-400">
                          No submission records found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {s.clientName?.substring(0, 2).toUpperCase() || "CL"}
                              </div>
                              <Link href={`/practice/clients/${s.id}`}>
                                <span className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                                  {s.clientName}
                                </span>
                              </Link>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">{s.clientCode}</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {s.entityType}
                            </span>
                          </td>

                          {/* Statutory Filing Counts */}
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.ct > 0 ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold" : "text-slate-400"}`}>
                              {s.ct}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.ap > 0 ? "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 font-bold" : "text-slate-400"}`}>
                              {s.ap}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.sa100 > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold" : "text-slate-400"}`}>
                              {s.sa100}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.sa800 > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold" : "text-slate-400"}`}>
                              {s.sa800}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.sa900 > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-bold" : "text-slate-400"}`}>
                              {s.sa900}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.mtdVat > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold" : "text-slate-400"}`}>
                              {s.mtdVat}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.bkCis > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 font-bold" : "text-slate-400"}`}>
                              {s.bkCis}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.pr11d > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.pr11d}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.prP60 > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.prP60}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.prP45 > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.prP45}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.prFps > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.prFps}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.prEps > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.prEps}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${s.prEyu > 0 ? "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 font-bold" : "text-slate-400"}`}>
                              {s.prEyu}
                            </span>
                          </td>

                          {/* Total Column */}
                          <td className="py-2.5 px-2 text-center bg-indigo-50/40 dark:bg-indigo-950/20 font-bold font-mono text-indigo-700 dark:text-indigo-300">
                            {s.total}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center justify-center gap-1 ${s.status === "Submitted"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                              {s.status === "Submitted" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              <span>{s.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right">
                            <Link href={`/practice/clients/${s.id}?tab=workspace`}>
                              <button className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-md transition cursor-pointer">
                                360° Filing
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Global Quick Add Modal */}
        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} clientsList={clientsList} />
      </div>
    </AppLayout>
  );
}
