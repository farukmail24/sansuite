import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Plus, X, Repeat, Play, Pause, Trash2 } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function RecurringPurchasesPage() {
  const [match, params] = useRoute("/bookkeeping/:id/recurring-purchases");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    profileName: "",
    supplierName: "",
    amount: "",
    frequency: "Monthly",
    startDate: new Date().toISOString().split("T")[0]
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Authentic recurring purchase templates from MySQL
  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookkeeping/recurring", clientId, "purchase"],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/recurring/client/${clientId}?type=purchase`);
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
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "purchase"] });
      setShowModal(false);
      setFormData({ profileName: "", supplierName: "", amount: "", frequency: "Monthly", startDate: new Date().toISOString().split("T")[0] });
      toast({ title: "Template Saved", description: "Recurring purchase template activated." });
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
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "purchase"] });
      toast({ title: "Status Updated", description: "Recurring purchase template status changed." });
    }
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/recurring/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/recurring", clientId, "purchase"] });
      toast({ title: "Template Deleted", description: "Recurring purchase schedule has been removed." });
    }
  });

  const saveTemplate = () => {
    if (!formData.profileName || !formData.amount) {
      toast({ title: "Error", description: "Please enter profile name and amount", type: "error" });
      return;
    }
    createProfileMutation.mutate({
      clientId: Number(clientId),
      profileType: "purchase",
      profileName: formData.profileName,
      partyName: formData.supplierName,
      amount: formData.amount,
      frequency: formData.frequency,
      startDate: formData.startDate,
      nextRun: formData.startDate,
      status: "Active"
    });
  };

  if (!clientId) {
    return <ClientGuard featureTitle="Recurring Purchases" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800">Recurring Purchases</span>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm">
            <Plus size={14} /> New Template
          </button>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Repeat size={16} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Automated Purchase Schedules</h2>
                <p className="text-xs text-gray-500">Automatically generate supplier purchase bills on a regular schedule.</p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-10 text-center text-sm text-gray-500">Loading recurring purchase templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Repeat size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">No Recurring Purchases Configured</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
                  Schedule regular supplier bills (such as office rent, software licenses, or recurring vendor services) to auto-generate.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus size={16} /> Create First Template
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase">
                      <th className="px-5 py-3">Profile Name</th>
                      <th className="px-5 py-3">Supplier</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3">Frequency</th>
                      <th className="px-5 py-3">Next Run</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {templates.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">{t.profileName}</td>
                        <td className="px-5 py-3 text-gray-600">{t.partyName || "-"}</td>
                        <td className="px-5 py-3 text-right font-mono font-medium text-gray-900">
                          £{parseFloat(t.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{t.frequency}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {t.nextRun ? new Date(t.nextRun).toLocaleDateString("en-GB") : "-"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right flex items-center justify-end gap-1">
                          <button 
                            onClick={() => toggleStatusMutation.mutate(t.id)}
                            className={`p-1.5 rounded-md ${t.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={t.status === 'Active' ? 'Pause Schedule' : 'Resume Schedule'}
                          >
                            {t.status === 'Active' ? <Pause size={15} /> : <Play size={15} />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete recurring purchase "${t.profileName}"?`)) {
                                deleteProfileMutation.mutate(t.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100"
                            title="Delete Schedule"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Create Recurring Purchase</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name *</label>
                <input 
                  type="text" 
                  value={formData.profileName} 
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })} 
                  placeholder="e.g. Office Rent" 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input 
                    type="text" 
                    value={formData.supplierName} 
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} 
                    placeholder="e.g. British Telecom"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                  <select 
                    value={formData.frequency} 
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={saveTemplate} 
                disabled={createProfileMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {createProfileMutation.isPending ? "Saving..." : "Activate Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
