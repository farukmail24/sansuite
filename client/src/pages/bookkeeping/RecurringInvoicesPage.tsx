import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Save, Plus, X, Repeat, Play, Pause, Trash2, Mail, Send,
  CheckCircle2, Clock, Search, ChevronRight, AlertCircle
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function RecurringInvoicesPage() {
  const [match, params] = useRoute("/bookkeeping/:id/recurring-invoices");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    profileName: "",
    customerName: "",
    amount: "",
    frequency: "Monthly",
    startDate: new Date().toISOString().split("T")[0],
    autoSendEmail: true,
    recipientEmail: "",
    emailSubject: "",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Authentic recurring invoice templates from MySQL
  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookkeeping/recurring", clientId, "invoice"],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/recurring/client/${clientId}?type=invoice`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId
  });

  const createProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/recurring", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "invoice"] });
      setShowModal(false);
      setFormData({
        profileName: "",
        customerName: "",
        amount: "",
        frequency: "Monthly",
        startDate: new Date().toISOString().split("T")[0],
        autoSendEmail: true,
        recipientEmail: "",
        emailSubject: "",
      });
      toast({ title: "Template Saved", description: "Recurring sales invoice template activated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save template", type: "error" });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/bookkeeping/recurring/${id}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "invoice"] });
      toast({ title: "Status Updated", description: "Recurring invoice template status changed." });
    }
  });

  const dispatchNowMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/recurring/${id}/dispatch`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to dispatch recurring invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "invoice"] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      toast({
        title: "Invoice Dispatched",
        description: data.message || "Recurring invoice generated and sent according to schedule."
      });
    },
    onError: (err: any) => {
      toast({ title: "Dispatch Failed", description: err.message, type: "error" });
    }
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/recurring/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "invoice"] });
      toast({ title: "Template Deleted", description: "Recurring profile has been removed." });
    }
  });

  const saveTemplate = () => {
    if (!formData.profileName || !formData.amount) {
      toast({ title: "Error", description: "Please enter profile name and amount", type: "error" });
      return;
    }
    createProfileMutation.mutate({
      clientId: Number(clientId),
      profileType: "invoice",
      profileName: formData.profileName,
      partyName: formData.customerName,
      amount: formData.amount,
      frequency: formData.frequency,
      startDate: formData.startDate,
      nextRun: formData.startDate,
      status: "Active"
    });
  };

  const filteredTemplates = templates.filter((t: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.profileName?.toLowerCase().includes(q) ||
      t.partyName?.toLowerCase().includes(q) ||
      t.frequency?.toLowerCase().includes(q)
    );
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Recurring Invoices" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Navigation Breadcrumb */}
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <ChevronRight size={14} />
            <span className="text-gray-800">Recurring Invoices</span>
          </div>
          <button
            onClick={() => {
              setFormData({
                profileName: "",
                customerName: "",
                amount: "",
                frequency: "Monthly",
                startDate: new Date().toISOString().split("T")[0],
                autoSendEmail: true,
                recipientEmail: client?.email || "",
                emailSubject: `Invoice from ${client?.clientName || "SanSuite"}`,
              });
              setShowModal(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={14} /> New Recurring Template
          </button>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                  <Repeat size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-base">Recurring Invoices & Email Automation</h2>
                  <p className="text-xs text-gray-500">Automate recurring customer retainer invoices and scheduled email delivery (Capium parity).</p>
                </div>
              </div>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-10 text-center text-sm text-gray-500">Loading recurring templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Repeat size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">No Recurring Invoices Configured</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
                  Set up repeating customer invoices on weekly, monthly, or quarterly schedules to automate regular retainer and subscription billing with automatic email dispatch.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> Create First Template
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 text-[11px] font-semibold text-gray-500 border-b border-gray-200 uppercase tracking-wider">
                      <th className="px-5 py-3">Profile Name</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3">Frequency</th>
                      <th className="px-5 py-3">Next Run</th>
                      <th className="px-5 py-3">Email Automation</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTemplates.map((t: any) => (
                      <tr key={t.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-800">{t.profileName}</td>
                        <td className="px-5 py-3.5 text-gray-600">{t.partyName || "-"}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                          £{parseFloat(t.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{t.frequency}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={12} className="text-gray-400" />
                            {t.nextRun ? new Date(t.nextRun).toLocaleDateString("en-GB") : "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Mail size={11} /> Auto-Email Active
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* DISPATCH NOW BUTTON */}
                            <button
                              onClick={() => dispatchNowMutation.mutate(t.id)}
                              disabled={dispatchNowMutation.isPending}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                              title="Run / Dispatch Now (Instant generate invoice)"
                            >
                              <Send size={14} />
                            </button>
                            {/* TOGGLE PAUSE/ACTIVE */}
                            <button
                              onClick={() => toggleStatusMutation.mutate(t.id)}
                              className={`p-1.5 rounded-md cursor-pointer ${t.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={t.status === 'Active' ? 'Pause Schedule' : 'Resume Schedule'}
                            >
                              {t.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            {/* DELETE */}
                            <button
                              onClick={() => {
                                if (confirm(`Delete recurring schedule "${t.profileName}"?`)) {
                                  deleteProfileMutation.mutate(t.id);
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100 cursor-pointer"
                              title="Delete Schedule"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Recurring Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <Repeat size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Create Recurring Invoice Template</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Profile Name *</label>
                <input
                  type="text"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  placeholder="e.g. Monthly Accountancy Retainer"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Acme Corp Ltd"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Frequency *</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">First Generation Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Recurring Email Automation (Capium Parity) */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-purple-600" />
                    <span className="font-bold text-purple-900">Email Automation (Capium Parity)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoSendEmail}
                      onChange={(e) => setFormData({ ...formData, autoSendEmail: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Automatically email the generated sales invoice PDF to the customer as soon as the scheduled recurrence runs.
                </p>

                {formData.autoSendEmail && (
                  <div className="space-y-2 pt-1 border-t border-purple-100">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">Customer Recipient Email</label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                        placeholder="billing@customer.co.uk"
                        className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">Custom Email Subject</label>
                      <input
                        type="text"
                        value={formData.emailSubject}
                        onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                        placeholder="Invoice from {company} - {profileName}"
                        className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={createProfileMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} /> {createProfileMutation.isPending ? "Activating..." : "Activate Recurring Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
