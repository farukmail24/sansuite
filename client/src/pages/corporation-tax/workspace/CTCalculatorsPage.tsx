import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Layers, Save, Calculator, HelpCircle, CheckCircle2,
  AlertCircle, ArrowRight, RefreshCw, Plus, Trash2
} from "lucide-react";
import { Link } from "wouter";

export default function CTCalculatorsPage() {
  return (
    <CTWorkspaceLayout activeSection="Calculators Hub">
      <CTCalculatorsContent />
    </CTWorkspaceLayout>
  );
}

function CTCalculatorsContent() {
  const { clientId, currentReturn, refetchReturns } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"ca" | "loss" | "marginal" | "s455">("ca");

  // --- 1. Capital Allowances States ---
  const [aiaClaimed, setAiaClaimed] = useState("0.00");
  const [fyaClaimed, setFyaClaimed] = useState("0.00");
  const [mainPoolWdvBf, setMainPoolWdvBf] = useState("0.00");
  const [mainPoolAdditions, setMainPoolAdditions] = useState("0.00");
  const [mainPoolDisposals, setMainPoolDisposals] = useState("0.00");
  const [mainPoolWdaClaimed, setMainPoolWdaClaimed] = useState("0.00");
  const [specialRatePoolAdditions, setSpecialRatePoolAdditions] = useState("0.00");
  const [specialRateWdaClaimed, setSpecialRateWdaClaimed] = useState("0.00");
  const [sbaClaimed, setSbaClaimed] = useState("0.00");

  // --- 2. Loss Schedule States ---
  const [lossBroughtForward, setLossBroughtForward] = useState("0.00");
  const [lossCurrentYear, setLossCurrentYear] = useState("0.00");
  const [lossSetOffCurrent, setLossSetOffCurrent] = useState("0.00");
  const [lossCarriedBack, setLossCarriedBack] = useState("0.00");

  // --- 3. Marginal Relief States ---
  const [associatedCompanies, setAssociatedCompanies] = useState(0);

  // --- 4. S455 Director Loans States ---
  const [directorLoanAdvanced, setDirectorLoanAdvanced] = useState("0.00");
  const [directorLoanRepaid, setDirectorLoanRepaid] = useState("0.00");

  // Fetch Existing Return Details with CA & Loss Schedules
  const { data: returnDetail } = useQuery<any>({
    queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}`],
    queryFn: async () => {
      if (!currentReturn?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentReturn?.id,
  });

  useEffect(() => {
    if (returnDetail) {
      const ca = returnDetail.capitalAllowances;
      if (ca) {
        setAiaClaimed(ca.annualInvestmentAllowanceClaimed || "0.00");
        setFyaClaimed(ca.firstYearAllowanceClaimed || "0.00");
        setMainPoolWdvBf(ca.mainPoolWdvBf || "0.00");
        setMainPoolAdditions(ca.mainPoolAdditions || "0.00");
        setMainPoolDisposals(ca.mainPoolDisposals || "0.00");
        setMainPoolWdaClaimed(ca.mainPoolWdaClaimed || "0.00");
        setSpecialRatePoolAdditions(ca.specialRatePoolAdditions || "0.00");
        setSpecialRateWdaClaimed(ca.specialRateWdaClaimed || "0.00");
        setSbaClaimed(ca.structuresAndBuildingsAllowance || "0.00");
      }

      const loss = returnDetail.lossSchedule;
      if (loss) {
        setLossBroughtForward(loss.lossBroughtForward || "0.00");
        setLossCurrentYear(loss.lossCurrentYear || "0.00");
        setLossSetOffCurrent(loss.lossSetOffAgainstCurrentProfits || "0.00");
        setLossCarriedBack(loss.lossCarriedBackPriorYear || "0.00");
      }
    }
  }, [returnDetail]);

  // Calculations:
  // 1. Capital Allowances
  const calculatedMainPoolBase = Math.max(
    0,
    parseFloat(mainPoolWdvBf || "0") + parseFloat(mainPoolAdditions || "0") - parseFloat(mainPoolDisposals || "0")
  );
  const autoMainPoolWda = (calculatedMainPoolBase * 0.18).toFixed(2);
  const autoSpecialPoolWda = (parseFloat(specialRatePoolAdditions || "0") * 0.06).toFixed(2);

  const totalCapitalAllowances = (
    parseFloat(aiaClaimed || "0") +
    parseFloat(fyaClaimed || "0") +
    parseFloat(mainPoolWdaClaimed || autoMainPoolWda) +
    parseFloat(specialRateWdaClaimed || autoSpecialPoolWda) +
    parseFloat(sbaClaimed || "0")
  ).toFixed(2);

  // 2. Loss Schedule Calculation
  const totalAvailableLoss = parseFloat(lossBroughtForward || "0") + parseFloat(lossCurrentYear || "0");
  const totalLossUtilised = parseFloat(lossSetOffCurrent || "0") + parseFloat(lossCarriedBack || "0");
  const lossCarriedForward = Math.max(0, totalAvailableLoss - totalLossUtilised).toFixed(2);

  // 3. Marginal Relief Calculation
  const divisor = 1 + associatedCompanies;
  const lowerLimit = 50000 / divisor;
  const upperLimit = 250000 / divisor;
  const currentProfits = parseFloat(currentReturn?.profitsChargeableToCt || currentReturn?.taxableTradingProfit || "0");

  let computedMarginalRelief = 0;
  if (currentProfits > lowerLimit && currentProfits < upperLimit) {
    computedMarginalRelief = Math.max(0, (upperLimit - currentProfits) * (3 / 200));
  }

  // 4. S455 Director Loans Calculation
  const loanOutstanding = Math.max(0, parseFloat(directorLoanAdvanced || "0") - parseFloat(directorLoanRepaid || "0"));
  const s455TaxDue = (loanOutstanding * 0.3375).toFixed(2);

  // Save Calculators Mutation
  const saveCalculatorsMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/calculators`, {
        capitalAllowances: {
          annualInvestmentAllowanceClaimed: aiaClaimed,
          firstYearAllowanceClaimed: fyaClaimed,
          mainPoolWdvBf,
          mainPoolAdditions,
          mainPoolDisposals,
          mainPoolWdaClaimed: mainPoolWdaClaimed || autoMainPoolWda,
          specialRatePoolAdditions,
          specialRateWdaClaimed: specialRateWdaClaimed || autoSpecialPoolWda,
          structuresAndBuildingsAllowance: sbaClaimed,
          totalCapitalAllowancesClaimed: totalCapitalAllowances,
        },
        lossSchedule: {
          lossBroughtForward,
          lossCurrentYear,
          lossSetOffAgainstCurrentProfits: lossSetOffCurrent,
          lossCarriedBackPriorYear: lossCarriedBack,
          lossCarriedForward,
        },
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}`] });
      toast({
        title: "Calculators Saved",
        description: "Capital Allowances and Loss Schedules saved. Updating main tax computation...",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to update schedules.",
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
            <Layers size={16} className="text-indigo-600" />
            Statutory Calculators & Schedules Hub
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            HMRC tax relief schedules for Capital Allowances, Loss Carry-Forwards, Marginal Relief and S455 Director Loans.
          </p>
        </div>

        <button
          type="button"
          onClick={() => saveCalculatorsMutation.mutate()}
          disabled={saveCalculatorsMutation.isPending}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Save size={13} />
          <span>{saveCalculatorsMutation.isPending ? "Saving..." : "Save Schedules"}</span>
        </button>
      </div>

      {/* 2. Calculator Selection Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("ca")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "ca"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Capital Allowances Schedule
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("loss")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "loss"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Loss Schedule & Relief
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("marginal")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "marginal"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Marginal Relief Calculator
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("s455")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "s455"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Loans to Participators (S455)
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: CAPITAL ALLOWANCES */}
      {activeTab === "ca" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Capital Allowances Claim (Plant & Machinery)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Replaces depreciation with statutory HMRC tax allowances. Maximum AIA is £1,000,000 per annum.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Total Claimed</span>
              <span className="text-base font-bold font-mono text-emerald-600">£{totalCapitalAllowances}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* AIA */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800 dark:text-slate-200">Annual Investment Allowance (AIA @ 100%)</label>
                <span className="text-[10px] text-indigo-600 font-medium">Max £1,000,000</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={aiaClaimed}
                onChange={(e) => setAiaClaimed(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Qualifying plant and machinery purchases 100% written off.</p>
            </div>

            {/* FYA */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">First Year Allowance (FYA @ 50% / 100%)</label>
              <input
                type="number"
                step="0.01"
                value={fyaClaimed}
                onChange={(e) => setFyaClaimed(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Special rate pool additions (50%) or zero-emission vehicles (100%).</p>
            </div>

            {/* Main Pool 18% */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800 dark:text-slate-200">Main Rate Pool (18% WDA)</label>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">Claim: £{autoMainPoolWda}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block mb-0.5">WDV B/Fwd (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolWdvBf}
                    onChange={(e) => setMainPoolWdvBf(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Additions (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolAdditions}
                    onChange={(e) => setMainPoolAdditions(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Disposals (£)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolDisposals}
                    onChange={(e) => setMainPoolDisposals(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Special Rate Pool 6% */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800 dark:text-slate-200">Special Rate Pool (6% WDA)</label>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">Claim: £{autoSpecialPoolWda}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5 text-[11px]">Integral features / Long-life asset additions (£)</span>
                <input
                  type="number"
                  step="0.01"
                  value={specialRatePoolAdditions}
                  onChange={(e) => setSpecialRatePoolAdditions(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOSS SCHEDULE & RELIEF */}
      {activeTab === "loss" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Trading Losses Schedule (Part 4 CTA 2010)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Track brought forward losses (s45 / s45A) and current year relief claims.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Carried Forward Loss</span>
              <span className="text-base font-bold font-mono text-indigo-600">£{lossCarriedForward}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Loss Brought Forward (£)</label>
              <input
                type="number"
                step="0.01"
                value={lossBroughtForward}
                onChange={(e) => setLossBroughtForward(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Trading losses brought forward from prior accounting periods.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Loss Set Off Current Profits (£)</label>
              <input
                type="number"
                step="0.01"
                value={lossSetOffCurrent}
                onChange={(e) => setLossSetOffCurrent(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Offset against current year trading profits to reduce CT liability.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Current Year Incurred Trading Loss (£)</label>
              <input
                type="number"
                step="0.01"
                value={lossCurrentYear}
                onChange={(e) => setLossCurrentYear(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Available to set off against total profits or carry back 12 months.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Loss Carried Back to Prior Year (£)</label>
              <input
                type="number"
                step="0.01"
                value={lossCarriedBack}
                onChange={(e) => setLossCarriedBack(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Section 37 CTA 2010 carry back against prior 12 months profits.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARGINAL RELIEF */}
      {activeTab === "marginal" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                HMRC Marginal Relief Calculator (Finance Act 2023)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reduces effective Corporation Tax rate between £50,000 (19%) and £250,000 (25%).
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Marginal Relief</span>
              <span className="text-base font-bold font-mono text-emerald-600">
                -£{computedMarginalRelief.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Number of Associated Companies</label>
              <input
                type="number"
                min="0"
                max="20"
                value={associatedCompanies}
                onChange={(e) => setAssociatedCompanies(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Divides limits equally by (1 + N companies).</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">Effective Lower Limit (19%)</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                £{lowerLimit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-slate-500">Standard £50k / {divisor}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 block">Effective Upper Limit (25%)</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                £{upperLimit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-slate-500">Standard £250k / {divisor}</p>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-900 dark:text-indigo-300 text-xs border border-indigo-200 dark:border-indigo-800">
            <p className="font-bold">Statutory Formula:</p>
            <p className="mt-1 font-mono text-[11px]">
              Marginal Relief = (Upper Limit - Profits) × (3 / 200)
            </p>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
              Profits Chargeable: £{currentProfits.toFixed(2)}. Resulting Relief: £{computedMarginalRelief.toFixed(2)}.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: S455 DIRECTOR LOANS */}
      {activeTab === "s455" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Section 455 Tax on Loans to Participators (CT600A)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Applies 33.75% corporation tax surcharge on outstanding close company loans to directors/shareholders.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">S455 Tax Due</span>
              <span className="text-base font-bold font-mono text-rose-600">£{s455TaxDue}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Total Loans Advanced During AP (£)</label>
              <input
                type="number"
                step="0.01"
                value={directorLoanAdvanced}
                onChange={(e) => setDirectorLoanAdvanced(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Gross advances made to participators or associates.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">Repaid Within 9 Months of AP End (£)</label>
              <input
                type="number"
                step="0.01"
                value={directorLoanRepaid}
                onChange={(e) => setDirectorLoanRepaid(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400">Repayments or dividends credited within statutory window.</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-900 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800">
            <p className="font-bold">Net Outstanding Balance Subject to Tax: £{loanOutstanding.toFixed(2)}</p>
            <p className="mt-1 text-[11px]">
              Tax rate is 33.75% (matching the dividend upper rate). This will automatically be attached to Supplementary Form CT600A.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
