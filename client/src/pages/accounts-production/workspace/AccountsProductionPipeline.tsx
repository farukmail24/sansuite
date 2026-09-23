import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, Users, FileSpreadsheet, Layers,
  Calculator, FileSignature, Send, CheckCircle2,
  AlertCircle, Clock, ArrowRight, ArrowLeft
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";

export interface PipelineStep {
  id: number;
  slug: string;
  name: string;
  shortDesc: string;
  icon: any;
  route: string;
}

export const AP_PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    slug: "period",
    name: "Period & Standard",
    shortDesc: "Statutory Dates & FRS Regime",
    icon: Calendar,
    route: "/dashboard",
  },
  {
    id: 2,
    slug: "officers",
    name: "Officers & Signatories",
    shortDesc: "Directors, Secretary & Signatories",
    icon: Users,
    route: "/directors",
  },
  {
    id: 3,
    slug: "trial-balance",
    name: "Trial Balance & Mapping",
    shortDesc: "Nominal Ledger & Balance Check",
    icon: FileSpreadsheet,
    route: "/trial-balance",
  },
  {
    id: 4,
    slug: "disclosures",
    name: "Policies & Notes",
    shortDesc: "Accounting Policies & Disclosures",
    icon: Layers,
    route: "/accounting-policies",
  },
  {
    id: 5,
    slug: "statements",
    name: "Statements & Reports",
    shortDesc: "P&L, Balance Sheet & Reports Pack",
    icon: Calculator,
    route: "/statements",
  },
  {
    id: 6,
    slug: "esign",
    name: "Client Review & eSign",
    shortDesc: "Director Signature Audit Trail",
    icon: FileSignature,
    route: "/esign",
  },
  {
    id: 7,
    slug: "submission",
    name: "Statutory Submission",
    shortDesc: "Companies House & HMRC Filing",
    icon: Send,
    route: "/submit",
  },
];

interface AccountsProductionPipelineProps {
  clientId: string;
  selectedPeriodId: number | null;
  currentPeriod: any;
  activeSection?: string;
}

