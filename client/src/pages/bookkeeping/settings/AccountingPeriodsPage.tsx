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
  Calendar,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Building,
} from "lucide-react";

export default function AccountingPeriodsPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/accounting-periods");
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

  const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    startDate: "",
    endDate: "",
    periodType: "Current",
    status: "Open",
  });

  const { data: periods = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/periods`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const addPeriodMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/periods`, payload);
      if (!res.ok) throw new Error("Failed to add accounting period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Period Added", description: "Accounting period created successfully." });
      setIsAddPeriodModalOpen(false);
      setNewPeriodForm({ startDate: "", endDate: "", periodType: "Current", status: "Open" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePeriodLockMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/periods/${periodId}/toggle-lock`);
      if (!res.ok) throw new Error("Failed to toggle lock status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Status Updated", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/periods/${periodId}`);
      if (!res.ok) throw new Error("Failed to delete period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Period Deleted", description: "Accounting period removed." });
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
            <span className="font-bold text-purple-700">Accounting Periods</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/accounting-periods`)}
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

        <div className="p-6 w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Accounting Periods
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Define financial accounting years and control transaction posting lock status to prevent retroactive modifications.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="accounting_periods" clientId={effectiveClientId} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Financial Years Registry</h3>
              <p className="text-xs text-slate-500">
                Manage period start and end dates with granular lock and unlock controls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddPeriodModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Accounting Period</span>
            </button>
          </div>

          {/* Periods Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {periods.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div className="text-sm font-bold text-slate-800">No Accounting Periods Recorded</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add financial years to ensure accurate period ledger postings, journal lockouts, and year-end reporting.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(true)}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} /> Add First Accounting Period
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Period Type</th>
                      <th className="py-3 px-4">Start Date (From)</th>
                      <th className="py-3 px-4">End Date (To)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Lock Control</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periods.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.periodType === "Current"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                          >
                            {p.periodType} Period
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{p.from}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{p.to}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === "Open"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.status === "Locked"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                          >
                            {p.status === "Locked" ? <Lock size={11} /> : <CheckCircle2 size={11} />}
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => togglePeriodLockMutation.mutate(p.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${p.isLocked
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                          >
                            {p.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>{p.isLocked ? "Unlock Period" : "Lock Period"}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this accounting period?")) {
                                deletePeriodMutation.mutate(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Period"
                          >
                            <Trash2 size={14} />
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

      {/* Add Accounting Period Modal */}
      {isAddPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Add Accounting Period</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPeriodModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPeriodMutation.mutate(newPeriodForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPeriodForm({ ...newPeriodForm, periodType: "Current" })}
                    className={`py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${newPeriodForm.periodType === "Current"
                        ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Current Period
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPeriodForm({ ...newPeriodForm, periodType: "Prior" })}
                    className={`py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${newPeriodForm.periodType === "Prior"
                        ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Prior Period
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Start Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodForm.startDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Period End Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodForm.endDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={newPeriodForm.status}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPeriodMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{addPeriodMutation.isPending ? "Creating..." : "Create Period"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
