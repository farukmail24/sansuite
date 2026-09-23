import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  Coins, Plus, ArrowRightLeft, ArrowUpRight, ArrowDownLeft,
  Calendar, CheckCircle2, AlertCircle, Info, X
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export default function CharityFundsPage() {
  return (
    <CharityWorkspaceLayout activeTab="funds">
      <CharityFundsContent />
    </CharityWorkspaceLayout>
  );
}

function CharityFundsContent() {
  const { charityId } = useCharityWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddFundModal, setShowAddFundModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // New Fund Form
  const [fundName, setFundName] = useState("");
  const [fundCode, setFundCode] = useState("");
  const [fundType, setFundType] = useState("Unrestricted");
  const [description, setDescription] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0.00");

  // Transfer Form
  const [fromFundId, setFromFundId] = useState("");
  const [toFundId, setToFundId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferReason, setTransferReason] = useState("");
  const [transferRef, setTransferRef] = useState("");

  // Fetch Funds
  const { data: fundsData, isLoading: isLoadingFunds } = useQuery({
    queryKey: [`/api/charity/${charityId}/funds`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/funds`);
      if (!res.ok) throw new Error("Failed to fetch funds");
      return res.json();
    },
    enabled: !!charityId,
  });

  // Fetch Transfers
  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery({
    queryKey: [`/api/charity/${charityId}/fund-transfers`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/fund-transfers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  const funds = fundsData?.funds || [];
  const summary = fundsData?.summary || {
    totalBForward: "0.00",
    totalIncome: "0.00",
    totalExpense: "0.00",
    totalBalance: "0.00",
  };

  // Add Fund Mutation
  const addFundMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/funds`, {
        fundName,
        fundCode,
        fundType,
        description,
        openingBalance,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create fund");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fund Created", description: `Fund "${fundName}" added successfully.` });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/funds`] });
      setShowAddFundModal(false);
      setFundName("");
      setFundCode("");
      setDescription("");
      setOpeningBalance("0.00");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/fund-transfers`, {
        fromFundId,
        toFundId,
        amount: transferAmount,
        transferDate,
        reason: transferReason,
        reference: transferRef,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to transfer funds");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transfer Complete", description: "Inter-fund transfer recorded successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/funds`] });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/fund-transfers`] });
      setShowTransferModal(false);
      setTransferAmount("");
      setTransferReason("");
      setTransferRef("");
    },
    onError: (err: any) => {
      toast({ title: "Transfer Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Charity Funds & Reserves</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Unrestricted, Restricted, Endowment and Designated funds according to UK Charities SORP.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowRightLeft size={14} className="text-orange-600" />
            <span>Fund Transfer</span>
          </button>
          <button
            onClick={() => setShowAddFundModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Add Fund</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total B.Forward</span>
          <div className="text-xl font-bold text-slate-800 mt-1">
            £{parseFloat(summary.totalBForward).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Income</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            £{parseFloat(summary.totalIncome).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Expenditure</span>
          <div className="text-xl font-bold text-rose-600 mt-1">
            £{parseFloat(summary.totalExpense).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-orange-50/50 to-white">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">Total Reserves</span>
          <div className="text-xl font-bold text-orange-600 mt-1">
            £{parseFloat(summary.totalBalance).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Active Charity Funds</h3>
          <span className="text-xs text-slate-500 font-mono">{funds.length} Funds Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Fund Code</th>
                <th className="px-4 py-3">Fund Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">B/F (£)</th>
                <th className="px-4 py-3 text-right">Income (£)</th>
                <th className="px-4 py-3 text-right">Transfers (£)</th>
                <th className="px-4 py-3 text-right">Current Balance (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingFunds ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading funds...</td></tr>
              ) : funds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Coins size={32} className="mx-auto text-slate-300 mb-2" />
                    No funds created yet. Click "+ Add Fund" to create your first fund.
                  </td>
                </tr>
              ) : (
                funds.map((f: any) => (
                  <tr key={f.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">{f.fundCode || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>{f.fundName}</div>
                      {f.description && <div className="text-[11px] font-normal text-slate-400">{f.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        f.fundType === 'Restricted'
                          ? 'bg-purple-100 text-purple-700'
                          : f.fundType === 'Endowment'
                          ? 'bg-amber-100 text-amber-700'
                          : f.fundType === 'Designated'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {f.fundType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {parseFloat(f.openingBalance || "0").toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                      +{parseFloat(f.totalIncome || "0").toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {f.netTransfers >= 0 ? `+${f.netTransfers.toFixed(2)}` : f.netTransfers.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                      £{parseFloat(f.currentBalance || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inter-Fund Transfers Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-orange-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Inter-Fund Transfer History</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">{transfers.length} Transfers Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">From Fund</th>
                <th className="px-4 py-3">To Fund</th>
                <th className="px-4 py-3">Reference / Reason</th>
                <th className="px-4 py-3 text-right">Transfer Amount (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingTransfers ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading transfers...</td></tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No inter-fund transfers recorded yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-600">{t.transferDate}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{t.fromFundName}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{t.toFundName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.reason || t.reference || "Fund transfer"}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      £{parseFloat(t.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Fund */}
      {showAddFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Create New Charity Fund</h3>
              <button onClick={() => setShowAddFundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fund Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Building Restoration Campaign"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fund Code</label>
                  <input
                    type="text"
                    placeholder="e.g. RES-BLD"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={fundCode}
                    onChange={(e) => setFundCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fund Type *</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={fundType}
                    onChange={(e) => setFundType(e.target.value)}
                  >
                    <option value="Unrestricted">Unrestricted (General)</option>
                    <option value="Designated">Designated</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Endowment">Endowment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Donor Stipulation</label>
                <textarea
                  rows={2}
                  placeholder="Specify any restrictions or trustee designations..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFundModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addFundMutation.isPending}
                  onClick={() => addFundMutation.mutate()}
                  className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addFundMutation.isPending ? "Creating..." : "Save Fund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inter-Fund Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Record Inter-Fund Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">From Fund (Source) *</label>
                <select
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={fromFundId}
                  onChange={(e) => setFromFundId(e.target.value)}
                >
                  <option value="">Select source fund...</option>
                  {funds.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.fundName} (£{parseFloat(f.currentBalance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To Fund (Destination) *</label>
                <select
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={toFundId}
                  onChange={(e) => setToFundId(e.target.value)}
                >
                  <option value="">Select destination fund...</option>
                  {funds.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.fundName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Statutory Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Trustee approval for project allocation"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={transferMutation.isPending}
                  onClick={() => transferMutation.mutate()}
                  className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {transferMutation.isPending ? "Executing..." : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
