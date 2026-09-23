import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { Calculator, CheckCircle2, Shield, RefreshCw, AlertCircle, Printer } from "lucide-react";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

export default function StatementsPage() {
  return (
    <ClientWorkspaceLayout activeSection="Financial Statements">
      <StatementsContent />
    </ClientWorkspaceLayout>
  );
}

function StatementsContent() {
  const { clientId, currentPeriod, selectedPeriodId } = useClientWorkspace();

  const { data: statements, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/statements/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/statements/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Calculating financial statements from trial balance...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calculator size={16} className="text-indigo-600" />
            Statutory Financial Statements
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Calculated in accordance with UK GAAP for {currentPeriod?.periodName || "Selected Period"}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/accounts-production/${clientId}/reports`}
            className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors shadow-xs"
            title="Generate and view full statutory accounts pack, PDF, and reports"
          >
            <Printer size={13} className="text-indigo-600" />
            <span>Reports & Accounts Pack</span>
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} /> Recalculate Statements
          </button>
        </div>
      </div>

      {/* Interactive Balance Sheet & P&L Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit & Loss Account */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Profit and Loss Account</h3>
            <p className="text-[11px] text-slate-500">
              For the period ended {currentPeriod?.endDate ? new Date(currentPeriod.endDate).toLocaleDateString("en-GB") : "31 March 2026"}
            </p>
          </div>

          <div className="space-y-2 font-mono text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Turnover / Revenue</span>
              <span className="font-bold">£{statements?.profitAndLoss?.turnover?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Cost of Raw Materials & Sales</span>
              <span>(£{statements?.profitAndLoss?.costOfSales?.toFixed(2) || "0.00"})</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-indigo-600 bg-slate-50 dark:bg-slate-800 px-2 rounded">
              <span>Gross Profit</span>
              <span>£{statements?.profitAndLoss?.grossProfit?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Administrative & Operating Expenses</span>
              <span>(£{statements?.profitAndLoss?.adminExpenses?.toFixed(2) || "0.00"})</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-slate-900 dark:text-slate-100">
              <span>Operating Profit / (Loss)</span>
              <span>£{statements?.profitAndLoss?.operatingProfit?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Tax on Profit</span>
              <span>(£{statements?.profitAndLoss?.taxExpense?.toFixed(2) || "0.00"})</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 rounded border border-emerald-200 dark:border-emerald-800">
              <span>Profit for the Financial Year</span>
              <span>£{statements?.profitAndLoss?.profitAfterTax?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>

        {/* Statement of Financial Position (Balance Sheet) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Statement of Financial Position</h3>
              <p className="text-[11px] text-slate-500">
                Balance Sheet as at {currentPeriod?.endDate ? new Date(currentPeriod.endDate).toLocaleDateString("en-GB") : "31 March 2026"}
              </p>
            </div>
            {statements?.balanceSheet?.isBalanced ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={10} /> Balanced
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                <AlertCircle size={10} /> Out of Balance
              </span>
            )}
          </div>

          <div className="space-y-2 font-mono text-xs text-slate-700 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Fixed Assets (Tangible & Intangible)</span>
              <span className="font-bold">£{statements?.balanceSheet?.fixedAssets?.total?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Current Assets (Debtors, Cash at bank)</span>
              <span>£{statements?.balanceSheet?.currentAssets?.total?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Creditors: amounts falling due within one year</span>
              <span>(£{statements?.balanceSheet?.creditorsDueWithinOneYear?.toFixed(2) || "0.00"})</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2 rounded">
              <span>Net Current Assets / (Liabilities)</span>
              <span>£{statements?.balanceSheet?.netCurrentAssets?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 rounded border border-indigo-200 dark:border-indigo-800">
              <span>Total Net Assets / (Liabilities)</span>
              <span>£{statements?.balanceSheet?.netAssets?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 pt-2 font-sans font-semibold text-slate-900 dark:text-slate-100">
              <span>Capital and Reserves</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Called Up Share Capital</span>
              <span>£{statements?.balanceSheet?.capitalAndReserves?.calledUpShareCapital?.toFixed(2) || "100.00"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Profit and Loss Account Reserves</span>
              <span>£{statements?.balanceSheet?.capitalAndReserves?.profitAndLossAccount?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 rounded border border-indigo-200 dark:border-indigo-800">
              <span>Total Shareholders&apos; Funds</span>
              <span>£{statements?.balanceSheet?.capitalAndReserves?.totalShareholdersFunds?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Audit Exemption Notice (Section 477 Companies Act 2006) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Shield size={14} className="text-indigo-600" />
          Small Company Audit Exemption Statement (Section 477 Companies Act 2006)
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {statements?.auditExemptionStatement ||
            "For the financial period ended, the company was entitled to exemption from audit under section 477 of the Companies Act 2006 relating to small companies. The members have not required the company to obtain an audit of its accounts for the period in question in accordance with section 476."}
        </p>
      </div>

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="statements"
        statusNotice={`P&L & Balance Sheet Calculated • Net Assets: £${statements?.balanceSheet?.netAssets?.toFixed(2) || "0.00"}`}
      />
    </div>
  );
}
