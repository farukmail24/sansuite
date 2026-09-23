import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  Smartphone, Users, Coins, Search, Plus, Filter, Download,
  CheckCircle2, AlertCircle, Clock, Briefcase, Building2, Globe,
  ShieldCheck, RefreshCw, ChevronRight, FileText, Send, Layers
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdTask } from "./types";
import DigitalRecordsWorkspace from "./DigitalRecordsWorkspace";
import AdjustmentsWorkspace from "./AdjustmentsWorkspace";
import FinalDeclarationWorkspace from "./FinalDeclarationWorkspace";
import MtdItClientsPage from "./MtdItClientsPage";
import DividendsPage from "./DividendsPage";

const sidebar = [
  { label: "Submissions Dashboard", icon: <Smartphone size={15} />, route: "/mtd-it?tab=dashboard" },
  { label: "Manage Clients", icon: <Users size={15} />, route: "/mtd-it?tab=clients" },
  { label: "Dividends Database", icon: <Coins size={15} />, route: "/mtd-it?tab=dividends" },
];

const dashboardSubTabs = [
  { id: "all", label: "All Quarters" },
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
  { id: "q3", label: "Q3" },
  { id: "q4", label: "Q4" },
  { id: "adjustments", label: "Adjustments and Allowances" },
  { id: "final", label: "Final Submissions" },
];

