import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileText, Save, Calculator, RefreshCw, CheckCircle2,
  AlertCircle, DollarSign, HelpCircle, Shield, ArrowRight,
  Building2, CreditCard, Landmark, Users, Info, Heart, Calendar, BadgePercent
} from "lucide-react";
import { Link, useLocation } from "wouter";
import HMRCHelpTooltip from "../../../components/common/HMRCHelpTooltip";

export default function SAFormsPage() {
  return (
    <SAWorkspaceLayout activeSection="SA100 Core Income">
      <SAFormsContent />
    </SAWorkspaceLayout>
  );
}

function SAFormsContent() {
  const [, setLocation] = useLocation();
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

  // Marriage Allowance (ITA 2007 s55A / Boxes 8-10)
  const [claimMarriageAllowanceRecipient, setClaimMarriageAllowanceRecipient] = useState(false);
  const [claimMarriageAllowanceTransferor, setClaimMarriageAllowanceTransferor] = useState(false);
  const [marriageAllowanceSpouseNino, setMarriageAllowanceSpouseNino] = useState("");
  const [marriageAllowanceSpouseFirstName, setMarriageAllowanceSpouseFirstName] = useState("");
  const [marriageAllowanceSpouseLastName, setMarriageAllowanceSpouseLastName] = useState("");
  const [marriageAllowanceSpouseDob, setMarriageAllowanceSpouseDob] = useState("");

  // PAYE Coding Out Election (TMA 1970 s59B / Box 2)
  const [electPayeCodingOut, setElectPayeCodingOut] = useState(false);

  // SA101 Additional Reliefs (Capium Art 47: 9000271638)
  const [seisReliefClaimed, setSeisReliefClaimed] = useState("0.00");
  const [eisReliefClaimed, setEisReliefClaimed] = useState("0.00");
  const [vctReliefClaimed, setVctReliefClaimed] = useState("0.00");

  // High Income Child Benefit Charge (HICBC) States (Finance Act 2024)
  const [hasChildBenefit, setHasChildBenefit] = useState(false);
  const [childBenefitReceived, setChildBenefitReceived] = useState("0.00");
  const [childBenefitChildrenCount, setChildBenefitChildrenCount] = useState("1");

  // Live HICBC estimate for real-time statutory guidance
  const totalTaxableIncomeEstimate = parseFloat(currentReturn?.totalTaxableIncome || currentReturn?.netIncome || "0");
  const is2024OrLater = !selectedTaxYear.includes("2023/2024") && !selectedTaxYear.includes("2022/2023");
  const hicbcThreshold = is2024OrLater ? 60000 : 50000;
  const excessIncome = Math.max(0, totalTaxableIncomeEstimate - hicbcThreshold);
  const clawbackPct = is2024OrLater
    ? Math.min(100, Math.floor(excessIncome / 200))
    : Math.min(100, Math.floor(excessIncome / 100));
  const estimatedHicbcTax = hasChildBenefit
    ? (parseFloat(childBenefitReceived || "0") * (clawbackPct / 100))
    : 0;

  // Bank Details for Direct HMRC Tax Repayments (Capium FAQ 9000165597)
  const [repaymentOption, setRepaymentOption] = useState<"taxpayer" | "nominee" | "agent">("taxpayer");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [buildingSocietyRoll, setBuildingSocietyRoll] = useState("");
  const [nomineeDeclaration, setNomineeDeclaration] = useState(false);

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

      // Restore Marriage Allowance
      if (sched.claimMarriageAllowanceRecipient !== undefined) setClaimMarriageAllowanceRecipient(Boolean(sched.claimMarriageAllowanceRecipient));
      if (sched.claimMarriageAllowanceTransferor !== undefined) setClaimMarriageAllowanceTransferor(Boolean(sched.claimMarriageAllowanceTransferor));
      if (sched.marriageAllowanceSpouseNino) setMarriageAllowanceSpouseNino(sched.marriageAllowanceSpouseNino);
      if (sched.marriageAllowanceSpouseFirstName) setMarriageAllowanceSpouseFirstName(sched.marriageAllowanceSpouseFirstName);
      if (sched.marriageAllowanceSpouseLastName) setMarriageAllowanceSpouseLastName(sched.marriageAllowanceSpouseLastName);
      if (sched.marriageAllowanceSpouseDob) setMarriageAllowanceSpouseDob(sched.marriageAllowanceSpouseDob);

      // Restore PAYE Coding Out Election
      if (sched.electPayeCodingOut !== undefined) setElectPayeCodingOut(Boolean(sched.electPayeCodingOut));

      // Restore Child Benefit
      if (currentReturn.childBenefitReceived && parseFloat(currentReturn.childBenefitReceived) > 0) {
        setHasChildBenefit(true);
        setChildBenefitReceived(currentReturn.childBenefitReceived);
        if (currentReturn.childBenefitChildrenCount) setChildBenefitChildrenCount(String(currentReturn.childBenefitChildrenCount));
      } else if (sched.childBenefitReceived && parseFloat(sched.childBenefitReceived) > 0) {
        setHasChildBenefit(true);
        setChildBenefitReceived(sched.childBenefitReceived);
        if (sched.childBenefitChildrenCount) setChildBenefitChildrenCount(String(sched.childBenefitChildrenCount));
      } else if (sched.childBenefit?.amountReceived && parseFloat(sched.childBenefit.amountReceived) > 0) {
        setHasChildBenefit(true);
        setChildBenefitReceived(sched.childBenefit.amountReceived);
        if (sched.childBenefit.childrenCount) setChildBenefitChildrenCount(String(sched.childBenefit.childrenCount));
      }

      if (sched.bankRefundDetails) {
        setRepaymentOption(sched.bankRefundDetails.repaymentOption || "taxpayer");
        setBankAccountName(sched.bankRefundDetails.bankAccountName || client?.clientName || "");
        setBankSortCode(sched.bankRefundDetails.bankSortCode || "");
        setBankAccountNumber(sched.bankRefundDetails.bankAccountNumber || "");
        setBuildingSocietyRoll(sched.bankRefundDetails.buildingSocietyRoll || "");
        setNomineeDeclaration(!!sched.bankRefundDetails.nomineeDeclaration);
      } else if (client?.clientName) {
        setBankAccountName(client.clientName);
      }
    }
  }, [currentReturn, client]);

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
        // Marriage Allowance
        claimMarriageAllowanceRecipient,
        claimMarriageAllowanceTransferor,
        marriageAllowanceSpouseNino,
        marriageAllowanceSpouseFirstName,
        marriageAllowanceSpouseLastName,
        marriageAllowanceSpouseDob,
        // PAYE Coding Out
        electPayeCodingOut,
        // SA101 Additional Reliefs
        seisReliefClaimed,
        eisReliefClaimed,
        vctReliefClaimed,
        // High Income Child Benefit Charge
        childBenefitReceived: hasChildBenefit ? childBenefitReceived : "0.00",
        childBenefitChildrenCount: hasChildBenefit ? parseInt(childBenefitChildrenCount || "1") : 0,
        // Preserve and extend schedulesData
        schedulesData: {
          ...(typeof currentReturn?.schedulesData === "string"
            ? JSON.parse(currentReturn.schedulesData || "{}")
            : (currentReturn?.schedulesData || {})),
          claimMarriageAllowanceRecipient,
          claimMarriageAllowanceTransferor,
          marriageAllowanceSpouseNino,
          marriageAllowanceSpouseFirstName,
          marriageAllowanceSpouseLastName,
          marriageAllowanceSpouseDob,
          electPayeCodingOut,
          childBenefit: {
            hasClaim: hasChildBenefit,
            amountReceived: hasChildBenefit ? childBenefitReceived : "0.00",
            childrenCount: hasChildBenefit ? parseInt(childBenefitChildrenCount || "1") : 0,
          },
          bankRefundDetails: {
            repaymentOption,
            bankAccountName,
            bankSortCode,
            bankAccountNumber,
            buildingSocietyRoll,
            nomineeDeclaration,
          },
        },
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
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Step 1 of 6
            </span>
            <HMRCHelpTooltip code="SA100" showBadge={true} inline={true} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={16} className="text-purple-600" />
            SA100 Core Income, Reliefs & Statutory Elections ({selectedTaxYear})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Declare bank interest, dividends, private pensions, Gift Aid, Marriage Allowance transfer, and PAYE coding out election.
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

      {/* High Income Child Benefit Charge (HICBC) - Finance Act 2024 / ITEPA 2003 s681B (Boxes 1-3) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={15} className="text-purple-600" />
              Finishing Your Tax Return: High Income Child Benefit Charge (HICBC)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              HMRC SA100 Page TR5: If you or your partner had Adjusted Net Income over £{hicbcThreshold.toLocaleString()} and claimed Child Benefit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
              Finance Act {is2024OrLater ? "2024" : "2012"} Rules
            </span>
          </div>
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
          <input
            type="checkbox"
            checked={hasChildBenefit}
            onChange={(e) => setHasChildBenefit(e.target.checked)}
            className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Taxpayer or partner was entitled to or received Child Benefit payments in {selectedTaxYear}
          </span>
        </label>

        {hasChildBenefit && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Box 1: Total Child Benefit Received in Tax Year (£) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={childBenefitReceived}
                    onChange={(e) => setChildBenefitReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Total payments received between 6 April and 5 April</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Box 2: Number of Children Entitled To *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={childBenefitChildrenCount}
                  onChange={(e) => setChildBenefitChildrenCount(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Number of children for whom benefit was claimed</span>
              </div>

              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-0.5">
                    Statutory Clawback Status
                  </span>
                  {totalTaxableIncomeEstimate > hicbcThreshold ? (
                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                      Income &gt; £{hicbcThreshold.toLocaleString()}: {clawbackPct}% Clawback Rate
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Income under £{hicbcThreshold.toLocaleString()} (Nil HICBC)
                    </div>
                  )}
                </div>
                {estimatedHicbcTax > 0 && (
                  <div className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 mt-1">
                    Est. Tax Charge: +£{estimatedHicbcTax.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-start gap-1.5">
                <Info size={13} className="text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Finance Act {is2024OrLater ? "2024 Statutory Threshold" : "2012 Standard Rule"}</strong>:
                  {is2024OrLater
                    ? " From 6 April 2024, the HICBC threshold is £60,000 to £80,000. The charge is 1% of the Child Benefit for each £200 of Adjusted Net Income above £60,000 (fully tapered at £80,000)."
                    : " For tax years prior to 2024/25, the threshold is £50,000 to £60,000 with a 1% charge per £100 of income above £50,000."
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marriage Allowance Transfer (ITA 2007 s55A / Boxes 8-10) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={15} className="text-rose-600" />
              Marriage Allowance Transfer (ITA 2007 s55A)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Transfer 10% of Personal Allowance (£1,257) between spouses or civil partners. Provides an exact £251.40 tax reduction for basic rate taxpayers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HMRCHelpTooltip code="MARRIAGE_ALLOWANCE" showBadge={true} inline={true} />
            {claimMarriageAllowanceRecipient && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Tax Reduction: -£251.40
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option A: Claim as Recipient */}
          <label className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
            claimMarriageAllowanceRecipient
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40"
          }`}>
            <input
              type="checkbox"
              checked={claimMarriageAllowanceRecipient}
              onChange={(e) => {
                const val = e.target.checked;
                setClaimMarriageAllowanceRecipient(val);
                if (val) setClaimMarriageAllowanceTransferor(false);
              }}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                Claim as Recipient Spouse
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                My spouse/civil partner earns below £12,570 and is transferring 10% of their allowance to me. Directly reduces my Income Tax by <strong>£251.40</strong>.
              </p>
            </div>
          </label>

          {/* Option B: Elect as Transferor */}
          <label className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
            claimMarriageAllowanceTransferor
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40"
          }`}>
            <input
              type="checkbox"
              checked={claimMarriageAllowanceTransferor}
              onChange={(e) => {
                const val = e.target.checked;
                setClaimMarriageAllowanceTransferor(val);
                if (val) setClaimMarriageAllowanceRecipient(false);
              }}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                Elect as Transferor Spouse
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                I earn less than £12,570 and elect to transfer £1,257 of my Personal Allowance to my higher-earning spouse. My personal allowance will be reduced by £1,257.
              </p>
            </div>
          </label>
        </div>

        {/* Spouse Details (Required if either option is selected) */}
        {(claimMarriageAllowanceRecipient || claimMarriageAllowanceTransferor) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 pt-3">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
              Spouse / Civil Partner Statutory Verification Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Partner First Name *
                </label>
                <input
                  type="text"
                  value={marriageAllowanceSpouseFirstName}
                  onChange={(e) => setMarriageAllowanceSpouseFirstName(e.target.value)}
                  placeholder="e.g. Jane"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Partner Last Name *
                </label>
                <input
                  type="text"
                  value={marriageAllowanceSpouseLastName}
                  onChange={(e) => setMarriageAllowanceSpouseLastName(e.target.value)}
                  placeholder="e.g. Smith"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Partner NINO *
                </label>
                <input
                  type="text"
                  value={marriageAllowanceSpouseNino}
                  onChange={(e) => setMarriageAllowanceSpouseNino(e.target.value.toUpperCase())}
                  placeholder="e.g. QQ123456A"
                  maxLength={9}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Partner Date of Birth
                </label>
                <input
                  type="date"
                  value={marriageAllowanceSpouseDob}
                  onChange={(e) => setMarriageAllowanceSpouseDob(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAYE Coding Out Election (TMA 1970 s59B / Box 2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={15} className="text-blue-600" />
              Underpayment Collection: PAYE Coding Out Election (SA100 Box 2)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Taxes Management Act 1970 s59B: Have HMRC collect tax owed under £3,000 via your monthly PAYE tax code instead of paying a lump sum by 31 January.
            </p>
          </div>
          <HMRCHelpTooltip code="CODING_OUT" showBadge={true} inline={true} />
        </div>

        <label className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
          electPayeCodingOut
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40"
        }`}>
          <input
            type="checkbox"
            checked={electPayeCodingOut}
            onChange={(e) => setElectPayeCodingOut(e.target.checked)}
            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="space-y-1">
            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
              Box 2: Elect to have HMRC collect tax due through my PAYE tax code (Under £3,000)
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              If you owe less than £3,000 for {selectedTaxYear} and receive wages, salary, or a company/state pension under PAYE, HMRC will automatically adjust your tax code across 12 monthly deductions starting 6 April.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 pt-1">
              <Calendar size={12} className="shrink-0" />
              <span>Statutory Condition: Return must be filed online on or before 30 December (or 31 October if paper).</span>
            </div>
          </div>
        </label>
      </div>

      {/* Finishing Your Tax Return: Bank Details for Direct HMRC Tax Repayments (Capium FAQ 9000165597) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark size={15} className="text-emerald-600" />
              Finishing Your Tax Return: If You Have Paid Too Much Tax (Direct BACS Repayment)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              HMRC requires UK bank account details to pay any tax refunds directly via BACS instead of mailing payable orders.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 self-start sm:self-auto">
            <CheckCircle2 size={11} />
            HMRC Direct BACS Refund
          </span>
        </div>

        {/* Repayment Option Pills */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Repayment Destination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: "taxpayer", title: "Taxpayer's Account", desc: "Pay directly to taxpayer" },
              { id: "nominee", title: "Nominee's Account", desc: "Pay to nominated third-party" },
              { id: "agent", title: "Agent / Firm Client Account", desc: "Pay to practice client account" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRepaymentOption(opt.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  repaymentOption === opt.id
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{opt.title}</span>
                  {repaymentOption === opt.id && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bank Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Account Name *
            </label>
            <input
              type="text"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="e.g. Mr John Smith"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Sort Code (6 Digits) *
            </label>
            <input
              type="text"
              maxLength={8}
              value={bankSortCode}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                const formatted = cleaned.length > 4 ? `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}` : cleaned.length > 2 ? `${cleaned.slice(0, 2)}-${cleaned.slice(2)}` : cleaned;
                setBankSortCode(formatted);
              }}
              placeholder="e.g. 20-40-60"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Account Number (8 Digits) *
            </label>
            <input
              type="text"
              maxLength={8}
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
              placeholder="e.g. 12345678"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Building Society Roll No. (Optional)
            </label>
            <input
              type="text"
              value={buildingSocietyRoll}
              onChange={(e) => setBuildingSocietyRoll(e.target.value)}
              placeholder="e.g. 123/AB/456"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Nominee Declaration Checkbox (if nominee/agent) */}
        {repaymentOption !== "taxpayer" && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2.5">
            <input
              type="checkbox"
              id="nomineeCheck"
              checked={nomineeDeclaration}
              onChange={(e) => setNomineeDeclaration(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="nomineeCheck" className="text-[11px] text-amber-800 dark:text-amber-300 cursor-pointer">
              <strong>Nominee / Agent Authorization (HMRC Declaration)</strong>: I confirm that the taxpayer has formally authorized HMRC to pay any repayment of tax due for this year to the nominated person/agent account named above.
            </label>
          </div>
        )}
      </div>

      {/* Step 1 Guided Footer Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs">
            1
          </div>
          <div>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Step 1: Core Income & Bank Refund Completed</span>
            <span className="text-[10px] text-slate-400">Next: Supplementary Schedules (Employment, Self Employment & Property)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            <span>{saveMutation.isPending ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await saveMutation.mutateAsync();
                setLocation(`/self-assessment/${clientId}/schedules`);
              } catch {}
            }}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>Save & Proceed to Step 2</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
