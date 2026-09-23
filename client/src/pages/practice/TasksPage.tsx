import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import {
  LayoutDashboard, CheckSquare, Users, Calendar, BarChart2,
  Settings, Plus, Search, X, CheckCircle2, GripVertical,
  Clock, AlertCircle, Sparkles, Filter, ChevronRight, User,
  Building2, Briefcase, Bell, Eye, ListFilter, CalendarDays,
  Columns, Trash2, Check, ArrowUpDown, ChevronLeft, FileText,
  TrendingUp, Layers, CheckCheck, Circle
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useLocation } from "wouter";

interface Task {
  id: number;
  title: string;
  description?: string;
  taskType: string;
  priority: string;
  status: string;
  dueDate: string;
  startDate?: string;
  clientId?: number;
  clientName?: string;
  assignedTo?: number;
  assigneeName?: string;
  emailNotification?: boolean;
}

const KANBAN_COLUMNS = ["Todo", "InProgress", "Review", "Completed"];
const KANBAN_TITLES: Record<string, string> = {
  Todo: "To Do",
  InProgress: "In Progress",
  Review: "In Review",
  Completed: "Completed"
};

// BY STATUS COLUMNS (Capium Screenshot 2)
const STATUS_COLUMNS = ["OverDue", "InProgress", "Completed", "NotStarted"];
const STATUS_TITLES: Record<string, { label: string; sub: string; color: string }> = {
  OverDue: { label: "OverDue", sub: "Tasks with overdue date", color: "text-rose-600" },
  InProgress: { label: "InProgress", sub: "Scheduled tasks in progress", color: "text-blue-600" },
  Completed: { label: "Completed", sub: "Recently finished tasks", color: "text-emerald-600" },
  NotStarted: { label: "Not Started", sub: "Not Started tasks", color: "text-slate-600" }
};

const priorityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Low: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
  Normal: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-slate-700" },
  High: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  Urgent: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-600" },
};