export default function AccountsProductionPipeline({
  clientId,
  selectedPeriodId,
  currentPeriod,
  activeSection,
}: AccountsProductionPipelineProps) {
  const [location] = useLocation();

  // 1. Fetch Directors to verify active signatories
  const { data: officers = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ch-directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // 2. Fetch Pre-filing Validation to check TB equilibrium & general readiness
  const { data: validationData } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/prefiling-validation/${selectedPeriodId || 0}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/prefiling-validation/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  // 3. Fetch Submissions status
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // 4. Fetch eSign Documents status
  const { data: esignData } = useQuery<any>({
    queryKey: ["/api/esign/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/documents");
      if (!res.ok) return { documents: [] };
      return res.json();
    },
  });

  // Derive Current Step Index based on URL location
  const currentStepIndex = useMemo(() => {
    if (location.includes("/directors")) return 1;
    if (location.includes("/trial-balance") || location.includes("/chart-of-accounts")) return 2;
    if (location.includes("/accounting-policies") || location.includes("/statutory-notes")) return 3;
    if (location.includes("/statements") || location.includes("/reports")) return 4;
    if (location.includes("/esign")) return 5;
    if (location.includes("/submit") || location.includes("/ixbrl-filing")) return 6;
    return 0; // default to period/dashboard
  }, [location]);

  // Determine Step Health & Status
  const stepStatuses = useMemo(() => {
    const hasPeriod = !!currentPeriod;
    const hasSignatories = officers.some((o: any) => o.isSignatoryOnAccounts && !o.resignedDate);
    
    const tbCheck = validationData?.checks?.find((c: any) => c.id === "tbBalance");
    const isTbBalanced = tbCheck?.status === "pass";

    const hasSubmissions = submissions.length > 0;
    const latestSubmission = submissions[0];
    const isSubmitted = latestSubmission && (latestSubmission.status === "Accepted" || latestSubmission.status === "Submitted");

    const esignDocs = Array.isArray(esignData?.documents)
      ? esignData.documents
      : (Array.isArray(esignData) ? esignData : []);
    const isSigned = esignDocs.some((d: any) => d.clientId === parseInt(clientId || "0") && d.status === "Signed");

    return [
      { id: 1, isComplete: hasPeriod, hasWarning: false },
      { id: 2, isComplete: officers.length > 0, hasWarning: officers.length > 0 && !hasSignatories },
      { id: 3, isComplete: isTbBalanced, hasWarning: hasPeriod && !isTbBalanced },
      { id: 4, isComplete: isTbBalanced, hasWarning: false },
      { id: 5, isComplete: isTbBalanced, hasWarning: false },
      { id: 6, isComplete: isSigned || isSubmitted, hasWarning: false },
      { id: 7, isComplete: isSubmitted, hasWarning: false },
    ];
  }, [currentPeriod, officers, validationData, submissions, esignData, clientId]);

  const completedCount = stepStatuses.filter((s) => s.isComplete).length;
  const progressPercent = Math.round((completedCount / AP_PIPELINE_STEPS.length) * 100);

  return (
    <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Accounts Production Statutory Pipeline
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            Step {currentStepIndex + 1} of {AP_PIPELINE_STEPS.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Responsive Horizontal Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {AP_PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = idx === currentStepIndex;
          const status = stepStatuses[idx];
          const isComplete = status?.isComplete;
          const hasWarning = status?.hasWarning;

          let borderClass = "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40";
          let textClass = "text-slate-600 dark:text-slate-400";
          let badgeColor = "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

          if (isCurrent) {
            borderClass = "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500";
            textClass = "text-indigo-900 dark:text-indigo-100 font-semibold";
            badgeColor = "bg-indigo-600 text-white";
          } else if (hasWarning) {
            borderClass = "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20";
            textClass = "text-amber-900 dark:text-amber-200";
            badgeColor = "bg-amber-500 text-white";
          } else if (isComplete) {
            borderClass = "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20";
            textClass = "text-slate-800 dark:text-slate-200";
            badgeColor = "bg-emerald-600 text-white";
          }

          return (
            <Link
              key={step.id}
              href={`/accounts-production/${clientId}${step.route}`}
              className={`p-2 rounded-lg border transition-all text-left flex flex-col justify-between cursor-pointer group ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${badgeColor}`}>
                  {isComplete ? <CheckCircle2 size={11} /> : step.id}
                </span>
                <Icon
                  size={14}
                  className={
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400"
                      : hasWarning
                      ? "text-amber-500"
                      : isComplete
                      ? "text-emerald-600"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  }
                />
              </div>

              <div>
                <div className={`text-[11px] truncate leading-tight ${textClass}`}>
                  {step.name}
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">
                  {step.shortDesc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface PipelineFooterNavProps {
  clientId: string;
  currentStepSlug: string;
  statusNotice?: string;
  onNextAction?: () => void;
  nextActionLabel?: string;
  nextActionDisabled?: boolean;
}

export function PipelineFooterNav({
  clientId,
  currentStepSlug,
  statusNotice,
  onNextAction,
  nextActionLabel,
  nextActionDisabled = false,
}: PipelineFooterNavProps) {
  const currentIndex = AP_PIPELINE_STEPS.findIndex((s) => s.slug === currentStepSlug);
  const prevStep = currentIndex > 0 ? AP_PIPELINE_STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < AP_PIPELINE_STEPS.length - 1 ? AP_PIPELINE_STEPS[currentIndex + 1] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 mt-6">
      <div>
        {prevStep ? (
          <Link
            href={`/accounts-production/${clientId}${prevStep.route}`}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Step {prevStep.id}: {prevStep.name}</span>
          </Link>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={13} />
            <span>Initial Workflow Stage</span>
          </div>
        )}
      </div>

      {statusNotice && (
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center hidden md:block">
          {statusNotice}
        </div>
      )}

      <div>
        {onNextAction ? (
          <button
            type="button"
            onClick={onNextAction}
            disabled={nextActionDisabled}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{nextActionLabel || (nextStep ? `Continue to Step ${nextStep.id}: ${nextStep.name}` : "Proceed")}</span>
            <ArrowRight size={13} />
          </button>
        ) : nextStep ? (
          <Link
            href={`/accounts-production/${clientId}${nextStep.route}`}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>Continue to Step {nextStep.id}: {nextStep.name}</span>
            <ArrowRight size={13} />
          </Link>
        ) : (
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 size={14} />
            <span>Final Stage Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