export default function MtdItHome() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "dashboard";

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [selectedTaxYear, setSelectedTaxYear] = useState("2025-26");
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Active workspace task state (when clicking View & Submit)
  const [activeWorkspaceTask, setActiveWorkspaceTask] = useState<MtdTask | null>(null);

  // Fetch Dashboard Submissions
  const { data: dashboardData, isLoading, refetch } = useQuery<{
    taxYear: string;
    tab: string;
    quarterStatusCounts: { all: number; open: number; overdue: number; submitted: number };
    tasks: MtdTask[];
  }>({
    queryKey: ["/api/mtd-it/submissions/dashboard", selectedTaxYear, activeSubTab],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/mtd-it/submissions/dashboard?taxYear=${selectedTaxYear}&tab=${activeSubTab}`
      );
      return res.json();
    },
  });

  const tasks = dashboardData?.tasks || [];
  const counts = dashboardData?.quarterStatusCounts || { all: 0, open: 0, overdue: 0, submitted: 0 };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tradingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.taskName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.taskStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Handle View & Submit Click
  const handleViewAndSubmit = (task: MtdTask) => {
    setActiveWorkspaceTask(task);
  };

  return (
    <AppLayout sidebar={sidebar} module="MTD IT">
      <div className="bg-gray-100 min-h-screen pb-12">
        {/* Top Breadcrumb Header */}
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-xs text-gray-500">
            <span
              onClick={() => {
                setActiveWorkspaceTask(null);
                setLocation("/mtd-it?tab=dashboard");
              }}
              className="flex items-center gap-1 hover:text-[#6c5ce7] cursor-pointer transition-colors"
            >
              <Smartphone size={13} /> Making Tax Digital for Income Tax
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-400 capitalize">
              {activeWorkspaceTask
                ? `${activeWorkspaceTask.clientName} - ${activeWorkspaceTask.taskName}`
                : currentTab.replace("-", " ")}
            </span>
          </div>

          {activeWorkspaceTask && (
            <button
              onClick={() => setActiveWorkspaceTask(null)}
              className="text-xs font-semibold text-[#6c5ce7] hover:underline"
            >
              Back to Submissions Grid
            </button>
          )}
        </div>

        <div className="p-4 w-full mx-auto">
          {/* Active Workspace View (View & Submit) */}
          {activeWorkspaceTask ? (
            activeWorkspaceTask.type === "adjustment" ? (
              <AdjustmentsWorkspace task={activeWorkspaceTask} onBack={() => setActiveWorkspaceTask(null)} />
            ) : activeWorkspaceTask.type === "final" ? (
              <FinalDeclarationWorkspace task={activeWorkspaceTask} onBack={() => setActiveWorkspaceTask(null)} />
            ) : (
              <DigitalRecordsWorkspace task={activeWorkspaceTask} onBack={() => setActiveWorkspaceTask(null)} />
            )
          ) : (
            <>
              {/* Main Tab Routing */}
              {currentTab === "clients" && <MtdItClientsPage />}
              {currentTab === "dividends" && <DividendsPage />}

              {/* Submissions Dashboard View */}
              {currentTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Title & Filter Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">Submissions Dashboard</h1>
                      <p className="text-xs text-gray-500 mt-1">
                        Track quarterly income updates, year-end adjustments, and consolidated final declarations for HMRC.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <select
                          value={selectedTaxYear}
                          onChange={(e) => setSelectedTaxYear(e.target.value)}
                          className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#6c5ce7]"
                        >
                          <option value="2025-26">Tax Year: 2025-26</option>
                          <option value="2026-27">Tax Year: 2026-27</option>
                          <option value="2024-25">Tax Year: 2024-25</option>
                        </select>
                      </div>

                      <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        title="Refresh Obligations"
                      >
                        <RefreshCw size={14} />
                      </button>

                      <button
                        onClick={() =>
                          toast({ title: "Export Started", description: "Exporting MTD IT obligations summary to CSV." })
                        }
                        className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} /> Export View
                      </button>

                      <button
                        onClick={() => setLocation("/mtd-it?tab=clients")}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} /> Manage Clients
                      </button>
                    </div>
                  </div>

                  {/* 4 Metric Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tasks</span>
                        <span className="text-2xl font-black text-gray-800 mt-1 block">{counts.all}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50 text-[#6c5ce7] rounded-lg">
                        <Layers size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Tasks</span>
                        <span className="text-2xl font-black text-amber-700 mt-1 block">{counts.open}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</span>
                        <span className="text-2xl font-black text-rose-700 mt-1 block">{counts.overdue}</span>
                      </div>
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                        <AlertCircle size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted to HMRC</span>
                        <span className="text-2xl font-black text-emerald-700 mt-1 block">{counts.submitted}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                  </div>

                  {/* 7 Sub-tabs Bar (Official Capium Parity) */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50/70">
                      {dashboardSubTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id)}
                          className={`px-5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                            activeSubTab === tab.id
                              ? "border-[#6c5ce7] text-[#6c5ce7] bg-white shadow-sm"
                              : "border-transparent text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Filter & Search Ribbon */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-3 bg-white">
                      <div className="relative w-full sm:max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search client or trade name..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#6c5ce7] bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#6c5ce7]"
                        >
                          <option value="all">All Statuses</option>
                          <option value="open">Open</option>
                          <option value="overdue">Overdue</option>
                          <option value="submitted">Submitted</option>
                        </select>
                      </div>
                    </div>

                    {/* Submissions Grid or Clean Empty State */}
                    {isLoading ? (
                      <div className="text-center py-12 text-sm text-gray-500">Loading obligations grid...</div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-16 px-4 bg-gray-50/50">
                        <Smartphone size={36} className="mx-auto text-gray-400 mb-3" />
                        <h4 className="text-sm font-bold text-gray-800">No Tasks Found</h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                          {tasks.length === 0
                            ? "There are currently no active MTD IT clients enrolled. Enroll practice clients to automatically schedule their quarterly obligations."
                            : "No tasks match your filter criteria."}
                        </p>
                        {tasks.length === 0 && (
                          <button
                            onClick={() => setLocation("/mtd-it?tab=clients")}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Plus size={14} /> Enroll Practice Client
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 w-10">
                                <input type="checkbox" className="rounded text-[#6c5ce7]" />
                              </th>
                              <th className="px-4 py-3">Client Name</th>
                              <th className="px-4 py-3">Source Name</th>
                              <th className="px-4 py-3">Task</th>
                              <th className="px-4 py-3">Due Date</th>
                              <th className="px-4 py-3">Task Status</th>
                              <th className="px-4 py-3">Last Submission Date</th>
                              <th className="px-4 py-3 text-center">Action</th>
                              <th className="px-4 py-3">Client Approval</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredTasks.map((task) => (
                              <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-4 py-3">
                                  <input type="checkbox" className="rounded text-[#6c5ce7]" />
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900">{task.clientName}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
                                    {task.sourceType === "uk-property" ? (
                                      <Building2 size={13} className="text-[#6c5ce7]" />
                                    ) : task.sourceType === "foreign-property" ? (
                                      <Globe size={13} className="text-blue-500" />
                                    ) : (
                                      <Briefcase size={13} className="text-emerald-600" />
                                    )}
                                    {task.tradingName}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800">{task.taskName}</td>
                                <td className="px-4 py-3 text-gray-600">{task.dueDate}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      task.taskStatus === "Submitted"
                                        ? "bg-green-100 text-green-700"
                                        : task.taskStatus === "Overdue"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {task.taskStatus === "Submitted" && <CheckCircle2 size={10} />}
                                    {task.taskStatus === "Overdue" && <AlertCircle size={10} />}
                                    {task.taskStatus === "Open" && <Clock size={10} />}
                                    {task.taskStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                  {task.lastSubmissionDate
                                    ? new Date(task.lastSubmissionDate).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleViewAndSubmit(task)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm inline-flex items-center gap-1 transition-colors"
                                  >
                                    View & Submit <ChevronRight size={12} />
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      task.clientApprovalStatus === "Approved"
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : task.clientApprovalStatus === "Sent"
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {task.clientApprovalStatus}
                                  </span>
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
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
