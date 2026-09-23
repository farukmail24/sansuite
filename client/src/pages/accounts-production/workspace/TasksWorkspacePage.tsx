import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { CheckSquare, Plus, RefreshCw, X, Calendar, User } from "lucide-react";

export default function TasksWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="Tasks">
      <TasksWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function TasksWorkspaceContent() {
  const { clientId, client } = useClientWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("Admin User");
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [taskPriority, setTaskPriority] = useState("Normal");

  const { data: allTasks = [], isLoading, refetch: refetchTasks } = useQuery<any[]>({
    queryKey: ["/api/practice/tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/tasks");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const clientTasks = allTasks.filter((t: any) => t.clientId === parseInt(clientId || "0"));

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/practice/tasks", {
        title: taskTitle,
        clientId: parseInt(clientId || "0"),
        assignedTo: taskAssignee,
        dueDate: taskDueDate,
        priority: taskPriority,
        status: "Pending",
        module: "Accounts Production",
      });
    },
    onSuccess: () => {
      refetchTasks();
      setShowAddTaskModal(false);
      setTaskTitle("");
      toast({ title: "Task Created", description: "Workflow item added to production checklist." });
    },
    onError: (err: any) => {
      toast({ title: "Task Creation Failed", description: err.message || "Could not create task.", variant: "destructive" });
    }
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare size={16} className="text-indigo-600" />
            Production Tasks & Workflow Checklist
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Tasks assigned specifically for {client?.clientName}.</p>
        </div>
        <button
          onClick={() => setShowAddTaskModal(true)}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Plus size={13} /> Add Task
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-600" />
            <span>Loading tasks...</span>
          </div>
        ) : clientTasks.length === 0 ? (
          <p className="py-6 text-center text-slate-400">
            No production tasks assigned to this client. Click &apos;Add Task&apos; to schedule workflow items.
          </p>
        ) : (
          clientTasks.map((t: any) => (
            <div key={t.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                <p className="text-slate-400 text-[11px]">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB") : "—"}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {t.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Task */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Production Task</h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Review Trial Balance reconciliation"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!taskTitle.trim() || createTaskMutation.isPending}
                onClick={() => createTaskMutation.mutate()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
