import { useState, useEffect, useMemo } from "react";
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
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
} from "lucide-react";

export default function OpeningBalancePage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/opening-balance");
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

  const [obDate, setObDate] = useState("");
  const [obRows, setObRows] = useState<
    { id?: number; accountName: string; nominalCode: string; debit: number; credit: number }[]
  >([]);

  const { data: coaAccounts = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/accounts`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const { data: obData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/opening-balances`],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/opening-balances`);
      return res.ok ? res.json() : null;
    },
    enabled: !!effectiveClientId,
  });

  useEffect(() => {
    if (obData) {
      setObDate(obData.balanceDate || new Date().toISOString().split("T")[0]);
      if (obData.balances && obData.balances.length > 0) {
        setObRows(obData.balances);
      } else {
        setObRows([
          { accountName: "Current Bank Account", nominalCode: "1200", debit: 0, credit: 0 },
          { accountName: "Accounts Receivable (Debtors)", nominalCode: "1100", debit: 0, credit: 0 },
          { accountName: "Opening Retained Earnings", nominalCode: "3200", debit: 0, credit: 0 },
        ]);
      }
    }
  }, [obData]);

  const addObRow = () => {
    setObRows([...obRows, { accountName: "", nominalCode: "", debit: 0, credit: 0 }]);
  };

  const removeObRow = (index: number) => {
    setObRows(obRows.filter((_, i) => i !== index));
  };

  const updateObRow = (index: number, field: string, value: any) => {
    const updated = [...obRows];
    (updated[index] as any)[field] = value;
    setObRows(updated);
  };

  const totalDebit = useMemo(() => {
    return obRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  }, [obRows]);

  const totalCredit = useMemo(() => {
    return obRows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  }, [obRows]);

  const balanceDifference = useMemo(() => {
    return Math.abs(totalDebit - totalCredit);
  }, [totalDebit, totalCredit]);

  const isBalanced = useMemo(() => {
    return balanceDifference < 0.009;
  }, [balanceDifference]);

  const saveOpeningBalancesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/opening-balances`, {
        balanceDate: obDate,
        balances: obRows,
      });
      if (!res.ok) throw new Error("Failed to save opening balances");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/opening-balances`] });
      toast({ title: "Opening Balances Saved", description: "Opening balance journal recorded successfully." });
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
            <span className="font-bold text-purple-700">Opening Balance</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/opening-balance`)}
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
                  Opening Balances
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Record opening assets, liabilities, and equity balances with automatic trial balance validation.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="opening_balance" clientId={effectiveClientId} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Opening Balances Journal</h3>
              <p className="text-xs text-slate-500">
                Record opening assets, liabilities, and retained earnings as of your bookkeeping conversion date.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Balance Date:</label>
                <input
                  type="date"
                  value={obDate}
                  onChange={(e) => setObDate(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={addObRow}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Row</span>
              </button>
              <button
                type="button"
                onClick={() => saveOpeningBalancesMutation.mutate()}
                disabled={saveOpeningBalancesMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saveOpeningBalancesMutation.isPending ? "Saving..." : "Save Balances"}</span>
              </button>
            </div>
          </div>

          {/* Dynamic Balance Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Debits</span>
              <span className="text-lg font-black text-slate-900">£{totalDebit.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Credits</span>
              <span className="text-lg font-black text-slate-900">£{totalCredit.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Difference</span>
              <span className={`text-lg font-black ${isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                £{balanceDifference.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">Ledger Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-1 ${isBalanced
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                >
                  {isBalanced ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>{isBalanced ? "In Balance" : "Out of Balance"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Opening Balances Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4 w-1/2">Nominal Account</th>
                    <th className="py-3 px-4 w-28">Code</th>
                    <th className="py-3 px-4 w-40">Debit (£)</th>
                    <th className="py-3 px-4 w-40">Credit (£)</th>
                    <th className="py-3 px-4 text-right w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {obRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          list="coaAccountOptions"
                          value={row.accountName}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateObRow(idx, "accountName", val);
                            const matchCoa = coaAccounts.find((a: any) => a.name === val);
                            if (matchCoa) {
                              updateObRow(idx, "nominalCode", matchCoa.code);
                            }
                          }}
                          placeholder="Select or enter account name..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={row.nominalCode}
                          onChange={(e) => updateObRow(idx, "nominalCode", e.target.value)}
                          placeholder="Code"
                          className="w-full font-mono border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.debit || ""}
                          onChange={(e) => updateObRow(idx, "debit", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-right font-mono border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.credit || ""}
                          onChange={(e) => updateObRow(idx, "credit", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-right font-mono border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeObRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                    <td colSpan={2} className="py-3 px-4 text-right text-slate-700">
                      Grand Totals:
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      £{totalDebit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      £{totalCredit.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <datalist id="coaAccountOptions">
            {coaAccounts.map((a: any) => (
              <option key={a.id} value={a.name}>
                {a.code} - {a.name} ({a.category})
              </option>
            ))}
          </datalist>
        </div>
      </div>
    </AppLayout>
  );
}
