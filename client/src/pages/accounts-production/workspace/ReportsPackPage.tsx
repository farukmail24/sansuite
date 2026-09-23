import { useQuery } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import FinancialReportGenerator from "../../../components/accounting/FinancialReportGenerator";
import { RefreshCw } from "lucide-react";

export default function ReportsPackPage() {
  return (
    <ClientWorkspaceLayout activeSection="Reports & Accounts Pack">
      <ReportsPackContent />
    </ClientWorkspaceLayout>
  );
}

function ReportsPackContent() {
  const { clientId, client, currentPeriod, selectedPeriodId } = useClientWorkspace();

  const { data: liveTbData, isLoading: isLoadingTb } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/live-tb`, selectedPeriodId],
    queryFn: async () => {
      const url = selectedPeriodId
        ? `/api/accounts-production/${clientId}/live-tb?periodId=${selectedPeriodId}`
        : `/api/accounts-production/${clientId}/live-tb`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return { lines: [] };
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: directors = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ch-directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: statutoryNotes } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/notes/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/notes/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  const { data: accountingPolicies } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/policies/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/policies/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  const { data: reportOptions } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/report-options/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/report-options/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  const signatory = directors.find((d: any) => d.isSignatory)?.name || directors[0]?.name || "Director";

  if (isLoadingTb) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Preparing accounts presentation pack...</span>
      </div>
    );
  }

  const periodStartFormatted = currentPeriod?.startDate
    ? new Date(currentPeriod.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : undefined;

  const periodEndFormatted = currentPeriod?.endDate
    ? new Date(currentPeriod.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "31 March 2026";

  const standardFormatted = accountingPolicies?.accountingStandard === "FRS105"
    ? "FRS 105 (The Financial Reporting Standard applicable to the Micro-entities Regime)"
    : "FRS 102 Section 1A (Small Entities)";

  return (
    <FinancialReportGenerator
      trialBalance={liveTbData?.lines || []}
      companyName={client?.clientName || "Company Accounts"}
      registrationNumber={client?.registrationNumber || ""}
      periodStart={periodStartFormatted}
      periodEnd={periodEndFormatted}
      accountingStandard={standardFormatted}
      directors={directors}
      statutoryNotes={statutoryNotes}
      accountingPolicies={accountingPolicies}
      clientId={clientId}
      reportSettings={{
        ...reportOptions,
        balanceSheetSignatory: signatory,
      }}
    />
  );
}
