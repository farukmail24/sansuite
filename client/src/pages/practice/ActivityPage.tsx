import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import {
  Activity, Mail, Users, Search, Calendar,
  Eye, CheckCircle2, Clock, AlertCircle,
  FileText, ArrowLeft, RefreshCw, Filter, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { formatDate } from "../../lib/dateUtils";

export default function ActivityPage() {
  // Top Activity Sub-Tabs: "general" | "email" | "user"
  const [activeTab, setActiveTab] = useState<"general" | "email" | "user">("general");

  // Tab 1: General Activity State
  const [generalCategory, setGeneralCategory] = useState("Show All");
  const [generalTimeframe, setGeneralTimeframe] = useState("7"); // days: 7, 30, 90, all

  // Tab 2: Email Activity State
  const [emailSearch, setEmailSearch] = useState("");
  const [emailFromDate, setEmailFromDate] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]);
  const [emailToDate, setEmailToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedEmailView, setSelectedEmailView] = useState<any>(null);

  // Tab 3: User Activity State
  const [userLogSearch, setUserLogSearch] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState("All");
  const [selectedActionFilter, setSelectedActionFilter] = useState("All");
  const [userFromDate, setUserFromDate] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]);
  const [userToDate, setUserToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Fetch Practice Users
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Audit Logs (User Activity)
  const { data: auditLogsList = [], isLoading: isLoadingLogs } = useQuery<any[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/logs");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Email Conversations (Email Logs)
  const { data: emailConversations = [], isLoading: isLoadingEmails } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations");
      if (!res.ok) return [];
      return res.json();
    }
  });


  // Filtered Email Logs
  const filteredEmails = useMemo(() => {
    return emailConversations.filter((c: any) => {
      if (emailSearch.trim()) {
        const q = emailSearch.toLowerCase();
        const matchSub = (c.subject || "").toLowerCase().includes(q);
        const matchRec = (c.recipientEmails || "").toLowerCase().includes(q);
        const matchSender = (c.senderEmail || "").toLowerCase().includes(q);
        if (!matchSub && !matchRec && !matchSender) return false;
      }
      return true;
    });
  }, [emailConversations, emailSearch]);

  // Filtered User Activity Logs
  const filteredUserLogs = useMemo(() => {
    return auditLogsList.filter((log: any) => {
      if (selectedUserFilter !== "All" && log.user !== selectedUserFilter && String(log.userId) !== selectedUserFilter) {
        return false;
      }
      if (selectedActionFilter !== "All" && log.action?.toLowerCase() !== selectedActionFilter.toLowerCase()) {
        return false;
      }
      if (userLogSearch.trim()) {
        const q = userLogSearch.toLowerCase();
        const matchDesc = (log.details || "").toLowerCase().includes(q);
        const matchAction = (log.action || "").toLowerCase().includes(q);
        const matchUser = (log.user || "").toLowerCase().includes(q);
        if (!matchDesc && !matchAction && !matchUser) return false;
      }
      return true;
    });
  }, [auditLogsList, selectedUserFilter, selectedActionFilter, userLogSearch]);

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        
        {/* Top Activity Sub-Tabs: Activity | Email Activity | User Activity */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-2xs">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("general")}
              className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                activeTab === "general"
                  ? "text-purple-700 dark:text-purple-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Activity
              {activeTab === "general" && (
                <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("email")}
              className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                activeTab === "email"
                  ? "text-purple-700 dark:text-purple-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Email Activity
              {activeTab === "email" && (
                <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("user")}
              className={`py-1 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                activeTab === "user"
                  ? "text-purple-700 dark:text-purple-400 font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              User Activity
              {activeTab === "user" && (
                <span className="absolute -bottom-3.5 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
              )}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUB-TAB 1: GENERAL ACTIVITY (Screenshot 1) */}
        {/* ========================================================= */}
        {activeTab === "general" && (
          <div className="p-6 space-y-4">
            {/* Header with Title & Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Activity</span>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={generalCategory}
                  onChange={(e) => setGeneralCategory(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 min-w-[140px]"
                >
                  <option value="Show All">Show All</option>
                  <option value="Clients">Clients</option>
                  <option value="Deadlines">Deadlines</option>
                  <option value="Tasks">Tasks</option>
                  <option value="Documents">Documents</option>
                </select>

                <select
                  value={generalTimeframe}
                  onChange={(e) => setGeneralTimeframe(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 min-w-[160px]"
                >
                  <option value="7">Show last 7 days</option>
                  <option value="30">Show last 30 days</option>
                  <option value="90">Show last 90 days</option>
                  <option value="all">Show All</option>
                </select>
              </div>
            </div>

            {/* Activity Table / Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs min-h-[350px] flex items-center justify-center p-8">
              {auditLogsList.length === 0 ? (
                <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">
                  No Records found
                </span>
              ) : (
                <div className="w-full">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Activity Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogsList.map((log: any) => (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(log.createdAt)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{log.user || "Practice Admin"}</td>
                          <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-medium text-[11px]">{log.resource || "General"}</span></td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{log.details || log.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-TAB 2: EMAIL ACTIVITY (Screenshot 2) */}
        {/* ========================================================= */}
        {activeTab === "email" && (
          <div className="p-6 space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Email Logs</span>
                <input
                  type="text"
                  placeholder="Quick Search"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-56"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">From</span>
                <input
                  type="date"
                  value={emailFromDate}
                  onChange={(e) => setEmailFromDate(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800"
                />
                <span className="text-xs text-slate-500">To</span>
                <input
                  type="date"
                  value={emailToDate}
                  onChange={(e) => setEmailToDate(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800"
                />
                <button
                  onClick={() => {}}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer shadow-xs"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Email Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Sent To</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Attachment</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                          No Records found
                        </td>
                      </tr>
                    ) : (
                      filteredEmails.map((email: any) => (
                        <tr key={email.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(email.createdAt)}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{email.recipientEmails || email.clientEmail || "-"}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{email.subject}</td>
                          <td className="py-2.5 px-3 text-slate-500">{email.attachments ? "Yes" : "-"}</td>
                          <td className="py-2.5 px-3"><span className="text-emerald-600 font-semibold">{email.status || "Sent"}</span></td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{email.sentByUser || "Practice User"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedEmailView(email)}
                              className="text-purple-600 hover:text-purple-900 p-1 cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
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

        {/* ========================================================= */}
        {/* SUB-TAB 3: USER ACTIVITY (Screenshot 3) */}
        {/* ========================================================= */}
        {activeTab === "user" && (
          <div className="p-6 space-y-4">
            {/* Top Action Button */}
            <div className="flex items-center gap-2">
              <button className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold px-3 py-1.5 rounded shadow-2xs text-slate-800 dark:text-slate-200">
                User Actions
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">User Log</span>
                <input
                  type="text"
                  placeholder="Quick Search"
                  value={userLogSearch}
                  onChange={(e) => setUserLogSearch(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-52"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Users</span>
                  <select
                    value={selectedUserFilter}
                    onChange={(e) => setSelectedUserFilter(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 min-w-[140px]"
                  >
                    <option value="All">All Users</option>
                    {teamMembers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Actions</span>
                  <select
                    value={selectedActionFilter}
                    onChange={(e) => setSelectedActionFilter(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 min-w-[120px]"
                  >
                    <option value="All">All</option>
                    <option value="LOGIN">Login</option>
                    <option value="CLIENT_CREATE">Client Create</option>
                    <option value="CLIENT_UPDATE">Client Edit</option>
                    <option value="DEADLINE_UPDATE">Deadline Update</option>
                    <option value="TASK_UPDATE">Task Update</option>
                    <option value="LOE_GENERATE">LoE Generate</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>From</span>
                  <input
                    type="date"
                    value={userFromDate}
                    onChange={(e) => setUserFromDate(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                  />
                  <span>To</span>
                  <input
                    type="date"
                    value={userToDate}
                    onChange={(e) => setUserToDate(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                  />
                </div>

                <button
                  onClick={() => {}}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer shadow-xs"
                >
                  Go
                </button>
              </div>
            </div>

            {/* User Activity Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">User Name</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUserLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                          No Records found
                        </td>
                      </tr>
                    ) : (
                      filteredUserLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(log.createdAt)}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{log.details || log.action}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{log.user || "Practice Staff"}</td>
                          <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[11px] text-slate-700 dark:text-slate-300">{log.action}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Email View Modal */}
        {selectedEmailView && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Mail size={16} className="text-purple-600" />
                  Email Log Detail
                </h3>
                <button
                  onClick={() => setSelectedEmailView(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div><span className="font-semibold text-slate-500">Sent To:</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedEmailView.recipientEmails}</span></div>
                <div><span className="font-semibold text-slate-500">Subject:</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedEmailView.subject}</span></div>
                <div><span className="font-semibold text-slate-500">Sent Date:</span> <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedEmailView.createdAt)}</span></div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 block mb-1">Body Content:</span>
                  <div
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedEmailView.bodyHtml || `<p>${selectedEmailView.bodyText || ""}</p>` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
