import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Printer, Building2, Calendar, AlertCircle,
  CheckCircle2, Copy, ExternalLink, RefreshCw, CreditCard, Shield, FileText, ArrowRight, ArrowLeft
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import HMRCHelpTooltip from "../../../components/common/HMRCHelpTooltip";

export default function SATaxDuePage() {
  return (
    <SAWorkspaceLayout activeSection="Tax Due Notice">
      <SATaxDueContent />
    </SAWorkspaceLayout>
  );
}

function SATaxDueContent() {
  const [, setLocation] = useLocation();
  const { clientId, client, currentReturn } = useSAWorkspace();
  const { toast } = useToast();

  const { data: taxDueData, isLoading } = useQuery<any>({
    queryKey: [`/api/self-assessment/${clientId}/returns/${currentReturn?.id}/tax-due`],
    queryFn: async () => {
      if (!currentReturn?.id) return null;
      const res = await apiRequest("GET", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/tax-due`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentReturn?.id,
  });

  // Fetch Practice Letterhead Settings (Capium Art 44: 9000228367)
  const { data: saSettings } = useQuery<any>({
    queryKey: ["/api/self-assessment/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/self-assessment/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const letterhead = saSettings?.taxDueLetterhead;
  const displayPracticeName = letterhead?.practiceName || "SanSuite Practice Tax Services";
  const displayHeaderText = letterhead?.headerText || "Self Assessment Tax Payment Notice";
  const displayIntro = letterhead?.introNotice;
  const displaySignoff = letterhead?.signoffText;
  const includeFirmBank = letterhead?.includeFirmBankDetails;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${label}: ${text}`,
      type: "success",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const utr = currentReturn.utrNumber || client?.utrNumber || "1234567890";
  // Statutory SA Reference format: 10-digit UTR + 'K'
  const paymentRef = `${utr}K`;
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const firstPoA = parseFloat(currentReturn.firstPaymentOnAccount || "0");
  const secondPoA = parseFloat(currentReturn.secondPaymentOnAccount || "0");

  let sched: any = {};
  if (currentReturn.schedulesData) {
    try {
      sched = typeof currentReturn.schedulesData === "string" ? JSON.parse(currentReturn.schedulesData) : currentReturn.schedulesData;
    } catch {}
  }
  const isCodedOut = Boolean(currentReturn.canCodeOut || sched.canCodeOut || (sched.electPayeCodingOut && netTaxDue < 3000 && netTaxDue > 0));
  const codedAmount = isCodedOut ? netTaxDue : 0;
  const balancingJanDue = isCodedOut ? 0 : netTaxDue;
  const totalJanDue = balancingJanDue + firstPoA;

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden no-print sa100-no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Step 4 of 6
            </span>
            <HMRCHelpTooltip code="CODING_OUT" showLabel />
          </div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Printer size={16} className="text-emerald-600" />
            Statutory Self Assessment Tax Payment Advice & Settlement
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Client payment advice slip with unique 11-character HMRC reference ({paymentRef}) and official bank transfer details.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Printer size={13} />
          <span>Print / Save Payment Slip</span>
        </button>
      </div>

      {/* Printable Tax Due Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs w-full space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 block mb-1">
              {displayPracticeName}
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {displayHeaderText}
            </h1>
            {displayIntro && (
              <p className="text-[11px] text-slate-500 italic mt-1 leading-relaxed">
                "{displayIntro}"
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Client: <span className="font-semibold text-slate-800 dark:text-slate-200">{client?.clientName}</span>
            </p>
            <p className="text-xs text-slate-500">
              Tax Year: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentReturn.taxYear}</span>
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block mb-0.5">Date of Notice</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {new Date().toLocaleDateString("en-GB")}
            </span>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
              Total Direct Payment Due by 31 January
            </span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
              £{totalJanDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
            {isCodedOut && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mt-1">
                (Balancing tax of £{codedAmount.toFixed(2)} is coded out into PAYE tax code under TMA 1970 s59B)
              </span>
            )}
            {!isCodedOut && firstPoA > 0 && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mt-1">
                (Balancing tax: £{netTaxDue.toFixed(2)} + 1st Payment on Account: £{firstPoA.toFixed(2)})
              </span>
            )}
            {isCodedOut && firstPoA > 0 && (
              <span className="text-[11px] text-purple-700 dark:text-purple-300 block mt-0.5">
                (Includes 1st Payment on Account: £{firstPoA.toFixed(2)})
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block mb-0.5">Statutory Deadline</span>
            <span className="text-sm font-bold text-rose-600 font-mono block">
              31 January Following Year End
            </span>
            {secondPoA > 0 && (
              <span className="text-[11px] text-purple-600 block mt-1">
                2nd PoA (£{secondPoA.toFixed(2)}) due 31 July
              </span>
            )}
          </div>
        </div>

        {/* Payment Reference Callout (Critical for HMRC) */}
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Your 11-Character HMRC Payment Reference:
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(paymentRef, "Payment Reference")}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 cursor-pointer print:hidden"
            >
              <Copy size={12} /> Copy Reference
            </button>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-700 text-center">
            <span className="text-xl font-extrabold font-mono tracking-wider text-slate-900 dark:text-slate-100">
              {paymentRef}
            </span>
          </div>

          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>CRITICAL:</strong> You MUST quote this exact reference when transferring funds. It consists of your 10-digit UTR ({utr}) followed by "K". Without this character, HMRC cannot allocate your payment and you may receive automatic late payment interest and penalties.
          </p>
        </div>

        {/* Official HMRC Bank Details */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>Official HMRC Bank Account Details (Faster Payments / BACS / CHAPS)</span>
            <span className="text-[10px] text-slate-500">Barclays Bank UK PLC</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Beneficiary / Payee:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">HMRC Shipley</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Sort Code:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">08-32-10</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("083210", "Sort Code")}
                  className="text-slate-400 hover:text-slate-600 print:hidden"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">12001039</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("12001039", "Account Number")}
                  className="text-slate-400 hover:text-slate-600 print:hidden"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Payment Reference:</span>
              <span className="font-semibold text-emerald-600 font-mono">{paymentRef}</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">International / IBAN (for payments from abroad):</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">GB38 BARC 2032 1012 0010 39</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Bank Identifier Code (BIC / SWIFT):</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">BARCGB22</span>
            </div>
          </div>
        </div>

        {/* Breakdown of Amounts */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Liability & Settlement Breakdown</h4>
            <HMRCHelpTooltip code="POA" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-1.5 flex justify-between">
              <span className="text-slate-500">Balancing Self Assessment Tax for {currentReturn.taxYear}</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {isCodedOut && (
              <div className="py-1.5 flex justify-between text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 rounded">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} />
                  Less: PAYE Coding Out Election (TMA 1970 s59B / Box 2)
                </span>
                <span className="font-mono font-semibold">
                  -£{codedAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {isCodedOut && (
              <div className="py-1.5 flex justify-between text-slate-600 dark:text-slate-400 px-2">
                <span>Net Balancing Tax Due 31 January</span>
                <span className="font-mono font-medium">£0.00</span>
              </div>
            )}
            {firstPoA > 0 && (
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">First Payment on Account for next tax year (Due 31 January)</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{firstPoA.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="py-1.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 px-2 rounded">
              <span>Total Direct Settlement Payable by 31 January</span>
              <span className="font-mono">
                £{totalJanDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {secondPoA > 0 && (
              <div className="py-1.5 flex justify-between text-purple-700 dark:text-purple-300">
                <span>Second Payment on Account (Due 31 July)</span>
                <span className="font-mono font-medium">
                  £{secondPoA.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Practice Client Account Option (Capium Art 44: 9000228367) */}
        {includeFirmBank && letterhead?.firmAccountNo && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Building2 size={13} />
              Alternative Option: Pay via Practice Client Trust Account
            </span>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              If instructed, you may transfer your tax funds directly to our client trust account: <strong>{letterhead.firmBankName || "Barclays Bank UK"}</strong> | Sort Code: <strong className="font-mono">{letterhead.firmSortCode}</strong> | Account No: <strong className="font-mono">{letterhead.firmAccountNo}</strong>. We will settle with HMRC on your behalf.
            </p>
          </div>
        )}

        {/* Footer Notes & Practice Sign-off */}
        <div className="text-[10px] text-slate-400 text-center leading-relaxed pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          {displaySignoff && (
            <p className="font-medium text-slate-700 dark:text-slate-300">{displaySignoff}</p>
          )}
          <p>Please allow up to 3 working days for bank transfers to clear with HMRC. Late payment interest is levied automatically by HMRC under TMA 1970 s86 from the statutory due date.</p>
        </div>
      </div>

      {/* Step 4 Guided Footer Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full print:hidden no-print sa100-no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
            4
          </div>
          <div>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Step 4: Tax Payment Slip & Advice Prepared</span>
            <span className="text-[10px] text-slate-400">Next: Step 5 — Client Approval & Electronic Signature (eSign)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Link
            href={`/self-assessment/${clientId}/calculation`}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Step 3: SA302</span>
          </Link>
          <Link
            href={`/self-assessment/${clientId}/esign`}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>Proceed to Step 5: Client Approval (eSign)</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
