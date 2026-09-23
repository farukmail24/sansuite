import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle,
  Save, ExternalLink, Plus, ListTree
} from "lucide-react";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

export default function TrialBalanceWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="Trial Balance & Mapping">
      <TrialBalanceWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function TrialBalanceWorkspaceContent() {
  const { clientId, currentPeriod, selectedPeriodId } = useClientWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: liveTbData, isFetching: isFetchingTb, refetch: refetchTb } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/live-tb`, selectedPeriodId],
    queryFn: async () => {
      const url = selectedPeriodId
        ? `/api/accounts-production/${clientId}/live-tb?periodId=${selectedPeriodId}`
        : `/api/accounts-production/${clientId}/live-tb`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return { lines: [], totalDebit: "0.00", totalCredit: "0.00", isBalanced: true };
      return res.json();
    },
    enabled: !!clientId,
  });

  const saveTbMutation = useMutation({
    mutationFn: async (options?: { continueToNext?: boolean }) => {
      if (!selectedPeriodId) return;
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/tb`, {
        tb: {
          periodId: selectedPeriodId,
          name: `Annual Trial Balance (${currentPeriod?.startDate?.substring(0, 4) || new Date().getFullYear()})`,
          totalDebit: liveTbData?.totalDebit || "0.00",
          totalCredit: liveTbData?.totalCredit || "0.00",
          isBalanced: liveTbData?.isBalanced ?? true,
        },
        lines: liveTbData?.lines || [],
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save trial balance.");
      }
      return { data: await res.json(), continueToNext: options?.continueToNext };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/live-tb`] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/statements`] });
      refetchTb();
      toast({ title: "Trial Balance Saved & Mapped", description: "Statutory financial statements updated successfully." });
      if (result?.continueToNext) {
        setLocation(`/accounts-production/${clientId}/accounting-policies`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to save trial balance.", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-indigo-600" />
            Trial Balance Nominal Ledger
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Synchronized nominal ledger lines and journal adjustments for {currentPeriod?.periodName || "Selected Period"}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/accounts-production/${clientId}/chart-of-accounts`}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors shadow-xs"
            title="View and manage Master Chart of Accounts"
          >
            <ListTree size={12} className="text-indigo-600" /> Chart of Accounts
          </Link>
          <Link
            href={`/accounts-production/${clientId}/tb`}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
          >
            <ExternalLink size={12} /> Full TB Hub & CSV Import
          </Link>
          <button
            onClick={() => refetchTb()}
            disabled={isFetchingTb}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors"
          >
            <RefreshCw size={12} className={isFetchingTb ? "animate-spin" : ""} /> Sync Live Ledger
          </button>
          <button
            onClick={() => saveTbMutation.mutate({ continueToNext: false })}
            disabled={saveTbMutation.isPending || !selectedPeriodId}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 text-xs transition-colors"
          >
            <Save size={13} /> {saveTbMutation.isPending ? "Saving..." : "Save & Lock Trial Balance"}
          </button>
        </div>
      </div>

      {/* Out of Balance Guidance Banner */}
      {!liveTbData?.isBalanced && (liveTbData?.lines?.length || 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200 text-xs">
                Trial Balance Variance: £{Math.abs((parseFloat(liveTbData?.totalDebit || "0") || 0) - (parseFloat(liveTbData?.totalCredit || "0") || 0)).toFixed(2)} Out of Balance
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Debits (£{liveTbData?.totalDebit || "0.00"}) and Credits (£{liveTbData?.totalCredit || "0.00"}) must be equal to satisfy UK statutory accounting rules. You can adjust line figures, add missing lines, or post a year-end journal.
              </p>
            </div>
          </div>
          <Link
            href={`/accounts-production/${clientId}/tb`}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto shrink-0"
          >
            <span>Fix in Full TB Hub</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* TB Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Nominal Code</th>
              <th className="py-2.5 px-4">Account Name</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4 text-right">Debit (£)</th>
              <th className="py-2.5 px-4 text-right">Credit (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {!liveTbData?.lines || liveTbData.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No nominal lines recorded for this accounting period. Click &apos;Sync Live Ledger&apos; to import from Bookkeeping or record manual journals in the Full TB Hub.
                </td>
              </tr>
            ) : (
              liveTbData.lines.map((line: any, idx: number) => (
                <tr key={line.nominalCode || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{line.nominalCode}</td>
                  <td className="py-2.5 px-4 font-medium">{line.accountName}</td>
                  <td className="py-2.5 px-4 text-slate-500">{line.category || "General"}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{parseFloat(line.debit) > 0 ? parseFloat(line.debit).toFixed(2) : "—"}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{parseFloat(line.credit) > 0 ? parseFloat(line.credit).toFixed(2) : "—"}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600">
              <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Total Trial Balance</span>
                {liveTbData?.isBalanced ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Balanced
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                    <AlertCircle size={10} /> Out of Balance (Diff: £{Math.abs((parseFloat(liveTbData?.totalDebit || "0") || 0) - (parseFloat(liveTbData?.totalCredit || "0") || 0)).toFixed(2)})
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-slate-100">£{liveTbData?.totalDebit || "0.00"}</td>
              <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-slate-100">£{liveTbData?.totalCredit || "0.00"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="trial-balance"
        statusNotice={liveTbData?.isBalanced ? `Balanced (£${liveTbData?.totalDebit || "0.00"})` : "Trial Balance requires balancing"}
        onNextAction={() => saveTbMutation.mutate({ continueToNext: true })}
        nextActionLabel={saveTbMutation.isPending ? "Saving TB..." : "Save TB & Continue to Disclosures"}
        nextActionDisabled={saveTbMutation.isPending || !liveTbData?.isBalanced}
      />
    </div>
  );
}
