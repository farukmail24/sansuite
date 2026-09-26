import { useState } from "react";
import { Link } from "wouter";
import {
  Users, FileSignature, ShieldCheck, Calendar,
  CheckSquare, FileSpreadsheet, ChevronRight, ChevronDown,
  ArrowRight, Compass, Sparkles, CheckCircle2, AlertCircle,
  Clock, Plus, Send, ExternalLink, HelpCircle
} from "lucide-react";

interface PracticeWorkflowGuideProps {
  clientsCount: number;
  deadlinesCount: number;
  tasksCount: number;
  proposalsCount: number;
  onQuickAdd: () => void;
  onRefreshDeadlines: () => void;
}

export default function PracticeWorkflowGuide({
  clientsCount,
  deadlinesCount,
  tasksCount,
  proposalsCount,
  onQuickAdd,
  onRefreshDeadlines,
}: PracticeWorkflowGuideProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "1. Client & Prospect Setup",
      shortLabel: "Clients",
      icon: Users,
      badge: `${clientsCount} Active`,
      badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      description: "Onboard your clients as Limited Companies, Sole Traders, Partnerships or Individuals. Synchronize company details directly with Companies House.",
      bestPractice: "UK Practice Tip: Always verify the incorporation date and Companies House CRN number during setup to ensure accounting reference dates auto-populate accurately.",
      primaryAction: { label: "+ Add New Client", onClick: onQuickAdd },
      secondaryLink: { label: "View Client CRM 360", href: "/practice/clients" },
    },
    {
      id: 2,
      title: "2. Proposal & LoE (eSign)",
      shortLabel: "Engagement",
      icon: FileSignature,
      badge: `${proposalsCount} Proposals`,
      badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      description: "Draft legally binding Letters of Engagement (LoE) and fee proposals with dynamic merge tags. Send to prospects or clients for paperless digital signature via eSign.",
      bestPractice: "UK Practice Tip: CCAB & ICAEW regulations mandate an updated Letter of Engagement before commencing fee-earning accounting or tax services.",
      primaryAction: { label: "Create Proposal", href: "/practice/proposals" },
      secondaryLink: { label: "eSign Audit Center", href: "/esign" },
    },
    {
      id: 3,
      title: "3. AML Screening & HMRC 64-8",
      shortLabel: "Compliance",
      icon: ShieldCheck,
      badge: "GovTalk & MLR 2017",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      description: "Perform mandatory Anti-Money Laundering checks against PEP & Sanctions watchlists. Generate official HMRC Form 64-8 to act as authorized tax agent.",
      bestPractice: "UK Practice Tip: Ensure Identity Proof, Proof of Address and Form 64-8 are logged under the client's Onboarding tab before filing returns.",
      primaryAction: { label: "AML Screening Register", href: "/aml" },
      secondaryLink: { label: "Client Onboarding Checklist", href: "/practice/clients" },
    },
    {
      id: 4,
      title: "4. Services & Statutory Deadlines",
      shortLabel: "Deadlines",
      icon: Calendar,
      badge: `${deadlinesCount} Tracked`,
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      description: "Assign accounting services (Accounts, CT600, VAT, CS01, Payroll). The compliance engine automatically computes statutory filing dates based on accounting periods.",
      bestPractice: "UK Practice Tip: Automated compliance reminders dispatch at 30, 14, 7, 3, and 1 days before statutory deadlines to prevent Companies House £150+ late filing penalties.",
      primaryAction: { label: "Refresh Deadlines Engine", onClick: onRefreshDeadlines },
      secondaryLink: { label: "Statutory Deadlines Grid", href: "/practice/deadlines" },
    },
    {
      id: 5,
      title: "5. Task Pipelines & Communications",
      shortLabel: "Tasks & Inbox",
      icon: CheckSquare,
      badge: `${tasksCount} Tasks`,
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      description: "Execute workflow steps on interactive Kanban boards. Sync staff schedules with Google Calendar and chase missing client paperwork with one-click document requests.",
      bestPractice: "UK Practice Tip: Break down large annual accounts into 5 sub-steps: Bank Reconciled -> Draft Accounts -> Manager Review -> Client Signature -> Gateway Submission.",
      primaryAction: { label: "Open Kanban Tasks", href: "/practice/tasks" },
      secondaryLink: { label: "Document Request Chaser", href: "/practice/documents" },
    },
    {
      id: 6,
      title: "6. Gateway Filing & Billing",
      shortLabel: "Submissions",
      icon: FileSpreadsheet,
      badge: "HMRC & CH Gateway",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      description: "Track all electronic gateway submissions (CT, Accounts, VAT, RTI) in the 360° Matrix. Convert completed billable hours into client fee invoices.",
      bestPractice: "UK Practice Tip: Always cross-reference the electronic gateway receipt token stored in the Submissions Matrix for statutory audit records.",
      primaryAction: { label: "View Submissions Matrix", href: "#submissions-matrix" },
      secondaryLink: { label: "Time & Fee Ledger", href: "/time-fees" },
    },
  ];

  const current = steps.find((s) => s.id === activeStep) || steps[0];
  const CurrentIcon = current.icon;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      
      {/* Roadmap Header Banner */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-purple-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-purple-950/20 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:opacity-95 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
            <Compass size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Practice Operating Roadmap & Workflow Guide
              <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                UK Standard Practice Methodology
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive 6-stage operational cycle: from lead onboarding to statutory deadline compliance and gateway filing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hidden sm:inline">
            {isOpen ? "Minimize Guide" : "Expand Workflow Guide"}
          </span>
          <div className="p-1 text-slate-500 dark:text-slate-400">
            <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-5">
          
          {/* 6-Stage Stepper Buttons Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isSelected = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-2xs"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <StepIcon size={13} />
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Stage 0{step.id}
                    </span>
                    <span
                      className={`text-xs font-bold truncate block ${
                        isSelected
                          ? "text-purple-900 dark:text-purple-200"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {step.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Content Panel for Selected Step */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <CurrentIcon size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {current.title}
                </h4>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {current.description}
              </p>

              {/* Best Practice Tip Box */}
              <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-purple-900 dark:text-purple-300">
                <Sparkles size={14} className="shrink-0 text-purple-600 mt-0.5" />
                <span className="leading-tight">{current.bestPractice}</span>
              </div>
            </div>

            {/* Quick Actions for this Step */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
              {current.primaryAction.onClick ? (
                <button
                  onClick={current.primaryAction.onClick}
                  className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} /> {current.primaryAction.label}
                </button>
              ) : (
                <Link href={current.primaryAction.href || "#"}>
                  <button className="w-full px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                    <ArrowRight size={13} /> {current.primaryAction.label}
                  </button>
                </Link>
              )}

              {current.secondaryLink && (
                <Link href={current.secondaryLink.href}>
                  <button className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>{current.secondaryLink.label}</span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </button>
                </Link>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