export default function TasksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar" | "by_status" | "reports">("kanban");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [filterPeriod, setFilterPeriod] = useState("Show Current Week");

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Local Task state for instant optimistic updates
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  // Calendar View State (Screenshot 1)
  const [calendarViewType, setCalendarViewType] = useState<"Month" | "Week">("Month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Form State matching Capium Screenshot 5
  const [taskType, setTaskType] = useState<"Client Billable" | "Client Non Billable" | "Other Non Billable">("Client Billable");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("Ad-hoc");
  const [emailNotification, setEmailNotification] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [visibility, setVisibility] = useState<"Public" | "Private">("Public");
  const [priority, setPriority] = useState<"Low" | "Normal" | "High" | "Urgent">("Normal");
  const [assignedToUser, setAssignedToUser] = useState<string>("");
  const [initialStatusForModal, setInitialStatusForModal] = useState<string>("Todo");
  const [checklist, setChecklist] = useState<{ id: string; title: string; type: string }[]>([
    { id: "step-1", title: "Client Approval", type: "Task" },
    { id: "step-2", title: "Completion", type: "Task" },
  ]);

  // Fetch Tasks from API
  const { data: serverTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/practice/tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/tasks");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Sync server tasks to local tasks
  useEffect(() => {
    if (serverTasks) {
      setLocalTasks(serverTasks);
    }
  }, [serverTasks]);

  // Fetch Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? await res.json() : [];
    },
  });

  // Fetch Team Members
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/team"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/team");
      return res.ok ? await res.json() : [];
    },
  });

  // Fetch Services
  const { data: servicesList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/services"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/services");
      return res.ok ? await res.json() : [];
    },
  });

  // Create Task Mutation
  const createTask = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/tasks", payload);
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task Created", description: "Ad-hoc task added to your practice workflow." });
      qc.invalidateQueries({ queryKey: ["/api/practice/tasks"] });
      setShowModal(false);
      resetForm();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // Update Task Mutation (Drag and drop or status change)
  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/practice/tasks/${id}`, { status });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practice/tasks"] });
    },
    onError: (e: any) => {
      toast({ title: "Error moving task", description: e.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["/api/practice/tasks"] });
    },
  });

  const resetForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setSelectedClientId("");
    setSelectedService("Ad-hoc");
    setEmailNotification(true);
    setStartDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date().toISOString().split("T")[0]);
    setVisibility("Public");
    setPriority("Normal");
    setAssignedToUser("");
    setInitialStatusForModal("Todo");
    setChecklist([
      { id: "step-1", title: "Client Approval", type: "Task" },
      { id: "step-2", title: "Completion", type: "Task" },
    ]);
  };

  // Filtered Tasks
  const filteredTasks = localTasks.filter((t) => {
    const matchSearch = (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.clientName || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    const matchAssignee = filterAssignee === "All" || (t.assigneeName && t.assigneeName.includes(filterAssignee));
    return matchSearch && matchPriority && matchAssignee;
  });

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== col) {
      setDragOverCol(col);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData("text/plain") || (draggedTaskId ? String(draggedTaskId) : "");
    setDragOverCol(null);
    setDraggedTaskId(null);

    if (!idStr) return;
    const taskId = parseInt(idStr);

    // Instant optimistic update in local state
    setLocalTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: targetStatus } : task))
    );

    // Call Backend API
    updateTask.mutate({ id: taskId, status: targetStatus });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast({ title: "Validation Error", description: "Task title is required.", variant: "destructive" });
      return;
    }

    createTask.mutate({
      title: taskTitle,
      description: taskDescription,
      taskType: taskType,
      priority: priority,
      status: initialStatusForModal,
      clientId: selectedClientId ? parseInt(selectedClientId) : null,
      assignedTo: assignedToUser ? parseInt(assignedToUser) : null,
      dueDate: dueDate || null,
      emailNotification: emailNotification,
    });
  };

  // Calendar Helper Logic (Screenshot 1)
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const totalDays = daysInMonth(currentYear, currentMonth);
  const startOffset = startDayOfMonth(currentYear, currentMonth); // 0 = Sun, 1 = Mon ...
  const prevMonthTotalDays = daysInMonth(currentYear, currentMonth - 1);

  // Calendar cells generation (6 rows x 7 cols = 42 cells)
  const calendarCells = [];
  // 1. Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateStr: `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(prevMonthTotalDays - i).padStart(2, "0")}`,
    });
  }
  // 2. Current month days
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  // 3. Next month leading days
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  // Calculate Monthly Progress
  const totalMonthTasks = localTasks.length;
  const completedMonthTasks = localTasks.filter((t) => t.status === "Completed").length;
  const progressPercent = totalMonthTasks > 0 ? Math.round((completedMonthTasks / totalMonthTasks) * 100) : 0;

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 h-[calc(100vh-64px)] flex flex-col space-y-4 bg-slate-50 dark:bg-slate-950 text-xs">
        
        {/* Top Header & View Tabs (Capium Exact Alignment - Screenshot 1, 2, 3) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          
          {/* View Mode Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#5c469c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Kanban View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#5c469c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-[#5c469c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Calendar View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by_status")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === "by_status"
                  ? "bg-[#5c469c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              By Status
            </button>
            <button
              type="button"
              onClick={() => setViewMode("reports")}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === "reports"
                  ? "bg-[#5c469c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Task Reports
            </button>
          </div>

          {/* Action Tools & Add Ad-hoc Task Button */}
          <div className="flex items-center gap-3">
            
            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 outline-none shadow-xs"
            >
              <option value="All">Priority - All</option>
              <option value="Low">Priority - Low</option>
              <option value="Normal">Priority - Normal</option>
              <option value="High">Priority - High</option>
              <option value="Urgent">Priority - Urgent</option>
            </select>

            {/* Staff Filter (Screenshot 1) */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 outline-none shadow-xs"
            >
              <option value="All">All Staff Members</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.firstName}>
                  {m.firstName} {m.lastName || ""}
                </option>
              ))}
            </select>

            {/* Period Dropdown */}
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 outline-none shadow-xs"
            >
              <option>Show Current Week</option>
              <option>Show This Month</option>
              <option>Show All Upcoming</option>
            </select>

            {/* Add Ad-hoc Task Button (Capium Purple) */}
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Ad-hoc Task</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: KANBAN BOARD                                                      */}
        {/* ========================================================================= */}
        {viewMode === "kanban" && (
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            {/* Search and Fast Filters Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search task title, client, or assignee..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="text-slate-500 text-[11px]">
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTasks.length}</strong> tasks across workflow
              </div>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden min-h-0">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => (t.status || "Todo") === col);
                const isOver = dragOverCol === col;

                return (
                  <div
                    key={col}
                    onDragOver={(e) => handleDragOver(e, col)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col)}
                    className={`flex flex-col rounded-xl border transition-all duration-150 h-full overflow-hidden ${
                      isOver
                        ? "bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 dark:bg-purple-950/30"
                        : "bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            col === "Todo"
                              ? "bg-slate-400"
                              : col === "InProgress"
                              ? "bg-blue-500"
                              : col === "Review"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span>{KANBAN_TITLES[col]}</span>
                      </div>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold text-[11px] border border-slate-200 dark:border-slate-700">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Card List with Dragging Capabilities */}
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
                      {colTasks.length === 0 ? (
                        <div
                          className={`h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-slate-400 text-[11px] transition ${
                            isOver ? "border-purple-400 bg-purple-100/50 text-purple-700" : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {isOver ? "Drop Task Here" : "No Tasks"}
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const isDraggingThis = draggedTaskId === task.id;
                          const pStyle = priorityStyles[task.priority] || priorityStyles.Normal;

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border transition shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing select-none group ${
                                isDraggingThis
                                  ? "opacity-40 border-purple-400 scale-95"
                                  : "border-slate-200 dark:border-slate-800 hover:border-purple-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                                  {task.priority || "Normal"}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400 group-hover:text-purple-600 transition">
                                  <GripVertical size={13} />
                                </div>
                              </div>

                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1 line-clamp-2">
                                {task.title}
                              </h4>

                              <p className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                                <Building2 size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{task.clientName || "Internal Firm Task"}</span>
                              </p>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Clock size={11} />
                                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "No date"}
                                </span>
                                {task.assigneeName ? (
                                  <div
                                    className="w-5 h-5 rounded-full bg-purple-100 text-[#5c469c] font-bold flex items-center justify-center text-[9px] border border-purple-200"
                                    title={task.assigneeName}
                                  >
                                    {task.assigneeName.trim()[0]}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Unassigned</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LIST VIEW                                                         */}
        {/* ========================================================================= */}
        {viewMode === "list" && (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Task Title</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Assigned To</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No tasks found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{t.title}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{t.clientName || "—"}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{t.assigneeName || "Unassigned"}</td>
                        <td className="p-3 text-slate-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${(priorityStyles[t.priority] || priorityStyles.Normal).bg} ${(priorityStyles[t.priority] || priorityStyles.Normal).text}`}>
                            {t.priority || "Normal"}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={t.status || "Todo"}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setLocalTasks((prev) => prev.map((item) => (item.id === t.id ? { ...item, status: newStatus } : item)));
                              updateTask.mutate({ id: t.id, status: newStatus });
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            {KANBAN_COLUMNS.map((c) => (
                              <option key={c} value={c}>
                                {KANBAN_TITLES[c]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              updateTask.mutate({ id: t.id, status: "Completed" });
                            }}
                            className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                            title="Mark Completed"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CALENDAR VIEW (Exact Match to Screenshot 1)                       */}
        {/* ========================================================================= */}
        {viewMode === "calendar" && (
          <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 overflow-hidden">
            
            {/* Left Sidebar: Calendar Overview */}
            <div className="col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs overflow-y-auto">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <CalendarDays size={18} className="text-[#5c469c]" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Calendar Overview</h3>
                  <p className="text-[10px] text-slate-400">Current and following month</p>
                </div>
              </div>

              {/* Current Month Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Current Month:</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                  Monthly Progress: <strong className="text-purple-700 font-bold">{progressPercent}%</strong>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#5c469c] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="pt-2 text-[11px] space-y-1 text-slate-500">
                  <div className="flex justify-between"><span>Tasks</span><strong className="text-slate-800 dark:text-slate-200">{localTasks.length}</strong></div>
                  <div className="flex justify-between"><span>Services</span><strong className="text-slate-800 dark:text-slate-200">{servicesList.length}</strong></div>
                  <div className="flex justify-between"><span>Clients</span><strong className="text-slate-800 dark:text-slate-200">{clientsList.length}</strong></div>
                </div>
              </div>

              {/* Upcoming Month Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Upcoming Month:</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                  Monthly Progress: <strong className="text-slate-700 font-bold">0%</strong>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full" style={{ width: "0%" }} />
                </div>
                <div className="pt-2 text-[11px] space-y-1 text-slate-500">
                  <div className="flex justify-between"><span>Tasks</span><strong className="text-slate-800 dark:text-slate-200">0</strong></div>
                  <div className="flex justify-between"><span>Services</span><strong className="text-slate-800 dark:text-slate-200">{servicesList.length}</strong></div>
                  <div className="flex justify-between"><span>Clients</span><strong className="text-slate-800 dark:text-slate-200">{clientsList.length}</strong></div>
                </div>
              </div>
            </div>

            {/* Right Main Calendar Grid */}
            <div className="col-span-9 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col space-y-3 shadow-xs min-h-0 overflow-hidden">
              
              {/* Tip and Month Header Controls */}
              <div className="text-[11px] text-slate-500 italic">
                Tip: Click on a specific day to create new task
              </div>

              <div className="flex items-center justify-between">
                {/* Month / Week Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCalendarViewType("Month")}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                      calendarViewType === "Month" ? "bg-[#5c469c] text-white shadow-2xs" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewType("Week")}
                    className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                      calendarViewType === "Week" ? "bg-[#5c469c] text-white shadow-2xs" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Week
                  </button>
                </div>

                {/* Month Navigation Title */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Month From 1 – {totalDays} {monthName} {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Add Ad-hoc Task Button */}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-3 py-1 rounded-md font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Add Ad-hoc Task
                </button>
              </div>

              {/* 7-Day Columns Calendar Table */}
              <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
                
                {/* Days of Week Header */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div
                    key={dayName}
                    className="bg-slate-50 dark:bg-slate-800 p-2 font-bold text-slate-600 dark:text-slate-300 text-center text-[11px]"
                  >
                    {dayName}
                  </div>
                ))}

                {/* Calendar Day Cells */}
                {calendarCells.slice(0, 35).map((cell, idx) => {
                  // Find tasks for this day
                  const dayTasks = localTasks.filter((t) => {
                    if (!t.dueDate) return false;
                    return t.dueDate.startsWith(cell.dateStr);
                  });

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        resetForm();
                        setDueDate(cell.dateStr);
                        setStartDate(cell.dateStr);
                        setShowModal(true);
                      }}
                      className={`bg-white dark:bg-slate-900 p-2 flex flex-col justify-between hover:bg-purple-50/50 dark:hover:bg-purple-950/20 cursor-pointer transition ${
                        !cell.isCurrentMonth ? "text-slate-300 dark:text-slate-600 bg-slate-50/40" : "text-slate-800 dark:text-slate-200 font-semibold"
                      }`}
                    >
                      <span className="text-[11px]">{cell.day}</span>
                      
                      {/* Task priority dot markers */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dayTasks.map((t) => (
                          <span
                            key={t.id}
                            className={`w-2 h-2 rounded-full ${(priorityStyles[t.priority] || priorityStyles.Normal).dot}`}
                            title={`${t.title} (${t.priority})`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend Footer (Screenshot 1) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span>Tip: Click on a specific day to create new task</span>
                <div className="flex items-center gap-4 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    This marker represents High Priority Task
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    This marker represents Low Priority Task
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    This marker represents Normal Priority Task
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: BY STATUS VIEW (Exact Match to Screenshot 2)                      */}
        {/* ========================================================================= */}
        {viewMode === "by_status" && (
          <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden min-h-0">
            {STATUS_COLUMNS.map((statusKey) => {
              const colMeta = STATUS_TITLES[statusKey];
              // Map tasks to status
              const colTasks = localTasks.filter((t) => {
                if (statusKey === "OverDue") {
                  if (t.status === "Completed") return false;
                  if (!t.dueDate) return false;
                  return new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
                }
                if (statusKey === "InProgress") return t.status === "InProgress" || t.status === "Review";
                if (statusKey === "Completed") return t.status === "Completed";
                if (statusKey === "NotStarted") return t.status === "Todo" || !t.status;
                return false;
              });

              const isOver = dragOverCol === statusKey;

              return (
                <div
                  key={statusKey}
                  onDragOver={(e) => handleDragOver(e, statusKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    const mappedDbStatus =
                      statusKey === "OverDue"
                        ? "Todo"
                        : statusKey === "InProgress"
                        ? "InProgress"
                        : statusKey === "Completed"
                        ? "Completed"
                        : "Todo";
                    handleDrop(e, mappedDbStatus);
                  }}
                  className={`flex flex-col rounded-xl border transition-all duration-150 h-full overflow-hidden ${
                    isOver
                      ? "bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 dark:bg-purple-950/30"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Status Column Header matching Screenshot 2 */}
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs ${colMeta.color}`}>
                          {colMeta.label} ({colTasks.length})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{colMeta.sub}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setInitialStatusForModal(
                          statusKey === "InProgress" ? "InProgress" : statusKey === "Completed" ? "Completed" : "Todo"
                        );
                        setShowModal(true);
                      }}
                      className="text-slate-400 hover:text-purple-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Task Card List with Dragging Capabilities */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                    {colTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
                        No Tasks Yet
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow cursor-grab active:cursor-grabbing select-none"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(priorityStyles[task.priority] || priorityStyles.Normal).bg} ${(priorityStyles[task.priority] || priorityStyles.Normal).text}`}>
                              {task.priority || "Normal"}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={10} />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "No date"}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs line-clamp-1">{task.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 truncate">{task.clientName || "Internal Firm Task"}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: TASK REPORTS (Exact Match to Screenshot 3 & 4)                    */}
        {/* ========================================================================= */}
        {viewMode === "reports" && (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs overflow-y-auto">
            <div className="max-w-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
                Available Task Reports
              </h3>
              
              <div className="space-y-3 pt-2">
                {/* 1. Tasks Report */}
                <button
                  type="button"
                  onClick={() => navigate("/practice/reports?report=tasks-master")}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#5c469c] font-bold text-sm">&gt;</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#5c469c] group-hover:underline">Tasks Report</h4>
                      <p className="text-[11px] text-slate-500">All ongoing practice jobs, accounting tasks, and statutory workflow checklist progression.</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600" />
                </button>

                {/* 2. Tasks Users Report */}
                <button
                  type="button"
                  onClick={() => navigate("/practice/reports?report=tasks-users")}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#5c469c] font-bold text-sm">&gt;</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#5c469c] group-hover:underline">Tasks Users Report</h4>
                      <p className="text-[11px] text-slate-500">Active workloads, job allocations, and task completion percentages by team accountant.</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600" />
                </button>

                {/* 3. Tasks Notes Report (New version) */}
                <button
                  type="button"
                  onClick={() => navigate("/practice/reports?report=tasks-notes-new")}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#5c469c] font-bold text-sm">&gt;</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#5c469c] group-hover:underline">Tasks Notes Report (New version)</h4>
                      <p className="text-[11px] text-slate-500">Recent team updates, checklist step completions, and client notes across all active jobs.</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600" />
                </button>

                {/* 4. Tasks Notes Report (Old version) */}
                <button
                  type="button"
                  onClick={() => navigate("/practice/reports?report=tasks-notes-old")}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#5c469c] font-bold text-sm">&gt;</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#5c469c] group-hover:underline">Tasks Notes Report (Old version)</h4>
                      <p className="text-[11px] text-slate-500">Historical task audit trail and legacy activity logs for completed practice engagements.</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CAPIUM EXACT MATCH: CREATE NEW AD-HOC TASK MODAL                          */}
        {/* ========================================================================= */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Create New Ad-hoc Task
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sub-header instruction text */}
              <div className="px-6 pt-4 pb-2 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Capium allows you to create tasks via the Deadline section for the selected client. However, you are also able to manually create a new ad-hoc task by filling out this form.
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                
                {/* 1. Task Type */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Task Type</label>
                  <div className="col-span-2">
                    <select
                      value={taskType}
                      onChange={(e: any) => setTaskType(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Client Billable">Client Billable</option>
                      <option value="Client Non Billable">Client Non Billable</option>
                      <option value="Other Non Billable">Other Non Billable</option>
                    </select>
                  </div>
                </div>

                {/* 2. Task Title * */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Task Title *</label>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Prepare Annual Accounts for Smith & Sons"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* 3. Task Description */}
                <div className="grid grid-cols-3 items-start gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2">Task Description</label>
                  <div className="col-span-2">
                    <textarea
                      rows={2}
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Enter detailed task instructions or checklist..."
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* 4. Client * */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Client *</label>
                  <div className="col-span-2">
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select a Client...</option>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientName} ({c.clientType || "Limited"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Service * */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Service *</label>
                  <div className="col-span-2">
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Ad-hoc">Ad-hoc</option>
                      <option value="Company Tax Return">Company Tax Return</option>
                      <option value="Self-Assessment">Self-Assessment</option>
                      <option value="Company Accounts">Company Accounts</option>
                      <option value="Confirmation Statement">Confirmation Statement</option>
                      <option value="Payroll">Payroll</option>
                      <option value="VAT Return">VAT Return</option>
                      <option value="Bookkeeping">Bookkeeping</option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.serviceTitle}>
                          {s.serviceTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Email Notification Toggle */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Notification</label>
                  <div className="col-span-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailNotification(!emailNotification)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        emailNotification ? "bg-[#8bc34a]" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          emailNotification ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {emailNotification ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>

                {/* 7. Start Date & Due Date */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
                  <div className="col-span-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Due Date *</label>
                  <div className="col-span-2">
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* 8. Visibility */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Visibility</label>
                  <div className="col-span-2">
                    <select
                      value={visibility}
                      onChange={(e: any) => setVisibility(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>

                {/* 9. Priority */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                  <div className="col-span-2">
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* 10. Assign to * */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assign to *</label>
                  <div className="col-span-2">
                    <select
                      value={assignedToUser}
                      onChange={(e) => setAssignedToUser(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-xs bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select staff member...</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName || ""} ({m.role || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 11. Checklist Steps */}
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Checklist</label>
                    <button
                      type="button"
                      onClick={() => {
                        const stepNum = checklist.length + 1;
                        setChecklist([
                          ...checklist,
                          { id: `step-${stepNum}`, title: `Step #${stepNum} Action`, type: "Task" }
                        ]);
                      }}
                      className="text-[#5c469c] hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      + Add Step
                    </button>
                  </div>

                  <div className="space-y-2">
                    {checklist.map((step, idx) => (
                      <div
                        key={step.id}
                        className="bg-blue-50/60 dark:bg-slate-800/80 p-2 rounded-lg border border-blue-100 dark:border-slate-700 flex items-center gap-2"
                      >
                        <GripVertical size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Step #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newTitle = e.target.value;
                            setChecklist(checklist.map((s, i) => (i === idx ? { ...s, title: newTitle } : s)));
                          }}
                          className="flex-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none"
                        />
                        <select
                          value={step.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setChecklist(checklist.map((s, i) => (i === idx ? { ...s, type: newType } : s)));
                          }}
                          className="border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none"
                        >
                          <option value="Task">Task</option>
                          <option value="Approval">Approval</option>
                          <option value="Review">Review</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setChecklist(checklist.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTask.isPending}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-6 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {createTask.isPending ? "Saving..." : "Save"}
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
