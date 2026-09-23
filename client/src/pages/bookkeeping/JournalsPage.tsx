import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";
import {
  FileText, Plus, X, Search, Settings, Save, Trash2, ArrowLeftRight
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
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2"
            >
              <Plus size={16} /> New Journal
            </button>
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
    </AppLayout>
  );
}
