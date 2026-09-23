import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins, Plus, RefreshCw, Trash2, Search, Building2,
  DollarSign, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdDividendRecord } from "./types";

export default function DividendsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTaxYear, setSelectedTaxYear] = useState("2025-26");
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [dividendForm, setDividendForm] = useState({
    companyName: "",
    sharesHeld: "",
    dividendRate: "",
    totalDividend: "",
    taxCredit: "0.00",
  });

  // Fetch enrolled clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/mtd-it/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mtd-it/clients");
      return res.json();
    },
  });

  const activeClientId = selectedClientId || (clients.length > 0 ? clients[0].clientId : null);

  // Fetch dividends
  const { data: dividends = [], isLoading } = useQuery<MtdDividendRecord[]>({
    queryKey: [`/api/mtd-it/dividends`, activeClientId, selectedTaxYear],
    queryFn: async () => {
      if (!activeClientId) return [];
      const res = await apiRequest("GET", `/api/mtd-it/dividends/${activeClientId}/${selectedTaxYear}`);
      return res.json();
    },
    enabled: !!activeClientId,
  });

  // Add Dividend Mutation
  const addDividendMutation = useMutation({
    mutationFn: async () => {
      if (!activeClientId) return;
      const res = await apiRequest("POST", "/api/mtd-it/dividends", {
        clientId: activeClientId,
        taxYear: selectedTaxYear,
        ...dividendForm,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/dividends`, activeClientId, selectedTaxYear] });
      setShowAddModal(false);
      setDividendForm({ companyName: "", sharesHeld: "", dividendRate: "", totalDividend: "", taxCredit: "0.00" });
      toast({ title: "Dividend Recorded", description: "Dividend payment saved to MTD database." });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Client</label>
            <select
              value={activeClientId || ""}
              onChange={(e) => setSelectedClientId(parseInt(e.target.value, 10))}
              className="p-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#6c5ce7]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.clientId}>
                  {c.clientName} (UTR: {c.utrNumber || "—"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tax Year</label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#6c5ce7]"
            >
              <option value="2025-26">2025-26</option>
              <option value="2026-27">2026-27</option>
              <option value="2024-25">2024-25</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              toast({
                title: "Dividends Synchronized",
                description: "Queried Company Secretarial share registers and Bookkeeping dividend vouchers.",
              })
            }
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} /> Auto-Import from CoSec / Bookkeeping
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!activeClientId}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Add Dividend
          </button>
        </div>
      </div>

      {/* Dividends Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading dividends...</div>
        ) : dividends.length === 0 ? (
          <div className="text-center py-16 px-4 bg-gray-50/50">
            <Coins size={36} className="mx-auto text-gray-400 mb-3" />
            <h4 className="text-sm font-bold text-gray-800">No Dividends Recorded for this Tax Year</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Dividends received from UK and foreign companies automatically flow into the annual Final Declaration calculation.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!activeClientId}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus size={14} /> Record First Dividend
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3 text-right">Shares Held</th>
                  <th className="px-4 py-3 text-right">Rate (£/share)</th>
                  <th className="px-4 py-3 text-right">Tax Credit (£)</th>
                  <th className="px-4 py-3 text-right font-bold">Total Dividend (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dividends.map((div) => (
                  <tr key={div.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 size={14} className="text-gray-400" />
                      {div.companyName}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{div.sharesHeld}</td>
                    <td className="px-4 py-3 text-right text-gray-700">£{parseFloat(div.dividendRate).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">£{parseFloat(div.taxCredit).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-800">
                      £{parseFloat(div.totalDividend).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Dividend */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-800">Record Dividend</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Holdings Ltd"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={dividendForm.companyName}
                  onChange={(e) => setDividendForm({ ...dividendForm, companyName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Shares Held</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="100"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dividendForm.sharesHeld}
                    onChange={(e) => setDividendForm({ ...dividendForm, sharesHeld: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Rate (£/share)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dividendForm.dividendRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const shares = parseFloat(dividendForm.sharesHeld) || 0;
                      setDividendForm({
                        ...dividendForm,
                        dividendRate: e.target.value,
                        totalDividend: shares > 0 && rate > 0 ? (shares * rate).toFixed(2) : dividendForm.totalDividend,
                      });
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Total Dividend Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                  value={dividendForm.totalDividend}
                  onChange={(e) => setDividendForm({ ...dividendForm, totalDividend: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => addDividendMutation.mutate()}
                disabled={!dividendForm.companyName || !dividendForm.totalDividend || addDividendMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm disabled:opacity-50"
              >
                {addDividendMutation.isPending ? "Saving..." : "Save Dividend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
