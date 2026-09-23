import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Calculator, RefreshCw, Save, CheckCircle2, AlertCircle,
  HelpCircle, Download, ArrowRight, Layers, ExternalLink
} from "lucide-react";
import { Link } from "wouter";

export default function CTComputationPage() {
  return (
    <CTWorkspaceLayout activeSection="CT600 Computation">
      <CTComputationContent />
    </CTWorkspaceLayout>
  );
}

function CTComputationContent() {
  const { clientId, client, currentReturn, refetchReturns } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form State
  const [turnover, setTurnover] = useState("0.00");
  const [netAccountingProfit, setNetAccountingProfit] = useState("0.00");
  const [disallowableExpenses, setDisallowableExpenses] = useState("0.00");
  const [depreciationAddBack, setDepreciationAddBack] = useState("0.00");
  const [capitalAllowancesClaimed, setCapitalAllowancesClaimed] = useState("0.00");
  const [tradingLossesBroughtForward, setTradingLossesBroughtForward] = useState("0.00");
  const [tradingLossesRelievedCurrentYear, setTradingLossesRelievedCurrentYear] = useState("0.00");
  const [nonTradingIncome, setNonTradingIncome] = useState("0.00");
  const [qualifyingDonations, setQualifyingDonations] = useState("0.00");
  const [taxDeductedAtSource, setTaxDeductedAtSource] = useState("0.00");

  const [isSyncingAp, setIsSyncingAp] = useState(false);

  // Initialize from current return
  useEffect(() => {
    if (currentReturn) {
      setTurnover(currentReturn.turnover || "0.00");
      setNetAccountingProfit(currentReturn.netAccountingProfit || "0.00");
      setDisallowableExpenses(currentReturn.disallowableExpenses || "0.00");
      setDepreciationAddBack(currentReturn.depreciationAddBack || "0.00");
      setCapitalAllowancesClaimed(currentReturn.capitalAllowancesClaimed || "0.00");
      setTradingLossesBroughtForward(currentReturn.tradingLossesBroughtForward || "0.00");
      setTradingLossesRelievedCurrentYear(currentReturn.tradingLossesRelievedCurrentYear || "0.00");
      setNonTradingIncome(currentReturn.nonTradingIncome || "0.00");
      setQualifyingDonations(currentReturn.qualifyingDonations || "0.00");
      setTaxDeductedAtSource(currentReturn.taxDeductedAtSource || "0.00");
    }
  }, [currentReturn]);

  // 1-Click Accounts Production Sync
  const handleSyncAccountsProduction = async () => {
    if (!currentReturn) return;
    setIsSyncingAp(true);
    try {
      const periodId = currentReturn.periodId || 1;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/ap-bridge/${periodId}`);
      if (!res.ok) {
        throw new Error("Unable to fetch data from Accounts Production.");
      }
      const data = await res.json();
      setTurnover(data.turnover || "0.00");
      setNetAccountingProfit(data.netAccountingProfit || "0.00");
      if (parseFloat(data.depreciationAddBack || "0") > 0) {
        setDepreciationAddBack(data.depreciationAddBack);
      }
      toast({
        title: "Accounts Production Synced",
        description: `Turnover (£${data.turnover}) and Net Profit (£${data.netAccountingProfit}) pulled from Trial Balance.`,
      });
    } catch (err: any) {
      toast({
        title: "Sync Warning",
        description: err.message || "Failed to bridge Accounts Production figures.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingAp(false);
    }
  };

  // Real-time Computation Logic (Statutory Finance Act 2023)
  const netProfit = parseFloat(netAccountingProfit || "0");
  const disallowables = parseFloat(disallowableExpenses || "0");
  const depreciation = parseFloat(depreciationAddBack || "0");
  const capitalAllowances = parseFloat(capitalAllowancesClaimed || "0");
  const lossRelief = parseFloat(tradingLossesRelievedCurrentYear || "0");
  const nonTrading = parseFloat(nonTradingIncome || "0");
  const donations = parseFloat(qualifyingDonations || "0");

  const taxableTradingProfit = Math.max(0, netProfit + disallowables + depreciation - capitalAllowances - lossRelief);
  const profitsChargeable = Math.max(0, taxableTradingProfit + nonTrading - donations);

  // UK Standard Rates & Marginal Relief Formula
  let ctRate = 19.0;
  let marginalRelief = 0;
  let taxPayable = 0;

  if (profitsChargeable <= 50000) {
    ctRate = 19.0;
    taxPayable = profitsChargeable * 0.19;
  } else if (profitsChargeable >= 250000) {
    ctRate = 25.0;
    taxPayable = profitsChargeable * 0.25;
  } else {
    ctRate = 25.0;
    const fullTax = profitsChargeable * 0.25;
    // Statutory standard fraction 3/200: (250,000 - profits) * (3 / 200)
    marginalRelief = (250000 - profitsChargeable) * (3 / 200);
    taxPayable = Math.max(0, fullTax - marginalRelief);
  }

  const taxDeducted = parseFloat(taxDeductedAtSource || "0");
  const netTaxDue = Math.max(0, taxPayable - taxDeducted);

  // Save Computation Mutation
  const saveComputationMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns`, {
        id: currentReturn.id,
        clientId: parseInt(clientId),
        periodId: currentReturn.periodId,
        utrNumber: currentReturn.utrNumber,
        accountingPeriodStart: currentReturn.accountingPeriodStart,
        accountingPeriodEnd: currentReturn.accountingPeriodEnd,
        taxYear: currentReturn.taxYear,
        turnover,
        netAccountingProfit,
        disallowableExpenses,
        depreciationAddBack,
        capitalAllowancesClaimed,
        tradingLossesBroughtForward,
        tradingLossesRelievedCurrentYear,
        nonTradingIncome,
        qualifyingDonations,
        taxDeductedAtSource,
      });
    },
    onSuccess: async () => {
      await refetchReturns();
      toast({
        title: "Computation Saved",
        description: "Statutory tax reconciliation and CT600 liability updated in database.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update computation.",
        variant: "destructive",
      });
    },
  });

  if (!currentReturn) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calculator size={16} className="text-indigo-600" />
            Statutory CT600 Tax Computation
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Accounting period: {new Date(currentReturn.accountingPeriodStart).toLocaleDateString("en-GB")} to {new Date(currentReturn.accountingPeriodEnd).toLocaleDateString("en-GB")} ({currentReturn.taxYear || "2025/2026"})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSyncAccountsProduction}
            disabled={isSyncingAp}
            className="px-3 py-1.5 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Automatically pull Turnover, Net Profit and Depreciation from Accounts Production Trial Balance"
          >
            <RefreshCw size={12} className={isSyncingAp ? "animate-spin" : ""} />
            <span>Import Figures from Accounts Production</span>
          </button>

          <button
            type="button"
            onClick={() => saveComputationMutation.mutate()}
            disabled={saveComputationMutation.isPending}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Save size={13} />
            <span>{saveComputationMutation.isPending ? "Saving..." : "Save Computation"}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Computation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Schedules (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section A: Commercial Profit / Turnover */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Commercial Accounts Profit & Revenue
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Total Turnover (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={turnover}
                  onChange={(e) => setTurnover(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Net Accounting Profit / (Loss) Before Tax (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={netAccountingProfit}
                  onChange={(e) => setNetAccountingProfit(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section B: Statutory Add-Backs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>2. Disallowables & Add-Backs</span>
              <span className="text-[10px] text-indigo-600 font-normal">Increases taxable profit</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Depreciation & Amortisation (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depreciationAddBack}
                  onChange={(e) => setDepreciationAddBack(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Disallowed for tax; replaced by Capital Allowances.</p>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Disallowable Expenses (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={disallowableExpenses}
                  onChange={(e) => setDisallowableExpenses(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">e.g. client entertaining, fines, personal expenses.</p>
              </div>
            </div>
          </div>

          {/* Section C: Tax Reliefs & Allowances Deductions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                3. Allowances & Loss Reliefs
              </h3>
              <Link href={`/corporation-tax/${clientId}/calculators`}>
                <span className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer">
                  <Layers size={11} /> Open Calculators Hub
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Capital Allowances Claimed (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={capitalAllowancesClaimed}
                  onChange={(e) => setCapitalAllowancesClaimed(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">AIA 100%, FYA 50%, Main pool 18%, Special pool 6%.</p>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Trading Loss Relief Utilised (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tradingLossesRelievedCurrentYear}
                  onChange={(e) => setTradingLossesRelievedCurrentYear(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Losses b/fwd (s45) or group relief offset.</p>
              </div>
            </div>
          </div>

          {/* Section D: Non-Trading & Other Adjustments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Non-Trading & Credits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Non-Trading Income (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nonTradingIncome}
                  onChange={(e) => setNonTradingIncome(e.target.value)}
                  placeholder="e.g. Bank interest"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Qualifying Donations (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={qualifyingDonations}
                  onChange={(e) => setQualifyingDonations(e.target.value)}
                  placeholder="Gift Aid donations"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Tax Deducted at Source (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxDeductedAtSource}
                  onChange={(e) => setTaxDeductedAtSource(e.target.value)}
                  placeholder="e.g. CIS deductions"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Statutory Tax Calculation Sheet (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 sticky top-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>Statutory Tax Computation</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold">
                Finance Act 2023
              </span>
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Net Accounting Profit:</span>
                <span className="font-mono font-semibold">£{netProfit.toFixed(2)}</span>
              </div>

              <div className="py-2 flex justify-between text-indigo-600">
                <span>(+) Disallowable Expenses:</span>
                <span className="font-mono font-semibold">+£{disallowables.toFixed(2)}</span>
              </div>

              <div className="py-2 flex justify-between text-indigo-600">
                <span>(+) Depreciation Add-back:</span>
                <span className="font-mono font-semibold">+£{depreciation.toFixed(2)}</span>
              </div>

              <div className="py-2 flex justify-between text-emerald-600">
                <span>(-) Capital Allowances Claimed:</span>
                <span className="font-mono font-semibold">-£{capitalAllowances.toFixed(2)}</span>
              </div>

              <div className="py-2 flex justify-between text-emerald-600">
                <span>(-) Trading Loss Relief:</span>
                <span className="font-mono font-semibold">-£{lossRelief.toFixed(2)}</span>
              </div>

              <div className="py-2.5 flex justify-between font-bold bg-slate-50 dark:bg-slate-800/60 px-2 rounded-lg">
                <span className="text-slate-900 dark:text-slate-100">Taxable Trading Profit:</span>
                <span className="font-mono text-indigo-600">£{taxableTradingProfit.toFixed(2)}</span>
              </div>

              {nonTrading > 0 && (
                <div className="py-2 flex justify-between text-indigo-600">
                  <span>(+) Non-Trading Income:</span>
                  <span className="font-mono font-semibold">+£{nonTrading.toFixed(2)}</span>
                </div>
              )}

              {donations > 0 && (
                <div className="py-2 flex justify-between text-emerald-600">
                  <span>(-) Qualifying Donations:</span>
                  <span className="font-mono font-semibold">-£{donations.toFixed(2)}</span>
                </div>
              )}

              <div className="py-2.5 flex justify-between font-bold bg-slate-50 dark:bg-slate-800/60 px-2 rounded-lg">
                <span className="text-slate-900 dark:text-slate-100">Profits Chargeable to CT:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">£{profitsChargeable.toFixed(2)}</span>
              </div>

              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Applicable Tax Rate:</span>
                <span className="font-mono font-bold text-indigo-600">{ctRate}%</span>
              </div>

              {marginalRelief > 0 && (
                <div className="py-2 flex justify-between text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 rounded">
                  <span>Marginal Relief (3/200):</span>
                  <span className="font-mono font-semibold">-£{marginalRelief.toFixed(2)}</span>
                </div>
              )}

              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Corporation Tax Payable:</span>
                <span className="font-mono font-semibold">£{taxPayable.toFixed(2)}</span>
              </div>

              {taxDeducted > 0 && (
                <div className="py-2 flex justify-between text-emerald-600">
                  <span>(-) Tax Deducted at Source:</span>
                  <span className="font-mono font-semibold">-£{taxDeducted.toFixed(2)}</span>
                </div>
              )}

              {/* Total Due Callout */}
              <div className="pt-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1 text-center">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Total Corporation Tax Due
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono block">
                    £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Payment Deadline: {currentReturn.paymentDueDate ? new Date(currentReturn.paymentDueDate).toLocaleDateString("en-GB") : "AP End + 9m 1d"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => saveComputationMutation.mutate()}
                disabled={saveComputationMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Save size={13} />
                <span>{saveComputationMutation.isPending ? "Updating CT600..." : "Save & Update CT600"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
