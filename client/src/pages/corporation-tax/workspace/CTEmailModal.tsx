import React, { useState } from "react";
import {
  X, Mail, Send, Paperclip, CheckCircle2, AlertCircle,
  FileText, FileCode, ExternalLink
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

interface CTEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  client: any;
  currentReturn: any;
}

export default function CTEmailModal({
  isOpen,
  onClose,
  clientId,
  client,
  currentReturn,
}: CTEmailModalProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState(client?.email || "");
  const [ccEmail, setCcEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const companyName = client?.clientName || "Company";
  const taxYear = currentReturn?.taxYear || "2024-25";
  const endDateStr = currentReturn?.accountingPeriodEnd
    ? new Date(currentReturn.accountingPeriodEnd).toLocaleDateString("en-GB")
    : "";
  const netTaxDue = parseFloat(currentReturn?.netTaxDue || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 });

  const defaultSubject = `Corporation Tax Return & Computation - ${companyName} (${taxYear})`;
  const [subject, setSubject] = useState(defaultSubject);

  const defaultMessage = `Dear ${companyName},

Please find attached copies of your draft Corporation Tax return (CT600) and computation schedule for the accounting period ending ${endDateStr}.

Based on our calculations, the payment details are as follows:
• Net Corporation Tax Liability: £${netTaxDue}
• Payment Due Date: 9 months and 1 day after period end

To pay your Corporation Tax directly to HMRC, please visit:
https://www.gov.uk/pay-corporation-tax/bank-details

Please review the figures and let us know if you have any questions before we proceed with the official HMRC electronic submission.

Kind Regards,
Pegasus Accountancy Services Ltd`;

  const [message, setMessage] = useState(defaultMessage);

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/send-email`,
        {
          recipientEmail,
          ccEmail,
          subject,
          message,
        }
      );

      if (!res.ok) {
        throw new Error("Failed to dispatch tax pack email.");
      }

      toast({
        title: "Email Dispatched",
        description: `Tax pack successfully sent to ${recipientEmail}.`,
      });
      onClose();
    } catch (err: any) {
      toast({
        title: "Email Failed",
        description: err.message || "Failed to send email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Email CT600 Return & Computation Pack
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send draft accounts, computation schedule, and tax summary letter to client
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="director@example.co.uk"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CC (Accountant / Practice)
              </label>
              <input
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="accounts@pegasusaccountancy.co.uk"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message Body
            </label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans leading-relaxed text-xs resize-none"
            />
          </div>

          {/* Included Attachments Pack */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <Paperclip size={13} className="text-indigo-600" />
              Attached Tax Filing Documents (4 files)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <FileText size={14} className="text-teal-600 shrink-0" />
                <span className="truncate">HMRC Form CT600 (Version 3).pdf</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <FileText size={14} className="text-indigo-600 shrink-0" />
                <span className="truncate">CT_Computation_Schedule.pdf</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <FileText size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">{companyName.replace(/\s+/g, "_")}_CT_Calc.doc</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                <FileCode size={14} className="text-emerald-600 shrink-0" />
                <span className="truncate">Company_Accounts_iXBRL.html</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={isSending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Send size={13} />
            <span>{isSending ? "Dispatching..." : "Send Tax Pack"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
