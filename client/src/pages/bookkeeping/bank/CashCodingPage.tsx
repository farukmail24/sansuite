import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { getClientSidebar } from "../sidebar";
import ClientGuard from "../ClientGuard";
import {
  Table, CheckSquare, Square, Check, X, Sparkles,
  Sliders, ArrowDownRight, ArrowUpRight, Search, ChevronRight,
  Save, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";

export default function CashCodingPage() {
  const [match, params] = useRoute("/bookkeeping/:id/cash-coding");
  const clientId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "out" | "in">("all");

  // Local grid edits: Map of txId -> { payeeName, nominalCode, vatRate }
  const [rowEdits, setRowEdits] = useState<Record<number, { payeeName?: string; nominalCode?: string; vatRate?: string }>>({});

  // Bulk assign form
  const [bulkPayee, setBulkPayee] = useState("");
  const [bulkNominal, setBulkNominal] = useState("");
  const [bulkVat, setBulkVat] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: cashData, isLoading, refetch } = useQuery({
    queryKey: [`/api/bookkeeping/cash-coding/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return { transactions: [], accounts: [], contacts: [] };
      const res = await apiRequest("GET", `/api/bookkeeping/cash-coding/client/${clientId}`);
      if (!res.ok) return { transactions: [], accounts: [], contacts: [] };
      return res.json();
    },
    enabled: !!clientId,
  });

  const transactions = cashData?.transactions || [];
  const accounts = cashData?.accounts || [];
  const contactsList = cashData?.contacts || [];

  const reconcileMutation = useMutation({
    mutationFn: async (itemsToReconcile: any[]) => {
      const res = await apiRequest("POST", "/api/bookkeeping/cash-coding/batch-reconcile", {
        items: itemsToReconcile
      });
      if (!res.ok) throw new Error("Batch reconciliation failed");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/cash-coding/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`] });
      setSelectedIds([]);
      setRowEdits({});
      toast({
        title: "Reconciled Successfully",
        description: data.message || `Reconciled ${data.reconciledCount} transaction(s).`
      });
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
      refetch();
      toast({
        title: "Rules Applied",
        description: data.message || `Coded ${data.matchedCount} transaction(s).`
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  });

  if (!clientId) return <ClientGuard featureTitle="Cash Coding" />;

  // Filter transactions
  const filtered = transactions.filter((tx: any) => {
    const isOut = parseFloat(tx.credit || "0") > 0;
    const isIn = parseFloat(tx.debit || "0") > 0;
    if (filterType === "out" && !isOut) return false;
    if (filterType === "in" && !isIn) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const payee = (rowEdits[tx.id]?.payeeName || tx.payeeName || "").toLowerCase();
      const code = (rowEdits[tx.id]?.nominalCode || tx.nominalCode || "").toLowerCase();
      return desc.includes(term) || payee.includes(term) || code.includes(term);
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((t: any) => t.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleApplyBulk = () => {
    if (selectedIds.length === 0) {
      toast({ title: "No Selection", description: "Please select rows to apply bulk codes.", type: "error" });
      return;
    }
    const updated = { ...rowEdits };
    for (const id of selectedIds) {
      updated[id] = {
        ...updated[id],
        ...(bulkPayee ? { payeeName: bulkPayee } : {}),
        ...(bulkNominal ? { nominalCode: bulkNominal } : {}),
        ...(bulkVat ? { vatRate: bulkVat } : {}),
      };
    }
    setRowEdits(updated);
    toast({ title: "Bulk Applied", description: `Applied values to ${selectedIds.length} selected row(s).` });
  };

  const handleReconcileSelected = () => {
    if (selectedIds.length === 0) {
      toast({ title: "No Rows Selected", description: "Select at least one transaction to reconcile.", type: "error" });
      return;
    }

    const payload = selectedIds.map(id => {
      const tx = transactions.find((t: any) => t.id === id);
      const edit = rowEdits[id] || {};
      return {
        transactionId: id,
        payeeName: edit.payeeName !== undefined ? edit.payeeName : tx.payeeName,
        nominalCode: edit.nominalCode !== undefined ? edit.nominalCode : (tx.nominalCode || "7300"),
        vatRate: edit.vatRate !== undefined ? edit.vatRate : (tx.vatRate || "20.00"),
        description: tx.description,
      };
    });

    reconcileMutation.mutate(payload);
  };

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Top Breadcrumb & Actions */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <button onClick={() => navigate(`/bookkeeping/${clientId}/bank`)} className="hover:text-purple-600">{client?.clientName || "Client"}</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-900">Cash Coding</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => applyRulesMutation.mutate()}
              disabled={applyRulesMutation.isPending}
              className="px-3.5 py-1.5 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles size={15} />
              {applyRulesMutation.isPending ? "Applying..." : "Auto-Code with Rules"}
            </button>
            <button
              onClick={() => navigate(`/bookkeeping/${clientId}/bank-rules`)}
              className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Sliders size={15} /> Manage Rules
            </button>
            <button
              onClick={handleReconcileSelected}
              disabled={selectedIds.length === 0 || reconcileMutation.isPending}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              {reconcileMutation.isPending ? "Reconciling..." : `Save & Reconcile (${selectedIds.length})`}
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-4">
          {/* Header Description */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Coding Grid</h1>
            <p className="text-sm text-gray-500 mt-1">
              Rapidly categorize and reconcile high-volume bank statement lines in a spreadsheet view with multi-line selection.
            </p>
          </div>

          {/* Bulk Action Bar (Active when rows selected) */}
          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  Bulk Assign to Selected ({selectedIds.length})
                </span>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Search & Type Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs w-48 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterType === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType("out")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterType === "out" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}
                  >
                    Spent
                  </button>
                  <button
                    onClick={() => setFilterType("in")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterType === "in" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}
                  >
                    Received
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Set Payee</label>
                <input
                  type="text"
                  value={bulkPayee}
                  onChange={(e) => setBulkPayee(e.target.value)}
                  placeholder="e.g. Shell UK"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Set Nominal Code</label>
                <select
                  value={bulkNominal}
                  onChange={(e) => setBulkNominal(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Leave as is --</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.nominalCode}>{a.nominalCode} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Set VAT Rate</label>
                <select
                  value={bulkVat}
                  onChange={(e) => setBulkVat(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Leave as is --</option>
                  <option value="20.00">Standard 20%</option>
                  <option value="5.00">Reduced 5%</option>
                  <option value="0.00">Zero 0%</option>
                  <option value="0.00">Exempt</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleApplyBulk}
                  disabled={selectedIds.length === 0}
                  className="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  Apply to Selected
                </button>
              </div>
            </div>
          </div>

          {/* Cash Coding Grid Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500 text-sm">Loading cash coding transactions...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-base font-semibold text-gray-900">All Caught Up!</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                  There are no unreconciled bank transactions requiring coding at this time.
                </p>
                <button
                  onClick={() => navigate(`/bookkeeping/${clientId}/bank`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Return to Bank Dashboard
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filtered.length && filtered.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 w-24">Date</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 w-24 text-right">Spent (£)</th>
                      <th className="py-3 px-3 w-24 text-right">Received (£)</th>
                      <th className="py-3 px-3 w-44">Payee / Contact</th>
                      <th className="py-3 px-3 w-56">Nominal Account</th>
                      <th className="py-3 px-3 w-28">VAT Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((tx: any) => {
                      const isSelected = selectedIds.includes(tx.id);
                      const currentEdit = rowEdits[tx.id] || {};
                      const payeeVal = currentEdit.payeeName !== undefined ? currentEdit.payeeName : (tx.payeeName || "");
                      const nominalVal = currentEdit.nominalCode !== undefined ? currentEdit.nominalCode : (tx.nominalCode || "7300");
                      const vatVal = currentEdit.vatRate !== undefined ? currentEdit.vatRate : (tx.vatRate || "20.00");

                      const spent = parseFloat(tx.credit || "0");
                      const received = parseFloat(tx.debit || "0");

                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors ${isSelected ? "bg-purple-50/60" : "hover:bg-gray-50/70"}`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(tx.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-600 whitespace-nowrap">
                            {new Date(tx.transactionDate).toLocaleDateString("en-GB")}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-900 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-700 whitespace-nowrap">
                            {spent > 0 ? `£${spent.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {received > 0 ? `£${received.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={payeeVal}
                              onChange={(e) => {
                                setRowEdits({
                                  ...rowEdits,
                                  [tx.id]: { ...currentEdit, payeeName: e.target.value }
                                });
                              }}
                              placeholder="Enter Payee"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={nominalVal}
                              onChange={(e) => {
                                setRowEdits({
                                  ...rowEdits,
                                  [tx.id]: { ...currentEdit, nominalCode: e.target.value }
                                });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                            >
                              {accounts.map((a: any) => (
                                <option key={a.id} value={a.nominalCode}>{a.nominalCode} - {a.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={vatVal}
                              onChange={(e) => {
                                setRowEdits({
                                  ...rowEdits,
                                  [tx.id]: { ...currentEdit, vatRate: e.target.value }
                                });
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                            >
                              <option value="20.00">20%</option>
                              <option value="5.00">5%</option>
                              <option value="0.00">0%</option>
                              <option value="0.00">Exempt</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
