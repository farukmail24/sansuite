import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useStopwatch } from "../../hooks/useStopwatch";
import { timeFeesSidebar } from "./sidebar";
import { 
  Briefcase, BarChart3, Clock, Settings, FileText, Plus, X, Calendar, 
  Search, User, Receipt, TrendingUp, CheckCircle2, AlertCircle, 
  ChevronRight, ArrowRight, MessageSquare, Paperclip, Mail, Repeat, 
  Activity, CheckSquare, Edit3, Trash2, Layers, ChevronLeft, Play, Send, Sparkles
} from "lucide-react";

export default function JobsListPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const stopwatch = useStopwatch();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<string>("details");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // View Mode: "list" | "calendar" (Phase 4.1)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Quick Log Time Modal inside Job Workspace (Phase 4.2)
  const [showQuickLogTime, setShowQuickLogTime] = useState(false);
  const [quickLogEntry, setQuickLogEntry] = useState({
    subtaskName: "",
    hours: "1.00",
    date: new Date().toISOString().split("T")[0],
    description: "",
    billable: true,
  });

  // Email Composer State in Job Workspace (Phase 4.3)
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Staff rates for dynamic rate propagation (Phase 2.3)
  const { data: staffRates = [] } = useQuery<any[]>({
    queryKey: ["/api/time-fees/manage/staff-rates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/manage/staff-rates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const currentUserRate = useMemo(() => {
    if (!user?.id || !staffRates.length) return null;
    return staffRates.find((s: any) => s.userId === user.id);
  }, [user, staffRates]);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    clientId: "",
    jobName: "",
    description: "",
    feeType: "Hourly",
    taskType: "Accounting & Compliance",
    budget: "1200.00",
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    estimatedHours: "15.00",
    assignedTo: ""
  });

  // Queries
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<any[]>({
    queryKey: ["/api/time-fees/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/jobs");
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

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/my-admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/my-admin/users");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Selected Job Details Query
  const { data: selectedJobData, isLoading: isLoadingJobDetails } = useQuery<any>({
    queryKey: ["/api/time-fees/jobs", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const res = await apiRequest("GET", `/api/time-fees/jobs/${selectedJobId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedJobId,
  });

  // Job Invoices Query (Phase 4.3)
  const { data: jobInvoices = [], isLoading: isLoadingJobInvoices } = useQuery<any[]>({
    queryKey: ["/api/time-fees/jobs", selectedJobId, "invoices"],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const res = await apiRequest("GET", `/api/time-fees/jobs/${selectedJobId}/invoices`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedJobId && activeJobTab === "invoices",
  });

  // Filtered jobs
  const filteredJobs = jobs.filter((j: any) => {
    const matchesStatus = statusFilter === "All" || j.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = !search || 
      j.jobName?.toLowerCase().includes(search.toLowerCase()) || 
      j.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      j.taskType?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Dynamic Month Calendar Grid calculation (Phase 4.1)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as day 0
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const days = [];
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= (remaining > 7 ? remaining - 7 : remaining); i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  // Comments state inside Job Details
  const [newComment, setNewComment] = useState("");

  // Stopwatch action (Phase 4.2)
  const handleStartTimerForJob = () => {
    if (!selectedJobData?.job) return;
    stopwatch.updateDetails({
      clientId: selectedJobData.job.clientId,
      clientName: selectedJobData.client?.clientName,
      jobId: selectedJobData.job.id,
      jobName: selectedJobData.job.jobName,
      taskName: selectedJobData.job.taskType || "General Practice",
    });
    stopwatch.start();
    stopwatch.setOpen(true);
    stopwatch.setMinimized(false);
    toast({
      title: "Timer Started",
      description: `Live stopwatch running for ${selectedJobData.job.jobName}`,
    });
  };

  // Quick Log Time Mutation (Phase 4.2)
  const quickLogTimeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobData?.job || !quickLogEntry.hours) {
        throw new Error("Hours are required");
      }
      const payload = {
        practiceId: selectedJobData.job.practiceId,
        clientId: selectedJobData.job.clientId,
        jobId: selectedJobData.job.id,
        taskName: selectedJobData.job.taskType || "General Practice",
        subtaskName: quickLogEntry.subtaskName || "General Deliverable",
        date: quickLogEntry.date,
        hours: quickLogEntry.hours,
        billable: quickLogEntry.billable,
        ratePerHour: currentUserRate?.billableRatePerHour || "75.00",
        costRate: currentUserRate?.costRatePerHour || "35.00",
        description: quickLogEntry.description || `Work dedicated to ${selectedJobData.job.jobName}`,
        status: "Unsubmitted",
      };
      const res = await apiRequest("POST", "/api/time-fees/timesheets", payload);
      if (!res.ok) throw new Error("Failed to log time");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      setShowQuickLogTime(false);
      setQuickLogEntry({
        subtaskName: "",
        hours: "1.00",
        date: new Date().toISOString().split("T")[0],
        description: "",
        billable: true,
      });
      toast({ title: "Time Recorded", description: "Timelog saved to job and timesheet." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Send Email Mutation (Phase 4.3)
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId || !emailSubject.trim() || !emailBody.trim()) {
        throw new Error("Subject and Message body are required");
      }
      const res = await apiRequest("POST", `/api/time-fees/jobs/${selectedJobId}/email`, {
        to: emailTo || selectedJobData?.client?.email || "client@example.com",
        subject: emailSubject,
        body: emailBody,
      });
      if (!res.ok) throw new Error("Failed to send correspondence");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs", selectedJobId] });
      setEmailSubject("");
      setEmailBody("");
      toast({ title: "Email Dispatched", description: "Client correspondence recorded to job file." });
    },
    onError: (err: any) => {
      toast({ title: "Email Error", description: err.message, variant: "destructive" });
    },
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!newJob.clientId || !newJob.jobName) throw new Error("Client and Job Name are required.");
      const res = await apiRequest("POST", "/api/time-fees/jobs", newJob);
      if (!res.ok) throw new Error("Failed to create job.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({ title: "Job Created", description: "New job created successfully." });
      setShowAddModal(false);
      setNewJob({
        clientId: "",
        jobName: "",
        description: "",
        feeType: "Hourly",
        taskType: "Accounting & Compliance",
        budget: "1200.00",
        startDate: new Date().toISOString().split('T')[0],
        targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedHours: "15.00",
        assignedTo: ""
      });
    },
    onError: (err: any) => {
      toast({ title: "Validation Error", description: err.message, type: "error" });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!newComment.trim() || !selectedJobId) return;
      const res = await apiRequest("POST", `/api/time-fees/jobs/${selectedJobId}/comment`, { comment: newComment.trim() });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs", selectedJobId] });
      setNewComment("");
      toast({ title: "Comment Posted", description: "Internal job note added." });
    }
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/time-fees/jobs/${id}`, { status });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/jobs", selectedJobId] });
      toast({ title: "Status Updated", description: "Job status modified." });
    }
  });

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50/60 min-h-screen">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Time &amp; Fees</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">Jobs Management</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Job
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                <Briefcase className="text-indigo-600" size={26} />
                Client Jobs &amp; Engagement Tracking
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Monitor client projects, fee budgets, planned hours versus actual timelogs, and return on investment (ROI).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Switcher: List vs Calendar (Phase 4.1) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "list" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers size={13} /> List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "calendar" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Calendar size={13} /> Calendar View
                </button>
              </div>

              <input
                type="text"
                placeholder="Search jobs or clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-white w-52 font-semibold"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold p-2 rounded-xl border border-slate-200 bg-white cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          {/* Conditional Rendering: Calendar View vs List View */}
          {viewMode === "calendar" ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-slate-800">
                    {calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {filteredJobs.length} Jobs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      today.setDate(1);
                      setCalendarMonth(today);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 7 Day Header */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="bg-slate-50 py-2 text-xs font-bold uppercase text-slate-500 tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                {calendarDays.map((cell, idx) => {
                  const dateStr = cell.date.toISOString().split("T")[0];
                  const dayJobs = filteredJobs.filter((j: any) => {
                    if (!j.startDate && !j.targetEndDate) return false;
                    const start = j.startDate ? String(j.startDate).split("T")[0] : null;
                    const end = j.targetEndDate ? String(j.targetEndDate).split("T")[0] : null;
                    if (start === dateStr || end === dateStr) return true;
                    if (start && end && dateStr >= start && dateStr <= end) return true;
                    return false;
                  });

                  const isToday = new Date().toISOString().split("T")[0] === dateStr;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors ${
                        cell.isCurrentMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
                      } ${isToday ? "ring-2 ring-indigo-500 ring-inset" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? "bg-indigo-600 text-white" : cell.isCurrentMonth ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        {dayJobs.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            {dayJobs.length} job{dayJobs.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-24 flex-1">
                        {dayJobs.slice(0, 3).map((j: any) => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                              setSelectedJobId(j.id);
                              setActiveJobTab("details");
                            }}
                            className={`w-full text-left p-1 rounded border text-[10px] font-semibold truncate block cursor-pointer transition-all ${
                              j.status === "Completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : j.status === "In Progress"
                                ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                                : j.status === "On Hold"
                                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
                            }`}
                          >
                            <span className="font-bold">{j.jobName}</span>
                            <span className="text-[9px] opacity-75 block truncate">
                              {j.clientName || "General Client"}
                            </span>
                          </button>
                        ))}
                        {dayJobs.length > 3 && (
                          <span className="text-[10px] text-slate-400 block text-center font-semibold">
                            +{dayJobs.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Job Details</th>
                    <th className="py-3 px-5">Client</th>
                    <th className="py-3 px-5">Fee Type</th>
                    <th className="py-3 px-5">Budget</th>
                    <th className="py-3 px-5">Hours (Actual / Est)</th>
                    <th className="py-3 px-5 text-center">ROI</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingJobs ? (
                    <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading jobs list...</td></tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <Briefcase className="mx-auto text-slate-300" size={32} />
                          <h3 className="text-sm font-bold text-slate-800">No Jobs Found</h3>
                          <p className="text-xs text-slate-500">
                            No jobs registered under this filter. Create your first client job to track timelogs and profitability.
                          </p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            + Add New Job
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j: any) => {
                      const estHours = parseFloat(j.estimatedHours || "1");
                      const actualHours = parseFloat(j.actualHours || "0");
                      const progressPct = Math.min(100, Math.round((actualHours / (estHours || 1)) * 100));

                      return (
                        <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-5">
                            <button
                              onClick={() => { setSelectedJobId(j.id); setActiveJobTab("details"); }}
                              className="font-bold text-slate-900 hover:text-indigo-600 text-left block text-sm cursor-pointer"
                            >
                              {j.jobName}
                            </button>
                            <span className="text-[11px] text-slate-500">{j.taskType || "Accounting Work"}</span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {j.clientName || "Unassigned"}
                          </td>
                          <td className="py-4 px-5">
                            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                              {j.feeType || "Hourly"}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono font-bold text-slate-900">
                            £{parseFloat(j.budget || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                              <span className="font-bold text-slate-800">{actualHours.toFixed(1)}h</span>
                              <span className="text-slate-400">/ {estHours.toFixed(1)}h ({progressPct}%)</span>
                            </div>
                            <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${actualHours > estHours ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${progressPct}%` }} 
                              />
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center font-bold font-mono">
                            <span className={parseFloat(j.roi || "0") >= 0 ? "text-emerald-700" : "text-rose-700"}>
                              {parseFloat(j.roi || "0") >= 0 ? "+" : ""}{j.roi || "0.0"}%
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              j.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              j.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              j.status === "On Hold" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}>
                              {j.status || "Active"}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <button
                              onClick={() => { setSelectedJobId(j.id); setActiveJobTab("details"); }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              Workspace <ChevronRight size={13} />
                            </button>
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
      </div>

        {/* ========================================================================= */}
        {/* 8-TAB JOB DETAILS WORKSPACE MODAL (Capium Article 9000235917 Specification) */}
        {/* ========================================================================= */}
        {selectedJobId && selectedJobData && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 my-6 max-h-[90vh] flex flex-col animate-in fade-in duration-150">
              {/* Modal Top Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      {selectedJobData.job.jobName}
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-normal px-2 py-0.5 rounded-md border border-slate-700">
                        {selectedJobData.job.feeType}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Client: <strong>{selectedJobData.client?.clientName || 'General'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickLogTime(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Clock size={13} />
                    Log Time
                  </button>
                  <button
                    type="button"
                    onClick={handleStartTimerForJob}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Play size={13} />
                    Start Timer
                  </button>

                  <select
                    value={selectedJobData.job.status || "Active"}
                    onChange={(e) => updateJobStatusMutation.mutate({ id: selectedJobId, status: e.target.value })}
                    className="bg-slate-800 text-white border border-slate-700 text-xs font-bold p-1.5 rounded-lg cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>

                  <button 
                    onClick={() => setSelectedJobId(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* 8-Tab Navigation Bar */}
              <div className="flex border-b border-slate-200 bg-slate-50/80 overflow-x-auto shrink-0 px-4">
                {[
                  { id: "details", label: "Details & ROI", icon: <Briefcase size={14} /> },
                  { id: "timelogs", label: `Timelogs (${selectedJobData.timelogs?.length || 0})`, icon: <Clock size={14} /> },
                  { id: "invoices", label: `Invoices & WIP (${selectedJobData.invoices?.length || 0})`, icon: <FileText size={14} /> },
                  { id: "recurring", label: "Recurring", icon: <Repeat size={14} /> },
                  { id: "email", label: "Email", icon: <Mail size={14} /> },
                  { id: "files", label: "Files", icon: <Paperclip size={14} /> },
                  { id: "comments", label: `Comments (${selectedJobData.comments?.length || 0})`, icon: <MessageSquare size={14} /> },
                  { id: "activity", label: "Activity", icon: <Activity size={14} /> },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveJobTab(t.id)}
                    className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      activeJobTab === t.id
                        ? "border-indigo-600 text-indigo-700 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Modal Body Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
                {/* 1. DETAILS & ROI */}
                {activeJobTab === "details" && (
                  <div className="space-y-6">
                    {/* ROI Summary Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block uppercase font-bold text-[10px]">Fee Budget</span>
                        <span className="text-xl font-bold text-slate-900 font-mono">£{parseFloat(selectedJobData.job.budget || "0").toFixed(2)}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Hours Logged</span>
                        <span className="text-xl font-bold text-slate-900 font-mono">
                          {selectedJobData.timelogs?.reduce((sum: number, t: any) => sum + parseFloat(t.hours || "0"), 0).toFixed(2)}h
                        </span>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-700 block uppercase font-bold text-[10px]">Estimated Profit Margin (ROI)</span>
                        <span className="text-xl font-bold text-emerald-800 font-mono">
                          +{selectedJobData.job.roi || '42.5'}%
                        </span>
                      </div>
                    </div>

                    {/* Subtasks Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckSquare size={15} className="text-indigo-600" />
                          Subtasks Breakdown
                        </h4>
                        <span className="text-slate-400 font-mono text-[11px]">3 Standard Deliverables</span>
                      </div>

                      <div className="space-y-2">
                        {((selectedJobData.job.subtasksJson as any[]) || []).map((st: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800">{st.name}</span>
                                <span className="text-slate-400 block text-[10px]">Rate: £{st.billableRate}/h • Cost: £{st.costRate}/h</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-700">{st.estimatedHours}h</span>
                              <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                {st.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TIMELOGS */}
                {activeJobTab === "timelogs" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-bold text-slate-800">Hours Dedicated to this Job</h4>
                      <button
                        onClick={() => navigate("/time-fees/timesheets")}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        + Log Time to Job
                      </button>
                    </div>

                    {selectedJobData.timelogs?.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">No time recorded against this job yet.</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Task</th>
                            <th className="py-2.5 px-3">Hours</th>
                            <th className="py-2.5 px-3">Rate</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedJobData.timelogs.map((t: any) => (
                            <tr key={t.id}>
                              <td className="py-2.5 px-3 font-mono">{new Date(t.date).toLocaleDateString("en-GB")}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{t.taskName}</td>
                              <td className="py-2.5 px-3 font-mono font-bold">{parseFloat(t.hours).toFixed(2)}h</td>
                              <td className="py-2.5 px-3 font-mono">£{parseFloat(t.ratePerHour || "85").toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {t.status || 'Draft'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 3. INVOICES (Phase 4.3) */}
                {activeJobTab === "invoices" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Job Invoices &amp; Realizations</h4>
                        <p className="text-[11px] text-slate-500">Invoices billed against this client job</p>
                      </div>
                      <button
                        onClick={() => navigate("/time-fees/invoices")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        Bill from WIP
                      </button>
                    </div>

                    {isLoadingJobInvoices ? (
                      <div className="py-8 text-center text-slate-400">Loading job invoices...</div>
                    ) : (jobInvoices || []).length === 0 ? (
                      <div className="py-10 text-center text-slate-400 space-y-2">
                        <FileText className="mx-auto text-slate-300" size={28} />
                        <p>No invoices generated for this client job yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {jobInvoices.map((inv: any) => (
                          <div key={inv.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                              <span className="text-slate-400 block text-[10px]">
                                {inv.date ? new Date(inv.date).toLocaleDateString("en-GB") : "-"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 block">
                                £{parseFloat(inv.totalAmount || "0").toFixed(2)}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {inv.status || 'Issued'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. RECURRING */}
                {activeJobTab === "recurring" && (
                  <div className="space-y-4 max-w-lg">
                    <h4 className="text-sm font-bold text-slate-800">Job Recurrence Schedule</h4>
                    <p className="text-slate-500">Configure automated job renewal so your practice never misses an annual or quarterly compliance deadline.</p>
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Recurrence Interval</label>
                        <select className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold">
                          <option value="none">One-off Job (No recurrence)</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly (Annual Accounts / CT600)</option>
                        </select>
                      </div>
                      <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer">
                        Save Recurrence Setting
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. EMAIL (Phase 4.3) */}
                {activeJobTab === "email" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Mail size={16} className="text-indigo-600" />
                        Client Correspondence &amp; Job Email Log
                      </h4>
                      <span className="text-xs text-slate-400">
                        {((selectedJobData.job.emailsJson as any[]) || []).length} Recorded Email(s)
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">To Email</label>
                          <input
                            type="email"
                            placeholder={selectedJobData.client?.email || "accounts@client.co.uk"}
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Request for Statutory Bank Statements"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Message Body</label>
                        <textarea
                          rows={3}
                          placeholder="Compose correspondence to be dispatched and recorded in job file..."
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => sendEmailMutation.mutate()}
                          disabled={sendEmailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send size={13} />
                          {sendEmailMutation.isPending ? "Sending..." : "Dispatch & Record"}
                        </button>
                      </div>
                    </div>

                    {/* Email Correspondence Log */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-700 text-xs">Correspondence History</h5>
                      {((selectedJobData.job.emailsJson as any[]) || []).length === 0 ? (
                        <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                          No correspondence recorded for this job yet.
                        </div>
                      ) : (
                        ((selectedJobData.job.emailsJson as any[]) || []).map((em: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{em.subject}</span>
                              <span className="text-[10px] text-slate-400">
                                {em.sentAt ? new Date(em.sentAt).toLocaleString("en-GB") : "-"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>To: <strong>{em.to}</strong></span>
                              <span>•</span>
                              <span>By: {em.sentBy || "Staff"}</span>
                            </div>
                            <p className="text-slate-700 text-xs pt-1 whitespace-pre-wrap">{em.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 6. FILES */}
                {activeJobTab === "files" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Attached Workpapers &amp; Documents</h4>
                    <div className="border-2 border-dashed border-slate-200 p-8 rounded-xl text-center space-y-2">
                      <Paperclip className="mx-auto text-slate-400" size={24} />
                      <p className="text-slate-500">Drag and drop trial balance workpapers or invoices here</p>
                      <button className="text-indigo-600 font-bold hover:underline cursor-pointer">Browse files</button>
                    </div>
                  </div>
                )}

                {/* 7. COMMENTS */}
                {activeJobTab === "comments" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Internal Accountant Collaboration Notes</h4>
                    <div className="space-y-3">
                      {((selectedJobData.comments as any[]) || []).length === 0 ? (
                        <div className="py-6 text-center text-slate-400">No comments posted yet.</div>
                      ) : (
                        selectedJobData.comments.map((c: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex justify-between items-center font-bold text-slate-800">
                              <span>{c.userName}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{new Date(c.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-600">{c.comment}</p>
                          </div>
                        ))
                      )}

                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Type internal note for team..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addCommentMutation.mutate(); }}
                          className="flex-1 p-2.5 rounded-xl border border-slate-300"
                        />
                        <button
                          onClick={() => addCommentMutation.mutate()}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                        >
                          Post Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. ACTIVITY */}
                {activeJobTab === "activity" && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Job Audit Trail</h4>
                    <div className="space-y-2">
                      {((selectedJobData.activity as any[]) || []).map((act: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md mt-0.5"><Activity size={13} /></div>
                          <div>
                            <span className="font-bold text-slate-800 block">{act.action}</span>
                            <span className="text-slate-500">{act.details} • {act.user}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD JOB */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Briefcase size={16} className="text-indigo-400" />
                  Create New Client Job
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Client *</label>
                  <select
                    value={newJob.clientId}
                    onChange={(e) => setNewJob({ ...newJob, clientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Job Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Accounts & CT600 FY2025"
                    value={newJob.jobName}
                    onChange={(e) => setNewJob({ ...newJob, jobName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Fee Type</label>
                    <select
                      value={newJob.feeType}
                      onChange={(e) => setNewJob({ ...newJob, feeType: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                    >
                      <option value="Hourly">Hourly Charge-out</option>
                      <option value="Fixed">Fixed Price</option>
                      <option value="Recurring">Recurring Retainer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Fee Budget (£)</label>
                    <input
                      type="number"
                      value={newJob.budget}
                      onChange={(e) => setNewJob({ ...newJob, budget: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newJob.startDate}
                      onChange={(e) => setNewJob({ ...newJob, startDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Target End Date</label>
                    <input
                      type="date"
                      value={newJob.targetEndDate}
                      onChange={(e) => setNewJob({ ...newJob, targetEndDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      value={newJob.estimatedHours}
                      onChange={(e) => setNewJob({ ...newJob, estimatedHours: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Assign To Staff</label>
                    <select
                      value={newJob.assignedTo}
                      onChange={(e) => setNewJob({ ...newJob, assignedTo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                    >
                      <option value="">Current User</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createJobMutation.mutate()}
                  disabled={createJobMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  {createJobMutation.isPending ? "Creating..." : "Create Job"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* QUICK LOG TIME MODAL (Phase 4.2) */}
        {showQuickLogTime && selectedJobData?.job && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Clock size={16} />
                  Log Time: {selectedJobData.job.jobName}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickLogTime(false)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtask / Deliverable</label>
                  <select
                    value={quickLogEntry.subtaskName}
                    onChange={(e) => setQuickLogEntry({ ...quickLogEntry, subtaskName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- General Deliverable --</option>
                    {((selectedJobData.job.subtasksJson as any[]) || []).map((st: any, i: number) => (
                      <option key={i} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={quickLogEntry.date}
                      onChange={(e) => setQuickLogEntry({ ...quickLogEntry, date: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={quickLogEntry.hours}
                      onChange={(e) => setQuickLogEntry({ ...quickLogEntry, hours: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div>
                    <span className="text-[11px] font-bold text-purple-900 block">Personal Rate Card</span>
                    <span className="text-[10px] text-purple-700">
                      £{currentUserRate?.billableRatePerHour || "75.00"}/hr billable • £{currentUserRate?.costRatePerHour || "35.00"}/hr cost
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-purple-900 text-xs">
                    <input
                      type="checkbox"
                      checked={quickLogEntry.billable}
                      onChange={(e) => setQuickLogEntry({ ...quickLogEntry, billable: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Billable
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Description</label>
                  <textarea
                    rows={2}
                    placeholder="Work details completed..."
                    value={quickLogEntry.description}
                    onChange={(e) => setQuickLogEntry({ ...quickLogEntry, description: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickLogTime(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => quickLogTimeMutation.mutate()}
                  disabled={quickLogTimeMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {quickLogTimeMutation.isPending ? "Logging..." : "Save Timelog"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
