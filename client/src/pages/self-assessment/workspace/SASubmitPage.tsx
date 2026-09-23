import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Shield, CheckCircle2, AlertCircle, RefreshCw, Send,
  ArrowRight, ArrowLeft, Code, FileText, Download, User, X
} from "lucide-react";
import { Link } from "wouter";

export default function SASubmitPage() {
  return (
    <SAWorkspaceLayout activeSection="HMRC Submit Gateway">
      <SASubmitContent />
    </SAWorkspaceLayout>
  );
}

function SASubmitContent() {
  const { clientId, client, currentReturn, refetchReturns } = useSAWorkspace();
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
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/validate`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Validation failed" }));
        throw new Error(err.error || "Validation failed");
      }
      return res.json();
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
          type: "success",
        });
        setStep(2);
      } else {
        setIsValidated(false);
        setValidationErrors(data.errors || ["Validation failed"]);
        toast({
          title: "Validation Issues Detected",
          description: "Please resolve highlighted items before submitting to HMRC.",
          type: "error",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Validation Error",
        description: err.message,
        type: "error",
      });
    },
  });

  // 2. Mutation: Live GovTalk XML Submission to HMRC
  const submitToHmrcMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/submit`, {
        isTestSubmission,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gateway rejected submission" }));
        throw new Error(err.error || "Gateway rejected submission");
      }
      return res.json();
    },
    onSuccess: async (data: any) => {
      await refetchReturns();
      toast({
        title: "SA100 Successfully Filed to HMRC",
        description: `Correlation ID: ${data.correlationId}`,
        type: "success",
      });
      setStep(4);
    },
    onError: (err: any) => {
      toast({
        title: "HMRC Submission Failed",
        description: err.message,
        type: "error",
      });
    },
  });


  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const isAccepted = currentReturn.status === "Accepted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-emerald-600" />
            HMRC GovTalk Electronic Submission Gateway (SA100)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            4-step statutory filing wizard for submitting Self Assessment tax returns directly to HMRC.
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
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 1</span>
          <span>Validate Report</span>
        </div>

        <div
          onClick={() => (isValidated || irMark ? setStep(2) : null)}
          className={`p-3 rounded-xl border transition-all ${
            step === 2
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : isValidated || irMark
              ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-50 cursor-not-allowed"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 2</span>
          <span>Verify Return</span>
        </div>

        <div
          onClick={() => (isValidated || irMark ? setStep(3) : null)}
          className={`p-3 rounded-xl border transition-all ${
            step === 3
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : isValidated || irMark
              ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-50 cursor-not-allowed"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 3</span>
          <span>Gateway Details</span>
        </div>

        <div
          onClick={() => (isAccepted ? setStep(4) : null)}
          className={`p-3 rounded-xl border transition-all ${
            step === 4
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : isAccepted
              ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 cursor-pointer"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-50 cursor-not-allowed"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">Step 4</span>
          <span>Submit to HMRC</span>
        </div>
      </div>

      {/* STEP 1: VALIDATE */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Step 1: Statutory Validation & IR Mark Generation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Checks UTR, National Insurance Number, supplementary page balances, and creates cryptographic IR Mark.
              </p>
            </div>

            <button
              type="button"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={validateMutation.isPending ? "animate-spin" : ""} />
              <span>{validateMutation.isPending ? "Validating..." : "Run Pre-Filing Validation"}</span>
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <AlertCircle size={14} /> Validation Errors Found ({validationErrors.length})
              </span>
              <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-300 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {isValidated && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Pre-Filing Validation Passed
              </span>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                The SA100 return is compliant with HMRC online filing schema specifications.
              </p>
              {irMark && (
                <div className="mt-2 text-xs">
                  <span className="text-slate-500">Cryptographic IR Mark: </span>
                  <code className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200">
                    {irMark}
                  </code>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">10-Digit Unique Taxpayer Reference (UTR)</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentReturn.utrNumber || client?.utrNumber || "Missing"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">National Insurance Number (NINO)</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentReturn.niNumber || client?.niNumber || "Missing"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Tax Year</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentReturn.taxYear}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Total Balancing Tax Due</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isValidated && !irMark}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue to Verify Return</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: VERIFY */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Step 2: Verify Final SA100 Computation & Declaration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all income totals, reliefs, and taxpayer approval status before transmitting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Taxpayer Information</span>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxpayer:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{client?.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UTR:</span>
                <span className="font-mono font-semibold">{currentReturn.utrNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NINO:</span>
                <span className="font-mono font-semibold">{currentReturn.niNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">eSign Status:</span>
                <span
                  className={`font-semibold ${
                    currentReturn.status === "Signed" || currentReturn.status === "Accepted"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {currentReturn.status === "Signed" || currentReturn.status === "Accepted"
                    ? "Signed & Approved"
                    : "Not Signed Yet"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Tax Liability Summary</span>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Income:</span>
                <span className="font-mono">£{parseFloat(currentReturn.totalIncomeReceived || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Personal Allowance:</span>
                <span className="font-mono">£{parseFloat(currentReturn.personalAllowance || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Tax Due:</span>
                <span className="font-mono font-bold text-emerald-600">
                  £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">1st Payment on Account:</span>
                <span className="font-mono">£{parseFloat(currentReturn.firstPaymentOnAccount || "0").toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Validation</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue to Gateway Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GATEWAY DETAILS */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Step 3: HMRC Agent Gateway Credentials & Options
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm your Government Gateway credentials and choose Test Service or Live Production.
            </p>
          </div>

          <div className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                HMRC Agent Sender ID *
              </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTestSubmission}
                  onChange={(e) => setIsTestSubmission(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Submit to HMRC Test in Live (Test Service)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6">
                Enables pre-transmission test mode without filing an official statutory tax return to HMRC live records.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Verify</span>
            </button>

            <button
              type="button"
              onClick={() => submitToHmrcMutation.mutate()}
              disabled={submitToHmrcMutation.isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Send size={14} className={submitToHmrcMutation.isPending ? "animate-spin" : ""} />
              <span>{submitToHmrcMutation.isPending ? "Submitting to HMRC..." : "Transmit SA100 to HMRC"}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUBMISSION CONFIRMATION */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs space-y-6 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              SA100 Tax Return Successfully Filed
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              HMRC has officially accepted the Self Assessment return for tax year {currentReturn.taxYear}.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">HMRC Gateway Status:</span>
              <span className="font-semibold text-emerald-600">Accepted</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Correlation ID:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentReturn.submissionCorrelationId || "CORR-" + currentReturn.id + "-PROD"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cryptographic IR Mark:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentReturn.irMark || irMark || "Generated"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submission Timestamp:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {currentReturn.submittedAt ? new Date(currentReturn.submittedAt).toLocaleString("en-GB") : new Date().toLocaleString("en-GB")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowXmlModal(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code size={13} />
              <span>View GovTalk XML Payload</span>
            </button>

            <Link
              to={`/self-assessment/${clientId}/tax-due`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Download Payment Advice Slip</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* GovTalk XML Viewer Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Code size={16} className="text-emerald-600" />
                HMRC GovTalk XML Protocol Transmission
              </h3>
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <pre className="p-4 bg-slate-950 text-emerald-400 text-xs font-mono rounded-xl overflow-x-auto whitespace-pre leading-relaxed">
{`<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-SA-SA100</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${currentReturn.submissionCorrelationId || "CORR-" + currentReturn.id + "-PROD"}</CorrelationID>
      <Transformation>XML</Transformation>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${senderId}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>Agent</Role>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <TargetDetails>
      <OrganisationalUnit>HMRC</OrganisationalUnit>
    </TargetDetails>
  </GovTalkDetails>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/SA/SA100/23-24/1">
      <IRheader>
        <Keys>
          <Key Type="UTR">${currentReturn.utrNumber || client?.utrNumber}</Key>
          <Key Type="NINO">${currentReturn.niNumber || client?.niNumber}</Key>
        </Keys>
        <PeriodEnd>2024-04-05</PeriodEnd>
        <IRmark Type="generic">${currentReturn.irMark || irMark || "GEN-IRMARK-SAMPLE"}</IRmark>
      </IRheader>
      <SA100>
        <TaxYear>${currentReturn.taxYear}</TaxYear>
        <TotalIncomeReceived>${currentReturn.totalIncomeReceived}</TotalIncomeReceived>
        <TotalTaxableIncome>${currentReturn.totalTaxableIncome}</TotalTaxableIncome>
        <TotalTaxAndNic>${currentReturn.totalTaxAndNic}</TotalTaxAndNic>
        <TaxDeductedAtSource>${currentReturn.taxDeductedAtSource}</TaxDeductedAtSource>
        <NetTaxDue>${currentReturn.netTaxDue}</NetTaxDue>
        <FirstPaymentOnAccount>${currentReturn.firstPaymentOnAccount}</FirstPaymentOnAccount>
        <SecondPaymentOnAccount>${currentReturn.secondPaymentOnAccount}</SecondPaymentOnAccount>
      </SA100>
    </IRenvelope>
  </Body>
</GovTalkMessage>`}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
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
