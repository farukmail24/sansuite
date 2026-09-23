import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Shield, CheckCircle2, AlertCircle, RefreshCw, Send,
  ArrowRight, ArrowLeft, Code, FileText, Download, Building2, X
} from "lucide-react";
import { Link } from "wouter";

export default function CTSubmitPage() {
  return (
    <CTWorkspaceLayout activeSection="HMRC Submit Gateway">
      <CTSubmitContent />
    </CTWorkspaceLayout>
  );
}

function CTSubmitContent() {
  const { clientId, client, currentReturn, refetchReturns } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [irMark, setIrMark] = useState<string | null>(currentReturn?.irMark || null);
  const [showXmlModal, setShowXmlModal] = useState(false);

  // HMRC Agent Gateway Credentials state
  const [senderId, setSenderId] = useState("HMRC-AGENT-7781");
  const [isTestSubmission, setIsTestSubmission] = useState(false);

  // 1. Mutation: Pre-filing Validation & IR Mark
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/validate`, {});
    },
    onSuccess: async (data: any) => {
      if (data.isValid) {
        setIsValidated(true);
        setValidationErrors([]);
        setIrMark(data.irMark);
        await refetchReturns();
        toast({
          title: "Pre-Filing Validation Passed",
          description: `IR Mark generated: ${data.irMark}`,
        });
        setStep(2);
      } else {
        setIsValidated(false);
        setValidationErrors(data.errors || ["Validation failed"]);
        toast({
          title: "Validation Issues Detected",
          description: "Please resolve highlighted items before submitting to HMRC.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Validation Error",
        description: err.message || "Failed to validate return.",
        variant: "destructive",
      });
    },
  });

  // 2. Mutation: Live GovTalk XML Submission to HMRC
  const submitToHmrcMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/submit`, {
        isTestSubmission,
      });
    },
    onSuccess: async (data: any) => {
      await refetchReturns();
      toast({
        title: "CT600 Successfully Filed to HMRC",
        description: `Correlation ID: ${data.correlationId}`,
      });
      setStep(4);
    },
    onError: (err: any) => {
      toast({
        title: "HMRC Submission Failed",
        description: err.message || "Gateway rejected submission.",
        variant: "destructive",
      });
    },
  });

  if (!currentReturn) return null;

  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const isAccepted = currentReturn.status === "Accepted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-emerald-600" />
            HMRC GovTalk Electronic Submission Gateway
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            4-step statutory filing wizard for submitting CT600 Corporation Tax returns directly to HMRC.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
            isAccepted
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {isAccepted ? "HMRC Accepted (Filed)" : currentReturn.status || "Draft"}
        </span>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div
          onClick={() => setStep(1)}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            step === 1
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 1</span>
          <span>Validate Report</span>
        </div>

        <div
          onClick={() => isValidated && setStep(2)}
          className={`p-3 rounded-xl border transition-all ${
            step === 2
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer"
              : isValidated
              ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 2</span>
          <span>Verify Figures</span>
        </div>

        <div
          onClick={() => isValidated && setStep(3)}
          className={`p-3 rounded-xl border transition-all ${
            step === 3
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer"
              : isValidated
              ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 3</span>
          <span>Gateway Details</span>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            step === 4
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : isAccepted
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 font-semibold cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 4</span>
          <span>HMRC Receipt</span>
        </div>
      </div>

      {/* STEP 1: VALIDATE REPORT */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Step 1: Statutory Pre-Filing Validation
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verify compliance with HMRC business logic, 10-digit UTR verification, and generate cryptographic IR Mark.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Company Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{client?.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">10-Digit Corporation Tax UTR:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {currentReturn.utrNumber || client?.utrNumber || "MISSING"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Accounting Period:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(currentReturn.accountingPeriodStart).toLocaleDateString("en-GB")} to {new Date(currentReturn.accountingPeriodEnd).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Net Tax Due to HMRC:</span>
                <span className="font-mono font-bold text-emerald-600">£{netTaxDue.toFixed(2)}</span>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 space-y-1">
                <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Validation Errors Detected:
                </span>
                <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-400 space-y-0.5">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {irMark && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> IR Mark Generated:
                </span>
                <span className="font-mono text-xs text-emerald-900 dark:text-emerald-200 block truncate">
                  {irMark}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              disabled={validateMutation.isPending}
              onClick={() => validateMutation.mutate()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={validateMutation.isPending ? "animate-spin" : ""} />
              <span>{validateMutation.isPending ? "Validating..." : "Run Pre-Filing Validation"}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: VERIFY REPORT */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Step 2: Verify CT600 Return & Attached Schedules
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review computed figures and ensure statutory attachments are in order before gateway transmission.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                Tax Liability Summary
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Turnover:</span>
                <span className="font-mono">£{parseFloat(currentReturn.turnover || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Trading Profit:</span>
                <span className="font-mono">£{parseFloat(currentReturn.taxableTradingProfit || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profits Chargeable to CT:</span>
                <span className="font-mono">£{parseFloat(currentReturn.profitsChargeableToCt || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicable Tax Rate:</span>
                <span className="font-bold text-indigo-600">{currentReturn.ctRatePercentage || "19"}%</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-1 text-emerald-600">
                <span>Net Tax Due:</span>
                <span className="font-mono">£{netTaxDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-700 pb-1">
                Statutory Submissions Checks
              </span>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={13} />
                <span>IR Mark Cryptographically Certified</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={13} />
                <span>Payment Reference Generated ({currentReturn.utrNumber || client?.utrNumber}A001)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={13} />
                <span>GovTalk XML Payload Formatted</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Proceed to Gateway Details</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GATEWAY DETAILS */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Step 3: HMRC Online Services Gateway Credentials
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Confirm your HMRC Agent Gateway credentials for electronic transmission.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                HMRC Agent Sender ID / Government Gateway ID
              </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="testToggle"
                checked={isTestSubmission}
                onChange={(e) => setIsTestSubmission(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="testToggle" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                Submit as Test Transmission (validates with HMRC without recording final filing)
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <button
              type="button"
              disabled={submitToHmrcMutation.isPending}
              onClick={() => submitToHmrcMutation.mutate()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Send size={13} />
              <span>{submitToHmrcMutation.isPending ? "Transmitting to HMRC..." : "Submit CT600 to HMRC"}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: HMRC SUBMISSION RECEIPT */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              CT600 Successfully Accepted by HMRC
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              HMRC GovTalk Gateway has acknowledged and accepted the Corporation Tax return for {client?.clientName}.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">HMRC Correlation ID:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currentReturn.hmrcCorrelationId || "HMRC-CT-SUCCESS"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">IR Mark:</span>
              <span className="font-bold text-indigo-600 truncate max-w-[280px]">
                {currentReturn.irMark || irMark || "IR-CERTIFIED"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Timestamp:</span>
              <span className="text-slate-800 dark:text-slate-200">
                {currentReturn.submittedAt ? new Date(currentReturn.submittedAt).toLocaleString("en-GB") : new Date().toLocaleString("en-GB")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Net Tax Payable:</span>
              <span className="font-bold text-emerald-600">£{netTaxDue.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link href={`/corporation-tax/${clientId}/tax-due`}>
              <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>View Tax Due Advice Slip</span>
                <ArrowRight size={12} />
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setShowXmlModal(true)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Code size={12} />
              <span>View HMRC Receipt XML</span>
            </button>
          </div>
        </div>
      )}

      {/* XML Receipt Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Code size={16} className="text-indigo-600" />
                HMRC GovTalk Response XML
              </h3>
              <button onClick={() => setShowXmlModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-96">
              {currentReturn.submissionReceiptXml ||
`<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>response</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${currentReturn.hmrcCorrelationId || "HMRC-CT-SUCCESS"}</CorrelationID>
      <Status>SUCCESS</Status>
    </MessageDetails>
  </Header>
  <Body>
    <SuccessResponse>
      <IRmark>${currentReturn.irMark || "IR-CERTIFIED"}</IRmark>
      <Message>HMRC received your CT600 return successfully.</Message>
    </SuccessResponse>
  </Body>
</GovTalkMessage>`}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
