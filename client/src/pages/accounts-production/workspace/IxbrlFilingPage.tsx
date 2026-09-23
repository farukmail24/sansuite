import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { Shield, RefreshCw, Code, CheckCircle2, AlertCircle, X, Download } from "lucide-react";

export default function IxbrlFilingPage() {
  return (
    <ClientWorkspaceLayout activeSection="iXBRL Filing Console">
      <IxbrlFilingContent />
    </ClientWorkspaceLayout>
  );
}

function IxbrlFilingContent() {
  const { clientId, currentPeriod, selectedPeriodId } = useClientWorkspace();
  const { toast } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  const { data: ixbrlSubmissions = [], isLoading, refetch: refetchIxbrl } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const generateIxbrlMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriodId) return;
      return await apiRequest("POST", `/api/accounts-production/${clientId}/ixbrl/generate`, {
        periodId: selectedPeriodId,
        accountsType: currentPeriod?.accountingStandard === "FRS105" ? "FRS105_Micro" : "FRS102_1A_Small",
      });
    },
    onSuccess: (data: any) => {
      refetchIxbrl();
      toast({ title: "iXBRL Tagging Generated", description: "Validated with UK GAAP taxonomy tags." });
    },
    onError: (err: any) => {
      toast({ title: "iXBRL Generation Failed", description: err.message || "Failed to generate iXBRL.", variant: "destructive" });
    }
  });

  const submitToChMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      return await apiRequest("POST", `/api/accounts-production/${clientId}/ixbrl/submit`, { submissionId });
    },
    onSuccess: (data: any) => {
      refetchIxbrl();
      toast({ title: "Submitted to Companies House", description: `Transaction ID: ${data.chTransactionId || "Accepted"}` });
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message || "Failed to file to Companies House.", variant: "destructive" });
    }
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-indigo-600" />
            Companies House iXBRL Electronic Gateway
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Generate inline XBRL tagged accounts and submit directly to Companies House for {currentPeriod?.periodName || "Selected Period"}.
          </p>
        </div>
        <button
          onClick={() => generateIxbrlMutation.mutate()}
          disabled={generateIxbrlMutation.isPending || !selectedPeriodId}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
        >
          <Shield size={13} /> {generateIxbrlMutation.isPending ? "Generating iXBRL..." : "Generate & Tag iXBRL"}
        </button>
      </div>

      {/* Submissions Log Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Transaction ID</th>
              <th className="py-2.5 px-4">Accounts Type</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Submitted Date</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-indigo-600" />
                    <span>Loading filing submissions...</span>
                  </div>
                </td>
              </tr>
            ) : ixbrlSubmissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No iXBRL files generated yet. Click &apos;Generate & Tag iXBRL&apos; to create an electronic filing package.
                </td>
              </tr>
            ) : (
              ixbrlSubmissions.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{sub.chTransactionId || "CH-PENDING"}</td>
                  <td className="py-3 px-4">{sub.accountsType}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${sub.status === "Accepted"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("en-GB") : "Not Submitted"}</td>
                  <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                    {sub.ixbrlContent && (
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Code size={11} /> View XML
                      </button>
                    )}
                    {sub.status !== "Accepted" && (
                      <button
                        onClick={() => submitToChMutation.mutate(sub.id)}
                        disabled={submitToChMutation.isPending}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-[11px] shadow-xs cursor-pointer transition-colors"
                      >
                        {submitToChMutation.isPending ? "Submitting..." : "Submit to Gateway"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: View iXBRL XML */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  iXBRL / XML Payload ({selectedSubmission.chTransactionId || "Draft"})
                </h3>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[11px] leading-relaxed border border-slate-800 select-all">
              <pre>{selectedSubmission.ixbrlContent || "<!-- No payload generated -->"}</pre>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[11px] text-slate-400">UK GAAP Taxonomy Tagged XHTML</span>
              <button
                onClick={() => {
                  const blob = new Blob([selectedSubmission.ixbrlContent || ""], { type: "application/xhtml+xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `accounts_${clientId}_${selectedSubmission.chTransactionId || "draft"}.html`;
                  a.click();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download size={12} /> Download iXBRL File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
