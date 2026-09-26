import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Shield, CheckCircle2, AlertCircle, RefreshCw, Send,
  ArrowRight, ArrowLeft, Code, FileText, Download, User, X, ExternalLink
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

  // Fetch Practice HMRC Agent Services Account (ASA) Details
  const { data: firmDetails } = useQuery<any>({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // HMRC Agent Gateway Credentials state
  const [senderId, setSenderId] = useState("");
  const [saAgentId, setSaAgentId] = useState("");
  const [isTestSubmission, setIsTestSubmission] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  useEffect(() => {
    if (firmDetails) {
      const defaultSender = firmDetails.hmrcGatewayId || firmDetails.saAgentId || firmDetails.hmrcAgentCode || "";
      if (defaultSender && !senderId) {
        setSenderId(defaultSender);
      }
      if (firmDetails.saAgentId && !saAgentId) {
        setSaAgentId(firmDetails.saAgentId);
      }
    }
  }, [firmDetails]);

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Step 3: HMRC Online Services Gateway Credentials
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Practice-wide HMRC Agent Services Account (ASA) credentials for electronic SA100 transmission.
              </p>
            </div>
            <Link
              href="/admin"
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage Firm ASA Credentials</span>
              <ExternalLink size={11} />
            </Link>
          </div>

          {firmDetails?.hmrcGatewayId || firmDetails?.saAgentId || firmDetails?.hmrcAgentCode ? (
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} />
              </div>
              <div className="text-xs space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Practice HMRC ASA Credentials Connected
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                    Global Default Active
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Credentials saved in <strong>My Admin &gt; My Firm &gt; Agent Credentials</strong> are automatically applied to this SA100 return.
                </p>
                <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                  {firmDetails.hmrcGatewayId && (
                    <span>Gateway ID: <strong>{firmDetails.hmrcGatewayId}</strong></span>
                  )}
                  {firmDetails.saAgentId && (
                    <span>SA Agent ID: <strong>{firmDetails.saAgentId}</strong></span>
                  )}
                  {firmDetails.hmrcAgentCode && (
                    <span>Agent Ref: <strong>{firmDetails.hmrcAgentCode}</strong></span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={16} />
              </div>
              <div className="text-xs space-y-1 flex-1">
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Global Practice HMRC Credentials Not Configured
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Save your Government Gateway ID and Agent Reference once in{" "}
                  <Link href="/admin" className="underline font-bold hover:text-amber-900">
                    My Admin &gt; My Firm &gt; Agent Credentials
                  </Link>{" "}
                  to auto-fill globally across all clients and filing modules.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 text-xs max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  HMRC Sender ID / Government Gateway ID
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Self Assessment Agent ID
                </label>
                <input
                  type="text"
                  value={saAgentId}
                  onChange={(e) => setSaAgentId(e.target.value)}
                  placeholder="e.g. SA123456"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-700 dark:text-slate-200 focus:outline-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="testToggleSA"
                  checked={isTestSubmission}
                  onChange={(e) => setIsTestSubmission(e.target.checked)}
                  className="rounded border-slate-300 mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Submit as Test Transmission (HMRC Live Test Service)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Transmits GovTalk XML payload to HMRC gateway for validation verification without logging an official statutory filing.
                  </span>
                </div>
              </label>
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
              disabled={submitToHmrcMutation.isPending || !senderId}
              onClick={() => {
                setDeclarationAgreed(false);
                setShowConfirmModal(true);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Send size={14} className={submitToHmrcMutation.isPending ? "animate-spin" : ""} />
              <span>Transmit SA100 to HMRC</span>
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

      {/* Statutory Filing Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Confirm Statutory SA100 Filing
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    HMRC Self Assessment Electronic Submission Gateway
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Transmission Mode Alert */}
              {isTestSubmission ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 dark:text-amber-300">
                    <span className="font-bold block">Test Transmission Mode</span>
                    This return will be validated against HMRC gateway test rules without recording an official legal filing.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold block">Live Official Statutory Filing</span>
                    This transmission will officially submit Form SA100 to HM Revenue &amp; Customs for legal tax assessment.
                  </div>
                </div>
              )}

              {/* Return Details Summary Table */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">Taxpayer Name:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{client?.clientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">10-Digit Tax UTR:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {currentReturn.utrNumber || client?.utrNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">Tax Year:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{currentReturn.taxYear}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">Total Taxable Income:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    £{parseFloat(currentReturn.totalTaxableIncome || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">Net Tax Due to HMRC:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    £{parseFloat(currentReturn.netTaxDue || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  <span className="text-slate-500">Gateway Sender ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{senderId}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500">Certified IR Mark:</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[240px]">
                    {currentReturn.irMark || irMark || "Generated"}
                  </span>
                </div>
              </div>

              {/* Statutory Legal Declaration Checkbox */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                    I confirm that I have reviewed the SA100 return and computations. I declare that the information is correct and complete to the best of my knowledge, and I am authorized to transmit this return to HM Revenue &amp; Customs.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel &amp; Review
              </button>

              <button
                type="button"
                disabled={!declarationAgreed || submitToHmrcMutation.isPending}
                onClick={async () => {
                  try {
                    await submitToHmrcMutation.mutateAsync();
                    setShowConfirmModal(false);
                  } catch (e) {}
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Send size={14} className={submitToHmrcMutation.isPending ? "animate-spin" : ""} />
                <span>{submitToHmrcMutation.isPending ? "Submitting to HMRC..." : "Confirm & Transmit to HMRC"}</span>
              </button>
            </div>
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
