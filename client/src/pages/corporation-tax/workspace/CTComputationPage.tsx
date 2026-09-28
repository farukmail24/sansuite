import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Calculator, RefreshCw, Save, CheckCircle2, AlertCircle,
  HelpCircle, Download, ArrowRight, Layers, ExternalLink, BookOpen, FileText
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
  const { clientId, client, currentReturn, periods, refetchReturns, openCT600FormModal } = useCTWorkspace();
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
  const [associatedCompaniesCount, setAssociatedCompaniesCount] = useState("0");
  const [isAmendedReturn, setIsAmendedReturn] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");

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
      setAssociatedCompaniesCount(String(currentReturn.associatedCompaniesCount || "0"));
      setIsAmendedReturn(Boolean(currentReturn.isAmendedReturn));
      setAmendmentReason(currentReturn.amendmentReason || "");
    }
  }, [currentReturn]);

  // 1-Click Accounts Production Sync
  const handleSyncAccountsProduction = async () => {
    if (!currentReturn) return;
    setIsSyncingAp(true);
    try {
      const periodId = currentReturn.periodId || (periods && periods.length > 0 ? periods[0].id : null);
      if (!periodId) {
        throw new Error("No accounting period found in Accounts Production.");
      }
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

  // Real-time Computation Logic (Statutory Finance Act 2021 & 2023)
  const netProfit = parseFloat(netAccountingProfit || "0");
  const disallowables = parseFloat(disallowableExpenses || "0");
  const depreciation = parseFloat(depreciationAddBack || "0");
  const capitalAllowances = parseFloat(capitalAllowancesClaimed || "0");
  const lossRelief = parseFloat(tradingLossesRelievedCurrentYear || "0");
  const nonTrading = parseFloat(nonTradingIncome || "0");
  const donations = parseFloat(qualifyingDonations || "0");

  const taxableTradingProfit = Math.max(0, netProfit + disallowables + depreciation - capitalAllowances - lossRelief);
  const profitsChargeable = Math.max(0, taxableTradingProfit + nonTrading - donations);

  // HMRC Box 326: Associated Companies Threshold Apportionment
  const associatedCount = parseInt(associatedCompaniesCount || "0");
  const divisor = 1 + Math.max(0, associatedCount);
  const lowerLimit = 50000 / divisor;
  const upperLimit = 250000 / divisor;

  let ctRate = 19.0;
  let marginalRelief = 0;
  let taxPayable = 0;

  if (profitsChargeable <= lowerLimit) {
    ctRate = 19.0;
    taxPayable = profitsChargeable * 0.19;
  } else if (profitsChargeable >= upperLimit) {
    ctRate = 25.0;
    taxPayable = profitsChargeable * 0.25;
  } else {
    ctRate = 25.0;
    const fullTax = profitsChargeable * 0.25;
    // Statutory standard fraction 3/200: (Upper Limit - Profits) * (3/200)
    marginalRelief = Math.max(0, (upperLimit - profitsChargeable) * (3 / 200));
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
        associatedCompaniesCount: associatedCount,
        isAmendedReturn,
        amendmentReason,
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

  const [postedJournal, setPostedJournal] = useState<string | null>(null);

  const postJournalMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn) return;
      const res = await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/post-bookkeeping-journal`, {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to post provision journal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPostedJournal(data.journalNumber);
      toast({
        title: "Posted to Bookkeeping",
        description: data.message || `Journal ${data.journalNumber} created in Bookkeeping.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Posting Failed",
        description: err.message,
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
            onClick={openCT600FormModal}
            className="px-3.5 py-1.5 border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Preview official statutory HMRC CT600 Form with current figures"
          >
            <FileText size={13} />
            <span>View CT600 Form</span>
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

          {/* Section E: Associated Companies & HMRC Return Details (Box 326 & Box 35) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>5. Associated Companies & Return Status (HMRC Box 326 & 35)</span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">Finance Act 2021 Apportionment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Number of Associated Companies (Box 326)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={associatedCompaniesCount}
                  onChange={(e) => setAssociatedCompaniesCount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Thresholds divided by (1 + N): Lower limit £{(50000 / divisor).toLocaleString("en-GB", { maximumFractionDigits: 0 })}, Upper limit £{(250000 / divisor).toLocaleString("en-GB", { maximumFractionDigits: 0 })}.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[11px]">
                  Return Submission Type (Box 35)
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAmendedReturn}
                    onChange={(e) => setIsAmendedReturn(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    This is an Amended Return (CT600 Replacement)
                  </span>
                </label>
                {isAmendedReturn && (
                  <input
                    type="text"
                    placeholder="Reason for amendment (e.g. Revised Capital Allowances, Disallowed Expenses)"
                    value={amendmentReason}
                    onChange={(e) => setAmendmentReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                )}
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

              <div className="py-2 flex justify-between text-slate-500">
                <span>Associated Companies (N):</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{associatedCount}</span>
              </div>

              <div className="py-2 flex justify-between text-slate-500 text-[11px]">
                <span>Small Profit Limit (£50k / {divisor}):</span>
                <span className="font-mono">£{lowerLimit.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="py-2 flex justify-between text-slate-500 text-[11px]">
                <span>Main Rate Limit (£250k / {divisor}):</span>
                <span className="font-mono">£{upperLimit.toLocaleString("en-GB", { maximumFractionDigits: 0 })}</span>
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

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => saveComputationMutation.mutate()}
                disabled={saveComputationMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Save size={13} />
                <span>{saveComputationMutation.isPending ? "Updating CT600..." : "Save & Update CT600"}</span>
              </button>

              {netTaxDue > 0 && (
                <button
                  type="button"
                  onClick={() => postJournalMutation.mutate()}
                  disabled={postJournalMutation.isPending || !!postedJournal}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                    postedJournal
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  <BookOpen size={13} />
                  <span>
                    {postedJournal 
                      ? `Provision Posted (${postedJournal})` 
                      : postJournalMutation.isPending 
                      ? "Posting to Ledger..." 
                      : "Post Tax Provision to Bookkeeping"}
                  </span>
                </button>
              )}

              <Link
                href={`/corporation-tax/${clientId}/calculators`}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Proceed to Calculators Hub</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
