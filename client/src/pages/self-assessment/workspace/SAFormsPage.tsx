import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileText, Save, Calculator, RefreshCw, CheckCircle2,
  AlertCircle, DollarSign, HelpCircle, Shield, ArrowRight
} from "lucide-react";
import { Link } from "wouter";

export default function SAFormsPage() {
  return (
    <SAWorkspaceLayout activeSection="SA100 Core Income">
      <SAFormsContent />
    </SAWorkspaceLayout>
  );
}

function SAFormsContent() {
  const { clientId, client, currentReturn, selectedTaxYear, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Income States
  const [savingsInterest, setSavingsInterest] = useState("0.00");
  const [dividendIncome, setDividendIncome] = useState("0.00");
  const [pensionIncome, setPensionIncome] = useState("0.00");
  const [otherIncome, setOtherIncome] = useState("0.00");
  const [foreignIncome, setForeignIncome] = useState("0.00");

  // Reliefs States
  const [pensionContributions, setPensionContributions] = useState("0.00");
  const [giftAidDonations, setGiftAidDonations] = useState("0.00");
  const [studentLoanPlan, setStudentLoanPlan] = useState("None");
  const [isAbovePensionAge, setIsAbovePensionAge] = useState(false);
  const [isClass2Voluntary, setIsClass2Voluntary] = useState(false);

  // SA101 Additional Reliefs (Capium Art 47: 9000271638)
  const [seisReliefClaimed, setSeisReliefClaimed] = useState("0.00");
  const [eisReliefClaimed, setEisReliefClaimed] = useState("0.00");
  const [vctReliefClaimed, setVctReliefClaimed] = useState("0.00");

  // Sync with currentReturn
  useEffect(() => {
    if (currentReturn) {
      setSavingsInterest(currentReturn.savingsInterest || "0.00");
      setDividendIncome(currentReturn.dividendIncome || "0.00");
      setPensionIncome(currentReturn.pensionIncome || "0.00");
      setOtherIncome(currentReturn.otherIncome || "0.00");
      setForeignIncome(currentReturn.foreignIncome || "0.00");
      setPensionContributions(currentReturn.pensionContributions || "0.00");
      setGiftAidDonations(currentReturn.giftAidDonations || "0.00");
      let sched: any = {};
      if (currentReturn.schedulesData) {
        try {
          sched = typeof currentReturn.schedulesData === "string" ? JSON.parse(currentReturn.schedulesData) : currentReturn.schedulesData;
        } catch {}
      }
      if (sched.seisReliefClaimed !== undefined) setSeisReliefClaimed(sched.seisReliefClaimed);
      if (sched.eisReliefClaimed !== undefined) setEisReliefClaimed(sched.eisReliefClaimed);
      if (sched.vctReliefClaimed !== undefined) setVctReliefClaimed(sched.vctReliefClaimed);
    }
  }, [currentReturn]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: currentReturn?.id,
        taxYear: selectedTaxYear,
        utrNumber: currentReturn?.utrNumber || client?.utrNumber || "",
        niNumber: currentReturn?.niNumber || client?.niNumber || "",
        // Preserve existing schedule figures
        employmentIncome: currentReturn?.employmentIncome || "0.00",
        employmentTaxDeducted: currentReturn?.employmentTaxDeducted || "0.00",
        selfEmploymentProfit: currentReturn?.selfEmploymentProfit || "0.00",
        propertyIncome: currentReturn?.propertyIncome || "0.00",
        capitalGainsNet: currentReturn?.capitalGainsNet || "0.00",
        financeCostsRelief: currentReturn?.financeCostsRelief || "0.00",
        tradingLossesRelieved: currentReturn?.tradingLossesRelieved || "0.00",
        // Updated inputs
        savingsInterest,
        dividendIncome,
        pensionIncome,
        otherIncome,
        foreignIncome,
        pensionContributions,
        giftAidDonations,
        studentLoanPlan,
        isAbovePensionAge,
        isClass2Voluntary,
        // SA101 Additional Reliefs
        seisReliefClaimed,
        eisReliefClaimed,
        vctReliefClaimed,
      };

      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save return" }));
        throw new Error(err.error || "Failed to save return");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SA100 Core Income Saved",
        description: "Tax return and SA302 figures recalculated successfully.",
        type: "success",
      });
      refetchReturns();
      queryClient.invalidateQueries({ queryKey: [`/api/self-assessment/${clientId}/returns`] });
    },
    onError: (err: any) => {
      toast({ title: "Save Error", description: err.message, type: "error" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={16} className="text-purple-600" />
            SA100 Core Income & Reliefs ({selectedTaxYear})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Enter investment income, pensions, personal reliefs, and student loan details.
          </p>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Save size={13} />
              Save & Compute Tax
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Core Incomes */}
        <div className="space-y-6">
          {/* Savings & Dividends */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Savings & Investment Income
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Taxable Savings Interest (Bank & Building Societies)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={savingsInterest}
                    onChange={(e) => setSavingsInterest(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Personal Savings Allowance: £1,000 (Basic) / £500 (Higher)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dividend Income (UK & Foreign Companies)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={dividendIncome}
                    onChange={(e) => setDividendIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">First £500 taxed at 0% (Dividend Allowance)</span>
              </div>
            </div>
          </div>

          {/* Pensions & Benefits */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Pensions & State Benefits
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State Pension & Occupational / Private Pensions
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={pensionIncome}
                    onChange={(e) => setPensionIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Other Taxable UK Income & Benefits
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Foreign Income (Overseas Interest & Earnings)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={foreignIncome}
                    onChange={(e) => setForeignIncome(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Reliefs & Reductions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Tax Reliefs & Deductions
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Pension Contributions (Gross Amount)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={pensionContributions}
                    onChange={(e) => setPensionContributions(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Extends the 20% basic rate band by the gross contribution</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gift Aid Payments to UK Registered Charities
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={giftAidDonations}
                    onChange={(e) => setGiftAidDonations(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Net payments are grossed up (x 100/80) to expand basic rate threshold</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Loan Repayment Plan
                </label>
                <select
                  value={studentLoanPlan}
                  onChange={(e) => setStudentLoanPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="None">None / No Student Loan</option>
                  <option value="Plan 1">Plan 1 (9% over £24,990 threshold)</option>
                  <option value="Plan 2">Plan 2 (9% over £27,295 threshold)</option>
                  <option value="Plan 4">Plan 4 - Scotland (9% over £31,395 threshold)</option>
                  <option value="Postgraduate">Postgraduate Loan (6% over £21,000 threshold)</option>
                </select>
              </div>

              {/* National Insurance Exemption Checkboxes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isAbovePensionAge}
                    onChange={(e) => setIsAbovePensionAge(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs">Client is at or above State Pension age (Exempt from Class 4 NIC)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isClass2Voluntary}
                    onChange={(e) => setIsClass2Voluntary(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs">Pay Class 2 NIC voluntarily (£3.45/week) if profits below Small Profits Threshold</span>
                </label>
              </div>
            </div>
          </div>

          {/* SA101 Additional Reliefs & Investments (Capium Art 47: 9000271638) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-purple-600" />
                  SA101: Additional Reliefs & Investments
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Statutory tax reducers for qualifying UK venture investments</p>
              </div>
              {((parseFloat(seisReliefClaimed || "0") * 0.5) + (parseFloat(eisReliefClaimed || "0") * 0.3) + (parseFloat(vctReliefClaimed || "0") * 0.3)) > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Tax Reduced: -£{((parseFloat(seisReliefClaimed || "0") * 0.5) + (parseFloat(eisReliefClaimed || "0") * 0.3) + (parseFloat(vctReliefClaimed || "0") * 0.3)).toFixed(2)}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Box 10: Seed Enterprise Investment Scheme (SEIS) Relief
                  </label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                    50% Tax Relief
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={seisReliefClaimed}
                    onChange={(e) => setSeisReliefClaimed(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Subscription for shares in qualifying early-stage companies (ITA 2007 Part 5A, up to £200,000 max)
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Enterprise Investment Scheme (EIS) Relief
                  </label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                    30% Tax Relief
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={eisReliefClaimed}
                    onChange={(e) => setEisReliefClaimed(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Qualifying EIS share investments (ITA 2007 Part 5, up to £1,000,000 or £2,000,000 for KIC)
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Venture Capital Trust (VCT) Relief
                  </label>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                    30% Tax Relief
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={vctReliefClaimed}
                    onChange={(e) => setVctReliefClaimed(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  New eligible ordinary shares in VCTs (ITA 2007 Part 6, up to £200,000 max)
                </span>
              </div>
            </div>
          </div>

          {/* Direct Link to Supplementary Schedules */}
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-xs text-purple-900 dark:text-purple-200">Have Employment, Property, or Capital Gains?</h4>
              <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                Add employment records (P60/P45), sole trader turnover, rental properties, and capital gains in Supplementary Schedules.
              </p>
            </div>
            <Link
              href={`/self-assessment/${clientId}/schedules`}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              Open Schedules
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
