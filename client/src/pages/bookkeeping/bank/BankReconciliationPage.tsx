import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { getClientSidebar } from "../sidebar";
import {
  FileText, LayoutDashboard, ShoppingCart, Wallet, BarChart2, Settings,
  ChevronRight, ArrowRightLeft, Search, CheckCircle, Plus, X, Building
} from "lucide-react";

export default function BankReconciliationPage() {
  const [match, params] = useRoute("/bookkeeping/:id/bank/:accountId/reconcile");
  const [, navigate] = useLocation();
  const clientId = params?.id;
  const accountId = params?.accountId;
  const { toast } = useToast();

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [searchTarget, setSearchTarget] = useState("");



  // Fetch Clients
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Fetch Bank Accounts (to get name)
  const { data: accounts = [] } = useQuery({
    queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });
  const account = accounts.find((a: any) => String(a.id) === accountId);

  // Fetch Bank Transactions
  const { data: transactions = [], isLoading: isLoadingTx } = useQuery({
    queryKey: [`/api/bookkeeping/bank-accounts/${accountId}/transactions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/${accountId}/transactions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!accountId,
  });

  const unreconciledTx = transactions.filter((t: any) => !t.isReconciled);
  const reconciledTxCount = transactions.filter((t: any) => t.isReconciled).length;

  // Fetch Unmatched Targets (Invoices & Bills)
  const { data: unmatched = { invoices: [], bills: [] }, isLoading: isLoadingTargets } = useQuery({
    queryKey: [`/api/bookkeeping/reconciliation/unmatched/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/reconciliation/unmatched/${clientId}`);
      if (!res.ok) return { invoices: [], bills: [] };
      return res.json();
    },
    enabled: !!clientId,
  });

  const allTargets = [...unmatched.invoices, ...unmatched.bills].filter(t =>
    t.invoiceNumber?.toLowerCase().includes(searchTarget.toLowerCase()) ||
    t.billNumber?.toLowerCase().includes(searchTarget.toLowerCase()) ||
    t.grandTotal.includes(searchTarget)
  );

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    description: "",
    type: "in" as "in" | "out",
    amount: ""
  });

  // Real manual statement line entry mutation
  const addStatementLineMutation = useMutation({
    mutationFn: async () => {
      const numAmt = parseFloat(entryForm.amount || "0");
      if (!entryForm.description || numAmt <= 0) {
        throw new Error("Please enter a valid description and amount");
      }
      const payload = {
        clientId: Number(clientId),
        transactionDate: entryForm.transactionDate,
        description: entryForm.description,
        debit: entryForm.type === 'in' ? numAmt.toFixed(2) : "0.00",
        credit: entryForm.type === 'out' ? numAmt.toFixed(2) : "0.00",
      };
      const res = await apiRequest("POST", `/api/bookkeeping/bank-accounts/${accountId}/transactions`, payload);
      if (!res.ok) throw new Error("Failed to record bank transaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/${accountId}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`] });
      setShowEntryModal(false);
      setEntryForm({
        transactionDate: new Date().toISOString().split('T')[0],
        description: "",
        type: "in",
        amount: ""
      });
      toast({ title: "Statement Line Added", description: "Bank transaction recorded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to add statement line", type: "error" });
    }
  });

  // Match Mutation
  const matchMutation = useMutation({
    mutationFn: async ({ txId, targetId, targetType }: { txId: number, targetId: number, targetType: string }) => {
      const res = await apiRequest("POST", "/api/bookkeeping/reconciliation/match", {
        clientId,
        transactionId: txId,
        matchedToId: targetId,
        matchedToType: targetType
      });
      if (!res.ok) throw new Error("Failed to match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/${accountId}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/reconciliation/unmatched/${clientId}`] });
      toast({ title: "Reconciled Successfully", description: "The transaction has been matched and cleared." });
      setSelectedTx(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reconcile transaction." });
    }
  });

  return (
    <AppLayout sidebar={getClientSidebar(clientId || "")} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}/bank`)} className="hover:text-purple-600 transition-colors">Bank Accounts</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">Reconcile: {account?.bankName || 'Account'}</span>
          </div>
        </div>

        <div className="p-6 flex-1 max-w-[1600px] w-full mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Bank Reconciliation</h1>
              <p className="text-gray-500 text-sm mt-1">Match statement lines with invoices and purchases.</p>
            </div>

            <div className="flex gap-4 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Statement Balance</p>
                <p className="text-lg font-bold text-gray-800">£{parseFloat(account?.currentBalance || "0").toFixed(2)}</p>
              </div>
              <div className="w-px h-10 bg-gray-200 mx-2"></div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">To Reconcile</p>
                <p className="text-lg font-bold text-orange-600">{unreconciledTx.length} items</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 h-[calc(100vh-220px)] min-h-[600px]">
            {/* LEFT PANE - Bank Transactions */}
            <div className="w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Bank Statement Lines</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEntryModal(true)}
                    className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus size={14} /> Add Statement Entry
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingTx ? (
                  <div className="text-center py-12 text-gray-500">Loading transactions...</div>
                ) : unreconciledTx.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center">
                    <CheckCircle size={44} className="text-green-500 mb-3" />
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Statement Fully Reconciled</h3>
                    <p className="text-gray-500 text-xs max-w-xs mb-4">
                      There are no outstanding unreconciled statement lines for this bank account ({reconciledTxCount} reconciled).
                    </p>
                    <button
                      onClick={() => setShowEntryModal(true)}
                      className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus size={13} /> Add Manual Statement Line
                    </button>
                  </div>
                ) : (
                  unreconciledTx.map((tx: any) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const isSpent = parseFloat(tx.credit) > 0;
                    const amount = isSpent ? parseFloat(tx.credit) : parseFloat(tx.debit);

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                            ? "border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500"
                            : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-500">{new Date(tx.transactionDate).toLocaleDateString()}</span>
                          <span className={`font-bold ${isSpent ? "text-red-600" : "text-green-600"}`}>
                            {isSpent ? "-" : "+"}£{amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">{tx.description}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-gray-400">Balance: £{parseFloat(tx.balance).toFixed(2)}</span>
                          {isSelected && (
                            <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                              Select Match <ArrowRightLeft size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANE - Match Targets */}
            <div className="w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">Match with SanSuite Records</h2>
                {selectedTx ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Find an invoice or bill to match with the selected
                    <span className="font-semibold text-gray-700"> £{parseFloat(selectedTx.debit) > 0 ? parseFloat(selectedTx.debit).toFixed(2) : parseFloat(selectedTx.credit).toFixed(2)}</span> transaction.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Select a bank transaction on the left to start matching.</p>
                )}
              </div>

              {!selectedTx ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                  <ArrowRightLeft size={48} className="text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Select a bank line to find matching records</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by Invoice/Bill Number or Amount..."
                        value={searchTarget}
                        onChange={e => setSearchTarget(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                    {isLoadingTargets ? (
                      <div className="text-center py-12 text-gray-500">Finding matches...</div>
                    ) : allTargets.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">No unmatched invoices or bills found.</div>
                    ) : (
                      allTargets.map((target: any) => {
                        const targetId = target.type === "Invoice" ? target.invoiceNumber : target.billNumber;
                        const txAmount = parseFloat(selectedTx.debit) > 0 ? parseFloat(selectedTx.debit) : parseFloat(selectedTx.credit);
                        const isExactMatch = parseFloat(target.grandTotal) === txAmount;

                        // Suggest logic: if it's a receipt (debit), suggest invoices. If it's a payment (credit), suggest bills.
                        const isReceipt = parseFloat(selectedTx.debit) > 0;
                        const isRecommendedType = (isReceipt && target.type === "Invoice") || (!isReceipt && target.type === "Purchase");
                        const isRecommended = isExactMatch && isRecommendedType;

                        return (
                          <div
                            key={`${target.type}-${target.id}`}
                            className={`p-4 border rounded-lg bg-white shadow-sm transition-all hover:border-purple-300 ${isRecommended ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${target.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {target.type}
                                </span>
                                <span className="font-semibold text-gray-800">{targetId}</span>
                              </div>
                              <span className="font-bold text-gray-800">£{parseFloat(target.grandTotal).toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                              {target.type === "Invoice" ? "Sales to Customer" : "Purchase from Supplier"} • Due: {target.dueDate ? new Date(target.dueDate).toLocaleDateString() : 'N/A'}
                            </p>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                              {isRecommended ? (
                                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12} /> Suggested Match
                                </span>
                              ) : (
                                <span></span>
                              )}

                              <button
                                onClick={() => matchMutation.mutate({ txId: selectedTx.id, targetId: target.id, targetType: target.type })}
                                disabled={matchMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {matchMutation.isPending && matchMutation.variables?.targetId === target.id ? "Matching..." : "Match"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Add Bank Statement Entry</h3>
              </div>
              <button onClick={() => setShowEntryModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Transaction Date *</label>
                <input
                  type="date"
                  value={entryForm.transactionDate}
                  onChange={(e) => setEntryForm({ ...entryForm, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Entry Description / Reference *</label>
                <input
                  type="text"
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder="e.g. BACS Customer Receipt, Monthly Rent Direct Debit"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Flow Type *</label>
                  <select
                    value={entryForm.type}
                    onChange={(e: any) => setEntryForm({ ...entryForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium"
                  >
                    <option value="in">Money In (+ Received)</option>
                    <option value="out">Money Out (- Spent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryForm.amount}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addStatementLineMutation.mutate()}
                disabled={addStatementLineMutation.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} /> {addStatementLineMutation.isPending ? "Adding..." : "Add Statement Line"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
