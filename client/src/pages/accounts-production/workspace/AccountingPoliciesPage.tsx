import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { Layers, Save, RefreshCw, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

export default function AccountingPoliciesPage() {
  return (
    <ClientWorkspaceLayout activeSection="Accounting Policies">
      <AccountingPoliciesContent />
    </ClientWorkspaceLayout>
  );
}

function AccountingPoliciesContent() {
  const { clientId, currentPeriod, selectedPeriodId } = useClientWorkspace();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [accountingStandard, setAccountingStandard] = useState("FRS102_1A");
  const [basisOfPreparation, setBasisOfPreparation] = useState("");
  const [turnoverPolicy, setTurnoverPolicy] = useState("");
  const [tangibleAssetsPolicy, setTangibleAssetsPolicy] = useState("");
  const [financialInstrumentsPolicy, setFinancialInstrumentsPolicy] = useState("");

  const { data: policiesData, isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/policies/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/policies/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  useEffect(() => {
    if (policiesData) {
      setAccountingStandard(policiesData.accountingStandard || "FRS102_1A");
      setBasisOfPreparation(policiesData.basisOfPreparation || "");
      setTurnoverPolicy(policiesData.turnoverPolicy || "");
      setTangibleAssetsPolicy(policiesData.tangibleAssetsPolicy || "");
      setFinancialInstrumentsPolicy(policiesData.financialInstrumentsPolicy || "");
    }
  }, [policiesData]);

  const savePoliciesMutation = useMutation({
    mutationFn: async (options?: { continueToNext?: boolean }) => {
      if (!selectedPeriodId) return;
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/policies/${selectedPeriodId}`, {
        accountingStandard,
        basisOfPreparation,
        turnoverPolicy,
        tangibleAssetsPolicy,
        financialInstrumentsPolicy,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save policies.");
      }
      return { data: await res.json(), continueToNext: options?.continueToNext };
    },
    onSuccess: (result: any) => {
      toast({ title: "Accounting Policies Saved", description: "Policies applied to statutory accounts." });
      refetch();
      if (result?.continueToNext) {
        setLocation(`/accounts-production/${clientId}/statutory-notes`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to save policies.", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Loading accounting policies...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers size={16} className="text-indigo-600" />
            Accounting Policies & Reporting Standard
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Select framework (FRS 102 Section 1A or FRS 105) and custom disclosure text for {currentPeriod?.periodName || "Selected Period"}.
          </p>
        </div>
        <button
          onClick={() => savePoliciesMutation.mutate({ continueToNext: false })}
          disabled={savePoliciesMutation.isPending || !selectedPeriodId}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Save size={13} /> {savePoliciesMutation.isPending ? "Saving..." : "Save Policies"}
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reporting Framework</label>
          <select
            value={accountingStandard}
            onChange={(e) => setAccountingStandard(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
          >
            <option value="FRS102_1A">FRS 102 Section 1A (Small Entities Standard)</option>
            <option value="FRS105">FRS 105 (Micro-Entities Framework)</option>
            <option value="Dormant">Dormant Company Accounts (DCA)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Basis of Preparation</label>
          <textarea
            rows={3}
            value={basisOfPreparation}
            onChange={(e) => setBasisOfPreparation(e.target.value)}
            placeholder="Enter basis of preparation under UK GAAP..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Turnover Recognition Policy</label>
          <textarea
            rows={2}
            value={turnoverPolicy}
            onChange={(e) => setTurnoverPolicy(e.target.value)}
            placeholder="Turnover is measured at the fair value of consideration received or receivable..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tangible Fixed Assets & Depreciation Policy</label>
          <textarea
            rows={2}
            value={tangibleAssetsPolicy}
            onChange={(e) => setTangibleAssetsPolicy(e.target.value)}
            placeholder="Tangible fixed assets are measured at cost less accumulated depreciation..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Financial Instruments Policy</label>
          <textarea
            rows={2}
            value={financialInstrumentsPolicy}
            onChange={(e) => setFinancialInstrumentsPolicy(e.target.value)}
            placeholder="Financial instruments are classified and measured in accordance with Section 11..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
          />
        </div>
      </div>

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="disclosures"
        statusNotice={policiesData ? "Policies Configured" : "Enter accounting policy text and save"}
        onNextAction={() => savePoliciesMutation.mutate({ continueToNext: true })}
        nextActionLabel={savePoliciesMutation.isPending ? "Saving..." : "Save Policies & Continue to Notes"}
        nextActionDisabled={savePoliciesMutation.isPending}
      />
    </div>
  );
}
