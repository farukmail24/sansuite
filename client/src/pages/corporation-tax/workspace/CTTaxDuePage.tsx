import { useQuery } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Printer, Download, Building2, Calendar, AlertCircle,
  CheckCircle2, Copy, ExternalLink, RefreshCw
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

export default function CTTaxDuePage() {
  return (
    <CTWorkspaceLayout activeSection="Tax Due Notice">
      <CTTaxDueContent />
    </CTWorkspaceLayout>
  );
}

function CTTaxDueContent() {
  const { clientId, client, currentReturn } = useCTWorkspace();
  const { toast } = useToast();

  const { data: taxDueData, isLoading } = useQuery<any>({
    queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/tax-due`],
    queryFn: async () => {
      if (!currentReturn?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/tax-due`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentReturn?.id,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard", description: `${label}: ${text}` });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentReturn) return null;

  const utr = currentReturn.utrNumber || client?.utrNumber || "1234567890";
  const paymentRef = `${utr}A001`;
  const paymentDueDate = currentReturn.paymentDueDate ? new Date(currentReturn.paymentDueDate) : null;
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Printer size={16} className="text-indigo-600" />
            Statutory Corporation Tax Payment Advice
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Client payment advice slip with unique 14-character HMRC reference and official bank transfer details.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Printer size={13} />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Printable Tax Due Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs max-w-3xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 block mb-1">
              SanSuite Practice Tax Services
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Corporation Tax Payment Notice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <span className="font-semibold text-slate-800 dark:text-slate-200">{client?.clientName}</span>
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block mb-0.5">Date of Notice</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString("en-GB")}</span>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block mb-1">
              Total Corporation Tax Liability Due
            </span>
            <span className="text-2xl font-black text-indigo-900 dark:text-indigo-100 font-mono">
              £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block mb-0.5">Payment Deadline</span>
            <span className="text-sm font-bold text-rose-600 font-mono">
              {paymentDueDate ? paymentDueDate.toLocaleDateString("en-GB") : "AP End + 9m 1d"}
            </span>
          </div>
        </div>

        {/* Payment Reference Callout (Critical for HMRC) */}
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Your 14-Character HMRC Payment Reference:
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(paymentRef, "Payment Reference")}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 cursor-pointer print:hidden"
            >
              <Copy size={12} /> Copy
            </button>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-700 text-center">
            <span className="text-xl font-extrabold font-mono tracking-wider text-slate-900 dark:text-slate-100">
              {paymentRef}
            </span>
          </div>

          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            <strong>CRITICAL:</strong> You MUST quote this exact reference when transferring funds. It consists of your 10-digit UTR ({utr}) followed by "A001". Without it, HMRC cannot identify your payment and may issue penalties.
          </p>
        </div>

        {/* Official HMRC Bank Details */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
            Official HMRC Bank Account Details (Faster Payments / BACS / CHAPS)
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Beneficiary / Payee:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">HMRC Shipley</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Sort Code:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">08-32-10</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Account Number:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">12001039</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Bank Name:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Barclays Bank UK PLC</span>
            </div>
            <div className="py-2 px-3 flex justify-between">
              <span className="text-slate-500">Reference:</span>
              <span className="font-bold text-indigo-600 font-mono">{paymentRef}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-[11px] text-slate-400 space-y-1">
          <p>
            Please allow up to 3 working days for bank processing before the statutory due date.
          </p>
          <p>
            Prepared automatically by SanSuite Cloud Corporation Tax Gateway.
          </p>
        </div>
      </div>
    </div>
  );
}
