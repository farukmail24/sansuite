import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  FileCheck, Plus, Search, CheckCircle2,
  Clock, AlertCircle, ExternalLink, Copy,
  Send, Building2, Upload
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import QuickAddModal from "../../components/practice/QuickAddModal";

export default function DocumentRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [requestTitle, setRequestTitle] = useState("Year-End 2026 Document Collection");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [itemsText, setItemsText] = useState(
    "Bank Statements (Jan-Dec)\nDirector Loan Account receipts\nDividend Vouchers\nVAT summary sheets"
  );

  // Fetch Requests
  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/documents/requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/documents/requests");
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

  // Create Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const items = itemsText.split("\n").map(i => i.trim()).filter(Boolean).map(name => ({ name, uploaded: false }));
      return await apiRequest("POST", "/api/pm/documents/requests", {
        clientId,
        requestTitle,
        description,
        dueDate,
        requiredItems: items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/documents/requests"] });
      toast({ title: "Document Request Created", description: "Upload portal link ready." });
      setIsCreateOpen(false);
    }
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/public/documents/upload/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Upload Link Copied", description: url });
  };

  const filtered = requests.filter((r) =>
    r.requestTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="text-indigo-600 dark:text-indigo-400" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Document Requests & Chaser</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create structured document checklists, dispatch public upload links to clients, and track incoming receipts.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={15} />
            New Document Request
          </button>
        </div>

        {/* Filter Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search document requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Request Title</th>
                  <th className="py-3 px-4">Checklist Items</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Loading document requests...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No document requests created yet.</td>
                  </tr>
                ) : (
                  filtered.map((req) => {
                    const isCompleted = req.status === "Completed";
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          {req.clientName}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">{req.requestTitle}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {req.requiredItems?.length || 0} requested files
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {req.dueDate ? new Date(req.dueDate).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${isCompleted
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                          >
                            {isCompleted ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCopyLink(req.publicToken)}
                              title="Copy Public Upload Link"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              <Copy size={13} />
                            </button>
                            <span className="text-[11px] text-slate-400">{req.publicToken.substring(0, 8)}...</span>
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

        {/* Modal: New Document Request */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Create Document Request</h3>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Client *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Select Client --</option>
                    {clientsList.map(c => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Request Title *</label>
                  <input
                    type="text"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Requested Items Checklist (One per line)</label>
                  <textarea
                    rows={4}
                    value={itemsText}
                    onChange={(e) => setItemsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
                <button
                  disabled={!clientId || !requestTitle || createRequestMutation.isPending}
                  onClick={() => createRequestMutation.mutate()}
                  className="px-4 py-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {createRequestMutation.isPending ? "Creating..." : "Create Request Link"}
                </button>
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
