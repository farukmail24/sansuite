import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, Send,
  FileCheck, Calculator, DollarSign, Download, Lock
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdTask } from "./types";

interface Props {
  task: MtdTask;
  onBack: () => void;
}

export default function FinalDeclarationWorkspace({ task, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch consolidated calculation
  const { data: finalData, isLoading } = useQuery({
    queryKey: [`/api/mtd-it/final-declaration`, task.clientId, "2025-26"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mtd-it/final-declaration/${task.clientId}/2025-26`);
      return res.json();
    },
  });

  const figures = finalData?.calculatedFigures;
  const isSubmitted = finalData?.declaration?.status === "Submitted";

  // Submit Final Declaration Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mtd-it/final-declaration/submit", {
        clientId: task.clientId,
        mtdClientId: task.mtdClientId,
        taxYear: "2025-26",
        figures,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/final-declaration`, task.clientId, "2025-26"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      toast({
        title: "Final Declaration Submitted",
        description: data.message || "Annual return successfully submitted to HMRC.",
      });
      onBack();
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">{task.clientName}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Annual Consolidated Return
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Task: <strong>Final Declaration (replacing SA100)</strong> | Tax Year: <strong>2025-26</strong> | Due:{" "}
              <strong>31 Jan 2027</strong> | Status:{" "}
              <span className={`font-semibold ${isSubmitted ? "text-green-600" : "text-amber-600"}`}>
                {isSubmitted ? "Submitted to HMRC" : "Draft Ready"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              toast({
                title: "Approval Sent",
                description: "Final Declaration statement dispatched to Capisign for client digital signature.",
              })
            }
            className="px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Send size={14} /> Send to Capisign for Signature
          </button>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!declarationConfirmed || isSubmitted || submitMutation.isPending}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldCheck size={14} /> {submitMutation.isPending ? "Submitting..." : "Submit Final Declaration to HMRC"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs uppercase font-bold text-gray-500">Gross Total Turnover</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">£{figures?.totalTurnover || "0.00"}</span>
          <span className="text-[11px] text-gray-400">All business & property sources</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs uppercase font-bold text-gray-500">Allowable Expenses</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">£{figures?.totalAllowableExpenses || "0.00"}</span>
          <span className="text-[11px] text-gray-400">Deductible trading expenses</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs uppercase font-bold text-gray-500">Dividends Income</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">£{figures?.totalDividends || "0.00"}</span>
          <span className="text-[11px] text-gray-400">From Dividends Database</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs uppercase font-bold text-[#6c5ce7]">Estimated Tax & NIC Due</span>
          <span className="text-xl font-black text-indigo-950 mt-1 block">£{figures?.estimatedTaxDue || "0.00"}</span>
          <span className="text-[11px] text-indigo-600">Calculated statutory liability</span>
        </div>
      </div>

      {/* Tax Liability Computation Statement */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
          Statutory Tax Liability Computation (Year ended 5 April 2026)
        </h3>

        <div className="divide-y divide-gray-100 text-xs">
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-600">Total Net Trading & Property Profits:</span>
            <span className="font-semibold text-gray-800">£{figures?.netProfit || "0.00"}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-600">Total UK & Foreign Dividends:</span>
            <span className="font-semibold text-gray-800">£{figures?.totalDividends || "0.00"}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-600">Total Net Income:</span>
            <span className="font-bold text-gray-900">
              £{(parseFloat(figures?.netProfit || "0") + parseFloat(figures?.totalDividends || "0")).toFixed(2)}
            </span>
          </div>
          <div className="py-2.5 flex justify-between text-green-700">
            <span>Less: Personal Allowance (Standard £12,570):</span>
            <span className="font-semibold">-£{figures?.personalAllowanceUsed || "0.00"}</span>
          </div>
          <div className="py-2.5 flex justify-between font-bold bg-gray-50 px-2 rounded">
            <span className="text-gray-900">Total Taxable Income:</span>
            <span className="text-gray-900">£{figures?.taxableProfit || "0.00"}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-600">Income Tax at Basic Rate (20%):</span>
            <span className="font-semibold text-gray-800">£{figures?.estimatedTaxDue || "0.00"}</span>
          </div>
          <div className="py-3 flex justify-between font-extrabold text-sm text-[#6c5ce7] bg-indigo-50/60 px-3 rounded-lg mt-2">
            <span>Total Estimated Tax Liability Payable by 31 Jan 2027:</span>
            <span>£{figures?.estimatedTaxDue || "0.00"}</span>
          </div>
        </div>
      </div>

      {/* Statutory Final Declaration Checkbox */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="declare-confirm"
            checked={declarationConfirmed}
            onChange={(e) => setDeclarationConfirmed(e.target.checked)}
            className="mt-1 rounded text-[#6c5ce7] focus:ring-[#6c5ce7]"
          />
          <label htmlFor="declare-confirm" className="text-xs text-amber-950 font-medium leading-relaxed">
            <strong>Statutory Declaration Confirmation:</strong> I confirm that I have reviewed the quarterly submissions,
            adjustments, allowances, and dividend records for this client. The information provided in this Final
            Declaration is correct and complete to the best of my knowledge and belief, in accordance with the Taxes
            Management Act 1970 and MTD for Income Tax legislation.
          </label>
        </div>
      </div>
    </div>
  );
}
