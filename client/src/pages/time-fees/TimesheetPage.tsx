import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { timeFeesSidebar } from "./sidebar";
import {
  BarChart3, Clock, Briefcase, FileText, Settings,
  Receipt, Plus, Trash2, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, User, Users, Download,
  Filter, CheckCircle2, AlertCircle, Play, Pause,
  DollarSign, X, CheckSquare, Send, Check, XCircle, RotateCcw, Copy
} from "lucide-react";

export default function TimesheetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Status Approval Tabs: "All" | "Unsubmitted" | "PFA" | "Approved" | "Rejected"
  const [activeStatusTab, setActiveStatusTab] = useState<string>("All");

  // View Mode: "timelog" | "day" | "week"
  const [viewMode, setViewMode] = useState<"timelog" | "day" | "week">("timelog");

  // Filters
  const [clientFilter, setClientFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Week View navigation
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [newEntry, setNewEntry] = useState({
    clientId: "",
    jobId: "",
    taskName: "Annual Accounts Production",
    subtaskName: "Trial Balance Review",
    date: new Date().toISOString().split("T")[0],
    hours: "2.50",
    billable: true,
    ratePerHour: "85.00",
    costRate: "40.00",
    description: "Statutory compliance and accounting work",
  });

  // Queries
  const { data: timesheets = [], isLoading: isLoadingTimesheets } = useQuery<any[]>({
    queryKey: ["/api/time-fees/timesheets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/timesheets");
      if (!res.ok) return [];
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

  const clientJobs = jobs.filter((j: any) => j.clientId === parseInt(newEntry.clientId));

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return timesheets.filter((t: any) => {
      const matchesStatus = activeStatusTab === "All" || t.status?.toLowerCase() === activeStatusTab.toLowerCase();
      const matchesClient = clientFilter === "All" || t.clientId === parseInt(clientFilter);
      const matchesSearch = !search || 
        t.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        t.taskName?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.jobName?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesClient && matchesSearch;
    });
  }, [timesheets, activeStatusTab, clientFilter, search]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: timesheets.length,
      unsubmitted: timesheets.filter(t => t.status === "Unsubmitted" || !t.status || t.status === "Draft").length,
      pfa: timesheets.filter(t => t.status === "PFA").length,
      approved: timesheets.filter(t => t.status === "Approved").length,
      rejected: timesheets.filter(t => t.status === "Rejected").length,
    };
  }, [timesheets]);

  // Financial summary of visible records
  const summary = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, t) => sum + parseFloat(t.hours || "0"), 0);
    const billableRevenue = filteredEntries.filter(t => t.billable).reduce((sum, t) => sum + (parseFloat(t.hours || "0") * parseFloat(t.ratePerHour || "85")), 0);
    const staffCost = filteredEntries.reduce((sum, t) => sum + (parseFloat(t.hours || "0") * parseFloat(t.costRate || "40")), 0);
    const netProfit = billableRevenue - staffCost;
    const margin = billableRevenue > 0 ? ((netProfit / billableRevenue) * 100).toFixed(1) : "0.0";
    return { totalHours, billableRevenue, staffCost, netProfit, margin };
  }, [filteredEntries]);

  // Checkbox multi-select logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredEntries.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: async () => {
      if (!newEntry.clientId) throw new Error("Please select a client.");
      if (!newEntry.hours || parseFloat(newEntry.hours) <= 0) throw new Error("Hours must be greater than 0.");
      const res = await apiRequest("POST", "/api/time-fees/timesheets", newEntry);
      if (!res.ok) throw new Error("Failed to create timesheet entry.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({ title: "Time Recorded", description: "Timesheet entry logged successfully." });
      setIsRecordModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Validation Error", description: err.message, type: "error" });
    }
  });

  const submitPfaMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/submit-pfa", { ids });
      if (!res.ok) throw new Error("Failed to submit timesheets");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Submitted for Approval", description: data.message });
      setSelectedIds([]);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/approve", { ids });
      if (!res.ok) throw new Error("Failed to approve timesheets");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({ title: "Timesheets Approved", description: data.message });
      setSelectedIds([]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[], reason: string }) => {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/reject", { ids, reason });
      if (!res.ok) throw new Error("Failed to reject timesheets");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Timesheets Rejected", description: data.message });
      setSelectedIds([]);
      setIsRejectModalOpen(false);
      setRejectReason("");
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/withdraw", { ids });
      if (!res.ok) throw new Error("Failed to withdraw timesheets");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Status Reverted", description: data.message });
      setSelectedIds([]);
    }
  });

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time-fees/timesheets/copy-week", { 
        currentWeekDate: currentWeekStart.toISOString() 
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to copy tasks.");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Week Tasks Copied", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Notice", description: err.message, type: "error" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/time-fees/timesheets/${id}`);
      if (!res.ok) throw new Error("Failed to delete entry.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({ title: "Entry Deleted", description: "Timesheet entry removed." });
    }
  });

  // Week days calculation
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50/60 min-h-screen">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Time &amp; Fees</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">Timesheets &amp; Approval Engine</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode("timelog")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "timelog" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Timelog
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "day" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "week" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Week Matrix
              </button>
            </div>

            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Log Time
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                <Clock className="text-indigo-600" size={26} />
                Staff Time Records &amp; Approvals
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Log chargeable client hours, submit for manager approval (PFA), and monitor team gross margins.
              </p>
            </div>

            {/* Financial Summary Badges */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Hours</span>
                <span className="font-bold text-slate-900">{summary.totalHours.toFixed(2)}h</span>
              </div>
              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Billable Value</span>
                <span className="font-bold text-emerald-600">£{summary.billableRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-3 py-1 bg-white rounded-lg border border-slate-200/80 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Staff Cost</span>
                <span className="font-bold text-slate-600">£{summary.staffCost.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100 text-xs">
                <span className="text-indigo-600 block text-[10px] uppercase font-bold">Profit Margin</span>
                <span className="font-bold text-indigo-900">{summary.margin}%</span>
              </div>
            </div>
          </div>

          {/* 4-Stage Approval Workflow Tab Navigation (Capium Articles 9000235910 & 9000235915) */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "All", label: "All Records", count: statusCounts.all },
                { id: "Unsubmitted", label: "Unsubmitted (Draft)", count: statusCounts.unsubmitted },
                { id: "PFA", label: "Pending Approval (PFA)", count: statusCounts.pfa },
                { id: "Approved", label: "Approved", count: statusCounts.approved },
                { id: "Rejected", label: "Rejected", count: statusCounts.rejected },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveStatusTab(tab.id); setSelectedIds([]); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeStatusTab === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeStatusTab === tab.id ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search timesheets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-white w-48"
              />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="text-xs font-semibold p-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="All">All Clients</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.clientName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Action Controls Toolbar (Shown when rows are selected) */}
          {selectedIds.length > 0 && (
            <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-150 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckSquare size={16} className="text-indigo-400" />
                <span>{selectedIds.length} entry/entries selected</span>
              </div>

              <div className="flex items-center gap-2">
                {activeStatusTab === "Unsubmitted" && (
                  <button
                    onClick={() => submitPfaMutation.mutate(selectedIds)}
                    disabled={submitPfaMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} /> Submit for Approval
                  </button>
                )}

                {activeStatusTab === "PFA" && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(selectedIds)}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={13} /> Bulk Approve
                    </button>
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                )}

                {activeStatusTab === "Approved" && (
                  <button
                    onClick={() => withdrawMutation.mutate(selectedIds)}
                    disabled={withdrawMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Withdraw Approval
                  </button>
                )}

                {activeStatusTab === "Rejected" && (
                  <button
                    onClick={() => withdrawMutation.mutate(selectedIds)}
                    disabled={withdrawMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Withdraw Rejection
                  </button>
                )}

                <button
                  onClick={() => setSelectedIds([])}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: TIMELOG TABLE VIEW */}
          {viewMode === "timelog" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={filteredEntries.length > 0 && selectedIds.length === filteredEntries.length}
                          className="rounded-sm border-slate-300 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Job / Task</th>
                      <th className="py-3 px-4">Staff</th>
                      <th className="py-3 px-4 text-center">Hours</th>
                      <th className="py-3 px-4 text-right">Rate / Cost</th>
                      <th className="py-3 px-4 text-center">Billable</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingTimesheets ? (
                      <tr><td colSpan={10} className="py-12 text-center text-slate-400 font-medium">Loading timesheets...</td></tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <Clock className="mx-auto text-slate-300" size={32} />
                            <h3 className="text-sm font-bold text-slate-800">No Timesheet Records Found</h3>
                            <p className="text-xs text-slate-500">
                              No time entries matching status '{activeStatusTab}'. Use the button below to log your chargeable hours.
                            </p>
                            <button
                              onClick={() => setIsRecordModalOpen(true)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              + Log Billable Time
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((t: any) => {
                        const isSelected = selectedIds.includes(t.id);
                        return (
                          <tr key={t.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                            <td className="py-3.5 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectOne(t.id)}
                                className="rounded-sm border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {t.date ? new Date(t.date).toLocaleDateString("en-GB") : "—"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {t.clientName || "General Practice"}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800">{t.taskName || "General Task"}</div>
                              {t.jobName && <div className="text-[10px] text-indigo-600 font-bold">Job: {t.jobName}</div>}
                              {t.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              {t.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : "Current User"}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-900">
                              {parseFloat(t.hours || "0").toFixed(2)}h
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              <span className="text-emerald-700 font-bold">£{parseFloat(t.ratePerHour || "85").toFixed(2)}/h</span>
                              <span className="text-slate-400 block text-[10px]">Cost: £{parseFloat(t.costRate || "40").toFixed(2)}/h</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {t.billable ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">Billable</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">Non-billable</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                t.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                t.status === "PFA" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                t.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                t.status === "Billed" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {t.status || "Unsubmitted"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {(!t.status || t.status === "Unsubmitted") && (
                                  <button
                                    onClick={() => submitPfaMutation.mutate([t.id])}
                                    title="Submit for Approval"
                                    className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md cursor-pointer"
                                  >
                                    <Send size={14} />
                                  </button>
                                )}
                                {t.status === "PFA" && (
                                  <>
                                    <button
                                      onClick={() => approveMutation.mutate([t.id])}
                                      title="Approve"
                                      className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md cursor-pointer"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => { setSelectedIds([t.id]); setIsRejectModalOpen(true); }}
                                      title="Reject"
                                      className="p-1 hover:bg-rose-50 text-rose-600 rounded-md cursor-pointer"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </>
                                )}
                                {(t.status === "Approved" || t.status === "Rejected") && (
                                  <button
                                    onClick={() => withdrawMutation.mutate([t.id])}
                                    title="Withdraw Status"
                                    className="p-1 hover:bg-amber-50 text-amber-600 rounded-md cursor-pointer"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteMutation.mutate(t.id)}
                                  title="Delete entry"
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: WEEK MATRIX VIEW (Capium Article 9000235910 - Copy Previous Week) */}
          {viewMode === "week" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              {/* Week navigation & Copy action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date(currentWeekStart);
                      d.setDate(d.getDate() - 7);
                      setCurrentWeekStart(d);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-800">
                    Week of {currentWeekStart.toLocaleDateString("en-GB")} — {weekDays[6].toLocaleDateString("en-GB")}
                  </span>
                  <button
                    onClick={() => {
                      const d = new Date(currentWeekStart);
                      d.setDate(d.getDate() + 7);
                      setCurrentWeekStart(d);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyWeekMutation.mutate()}
                    disabled={copyWeekMutation.isPending}
                    className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Copy size={14} /> Copy Tasks from Previous Week
                  </button>
                  <button
                    onClick={() => setIsRecordModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Add Time
                  </button>
                </div>
              </div>

              {/* Day Columns */}
              <div className="grid grid-cols-7 gap-3">
                {weekDays.map((day, idx) => {
                  const dayStr = day.toISOString().split("T")[0];
                  const dayEntries = timesheets.filter((t: any) => {
                    const tStr = t.date ? new Date(t.date).toISOString().split("T")[0] : "";
                    return tStr === dayStr;
                  });
                  const dayTotal = dayEntries.reduce((sum, t) => sum + parseFloat(t.hours || "0"), 0);
                  const isToday = dayStr === new Date().toISOString().split("T")[0];

                  return (
                    <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between min-h-[220px] ${
                      isToday ? 'bg-indigo-50/30 border-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50/50 border-slate-200'
                    }`}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-bold text-slate-700">
                            {day.toLocaleDateString("en-GB", { weekday: "short" })}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {day.getDate()}
                          </span>
                        </div>

                        {dayEntries.length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-slate-400">No time logged</div>
                        ) : (
                          <div className="space-y-1.5">
                            {dayEntries.map((t: any) => (
                              <div key={t.id} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-0.5 text-[11px]">
                                <div className="font-bold text-slate-800 truncate">{t.clientName}</div>
                                <div className="text-slate-500 truncate">{t.taskName}</div>
                                <div className="flex justify-between items-center pt-1 font-mono">
                                  <span className="font-bold text-indigo-700">{parseFloat(t.hours).toFixed(1)}h</span>
                                  <span className="text-[9px] text-slate-400 uppercase">{t.status || 'Draft'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Total:</span>
                        <span className="text-slate-900 font-mono">{dayTotal.toFixed(1)}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: DAY VIEW */}
          {viewMode === "day" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Daily Detailed View — {new Date().toLocaleDateString("en-GB", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setIsRecordModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Add Today's Time
                </button>
              </div>

              {timesheets.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No time logged for today yet. Use "+ Add Today's Time" or the Live Timer on Dashboard.
                </div>
              ) : (
                <div className="space-y-3">
                  {timesheets.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).map(t => (
                    <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{t.clientName}</div>
                        <div className="text-xs text-slate-600">{t.taskName} — {t.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-indigo-700">{parseFloat(t.hours).toFixed(2)}h</div>
                        <div className="text-xs text-emerald-600 font-semibold">£{(parseFloat(t.hours) * parseFloat(t.ratePerHour || "85")).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL: RECORD TIME */}
        {isRecordModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Clock size={16} className="text-indigo-400" />
                  Log Billable Time Entry
                </h3>
                <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Client *</label>
                  <select
                    value={newEntry.clientId}
                    onChange={(e) => setNewEntry({ ...newEntry, clientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Associated Job (Optional)</label>
                  <select
                    value={newEntry.jobId}
                    onChange={(e) => setNewEntry({ ...newEntry, jobId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Standalone Client Work --</option>
                    {clientJobs.map((j: any) => (
                      <option key={j.id} value={j.id}>{j.jobName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Task Category</label>
                    <input
                      type="text"
                      value={newEntry.taskName}
                      onChange={(e) => setNewEntry({ ...newEntry, taskName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Date *</label>
                    <input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Hours *</label>
                    <input
                      type="number"
                      step="0.25"
                      value={newEntry.hours}
                      onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Bill Rate (£)</label>
                    <input
                      type="number"
                      value={newEntry.ratePerHour}
                      onChange={(e) => setNewEntry({ ...newEntry, ratePerHour: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Cost Rate (£)</label>
                    <input
                      type="number"
                      value={newEntry.costRate}
                      onChange={(e) => setNewEntry({ ...newEntry, costRate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Work Description</label>
                  <textarea
                    rows={2}
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                    placeholder="Provide details about tasks performed..."
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="billableCheck"
                    checked={newEntry.billable}
                    onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                    className="rounded-sm border-slate-300"
                  />
                  <label htmlFor="billableCheck" className="font-bold text-slate-700 cursor-pointer">
                    Chargeable / Billable to Client
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createEntryMutation.mutate()}
                  disabled={createEntryMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  {createEntryMutation.isPending ? "Saving..." : "Save Time Entry"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REJECT REASON */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm">Reject Selected Timesheets</h3>
                <button onClick={() => setIsRejectModalOpen(false)} className="text-rose-200 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-3 text-xs">
                <p className="text-slate-600">Please provide a reason for rejecting the selected {selectedIds.length} timesheet(s):</p>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Hours exceeded budget; please revise description"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 rounded-xl text-xs text-slate-600 cursor-pointer">Cancel</button>
                <button 
                  onClick={() => rejectMutation.mutate({ ids: selectedIds, reason: rejectReason })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
