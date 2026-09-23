import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileSignature, Send, CheckCircle2, Clock, AlertCircle,
  ExternalLink, Copy, RefreshCw, User, Mail, Shield
} from "lucide-react";

export default function CTeSignPage() {
  return (
    <CTWorkspaceLayout activeSection="eSign Approval">
      <CTeSignContent />
    </CTWorkspaceLayout>
  );
}

function CTeSignContent() {
  const { clientId, client, currentReturn, refetchReturns } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");

  // Fetch Company Officers / Directors
  const { data: directors = [] } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${clientId}/directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (directors.length > 0) {
      const signatory = directors.find((d: any) => d.isSignatory) || directors[0];
      setDirectorName(signatory.name || "");
    }
    if (client?.email) {
      setDirectorEmail(client.email);
    }
  }, [directors, client]);

  // Dispatch to eSign Mutation
  const sendToEsignMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/send-to-capisign`, {
        directorName,
        directorEmail,
      });
    },
    onSuccess: async (data: any) => {
      await refetchReturns();
      toast({
        title: "CT600 Sent to eSign",
        description: `Digital signing link generated: ${data.signUrl}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Dispatch Failed",
        description: err.message || "Failed to dispatch eSign document.",
        variant: "destructive",
      });
    },
  });

  if (!currentReturn) return null;

  const isSigned = currentReturn.status === "Signed" || currentReturn.status === "Accepted";
  const isSent = currentReturn.status === "SentToCapisign" || isSigned;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSignature size={16} className="text-indigo-600" />
            Director Digital eSign Approval
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dispatch the CT600 return and computation to the company director for electronic signature before filing.
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
            isSigned
              ? "bg-emerald-100 text-emerald-700"
              : isSent
              ? "bg-purple-100 text-purple-700"
              : "bg-slate-100 text-slate-600"
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
              The director will receive a secure portal link to review the CT600 and approve the tax calculation of £{parseFloat(currentReturn.netTaxDue || "0").toFixed(2)}.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Select Signing Director *</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="Full name of director"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Director Email Address *</label>
            <div className="relative">
              <Mail size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                placeholder="director@company.co.uk"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-[11px]">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">Documents Attached for Signature:</span>
            <ul className="space-y-1 text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>HMRC Form CT600 Return ({currentReturn.taxYear || "2025/2026"})</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Statutory Corporation Tax Computation Schedule</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Director Approval Declaration (Companies Act 2006 & Taxes Management Act 1970)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={sendToEsignMutation.isPending || !directorName || !directorEmail}
            onClick={() => sendToEsignMutation.mutate()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Send size={13} />
            <span>{sendToEsignMutation.isPending ? "Sending to Director..." : "Dispatch to eSign Portal"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
