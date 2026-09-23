import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import {
  Building2, ExternalLink, FileSpreadsheet, Calculator,
  Shield, FileSignature, CheckCircle2, Clock, Calendar,
  ArrowRight, Users, Layers, AlertCircle, AlertTriangle,
  Scale, FileText, Send, Sparkles, CheckSquare, Printer
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { AP_PIPELINE_STEPS, PipelineFooterNav } from "./AccountsProductionPipeline";

export default function WorkspaceDashboardPage() {
  return (
    <ClientWorkspaceLayout activeSection="Dashboard">
      <WorkspaceDashboardContent />
    </ClientWorkspaceLayout>
  );
}

function WorkspaceDashboardContent() {
  const { clientId, client, currentPeriod, periods, openNewPeriodModal, openEditPeriodModal } = useClientWorkspace();

  // 1. Fetch Officers / Signatories
  const { data: officers = [], isLoading: isLoadingOfficers } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ch-directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // 2. Fetch Pre-filing Statutory Validation
  const { data: validationData, isLoading: isLoadingValidation } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/prefiling-validation/${currentPeriod?.id || 0}`],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/prefiling-validation/${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!currentPeriod?.id,
  });

  // 3. Fetch Financial Statements Summary
  const { data: statementsData, isLoading: isLoadingStatements } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/statements`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/statements?periodId=${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!currentPeriod?.id,
  });

  // 4. Fetch Submissions
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Calculations for Stage Evaluation
  const hasPeriod = !!currentPeriod;
  const activeSignatories = officers.filter((o: any) => o.isSignatoryOnAccounts && !o.resignedDate);
  const tbCheck = validationData?.checks?.find((c: any) => c.id === "tbBalance");
  const isTbBalanced = tbCheck?.status === "pass";

  const latestSubmission = submissions[0] || null;
  const isSubmitted = latestSubmission && (latestSubmission.status === "Accepted" || latestSubmission.status === "Submitted");

  // Summary Metrics from Statements
  const turnover = statementsData?.profitAndLoss?.turnover || statementsData?.turnover || 0;
  const netProfit = statementsData?.profitAndLoss?.netProfitOrLoss || statementsData?.netProfit || 0;
  const netAssets = statementsData?.balanceSheet?.totalNetAssets || statementsData?.netAssets || 0;

  // Compute Next Action Step
  const nextRecommendedStep = useMemo(() => {
    if (!hasPeriod) return AP_PIPELINE_STEPS[0];
    if (officers.length === 0 || activeSignatories.length === 0) return AP_PIPELINE_STEPS[1];
    if (!isTbBalanced) return AP_PIPELINE_STEPS[2];
    if (!isSubmitted) return AP_PIPELINE_STEPS[6];
    return AP_PIPELINE_STEPS[4];
  }, [hasPeriod, officers, activeSignatories, isTbBalanced, isSubmitted]);

  return (
    <div className="space-y-6">
      {/* 1. Client Statutory Profile & Filing Countdown Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{client.clientName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {client.tradingStatus || "Trading"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                UK Limited Statutory Production Workspace • Companies Act 2006
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {client.registrationNumber && (
              <a
                href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>CH: {client.registrationNumber}</span>
                <ExternalLink size={12} />
              </a>
            )}

            <Link
              href={`/accounts-production/${clientId}${nextRecommendedStep.route}`}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>Resume Step {nextRecommendedStep.id}: {nextRecommendedStep.name}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Accounting Standard</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {currentPeriod?.accountingStandard === "FRS105"
                ? "FRS 105 (Micro Entities)"
                : currentPeriod?.accountingStandard === "Dormant"
                ? "Dormant Company Accounts (DCA)"
                : currentPeriod?.accountingStandard === "CIC"
                ? "CIC Form 34 Community Interest"
                : "FRS 102 Section 1A (Small Entities)"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Audit Regime</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Exempt under Section 477 CA 2006
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Active Period Dates</span>
            {currentPeriod ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(currentPeriod.startDate).toLocaleDateString("en-GB")} to {new Date(currentPeriod.endDate).toLocaleDateString("en-GB")}
              </span>
            ) : (
              <span className="font-semibold text-rose-500">No Period Set</span>
            )}
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Filing Deadline</span>
            {currentPeriod?.dueDate ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {new Date(currentPeriod.dueDate).toLocaleDateString("en-GB")}
              </span>
            ) : (
              <span className="font-semibold text-slate-400">Standard 9 Months</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Statutory Financial Highlights (Turnover, Profit, Assets, TB Equilibrium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Turnover / Revenue</span>
            <Calculator size={14} className="text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            £{Number(turnover).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">P&L Nominal Category 4000-4999</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Net Profit / (Loss)</span>
            <Calculator size={14} className={netProfit >= 0 ? "text-emerald-500" : "text-rose-500"} />
          </div>
          <div className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            £{Number(netProfit).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Operating profit after taxation</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Net Assets</span>
            <Scale size={14} className="text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            £{Number(netAssets).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fixed + Current - Liabilities</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Trial Balance Status</span>
            <FileSpreadsheet size={14} className={isTbBalanced ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isTbBalanced ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> In Equilibrium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle size={16} /> Needs Mapping / Review
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Debits = Credits validation</div>
        </div>
      </div>

      {/* 3. Comprehensive Master Pipeline Roadmap (7 Statutory Steps) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Master Accounts Preparation Pipeline
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Standard Operating Workflow (Capium & Companies House Parity)
          </span>
        </div>

        <div className="space-y-3">
          {AP_PIPELINE_STEPS.map((step) => {
            const Icon = step.icon;
            let statusText = "Ready to Begin";
            let statusBadge = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
            let actionText = "Open";

            if (step.id === 1) {
              if (hasPeriod) {
                const pName = currentPeriod.periodName || (currentPeriod.endDate ? `Period ended ${new Date(currentPeriod.endDate).toLocaleDateString("en-GB")}` : "Active Period");
                const stdName = currentPeriod.accountingStandard === "FRS105" ? "FRS 105" : currentPeriod.accountingStandard === "Dormant" ? "DCA" : "FRS 102 1A";
                statusText = `${pName} (${stdName})`;
                statusBadge = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
                actionText = "Manage Period";
              } else {
                statusText = "No active accounting period configured";
                statusBadge = "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300";
                actionText = "Create Period";
              }
            } else if (step.id === 2) {
              if (officers.length > 0 && activeSignatories.length > 0) {
                statusText = `${officers.length} Officer(s) • Signatory: ${activeSignatories[0].officerName}`;
                statusBadge = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
                actionText = "View Officers";
              } else if (officers.length > 0) {
                statusText = `${officers.length} Officer(s) • No signatory designated`;
                statusBadge = "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300";
                actionText = "Designate Signatory";
              } else {
                statusText = "No company directors appointed";
                statusBadge = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                actionText = "Add Directors";
              }
            } else if (step.id === 3) {
              if (isTbBalanced) {
                statusText = "Trial balance imported and debits equal credits";
                statusBadge = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
                actionText = "View Trial Balance";
              } else {
                statusText = "Trial balance requires import or adjustments";
                statusBadge = "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300";
                actionText = "Import / Map TB";
              }
            } else if (step.id === 4) {
              statusText = "Statutory notes, employee count and disclosures";
              statusBadge = "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300";
              actionText = "Review Policies";
            } else if (step.id === 5) {
              statusText = "Profit & Loss, Balance Sheet, Notes & Reports Pack";
              statusBadge = "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300";
              actionText = "View Statements";
            } else if (step.id === 6) {
              statusText = "Send draft accounts to directors for digital signature";
              statusBadge = "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300";
              actionText = "Open eSign Console";
            } else if (step.id === 7) {
              if (isSubmitted) {
                statusText = `Filed with Companies House (${latestSubmission.status})`;
                statusBadge = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
                actionText = "View Submission";
              } else {
                statusText = "4-Step Validation & Gateway Submission Wizard";
                statusBadge = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                actionText = "Launch Wizard";
              }
            }

            return (
              <div
                key={step.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-indigo-400 dark:hover:border-indigo-700 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs">
                    {step.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {step.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge}`}>
                        {statusText}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {step.shortDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/accounts-production/${clientId}${step.route}`}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>{actionText}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href={`/accounts-production/${clientId}/reports`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Printer size={16} />
            </div>
            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Full Accounts Report Pack</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600" />
            </h4>
            <p className="text-[11px] text-slate-400">Generate printable PDF with draft stamp and accountant's report.</p>
          </div>
        </Link>

        <Link href={`/accounts-production/${clientId}/ixbrl-filing`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Shield size={16} />
            </div>
            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>iXBRL Taxonomy Console</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600" />
            </h4>
            <p className="text-[11px] text-slate-400">Inspect automated FRS 102/105 taxonomy tags and XML payloads.</p>
          </div>
        </Link>

        <Link href={`/accounts-production/${clientId}/ch-api`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 size={16} />
            </div>
            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Companies House Live Sync</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600" />
            </h4>
            <p className="text-[11px] text-slate-400">Synchronize PSC records, filing history and officer changes.</p>
          </div>
        </Link>
      </div>

      {/* 5. Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="period"
        statusNotice={hasPeriod ? `Period: ${currentPeriod.periodName}` : "Create an accounting period to begin"}
        nextActionLabel={`Continue to Step 2: Officers & Signatories`}
      />
    </div>
  );
}
