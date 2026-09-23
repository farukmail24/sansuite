import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Calendar, RefreshCw, Filter, CheckCircle2,
  AlertCircle, Clock, Search, Plus, ExternalLink,
  ChevronRight, Building2, User, MoreVertical,
  CheckSquare, ArrowLeft, Download, Printer,
  FileSpreadsheet, Mail, SlidersHorizontal, Eye,
  Trash2, X, Check, Repeat
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useLocation } from "wouter";

// Available Deadlines Reports
const DEADLINES_REPORTS = [
  { id: "deadlines-master", title: "Deadlines Report", desc: "Comprehensive breakdown of all Companies House and HMRC deadlines." },
  { id: "client-deadlines", title: "Client Deadlines Report", desc: "Client-by-client statutory filing roadmap with countdown indicators." },
  { id: "internal-deadlines", title: "Internal Deadlines Report", desc: "Internal practice milestone target dates configured by your firm." },
  { id: "task-deadlines", title: "Task Deadlines Report", desc: "Cross-link between compliance deadlines and active task checklist completion." },
];

export default function DeadlinesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Top Sub-Tabs: "by_dates" | "list_view" | "reports"
  const [activeTab, setActiveTab] = useState<"by_dates" | "list_view" | "reports">("by_dates");

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>("Due and Overdue");
  const [filterService, setFilterService] = useState<string>("All");
  const [filterClient, setFilterClient] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupBy, setGroupBy] = useState<string>("Date");

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection & Email Workflow toggles
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [emailWorkflows, setEmailWorkflows] = useState<Record<number, boolean>>({});

  // Modals State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [selectedDeadlineToTask, setSelectedDeadlineToTask] = useState<any>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Add Deadline Form
  const [addForm, setAddForm] = useState({
    clientId: "",
    serviceType: "Accounts",
    deadlineName: "",
    statutoryDeadlineDate: "",
    internalDeadlineDate: "",
    frequency: "Yearly",
  });

  // Quick Task Form
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "Normal",
    assignedTo: "",
    dueDate: "",
  });

  // Fetch Deadlines
  const { data: deadlinesList = [], isLoading, isFetching } = useQuery<any[]>({
    queryKey: ["/api/pm/deadlines"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/deadlines");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Team Users
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Refresh Statutory Deadlines Mutation
  const refreshDeadlinesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/deadlines/refresh", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      toast({
        title: "Statutory Deadlines Refreshed",
        description: data.message || "Companies House & HMRC filing dates recalculated.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    }
  });

  // Create Custom Deadline Mutation
  const createDeadlineMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/pm/deadlines", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      toast({ title: "Deadline Added", description: "New deadline recorded successfully." });
      setShowAddModal(false);
      setAddForm({
        clientId: "",
        serviceType: "Accounts",
        deadlineName: "",
        statutoryDeadlineDate: "",
        internalDeadlineDate: "",
        frequency: "Yearly",
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add deadline", description: err.message, variant: "destructive" });
    }
  });

  // Convert Deadline to Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/practice/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/tasks"] });
      toast({ title: "Task Created", description: "Deadline added to practice tasks queue." });
      setShowTaskModal(false);
      setSelectedDeadlineToTask(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    }
  });

  // Send Single Reminder Email Mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/pm/deadlines/${id}/send-reminder`, {});
      if (!res.ok) throw new Error("Failed to send reminder");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({
        title: "Reminder Email Dispatched",
        description: data.message || "Statutory deadline notification sent to client.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reminder", description: err.message, variant: "destructive" });
    }
  });

  // Batch Dispatch All Due Reminders Mutation
  const dispatchAllRemindersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pm/deadlines/reminders/dispatch-all", {});
      if (!res.ok) throw new Error("Failed to dispatch reminders");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({
        title: "All Reminders Dispatched",
        description: data.message || "Batch statutory deadline notifications sent.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Batch Dispatch Failed", description: err.message, variant: "destructive" });
    }
  });

  // Format Date Helper
  const formatDate = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Filtered Deadlines List
  const filteredDeadlines = useMemo(() => {
    return deadlinesList.filter((d: any) => {
      // Status Filter
      if (filterStatus === "Due and Overdue") {
        if (d.status !== "Due" && d.status !== "Overdue") return false;
      } else if (filterStatus !== "All") {
        if (d.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // Service Type Filter
      if (filterService !== "All") {
        if (d.serviceType?.toLowerCase() !== filterService.toLowerCase()) return false;
      }

      // Client Filter
      if (filterClient !== "All") {
        if (String(d.clientId) !== String(filterClient) && d.clientName !== filterClient) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.deadlineName || "").toLowerCase().includes(q);
        const matchClient = (d.clientName || "").toLowerCase().includes(q);
        const matchService = (d.serviceType || "").toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchService) return false;
      }

      return true;
    });
  }, [deadlinesList, filterStatus, filterService, filterClient, searchQuery]);

  // Grouped for Kanban (By Dates)
  const kanbanColumns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const cols: {
      today: any[];
      tomorrow: any[];
      thisWeek: any[];
      thisMonth: any[];
      nextMonth: any[];
      recent: any[];
    } = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      thisMonth: [],
      nextMonth: [],
      recent: [],
    };

    filteredDeadlines.forEach((d: any) => {
      if (!d.statutoryDeadlineDate) {
        cols.recent.push(d);
        return;
      }
      const itemDate = new Date(d.statutoryDeadlineDate);
      itemDate.setHours(0, 0, 0, 0);

      const diffTime = itemDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || d.status === "Submitted" || d.status === "Completed") {
        cols.recent.push(d);
      } else if (diffDays === 0) {
        cols.today.push(d);
      } else if (diffDays === 1) {
        cols.tomorrow.push(d);
      } else if (itemDate <= endOfWeek) {
        cols.thisWeek.push(d);
      } else if (itemDate <= endOfMonth) {
        cols.thisMonth.push(d);
      } else if (itemDate <= endOfNextMonth) {
        cols.nextMonth.push(d);
      } else {
        cols.recent.push(d);
      }
    });

    return cols;
  }, [filteredDeadlines]);

  // Grouped for List View (by Date)
  const groupedByDateList = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredDeadlines.forEach((d: any) => {
      const dateKey = formatDate(d.statutoryDeadlineDate);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(d);
    });
    return groups;
  }, [filteredDeadlines]);

  // Toggle Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDeadlines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeadlines.map((d: any) => d.id));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Sync emailWorkflows from deadlinesList database records
  useEffect(() => {
    if (deadlinesList && deadlinesList.length > 0) {
      const map: Record<number, boolean> = {};
      deadlinesList.forEach((d: any) => {
        map[d.id] = d.reminderDays !== "none";
      });
      setEmailWorkflows(map);
    }
  }, [deadlinesList]);

  const toggleEmailWorkflow = async (id: number) => {
    const nextVal = emailWorkflows[id] === undefined ? false : !emailWorkflows[id];
    setEmailWorkflows((prev) => ({
      ...prev,
      [id]: nextVal,
    }));
    try {
      await apiRequest("PATCH", `/api/pm/deadlines/${id}`, {
        reminderDays: nextVal ? "30,14,7,1" : "none",
      });
      toast({
        title: "Email Workflow Updated",
        description: nextVal ? "Automated email chasing enabled." : "Automated email chasing disabled.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save chasing preference to database.", variant: "destructive" });
    }
  };

  const handleOpenAddTask = (deadline: any) => {
    setSelectedDeadlineToTask(deadline);
    setTaskForm({
      title: `${deadline.deadlineName || deadline.serviceType} - ${deadline.clientName}`,
      priority: deadline.status === "Overdue" ? "High" : "Normal",
      assignedTo: deadline.assignedUserId ? String(deadline.assignedUserId) : "",
      dueDate: deadline.statutoryDeadlineDate ? deadline.statutoryDeadlineDate.substring(0, 10) : "",
    });
    setShowTaskModal(true);
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        
        {/* Top Controls Header Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left Sub-Tabs: By Dates | List View | Reports */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => { setActiveTab("by_dates"); setSelectedReportId(null); }}
                className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  activeTab === "by_dates"
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                By Dates
                {activeTab === "by_dates" && (
                  <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
                )}
              </button>

              <button
                onClick={() => { setActiveTab("list_view"); setSelectedReportId(null); }}
                className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  activeTab === "list_view"
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                List View
                {activeTab === "list_view" && (
                  <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
                )}
              </button>

              <button
                onClick={() => { setActiveTab("reports"); }}
                className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  activeTab === "reports"
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Reports
                {activeTab === "reports" && (
                  <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
                )}
              </button>
            </div>

            {/* Right Filters & Action Buttons */}
            {activeTab !== "reports" && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Dropdown */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 shadow-2xs cursor-pointer min-w-[160px]"
                >
                  <option value="Due and Overdue">Due and Overdue</option>
                  <option value="All">Status - All</option>
                  <option value="Due">Due</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Submitted">Submitted</option>
                </select>

                {/* Service Type Dropdown */}
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 shadow-2xs cursor-pointer min-w-[150px]"
                >
                  <option value="All">Service Type - All</option>
                  <option value="Accounts">Company Accounts</option>
                  <option value="CT600">Corporation Tax (CT600)</option>
                  <option value="CS01">Confirmation Statement</option>
                  <option value="VAT">VAT Returns</option>
                  <option value="SA100">Self Assessment (SA100)</option>
                </select>

                {/* Client Dropdown */}
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 shadow-2xs cursor-pointer min-w-[150px]"
                >
                  <option value="All">Client All</option>
                  {clientsList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </select>

                {/* Add Deadline Button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} /> Add Deadline
                </button>

                {/* Dispatch All Reminders Button */}
                <button
                  onClick={() => dispatchAllRemindersMutation.mutate()}
                  disabled={dispatchAllRemindersMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Dispatch automated reminder emails to all clients with upcoming deadlines"
                >
                  <Mail size={12} className={dispatchAllRemindersMutation.isPending ? "animate-bounce" : ""} />
                  {dispatchAllRemindersMutation.isPending ? "Sending..." : "Dispatch Reminders"}
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => refreshDeadlinesMutation.mutate()}
                  disabled={refreshDeadlinesMutation.isPending || isFetching}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} className={refreshDeadlinesMutation.isPending || isFetching ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: BY DATES (Kanban Board Timeframe Columns - Screenshot 1) */}
        {/* ========================================================= */}
        {activeTab === "by_dates" && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-[550px]">
              
              {/* 1. Today */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Today ({kanbanColumns.today.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.today.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.today.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

              {/* 2. Tomorrow */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Tomorrow ({kanbanColumns.tomorrow.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.tomorrow.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.tomorrow.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

              {/* 3. This Week */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  This Week ({kanbanColumns.thisWeek.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.thisWeek.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.thisWeek.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

              {/* 4. This Month */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  This month ({kanbanColumns.thisMonth.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.thisMonth.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.thisMonth.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

              {/* 5. Next Month */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Next month ({kanbanColumns.nextMonth.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.nextMonth.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.nextMonth.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

              {/* 6. Recent Deadlines */}
              <div className="bg-[#f0f4f8] dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex flex-col">
                <div className="px-3.5 py-2.5 bg-[#e2e8f0] dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Recent Deadlines ({kanbanColumns.recent.length})
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {kanbanColumns.recent.length === 0 ? (
                    <div className="text-center py-16 text-purple-600 dark:text-purple-400 font-medium text-xs">
                      No Records found
                    </div>
                  ) : (
                    kanbanColumns.recent.map((item: any) => (
                      <KanbanDeadlineCard key={item.id} item={item} onAddTask={handleOpenAddTask} onToggleEmail={toggleEmailWorkflow} emailActive={emailWorkflows[item.id] ?? true} onSendReminder={(id: number) => sendReminderMutation.mutate(id)} isSendingReminder={sendReminderMutation.isPending} />
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIST VIEW (Exact Table Alignment - Screenshot 2) */}
        {/* ========================================================= */}
        {activeTab === "list_view" && (
          <div className="p-6 space-y-4">
            
            {/* Table Search & Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Deadlines</span>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Quick Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-l px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-56"
                  />
                  <button
                    onClick={() => {}}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3 py-1.5 rounded-r cursor-pointer"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Group By -</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="Date">Date</option>
                  <option value="Client">Client</option>
                  <option value="Service">Service</option>
                </select>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} /> Add Deadline
                </button>

                <button
                  onClick={() => refreshDeadlinesMutation.mutate()}
                  disabled={refreshDeadlinesMutation.isPending || isFetching}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} className={refreshDeadlinesMutation.isPending || isFetching ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Grouped Table View */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filteredDeadlines.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Deadline Type</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Client Type</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Last Submitted</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Internal Deadline Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">To do</th>
                      <th className="py-2.5 px-3">Email Workflow</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(groupedByDateList).length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-12 text-slate-400">
                          No deadlines found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(groupedByDateList).map(([dateKey, rows]) => {
                        const dueCount = rows.filter((r) => r.status === "Due").length;
                        const subCount = rows.filter((r) => r.status === "Submitted" || r.status === "Completed").length;
                        const overCount = rows.filter((r) => r.status === "Overdue").length;

                        return (
                          <ReactGroup key={dateKey}>
                            {/* Sub-Header Group Banner */}
                            <tr className="bg-slate-100/70 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                              <td colSpan={12} className="py-2 px-3">
                                <div className="flex items-center gap-6">
                                  <span className="font-bold text-slate-800 dark:text-slate-100">Due Date: {dateKey}</span>
                                  <span className="text-slate-500 font-normal">
                                    On Due: <span className="text-blue-600 font-semibold">{dueCount} deadline(s)</span> | Submitted: <span className="text-emerald-600 font-semibold">{subCount} deadline(s)</span> | Overdue: <span className="text-rose-600 font-semibold">{overCount} deadline(s)</span>
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Group Data Rows */}
                            {rows.map((row) => {
                              const isOverdue = row.status === "Overdue";
                              const isDue = row.status === "Due";
                              const isSub = row.status === "Submitted" || row.status === "Completed";

                              return (
                                <tr
                                  key={row.id}
                                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(row.id)}
                                      onChange={() => toggleSelectId(row.id)}
                                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                                    <Repeat size={12} className="text-purple-500 shrink-0" />
                                    <span>{row.deadlineName || row.serviceType}</span>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                                    {row.clientName}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    {row.clientType || "Limited"}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    Yearly
                                  </td>
                                  <td className="py-2.5 px-3 text-[11px] text-slate-500">
                                    {row.submittedAt ? formatDate(row.submittedAt) : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                                    {formatDate(row.statutoryDeadlineDate)}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-500">
                                    {formatDate(row.internalDeadlineDate)}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`font-semibold text-xs ${
                                        isOverdue
                                          ? "text-rose-600"
                                          : isDue
                                          ? "text-blue-600"
                                          : isSub
                                          ? "text-emerald-600"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <button
                                      onClick={() => handleOpenAddTask(row)}
                                      className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                                    >
                                      Add To Tasks
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleEmailWorkflow(row.id)}
                                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                          emailWorkflows[row.id] !== false
                                            ? "bg-emerald-500"
                                            : "bg-slate-300 dark:bg-slate-700"
                                        }`}
                                      >
                                        <div
                                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                            emailWorkflows[row.id] !== false ? "translate-x-4" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        {emailWorkflows[row.id] !== false ? "ON" : "OFF"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => sendReminderMutation.mutate(row.id)}
                                      disabled={sendReminderMutation.isPending}
                                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-1 cursor-pointer transition hover:bg-emerald-50 dark:hover:bg-slate-800 rounded inline-flex items-center gap-1 font-semibold text-[11px]"
                                      title="Send Instant Deadline Reminder Email to Client"
                                    >
                                      <Mail size={13} />
                                      <span>Remind</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </ReactGroup>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Pagination */}
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>Displaying 1 to {filteredDeadlines.length} out of {filteredDeadlines.length} deadlines</span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
                    &lt; Previous
                  </button>
                  <button className="px-2.5 py-1 rounded bg-[#5c469c] text-white font-semibold shadow-2xs">
                    1
                  </button>
                  <button className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REPORTS (Direct Links to Master Reports - Screenshot 3) */}
        {/* ========================================================= */}
        {activeTab === "reports" && (
          <div className="p-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 shadow-2xs space-y-6">
              <div className="space-y-4">
                {DEADLINES_REPORTS.map((rep) => (
                  <div key={rep.id} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <button
                      onClick={() => navigate(`/practice/reports?report=${rep.id}`)}
                      className="text-sm font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 flex items-center gap-2 cursor-pointer group"
                    >
                      <ChevronRight size={14} className="text-purple-500 group-hover:translate-x-0.5 transition-transform" />
                      <span>{rep.title}</span>
                    </button>
                    <p className="text-xs text-slate-500 ml-5 mt-0.5">{rep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ADD DEADLINE MODAL */}
        {/* ========================================================= */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  Add Custom Filing Deadline
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addForm.clientId || !addForm.deadlineName || !addForm.statutoryDeadlineDate) {
                    toast({ title: "Validation Error", description: "Please fill in all mandatory fields.", variant: "destructive" });
                    return;
                  }
                  createDeadlineMutation.mutate({
                    clientId: parseInt(addForm.clientId),
                    serviceType: addForm.serviceType,
                    deadlineName: addForm.deadlineName,
                    statutoryDeadlineDate: new Date(addForm.statutoryDeadlineDate),
                    internalDeadlineDate: addForm.internalDeadlineDate ? new Date(addForm.internalDeadlineDate) : undefined,
                  });
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.clientId}
                    onChange={(e) => setAddForm({ ...addForm, clientId: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="">Select a Client</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.clientType})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={addForm.serviceType}
                      onChange={(e) => setAddForm({ ...addForm, serviceType: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    >
                      <option value="Accounts">Company Accounts</option>
                      <option value="CT600">Corporation Tax (CT600)</option>
                      <option value="CS01">Confirmation Statement</option>
                      <option value="VAT">VAT Return</option>
                      <option value="SA100">Self Assessment (SA100)</option>
                      <option value="Payroll">Payroll RTI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Frequency
                    </label>
                    <select
                      value={addForm.frequency}
                      onChange={(e) => setAddForm({ ...addForm, frequency: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    >
                      <option value="Yearly">Yearly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="One-Off">One-Off</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Accounts Filing 2026"
                    value={addForm.deadlineName}
                    onChange={(e) => setAddForm({ ...addForm, deadlineName: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Statutory Due Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={addForm.statutoryDeadlineDate}
                      onChange={(e) => setAddForm({ ...addForm, statutoryDeadlineDate: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Internal Target Date
                    </label>
                    <input
                      type="date"
                      value={addForm.internalDeadlineDate}
                      onChange={(e) => setAddForm({ ...addForm, internalDeadlineDate: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDeadlineMutation.isPending}
                    className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                  >
                    {createDeadlineMutation.isPending ? "Adding..." : "Save Deadline"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ADD TO TASKS MODAL */}
        {/* ========================================================= */}
        {showTaskModal && selectedDeadlineToTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare size={16} className="text-purple-600" />
                  Add Deadline to Tasks Queue
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createTaskMutation.mutate({
                    title: taskForm.title,
                    taskType: selectedDeadlineToTask.serviceType || "Compliance",
                    priority: taskForm.priority,
                    clientId: selectedDeadlineToTask.clientId,
                    dueDate: taskForm.dueDate || new Date().toISOString(),
                    assignedTo: taskForm.assignedTo ? parseInt(taskForm.assignedTo) : undefined,
                  });
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Staff Member
                  </label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Add to Tasks"}
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

// Sub-Component: Kanban Deadline Card for "By Dates" Tab
function KanbanDeadlineCard({ item, onAddTask, onToggleEmail, emailActive, onSendReminder, isSendingReminder }: any) {
  const isOverdue = item.status === "Overdue";
  const isDue = item.status === "Due";

  return (
    <div className="p-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between gap-1">
        <span className="font-bold text-xs text-purple-700 dark:text-purple-400 line-clamp-1">
          {item.deadlineName || item.serviceType}
        </span>
        <span className={`text-[10px] font-bold shrink-0 ${isOverdue ? "text-rose-600" : isDue ? "text-blue-600" : "text-emerald-600"}`}>
          {item.status}
        </span>
      </div>

      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
        {item.clientName}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/50">
        <span>Due: {item.statutoryDeadlineDate ? item.statutoryDeadlineDate.substring(0, 10) : "-"}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendReminder && onSendReminder(item.id)}
            disabled={isSendingReminder}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            title="Send direct email reminder to client"
          >
            <Mail size={11} /> Mail
          </button>
          <button
            onClick={() => onAddTask(item)}
            className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
          >
            + Task
          </button>
        </div>
      </div>
    </div>
  );
}

// React Fragment wrapper for table group rows
function ReactGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
