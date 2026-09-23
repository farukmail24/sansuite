import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  MessageSquare, Mail, Send, Filter,
  Search, Plus, X, Clock
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { formatDate } from "../../lib/dateUtils";

export default function CrmCommunicationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [commSubTab, setCommSubTab] = useState<"all" | "sms" | "scheduled">("all");
  const [commSearch, setCommSearch] = useState("");
  const [commPeriod, setCommPeriod] = useState("Last Week");
  const [commPriority, setCommPriority] = useState("All");
  const [isNewEmailModalOpen, setIsNewEmailModalOpen] = useState(false);
  const [newEmailForm, setNewEmailForm] = useState({
    recipient: "",
    subject: "",
    message: "",
    priority: "Normal",
  });

  // Fetch Communications
  const { data: communicationsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/pm/conversations/send", {
        recipientEmails: payload.recipient,
        subject: payload.subject,
        bodyHtml: `<p>${payload.message.replace(/\n/g, "<br/>")}</p>`,
        bodyText: payload.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Email Dispatched", description: "CRM communication message delivered." });
      setIsNewEmailModalOpen(false);
      setNewEmailForm({ recipient: "", subject: "", message: "", priority: "Normal" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    }
  });


  const filteredComms = communicationsList.filter((comm: any) => {
    if (commSearch.trim()) {
      const q = commSearch.toLowerCase();
      const matchTo = (comm.recipientEmails || "").toLowerCase().includes(q);
      const matchSub = (comm.subject || "").toLowerCase().includes(q);
      const matchMsg = (comm.bodyText || "").toLowerCase().includes(q);
      if (!matchTo && !matchSub && !matchMsg) return false;
    }
    return true;
  });

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        <div className="p-6 space-y-4">
          
          {/* Top Sub-Sub Tabs: All (0) | SMS | Scheduled SMS (Screenshot 3) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setCommSubTab("all")}
                className={`text-xs font-semibold pb-1 cursor-pointer transition-colors ${
                  commSubTab === "all"
                    ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({communicationsList.length})
              </button>
              <button
                onClick={() => setCommSubTab("sms")}
                className={`text-xs font-semibold pb-1 cursor-pointer transition-colors ${
                  commSubTab === "sms"
                    ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                SMS
              </button>
              <button
                onClick={() => setCommSubTab("scheduled")}
                className={`text-xs font-semibold pb-1 cursor-pointer transition-colors ${
                  commSubTab === "scheduled"
                    ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Scheduled SMS
              </button>
            </div>

            {/* Right Filter Selectors */}
            <div className="flex items-center gap-3">
              <select
                value={commPeriod}
                onChange={(e) => setCommPeriod(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1 bg-white dark:bg-slate-800 min-w-[150px]"
              >
                <option value="Last Week">Period - Last Week</option>
                <option value="Last Month">Period - Last Month</option>
                <option value="This Year">Period - This Year</option>
                <option value="All">Period - All</option>
              </select>

              <select
                value={commPriority}
                onChange={(e) => setCommPriority(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1 bg-white dark:bg-slate-800 min-w-[130px]"
              >
                <option value="All">Priority All</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Filter Search Bar & New Email Button */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Communications</span>
              <input
                type="text"
                placeholder="Quick Search for messages"
                value={commSearch}
                onChange={(e) => setCommSearch(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-64"
              />
            </div>

            <button
              onClick={() => setIsNewEmailModalOpen(true)}
              className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> New Email
            </button>
          </div>

          {/* Communications Table */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">To ▼</th>
                    <th className="py-2.5 px-3">Message ▼</th>
                    <th className="py-2.5 px-3">Priority ▼</th>
                    <th className="py-2.5 px-3">Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                        No Records found
                      </td>
                    </tr>
                  ) : (
                    filteredComms.map((comm: any) => (
                      <tr key={comm.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{comm.recipientEmails || comm.clientName}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <p className="font-semibold">{comm.subject}</p>
                          <p className="text-slate-500 text-[11px] line-clamp-1">{comm.bodyText}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Normal
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(comm.sentAt || comm.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Modal: New Email */}
      {isNewEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail size={16} className="text-purple-600" />
                Compose CRM Email
              </h3>
              <button onClick={() => setIsNewEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEmailForm.recipient || !newEmailForm.subject) {
                  toast({ title: "Validation Error", description: "Recipient and Subject are required.", variant: "destructive" });
                  return;
                }
                sendEmailMutation.mutate(newEmailForm);
              }}
              className="p-5 space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To *</label>
                <input
                  type="email"
                  placeholder="prospect@company.com"
                  value={newEmailForm.recipient}
                  onChange={(e) => setNewEmailForm({ ...newEmailForm, recipient: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Accounting Proposal Follow-up"
                  value={newEmailForm.subject}
                  onChange={(e) => setNewEmailForm({ ...newEmailForm, subject: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  rows={4}
                  placeholder="Dear Contact..."
                  value={newEmailForm.message}
                  onChange={(e) => setNewEmailForm({ ...newEmailForm, message: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {sendEmailMutation.isPending ? "Sending..." : "Dispatch Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
