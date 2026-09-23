import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileSignature, Send, CheckCircle2, Clock, AlertCircle,
  ExternalLink, Copy, RefreshCw, User, Mail, Shield, Check
} from "lucide-react";

export default function SAeSignPage() {
  return (
    <SAWorkspaceLayout activeSection="eSign">
      <SAeSignContent />
    </SAWorkspaceLayout>
  );
}

function SAeSignContent() {
  const { clientId, client, currentReturn, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (client) {
      setSignerName(client.clientName || "");
      setSignerEmail(client.email || "");
    }
  }, [client]);


  const isSigned = currentReturn.status === "Signed" || currentReturn.status === "Accepted";
  const isSent = currentReturn.status === "SentToCapisign" || isSigned;
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const signUrl = `${window.location.origin}/portal/sign/sa100/${currentReturn.id}`;

  // 1. Dispatch to eSign Mutation
  const sendToEsignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns`, {
        ...currentReturn,
        status: "SentToCapisign",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Dispatch failed" }));
        throw new Error(err.error || "Dispatch failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refetchReturns();
      toast({
        title: "SA100 Dispatched for eSign",
        description: `Electronic signature invitation sent to ${signerEmail}.`,
        type: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Dispatch Failed",
        description: err.message,
        type: "error",
      });
    },
  });

  // 2. Mark as Signed Manually Mutation
  const markSignedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns`, {
        ...currentReturn,
        status: "Signed",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(err.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refetchReturns();
      toast({
        title: "Status Updated: Approved & Signed",
        description: "Return marked as electronically signed and approved for HMRC submission.",
        type: "success",
      });
    },
  });

  const copySigningLink = () => {
    navigator.clipboard.writeText(signUrl);
    setCopiedLink(true);
    toast({
      title: "Signing Link Copied",
      description: "Direct client signing link copied to clipboard.",
      type: "success",
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSignature size={16} className="text-emerald-600" />
            Client eSign & Return Approval
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Obtain legally binding digital approval and statutory declaration from the taxpayer prior to HMRC filing.
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
            isSigned
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : isSent
              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {isSigned ? "Approved & Signed" : isSent ? "Awaiting Signature" : "Draft (Not Sent)"}
        </span>
      </div>

      {/* Main Dispatch Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Electronic Signature Dispatch
            </h3>
            <p className="text-xs text-slate-500">
              The taxpayer will review the full SA100 return and approve the balancing tax liability of £{netTaxDue.toFixed(2)}.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Signatory Full Name *
            </label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full name of taxpayer"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Signatory Email Address *
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Statutory Declaration Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">Statutory Taxpayer Declaration:</p>
            <p className="italic">
              "I declare that the information given in this return and any attached schedules is correct and complete to the best of my knowledge and belief. I understand that I may incur financial penalties and face prosecution if I submit false or incomplete statements."
            </p>
          </div>

          {/* Shareable Link Box */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                Direct Client Signing Link:
              </span>
              <button
                type="button"
                onClick={copySigningLink}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono truncate text-slate-700 dark:text-slate-300">
              {signUrl}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => sendToEsignMutation.mutate()}
              disabled={sendToEsignMutation.isPending || !signerEmail}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>{sendToEsignMutation.isPending ? "Sending..." : "Dispatch to Client via eSign"}</span>
            </button>

            <button
              type="button"
              onClick={() => markSignedMutation.mutate()}
              disabled={markSignedMutation.isPending || isSigned}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>Mark as Signed (Offline/Paper)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
