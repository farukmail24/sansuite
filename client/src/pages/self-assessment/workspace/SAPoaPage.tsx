import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  CreditCard, AlertCircle, CheckCircle2, Shield, Calendar,
  TrendingDown, ArrowRight, Save, HelpCircle, RefreshCw, FileText
} from "lucide-react";
import { Link } from "wouter";

export default function SAPoaPage() {
  return (
    <SAWorkspaceLayout activeSection="Payments on Account">
      <SAPoaContent />
    </SAWorkspaceLayout>
  );
}

function SAPoaContent() {
  const { clientId, client, currentReturn, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Claim to reduce state
  const [claimReduction, setClaimReduction] = useState(false);
  const [reducedAmount, setReducedAmount] = useState("0.00");
  const [reductionReason, setReductionReason] = useState("income_decreased");
  const [reductionExplanation, setReductionExplanation] = useState("");

  useEffect(() => {
    if (currentReturn?.schedulesData?.poaReduction) {
      const red = currentReturn.schedulesData.poaReduction;
      setClaimReduction(red.claimed || false);
      setReducedAmount(red.reducedAmount || "0.00");
      setReductionReason(red.reason || "income_decreased");
      setReductionExplanation(red.explanation || "");
    }
  }, [currentReturn]);


  const totalTaxAndNic = parseFloat(currentReturn.totalTaxAndNic || "0");
  const taxDeductedAtSource = parseFloat(currentReturn.taxDeductedAtSource || "0");
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const firstPoA = parseFloat(currentReturn.firstPaymentOnAccount || "0");
  const secondPoA = parseFloat(currentReturn.secondPaymentOnAccount || "0");

  // Statutory Criteria Check (TMA 1970 s59A)
  const isOverThousand = netTaxDue >= 1000;
  const sourceRatio = totalTaxAndNic > 0 ? (taxDeductedAtSource / totalTaxAndNic) * 100 : 100;
  const isUnderEightyPercent = sourceRatio < 80;
  const poaApplies = isOverThousand && isUnderEightyPercent;

  // Save Claim to Reduce Mutation
  const saveReductionMutation = useMutation({
    mutationFn: async () => {
      const currentSchedules = currentReturn.schedulesData || {};
      const updatedSchedules = {
        ...currentSchedules,
        poaReduction: {
          claimed: claimReduction,
          reducedAmount: claimReduction ? reducedAmount : "0.00",
          reason: reductionReason,
          explanation: reductionExplanation,
        },
      };

      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/schedules`, {
        schedulesData: updatedSchedules,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save PoA claim" }));
        throw new Error(err.error || "Failed to save PoA claim");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchReturns();
      toast({
        title: "PoA Reduction Saved",
        description: claimReduction
          ? `Claim to reduce each Payment on Account to £${parseFloat(reducedAmount || "0").toFixed(2)} recorded.`
          : "Standard statutory Payments on Account retained.",
        type: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message,
        type: "error",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-600" />
            Statutory Payments on Account (TMA 1970 s59A)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Advance payments towards the next tax year’s Income Tax and Class 4 National Insurance liability.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
            poaApplies
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
          }`}
        >
          {poaApplies ? "Payments on Account Mandatory" : "Exempt from Payments on Account"}
        </span>
      </div>

      {/* Statutory Rules Diagnostic Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Shield size={14} className="text-indigo-600" />
          HMRC Two-Part Statutory Exemption Test
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Rule 1 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Test 1: De Minimis £1,000 Threshold</span>
              {isOverThousand ? (
                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                  <AlertCircle size={13} /> Exceeds £1,000
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Below £1,000 (Exempt)
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[11px]">
              If the tax liability after tax deducted at source is under £1,000, no Payments on Account are required.
            </p>
            <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              Net Tax Due: £{netTaxDue.toFixed(2)}
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Test 2: 80% Tax at Source Rule</span>
              {isUnderEightyPercent ? (
                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                  <AlertCircle size={13} /> Under 80% ({sourceRatio.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> 80%+ at source (Exempt)
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[11px]">
              If 80% or more of your total tax was collected at source (e.g. PAYE, CIS), no Payments on Account are required.
            </p>
            <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              Source Percentage: {sourceRatio.toFixed(1)}% (£{taxDeductedAtSource.toFixed(2)} of £{totalTaxAndNic.toFixed(2)})
            </div>
          </div>
        </div>
      </div>

      {/* Payment Installments Schedule */}
      {poaApplies && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" />
                1st Payment on Account
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                Due 31 January
              </span>
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                £{(claimReduction ? parseFloat(reducedAmount || "0") : firstPoA).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
              {claimReduction && (
                <span className="text-[10px] text-amber-600 block line-through">
                  Original: £{firstPoA.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Payable concurrently with the balancing tax due for tax year {currentReturn.taxYear}.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" />
                2nd Payment on Account
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                Due 31 July
              </span>
            </div>
            <div>
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                £{(claimReduction ? parseFloat(reducedAmount || "0") : secondPoA).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
              {claimReduction && (
                <span className="text-[10px] text-amber-600 block line-through">
                  Original: £{secondPoA.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Second installment towards the subsequent tax year liability.
            </p>
          </div>
        </div>
      )}

      {/* Claim to Reduce Payments on Account (HMRC Form SA303 / SA100 Box 11) */}
      {poaApplies && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <TrendingDown size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Claim to Reduce Payments on Account
                </h3>
                <p className="text-xs text-slate-500">
                  HMRC allows reduction if you expect next year's income or self-employment profits to be significantly lower.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={claimReduction}
                onChange={(e) => setClaimReduction(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {claimReduction && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Reduced Amount for EACH Payment (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reducedAmount}
                    onChange={(e) => setReducedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    placeholder="0.00"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Total advance payments will be 2 × £{parseFloat(reducedAmount || "0").toFixed(2)} = £{(parseFloat(reducedAmount || "0") * 2).toFixed(2)}.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Statutory HMRC Reason Code *
                  </label>
                  <select
                    value={reductionReason}
                    onChange={(e) => setReductionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="income_decreased">My income has decreased</option>
                    <option value="allowances_increased">My tax allowances or reliefs have increased</option>
                    <option value="source_tax_increased">More of my income is being taxed at source</option>
                    <option value="ceased_trading">I have ceased trading or changed employment</option>
                    <option value="other">Other statutory commercial reason</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs mb-1">
                  Explanation / Justification for Reduction *
                </label>
                <textarea
                  rows={3}
                  value={reductionExplanation}
                  onChange={(e) => setReductionExplanation(e.target.value)}
                  placeholder="State clearly why you expect next year's taxable income or profit to be lower (e.g. loss of client, maternity leave, lower contract rates)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Statutory Warning */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1">
                  <p className="font-semibold">Statutory HMRC Interest & Surcharge Warning</p>
                  <p>
                    If you reduce your Payments on Account and your final tax turns out to be higher than your reduced estimate, HMRC will charge statutory interest from the original due dates and may apply penalties for unjustified claims.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => saveReductionMutation.mutate()}
                  disabled={saveReductionMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Save size={13} />
                  <span>{saveReductionMutation.isPending ? "Saving..." : "Save PoA Reduction Claim"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <Link
          to={`/self-assessment/${clientId}/calculation`}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5"
        >
          <span>Back to Tax Calculation (SA302)</span>
        </Link>

        <Link
          to={`/self-assessment/${clientId}/tax-due`}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <span>View Payment Advice Slip</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
