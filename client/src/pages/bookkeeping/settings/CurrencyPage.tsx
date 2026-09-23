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
  Coins,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  X,
  Building,
} from "lucide-react";

export default function CurrencyPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/currency");
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

  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [currencyForm, setCurrencyForm] = useState<any>({
    id: null,
    currencyName: "",
    code: "",
    symbol: "",
    rate: 1.0,
    isDefault: false,
  });

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/currencies`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const saveCurrencyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/currencies`, payload);
      if (!res.ok) throw new Error("Failed to save currency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Currency Saved", description: "Currency rate details saved." });
      setIsAddCurrencyModalOpen(false);
      setCurrencyForm({ id: null, currencyName: "", code: "", symbol: "", rate: 1.0, isDefault: false });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (currencyId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/currencies/${currencyId}`);
      if (!res.ok) throw new Error("Failed to delete currency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Currency Deleted", description: "Currency rate removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const syncRatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/currencies/sync-rates`);
      if (!res.ok) throw new Error("Failed to sync rates");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Rates Synchronised", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
            <span className="font-bold text-purple-700">Currency</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/currency`)}
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
                  Currency & Exchange Rates
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Maintain foreign currency conversion rates with GBP (£) base currency benchmark synchronization.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="currency" clientId={effectiveClientId} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Multi-Currency & Exchange Rates</h3>
              <p className="text-xs text-slate-500">
                Base Currency is <strong>Pound Sterling (GBP £)</strong>. Maintain official exchange conversion rates for international sales and purchases.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncRatesMutation.mutate()}
                disabled={syncRatesMutation.isPending}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={syncRatesMutation.isPending ? "animate-spin" : ""} />
                <span>{syncRatesMutation.isPending ? "Syncing..." : "Sync Benchmark Rates"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrencyForm({ id: null, currencyName: "", code: "", symbol: "", rate: 1.0, isDefault: false });
                  setIsAddCurrencyModalOpen(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Currency</span>
              </button>
            </div>
          </div>

          {/* Currency Rates Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Currency Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Conversion Rate (to 1 GBP)</th>
                    <th className="py-3 px-4">Primary Default</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currencies.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{c.currencyName}</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{c.symbol}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        1 GBP = {c.rate.toFixed(4)} {c.code}
                      </td>
                      <td className="py-3 px-4">
                        {c.isDefault ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <Check size={11} /> Default
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrencyForm({
                              id: c.id,
                              currencyName: c.currencyName,
                              code: c.code,
                              symbol: c.symbol,
                              rate: c.rate,
                              isDefault: c.isDefault,
                            });
                            setIsAddCurrencyModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit Currency Rate"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove currency "${c.currencyName}" (${c.code})?`)) {
                              deleteCurrencyMutation.mutate(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Currency"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Currency Modal */}
      {isAddCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {currencyForm.id ? "Edit Currency Rate" : "Add New Currency"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCurrencyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrencyMutation.mutate(currencyForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United States Dollar"
                  value={currencyForm.currencyName}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, currencyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISO Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="USD"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Currency Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="$"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    className="w-full font-bold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Exchange Rate to 1 GBP *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  placeholder="1.2694"
                  value={currencyForm.rate}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, rate: parseFloat(e.target.value) || 1.0 })}
                  className="w-full font-mono font-bold text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Example: If 1 GBP = 1.25 USD, enter 1.2500
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="currDefault"
                  checked={currencyForm.isDefault}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, isDefault: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="currDefault" className="font-semibold text-slate-700 cursor-pointer">
                  Set as primary default foreign currency
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCurrencyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCurrencyMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveCurrencyMutation.isPending ? "Saving..." : "Save Currency"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
