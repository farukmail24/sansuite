import { useQuery } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Printer, Building2, Calendar, AlertCircle,
  CheckCircle2, Copy, ExternalLink, RefreshCw, CreditCard, Shield, FileText
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

export default function SATaxDuePage() {
  return (
    <SAWorkspaceLayout activeSection="Tax Due Notice">
      <SATaxDueContent />
    </SAWorkspaceLayout>
  );
}

function SATaxDueContent() {
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
  const totalJanDue = netTaxDue + firstPoA;

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Printer size={16} className="text-emerald-600" />
            Statutory Self Assessment Tax Payment Advice
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs max-w-3xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 block mb-1">
              SanSuite Practice Tax Services
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Self Assessment Tax Payment Notice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
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
              Total Amount Due by 31 January
            </span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
              £{totalJanDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
            {firstPoA > 0 && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mt-1">
                (Balancing tax: £{netTaxDue.toFixed(2)} + 1st Payment on Account: £{firstPoA.toFixed(2)})
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
          <h4 className="font-bold text-slate-800 dark:text-slate-200">Liability Breakdown</h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-1.5 flex justify-between">
              <span className="text-slate-500">Balancing Self Assessment Tax for {currentReturn.taxYear}</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {firstPoA > 0 && (
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">First Payment on Account for next tax year</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{firstPoA.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="py-1.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 px-2 rounded">
              <span>Total Payable by 31 January</span>
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

        {/* Footer Notes */}
        <div className="text-[10px] text-slate-400 text-center leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
          Please allow up to 3 working days for bank transfers to clear with HMRC. Late payment interest is levied automatically by HMRC under TMA 1970 s86 from the statutory due date.
        </div>
      </div>
    </div>
  );
}
