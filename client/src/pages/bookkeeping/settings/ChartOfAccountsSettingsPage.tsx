import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "../sidebar";
import SettingsTabs from "../../../components/bookkeeping/SettingsTabs";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  ChevronRight,
  Building2,
  ListTree,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  Save,
  X,
  Building,
} from "lucide-react";

export default function ChartOfAccountsSettingsPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/chart-of-accounts");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const rawClientId = params1?.id || params2?.id || "";

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const effectiveClientId = useMemo(() => {
    if (rawClientId) return rawClientId;
    if (clients.length > 0) return String(clients[0].id);
    return "";
  }, [rawClientId, clients]);

  const activeClient = useMemo(() => {
    return clients.find((c: any) => String(c.id) === String(effectiveClientId));
  }, [clients, effectiveClientId]);

  const [coaSearch, setCoaSearch] = useState("");
  const [coaCategoryFilter, setCoaCategoryFilter] = useState("All");
  const [coaStatusFilter, setCoaStatusFilter] = useState("All");
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<any>({
    id: null,
    code: "",
    name: "",
    category: "Turnover",
    group: "Turnover",
    status: "Normal",
  });

  const { data: coaAccounts = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/accounts`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const filteredCoa = useMemo(() => {
    return coaAccounts.filter((acc: any) => {
      const matchSearch =
        acc.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
        acc.code.toLowerCase().includes(coaSearch.toLowerCase());
      const matchCat = coaCategoryFilter === "All" || acc.category === coaCategoryFilter;
      const matchStatus = coaStatusFilter === "All" || acc.status === coaStatusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [coaAccounts, coaSearch, coaCategoryFilter, coaStatusFilter]);

  const saveAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/accounts`, payload);
      if (!res.ok) throw new Error("Failed to save account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`] });
      toast({ title: "Account Saved", description: "Chart of Accounts updated." });
      setIsAddAccountModalOpen(false);
      setAccountForm({ id: null, code: "", name: "", category: "Turnover", group: "Turnover", status: "Normal" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/accounts/${accountId}`);
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`] });
      toast({ title: "Account Deleted", description: "Nominal account removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleExportCoaCsv = () => {
    const headers = ["Nominal Code,Account Name,Category,Group,Status,System Account\n"];
    const rows = filteredCoa.map((a: any) =>
      `"${a.code}","${a.name}","${a.category}","${a.group}","${a.status}","${a.isSystem ? "Yes" : "No"}"`
    );
    const blob = new Blob([headers.join("") + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Chart_of_Accounts_${effectiveClientId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout
      sidebar={effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar}
      module="Bookkeeping"
    >
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Navigation Breadcrumb & Client Switcher */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700">Chart of Accounts</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/chart-of-accounts`)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 max-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Chart of Accounts
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Maintain nominal ledger accounts, categorize income, expenditures, assets, liabilities, and manage account statuses.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="chart_of_accounts" clientId={effectiveClientId} />

          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search accounts or code..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <select
                value={coaCategoryFilter}
                onChange={(e) => setCoaCategoryFilter(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Turnover">Turnover / Income</option>
                <option value="Cost of Sales">Cost of Sales</option>
                <option value="Administrative Expenses">Administrative Expenses</option>
                <option value="Current Assets">Current Assets</option>
                <option value="Fixed Assets">Fixed Assets</option>
                <option value="Current Liabilities">Current Liabilities</option>
                <option value="Long Term Liabilities">Long Term Liabilities</option>
                <option value="Equity">Equity</option>
                <option value="Bank">Bank & Cash</option>
              </select>

              <select
                value={coaStatusFilter}
                onChange={(e) => setCoaStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Normal">Normal</option>
                <option value="Archive">Archive</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCoaCsv}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountForm({ id: null, code: "", name: "", category: "Turnover", group: "Turnover", status: "Normal" });
                  setIsAddAccountModalOpen(true);
                }}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Nominal Account</span>
              </button>
            </div>
          </div>

          {/* COA Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Nominal Accounts ({filteredCoa.length})</span>
            </div>
            {filteredCoa.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                  <ListTree size={24} />
                </div>
                <div className="text-sm font-bold text-slate-800">No Nominal Accounts Found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Adjust your search or filter, or add a custom nominal account to your Chart of Accounts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/40">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Group Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCoa.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-purple-700">{acc.code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{acc.name}</span>
                            {acc.isSystem && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                System
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-slate-700 bg-slate-100">
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{acc.group}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-xs ${acc.status === "Normal"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {acc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAccountForm({
                                id: acc.id,
                                code: acc.code,
                                name: acc.name,
                                category: acc.category,
                                group: acc.group,
                                status: acc.status,
                              });
                              setIsAddAccountModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Edit Account"
                          >
                            <Edit2 size={13} />
                          </button>
                          {!acc.isSystem && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete account "${acc.name}" (${acc.code})?`)) {
                                  deleteAccountMutation.mutate(acc.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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

      {/* Add/Edit Nominal Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {accountForm.id ? "Edit Nominal Account" : "Add Nominal Account"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAccountMutation.mutate(accountForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4005"
                  value={accountForm.code}
                  onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                  className="w-full font-mono font-bold text-purple-700 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Subscriptions"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full font-semibold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Accounting Category *</label>
                <select
                  value={accountForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setAccountForm({ ...accountForm, category: cat, group: cat });
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Turnover">Turnover / Income</option>
                  <option value="Cost of Sales">Cost of Sales</option>
                  <option value="Administrative Expenses">Administrative Expenses</option>
                  <option value="Current Assets">Current Assets</option>
                  <option value="Fixed Assets">Fixed Assets</option>
                  <option value="Current Liabilities">Current Liabilities</option>
                  <option value="Long Term Liabilities">Long Term Liabilities</option>
                  <option value="Equity">Equity</option>
                  <option value="Bank">Bank & Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub-Group</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Expenses"
                  value={accountForm.group}
                  onChange={(e) => setAccountForm({ ...accountForm, group: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={accountForm.status}
                  onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Normal">Normal (Active)</option>
                  <option value="Archive">Archive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveAccountMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveAccountMutation.isPending ? "Saving..." : "Save Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
