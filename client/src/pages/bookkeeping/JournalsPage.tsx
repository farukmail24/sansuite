import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";
import {
  FileText, Plus, X, Search, Settings, Save, Trash2, ArrowLeftRight,
  Coins, Globe, AlertCircle, RefreshCw
} from "lucide-react";

export default function JournalsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/journals");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="Journals" />;

  const [showModal, setShowModal] = useState(false);
  const [journalForm, setJournalForm] = useState({
    journalDate: new Date().toISOString().split('T')[0],
    reference: "",
    description: "",
  });

  const [lines, setLines] = useState([
    { nominalCode: "", description: "", debit: "", credit: "" },
    { nominalCode: "", description: "", debit: "", credit: "" }
  ]);

  // Foreign Currency Adjustment State (Capium Parity)
  const [showFxModal, setShowFxModal] = useState(false);
  const [fxForm, setFxForm] = useState({
    currency: "USD",
    accountType: "Debtors" as "Debtors" | "Creditors" | "Bank",
    nominalCode: "1100",
    foreignAmount: "",
    bookRate: "1.30",
    currentRate: "1.25",
    revaluationDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const { data: client } = useQuery({
    queryKey: ["/api/practice/clients", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practice/clients/${clientId}`);
      return res.json();
    },
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/coa", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/coa/${clientId}`);
      return res.json();
    },
  });

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["/api/journals", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/journals/${clientId}`);
      return res.json();
    },
  });

  const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
  const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const saveJournal = useMutation({
    mutationFn: async () => {
      if (!isBalanced) throw new Error("Journal is not balanced");
      if (!journalForm.description) throw new Error("Description is required");

      const res = await apiRequest("POST", "/api/journals", {
        clientId,
        ...journalForm,
        totalAmount: totalDebit,
        lines: lines.filter(l => l.nominalCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      });
      if (!res.ok) throw new Error("Failed to save journal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals", clientId] });
      toast({ title: "Journal Saved", description: "The manual journal has been posted successfully." });
      setShowModal(false);
      setLines([
        { nominalCode: "", description: "", debit: "", credit: "" },
        { nominalCode: "", description: "", debit: "", credit: "" }
      ]);
      setJournalForm({ ...journalForm, reference: "", description: "" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message });
    }
  });

  const addLine = () => setLines([...lines, { nominalCode: "", description: "", debit: "", credit: "" }]);
  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    // If setting debit, clear credit and vice versa
    if (field === 'debit' && parseFloat(value) > 0) newLines[index].credit = "";
    if (field === 'credit' && parseFloat(value) > 0) newLines[index].debit = "";
    setLines(newLines);
  };
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  // FX Calculation
  const fAmt = parseFloat(fxForm.foreignAmount || "0");
  const bRate = parseFloat(fxForm.bookRate || "1");
  const cRate = parseFloat(fxForm.currentRate || "1");
  const originalGbp = bRate > 0 ? fAmt / bRate : 0;
  const currentGbp = cRate > 0 ? fAmt / cRate : 0;
  let rawDiff = currentGbp - originalGbp;
  if (fxForm.accountType === "Creditors") {
    rawDiff = -rawDiff;
  }
  const isFxGain = rawDiff >= 0;
  const fxDiffAbs = Math.abs(rawDiff);

  const postFxJournal = useMutation({
    mutationFn: async () => {
      if (!fAmt || !bRate || !cRate) throw new Error("Please enter amount and valid exchange rates");
      if (fxDiffAbs < 0.01) throw new Error("Exchange rate difference is zero (£0.00). No adjustment journal required.");

      let linesPayload = [];
      if (isFxGain) {
        linesPayload = [
          {
            nominalCode: fxForm.nominalCode,
            description: `FX Revaluation Gain - ${fxForm.currency} ${fAmt.toFixed(2)} (${fxForm.accountType})`,
            debit: fxDiffAbs.toFixed(2),
            credit: "0.00"
          },
          {
            nominalCode: "7900",
            description: `Realised/Unrealised FX Gain - ${fxForm.currency} @ ${cRate}`,
            debit: "0.00",
            credit: fxDiffAbs.toFixed(2)
          }
        ];
      } else {
        linesPayload = [
          {
            nominalCode: "7900",
            description: `Realised/Unrealised FX Loss - ${fxForm.currency} @ ${cRate}`,
            debit: fxDiffAbs.toFixed(2),
            credit: "0.00"
          },
          {
            nominalCode: fxForm.nominalCode,
            description: `FX Revaluation Loss - ${fxForm.currency} ${fAmt.toFixed(2)} (${fxForm.accountType})`,
            debit: "0.00",
            credit: fxDiffAbs.toFixed(2)
          }
        ];
      }

      const res = await apiRequest("POST", "/api/journals", {
        clientId,
        journalDate: fxForm.revaluationDate,
        reference: `FX-ADJ-${fxForm.currency}-${new Date(fxForm.revaluationDate).toISOString().slice(2, 10).replace(/-/g, "")}`,
        description: `FX Adjustment: ${fxForm.currency} ${fAmt.toFixed(2)} revalued from ${bRate} to ${cRate} (${fxForm.accountType})`,
        totalAmount: fxDiffAbs.toFixed(2),
        lines: linesPayload
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to post FX adjustment journal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals", clientId] });
      toast({
        title: "FX Journal Posted",
        description: `Foreign currency adjustment of £${fxDiffAbs.toFixed(2)} (${isFxGain ? "Gain" : "Loss"}) posted to nominal ledger.`
      });
      setShowFxModal(false);
      setFxForm({
        currency: "USD",
        accountType: "Debtors",
        nominalCode: "1100",
        foreignAmount: "",
        bookRate: "1.30",
        currentRate: "1.25",
        revaluationDate: new Date().toISOString().split("T")[0],
        notes: ""
      });
    },
    onError: (e: any) => {
      toast({ title: "FX Adjustment Failed", description: e.message, variant: "destructive" });
    }
  });



  return (
    <AppLayout sidebar={getClientSidebar(params?.id || "")} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Bookkeeping</span>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span>Journals</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <ArrowLeftRight className="text-purple-600" /> Manual Journals
              </h1>
              <p className="text-gray-500 text-sm mt-1">Post double-entry journal adjustments.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowFxModal(true)}
                className="px-3.5 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg font-medium transition-colors text-sm flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Foreign Currency Rate Adjustment (Capium Parity)"
              >
                <Coins size={15} /> FX Rate Adjustment
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> New Journal
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search journals..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                    <th className="px-6 py-3 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 uppercase tracking-wider">Journal No</th>
                    <th className="px-6 py-3 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading journals...</td></tr>
                  ) : journals.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-500">No journals posted yet.</td></tr>
                  ) : (
                    journals.map((j: any) => (
                      <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-600 font-medium">{new Date(j.journalDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-mono text-purple-700">{j.journalNumber}</td>
                        <td className="px-6 py-4 text-gray-600">{j.reference || "—"}</td>
                        <td className="px-6 py-4 text-gray-800">{j.description}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800">£{parseFloat(j.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Journal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-lg">Post New Journal</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-5 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={journalForm.journalDate}
                    onChange={(e) => setJournalForm({ ...journalForm, journalDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={journalForm.reference}
                    onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                    placeholder="e.g. ADJ-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    value={journalForm.description}
                    onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                    placeholder="Journal description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-xs font-semibold text-gray-600 border-b border-gray-200 uppercase">
                      <th className="px-4 py-3 w-1/3">Nominal Code</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 w-32 text-right">Debit (£)</th>
                      <th className="px-4 py-3 w-32 text-right">Credit (£)</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-2">
                          <select
                            value={line.nominalCode}
                            onChange={(e) => updateLine(idx, 'nominalCode', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-purple-500"
                          >
                            <option value="">Select Code...</option>
                            {chartOfAccounts.map((coa: any) => (
                              <option key={coa.id} value={coa.nominalCode}>{coa.nominalCode} - {coa.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            placeholder="Line description"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0" step="0.01"
                            value={line.debit}
                            onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:border-purple-500"
                            disabled={parseFloat(line.credit) > 0}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0" step="0.01"
                            value={line.credit}
                            onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:border-purple-500"
                            disabled={parseFloat(line.debit) > 0}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={2} className="px-4 py-3">
                        <button onClick={addLine} className="text-sm font-medium text-purple-600 flex items-center gap-1 hover:text-purple-800">
                          <Plus size={14} /> Add Line
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">£{totalDebit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">£{totalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200">
                  Total Debits (£{totalDebit.toFixed(2)}) must equal Total Credits (£{totalCredit.toFixed(2)}). Difference: £{Math.abs(totalDebit - totalCredit).toFixed(2)}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => saveJournal.mutate()}
                disabled={saveJournal.isPending || !isBalanced || !journalForm.description}
                className="px-5 py-2 text-white bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} /> {saveJournal.isPending ? "Posting..." : "Post Journal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Foreign Currency Adjustment Modal (Capium Parity) */}
      {showFxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Foreign Currency Rate Adjustment</h3>
                  <p className="text-xs text-gray-500">Calculate & post FX gain/loss journals (Capium parity)</p>
                </div>
              </div>
              <button onClick={() => setShowFxModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 text-purple-900 leading-relaxed">
                When exchange rates fluctuate between transaction date and month-end/balance sheet date, this tool automatically computes the gain/loss and creates the balancing journal to <strong>#7900 Foreign Exchange Gain/Loss</strong>.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Currency *</label>
                  <select
                    value={fxForm.currency}
                    onChange={(e) => setFxForm({ ...fxForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                    <option value="CHF">CHF (Fr) - Swiss Franc</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ledger Category *</label>
                  <select
                    value={fxForm.accountType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      const code = val === "Debtors" ? "1100" : (val === "Creditors" ? "2100" : "1200");
                      setFxForm({ ...fxForm, accountType: val, nominalCode: code });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  >
                    <option value="Debtors">Trade Debtors (#1100)</option>
                    <option value="Creditors">Trade Creditors (#2100)</option>
                    <option value="Bank">Foreign Currency Bank Account (#1200)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Foreign Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10000.00"
                    value={fxForm.foreignAmount}
                    onChange={(e) => setFxForm({ ...fxForm, foreignAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Book Exchange Rate *</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="1.3000"
                    value={fxForm.bookRate}
                    onChange={(e) => setFxForm({ ...fxForm, bookRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Original rate (£1 = {fxForm.currency})</span>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Closing Rate *</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="1.2500"
                    value={fxForm.currentRate}
                    onChange={(e) => setFxForm({ ...fxForm, currentRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Revaluation rate</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Revaluation Date *</label>
                  <input
                    type="date"
                    value={fxForm.revaluationDate}
                    onChange={(e) => setFxForm({ ...fxForm, revaluationDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    placeholder={`e.g. Month End ${fxForm.currency} Reval`}
                    value={fxForm.notes}
                    onChange={(e) => setFxForm({ ...fxForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Live Calculation Preview */}
              {fAmt > 0 && bRate > 0 && cRate > 0 && (
                <div className={`p-4 rounded-xl border ${isFxGain ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">Exchange Result:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isFxGain ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {isFxGain ? "FX Gain" : "FX Loss"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                    <div>
                      <span className="text-gray-500 block">Original Value</span>
                      <span className="font-mono font-bold text-gray-800">£{originalGbp.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Revalued Value</span>
                      <span className="font-mono font-bold text-gray-800">£{currentGbp.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">FX Adjustment</span>
                      <span className={`font-mono font-bold text-sm ${isFxGain ? "text-emerald-700" : "text-rose-700"}`}>
                        {isFxGain ? "+" : "-"}£{fxDiffAbs.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 font-mono text-[11px] space-y-1">
                    <p className="font-semibold text-gray-700 mb-1">Generated Journal Lines:</p>
                    {isFxGain ? (
                      <>
                        <div className="flex justify-between text-emerald-700">
                          <span>DR #{fxForm.nominalCode} {fxForm.accountType}:</span>
                          <span>£{fxDiffAbs.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>CR #7900 Foreign Exchange Gain/Loss:</span>
                          <span>£{fxDiffAbs.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-rose-700">
                          <span>DR #7900 Foreign Exchange Gain/Loss:</span>
                          <span>£{fxDiffAbs.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>CR #{fxForm.nominalCode} {fxForm.accountType}:</span>
                          <span>£{fxDiffAbs.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowFxModal(false)}
                className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => postFxJournal.mutate()}
                disabled={postFxJournal.isPending || !fAmt || fxDiffAbs < 0.01}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Coins size={14} />
                {postFxJournal.isPending ? "Posting FX Journal..." : `Post FX Journal (£${fxDiffAbs.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
