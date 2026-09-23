import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  X, UserPlus, CheckSquare, Calendar,
  Clock, FileText, Building2, User,
  AlertCircle, CheckCircle2
} from "lucide-react";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientsList?: any[];
}

export default function QuickAddModal({ isOpen, onClose, clientsList = [] }: QuickAddModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"client" | "task" | "deadline" | "time" | "note">("client");

  // Client Form State
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("Limited");
  const [companyNumber, setCompanyNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClientId, setTaskClientId] = useState("");
  const [taskPriority, setTaskPriority] = useState("Normal");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Deadline Form State
  const [deadlineName, setDeadlineName] = useState("");
  const [deadlineClientId, setDeadlineClientId] = useState("");
  const [deadlineService, setDeadlineService] = useState("Accounts");
  const [deadlineDate, setDeadlineDate] = useState("");

  // Note Form State
  const [noteClientId, setNoteClientId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  // Time Form State
  const [timeClientId, setTimeClientId] = useState("");
  const [timeHours, setTimeHours] = useState("1.0");
  const [timeDescription, setTimeDescription] = useState("");

  // Create Client Mutation
  const createClientMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/clients", {
        clientName,
        clientType,
        registrationNumber: companyNumber,
        email,
        phone,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Client Created", description: `${clientName} has been added.` });
      setClientName("");
      setCompanyNumber("");
      setEmail("");
      setPhone("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to create client", description: err.message, variant: "destructive" });
    }
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/tasks", {
        title: taskTitle,
        clientId: taskClientId ? parseInt(taskClientId) : null,
        priority: taskPriority,
        dueDate: taskDueDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/tasks"] });
      toast({ title: "Task Created", description: taskTitle });
      setTaskTitle("");
      onClose();
    }
  });

  // Create Deadline Mutation
  const createDeadlineMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/deadlines", {
        clientId: deadlineClientId,
        deadlineName,
        serviceType: deadlineService,
        statutoryDeadlineDate: deadlineDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      toast({ title: "Deadline Scheduled", description: deadlineName });
      setDeadlineName("");
      onClose();
    }
  });

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/pm/clients/${noteClientId}/timeline`, {
        activityType: "Note",
        title: noteTitle,
        content: noteContent,
        isPinned,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${noteClientId}/timeline`] });
      toast({ title: "Note Logged to Timeline", description: noteTitle });
      setNoteTitle("");
      setNoteContent("");
      onClose();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Quick Add Action</h3>
              <p className="text-xs text-slate-500">Rapid entry for clients, tasks, deadlines & notes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/30 p-1.5 gap-1 text-xs font-medium">
          {[
            { id: "client", label: "Client", icon: <UserPlus size={13} /> },
            { id: "task", label: "Task", icon: <CheckSquare size={13} /> },
            { id: "deadline", label: "Deadline", icon: <Calendar size={13} /> },
            { id: "note", label: "Note", icon: <FileText size={13} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-sm">
          {/* TAB 1: NEW CLIENT */}
          {activeTab === "client" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Tech Solutions Ltd"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client Entity Type</label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Limited">Limited Company</option>
                    <option value="SoleTrader">Sole Trader</option>
                    <option value="Partnership">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="Individual">Individual</option>
                    <option value="Charity">Charity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Company Reg Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 09876543"
                    value={companyNumber}
                    onChange={(e) => setCompanyNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Email</label>
                  <input
                    type="email"
                    placeholder="director@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+44 20 7946 0912"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                disabled={!clientName || createClientMutation.isPending}
                onClick={() => createClientMutation.mutate()}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                {createClientMutation.isPending ? "Creating Client..." : "Create Client"}
              </button>
            </div>
          )}

          {/* TAB 2: NEW TASK */}
          {activeTab === "task" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Reconcile Q3 Bank Transactions"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Linked Client</label>
                  <select
                    value={taskClientId}
                    onChange={(e) => setTaskClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Internal / No Client --</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.clientName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                disabled={!taskTitle || createTaskMutation.isPending}
                onClick={() => createTaskMutation.mutate()}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                {createTaskMutation.isPending ? "Creating Task..." : "Create Task"}
              </button>
            </div>
          )}

          {/* TAB 3: NEW DEADLINE */}
          {activeTab === "deadline" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client *</label>
                <select
                  value={deadlineClientId}
                  onChange={(e) => setDeadlineClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Client --</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Service Type</label>
                  <select
                    value={deadlineService}
                    onChange={(e) => setDeadlineService(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Accounts">Accounts Production</option>
                    <option value="CT600">Corporation Tax CT600</option>
                    <option value="VAT">VAT Return</option>
                    <option value="CS01">Confirmation Statement</option>
                    <option value="SA100">Self Assessment</option>
                    <option value="Bespoke">Bespoke / Advisory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Statutory Date *</label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Deadline Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 VAT Return 2026"
                  value={deadlineName}
                  onChange={(e) => setDeadlineName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                disabled={!deadlineClientId || !deadlineDate || createDeadlineMutation.isPending}
                onClick={() => createDeadlineMutation.mutate()}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                {createDeadlineMutation.isPending ? "Scheduling..." : "Schedule Deadline"}
              </button>
            </div>
          )}

          {/* TAB 4: NEW NOTE */}
          {activeTab === "note" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client *</label>
                <select
                  value={noteClientId}
                  onChange={(e) => setNoteClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Client --</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Note Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Meeting notes regarding R&D Tax claim"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                <textarea
                  rows={3}
                  placeholder="Enter details..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNote"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="pinNote" className="text-xs text-slate-600 dark:text-slate-400">Pin this note to the top of client timeline</label>
              </div>

              <button
                disabled={!noteClientId || !noteTitle || createNoteMutation.isPending}
                onClick={() => createNoteMutation.mutate()}
                className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                {createNoteMutation.isPending ? "Logging..." : "Log Note to Timeline"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
