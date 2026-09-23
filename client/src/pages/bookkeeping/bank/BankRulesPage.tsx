import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { getClientSidebar } from "../sidebar";
import ClientGuard from "../ClientGuard";
import {
  Sliders, Plus, Play, Trash2, Edit3, CheckCircle2,
  AlertCircle, ChevronRight, ArrowDownRight, ArrowUpRight,
  Filter, Sparkles, X, Check
} from "lucide-react";

export default function BankRulesPage() {
  const [match, params] = useRoute("/bookkeeping/:id/bank-rules");
  const clientId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const [formData, setFormData] = useState({
    ruleName: "",
    ruleType: "Money Out",
    priority: "1",
    fieldToMatch: "description",
    matchCondition: "contains",
    matchValue: "",
    contactId: "",
    nominalCode: "7300",
    vatRate: "20.00",
    isActive: true,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/bank-rules/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/bank-rules/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: [`/api/bookkeeping/chart-of-accounts/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/chart-of-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: contactsList = [] } = useQuery({
    queryKey: [`/api/bookkeeping/contacts/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/bank-rules", payload);
      if (!res.ok) throw new Error("Failed to save bank rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-rules/client/${clientId}`] });
      setShowModal(false);
      setEditingRule(null);
      resetForm();
      toast({ title: "Bank Rule Saved", description: "The classification rule was saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/bank-rules/${id}`);
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-rules/client/${clientId}`] });
      toast({ title: "Rule Deleted", description: "The bank rule has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  });

  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/bank-rules/apply/${clientId}`);
      if (!res.ok) throw new Error("Failed to apply rules");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/cash-coding/client/${clientId}`] });
      toast({
        title: "Rules Applied",
        description: data.message || `Matched and coded ${data.matchedCount} transaction(s).`
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  });

  const resetForm = () => {
    setFormData({
      ruleName: "",
      ruleType: "Money Out",
      priority: "1",
      fieldToMatch: "description",
      matchCondition: "contains",
      matchValue: "",
      contactId: "",
      nominalCode: "7300",
      vatRate: "20.00",
      isActive: true,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingRule(null);
    setShowModal(true);
  };

  const handleEdit = (r: any) => {
    setEditingRule(r);
    setFormData({
      ruleName: r.ruleName,
      ruleType: r.ruleType || "Money Out",
      priority: String(r.priority || "1"),
      fieldToMatch: r.fieldToMatch || "description",
      matchCondition: r.matchCondition || "contains",
      matchValue: r.matchValue,
      contactId: r.contactId ? String(r.contactId) : "",
      nominalCode: r.nominalCode || "7300",
      vatRate: r.vatRate || "20.00",
      isActive: Boolean(r.isActive),
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ruleName || !formData.matchValue) {
      toast({ title: "Validation Error", description: "Rule name and match value are required.", type: "error" });
      return;
    }
    saveRuleMutation.mutate({
      ...(editingRule ? { id: editingRule.id } : {}),
      clientId: Number(clientId),
      ...formData,
      contactId: formData.contactId ? Number(formData.contactId) : null,
    });
  };

  if (!clientId) return <ClientGuard featureTitle="Bank Rules" />;

  const activeCount = rules.filter((r: any) => r.isActive).length;
  const moneyOutCount = rules.filter((r: any) => r.ruleType === "Money Out").length;
  const moneyInCount = rules.filter((r: any) => r.ruleType === "Money In").length;

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Top Breadcrumb */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <button onClick={() => navigate(`/bookkeeping/${clientId}/bank`)} className="hover:text-purple-600">{client?.clientName || "Client"}</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-900">Bank Rules</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => applyRulesMutation.mutate()}
              disabled={applyRulesMutation.isPending || rules.length === 0}
              className="px-3.5 py-1.5 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles size={15} />
              {applyRulesMutation.isPending ? "Applying..." : "Apply Rules Now"}
            </button>
            <button
              onClick={() => navigate(`/bookkeeping/${clientId}/cash-coding`)}
              className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              Cash Coding Grid
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={15} /> New Bank Rule
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header Description */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Classification Rules</h1>
            <p className="text-sm text-gray-500 mt-1">
              Automatically categorize and code bank transactions based on keywords, payees, and amounts during reconciliation.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{rules.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Sliders size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Money Out Rules</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{moneyOutCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <ArrowDownRight size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Money In Rules</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{moneyInCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={16} className="text-purple-600" /> Configured Rules
              </h3>
              <span className="text-xs text-gray-500">Rules are executed in order of priority (1 = Highest)</span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-gray-500 text-sm">Loading bank rules...</div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-3">
                  <Sliders size={24} />
                </div>
                <h4 className="text-base font-semibold text-gray-900">No Bank Rules Configured</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                  Create automatic rules to categorize recurring transactions (e.g. Shell, Uber, Utilities) without manual coding.
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Create First Rule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 w-16 text-center">Pri</th>
                      <th className="py-3 px-4">Rule Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Assigned Payee</th>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4">VAT Rate</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rules.map((rule: any) => (
                      <tr key={rule.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-gray-600">{rule.priority}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{rule.ruleName}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            rule.ruleType === "Money Out" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {rule.ruleType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                          {rule.fieldToMatch} {rule.matchCondition} "{rule.matchValue}"
                        </td>
                        <td className="py-3 px-4 text-gray-700">{rule.payeeName || "—"}</td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-purple-700">
                          {rule.nominalCode || "—"}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{rule.vatRate}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                          }`}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Edit Rule"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete rule "${rule.ruleName}"?`)) {
                                deleteRuleMutation.mutate(rule.id);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Rule"
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

        {/* Create / Edit Rule Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <Sliders size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">
                    {editingRule ? "Edit Bank Rule" : "Create New Bank Rule"}
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rule Name *</label>
                    <input
                      type="text"
                      value={formData.ruleName}
                      onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                      placeholder="e.g. Fuel Purchases"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rule Type</label>
                    <select
                      value={formData.ruleType}
                      onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Money Out">Money Out (Spend)</option>
                      <option value="Money In">Money In (Receive)</option>
                    </select>
                  </div>
                </div>

                {/* Conditions Section */}
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-900">Matching Conditions</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Field</label>
                      <select
                        value={formData.fieldToMatch}
                        onChange={(e) => setFormData({ ...formData, fieldToMatch: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                      >
                        <option value="description">Description</option>
                        <option value="reference">Reference</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Condition</label>
                      <select
                        value={formData.matchCondition}
                        onChange={(e) => setFormData({ ...formData, matchCondition: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals Exact</option>
                        <option value="starts_with">Starts With</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Match Value *</label>
                      <input
                        type="text"
                        value={formData.matchValue}
                        onChange={(e) => setFormData({ ...formData, matchValue: e.target.value })}
                        placeholder="e.g. Shell"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Assign Actions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Assign Payee / Contact</label>
                      <select
                        value={formData.contactId}
                        onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">-- No Contact --</option>
                        {contactsList.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.contactType})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nominal Account Code *</label>
                      <select
                        value={formData.nominalCode}
                        onChange={(e) => setFormData({ ...formData, nominalCode: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                        required
                      >
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.nominalCode}>{a.nominalCode} - {a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">VAT Rate (%)</label>
                      <select
                        value={formData.vatRate}
                        onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="20.00">Standard 20%</option>
                        <option value="5.00">Reduced 5%</option>
                        <option value="0.00">Zero 0%</option>
                        <option value="0.00">Exempt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Priority (1 to 10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    Enable this rule immediately
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveRuleMutation.isPending}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                      {saveRuleMutation.isPending ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
