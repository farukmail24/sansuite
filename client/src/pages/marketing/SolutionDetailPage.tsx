import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Receipt,
  Calculator,
  UserCheck,
  Users2,
  Stamp,
  FileCode2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock,
  ChevronRight
} from "lucide-react";

interface CmsModule {
  id: number;
  moduleKey: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  iconName: string;
  category: string;
  features: string[];
  workflowSteps?: Array<{ step?: number | string; title: string; description?: string; desc?: string }>;
  capiumComparisonHighlight?: string;
}

const MODULE_FALLBACKS: Record<string, Partial<CmsModule>> = {
  "practice-management": {
    name: "Practice Management & CRM",
    slug: "practice-management",
    category: "Practice Hub",
    shortDescription: "Centralized practice hub with deadlines, AML compliance, automated onboarding, task management, and client communication.",
    fullDescription: "Built exclusively for UK accountancy practices, SanSuite Practice Management synchronizes your entire firm's workflow into one intelligent dashboard. Eliminate missed statutory deadlines with automated Companies House and HMRC calendar tracking, conduct rigorous AML checks with integrated ID verification, and onboard new clients effortlessly with dynamic digital engagement letters.",
    features: [
      "Automated Companies House & HMRC deadline tracking with color-coded alerts",
      "Comprehensive Anti-Money Laundering (AML) risk assessment & photo ID verification",
      "Customizable workflow pipelines with Kanban boards and task delegation",
      "Integrated electronic proposals with fee calculators and digital letter of engagement",
      "Direct client messaging and automated multi-channel deadline chasers",
      "Time tracking, staff billable rate utilization, and work-in-progress (WIP) reporting",
    ],
    capiumComparisonHighlight: "100% workflow parity with Capium Practice Management plus automated deadline synchronizers, built-in risk scoring, and zero hidden add-on costs.",
  },
  "accounts-production": {
    name: "Accounts Production (FRS 102 / 105)",
    slug: "accounts-production",
    category: "Compliance & Reporting",
    shortDescription: "Produce FRS 102 1A and FRS 105 micro-entity accounts with automatic iXBRL tagging and direct dual filing to Companies House and HMRC.",
    fullDescription: "Empower your practice to generate compliant statutory annual accounts in minutes. SanSuite Accounts Production incorporates standard UK Chart of Accounts, auto-balancing trial balances, intelligent note disclosures, and seamless one-click iXBRL electronic filing directly to Companies House and HMRC simultaneously.",
    features: [
      "Strict compliance with FRS 102 Section 1A and FRS 105 Micro-Entity reporting frameworks",
      "Instant dual submission to Companies House and HMRC via secure government gateway",
      "Automated iXBRL tagging engine verified against standard UK GAAP taxonomies",
      "Seamless Trial Balance import from Xero, QuickBooks, Sage, and SanSuite Bookkeeping",
      "Intelligent note disclosure generator with customizable accountant reports",
      "Comparative prior-year figures auto-roll forward with detailed audit trail",
    ],
    capiumComparisonHighlight: "Dual-gateway filing matches Capium Accounts Production with enhanced ledger reconciliation and faster live iXBRL validation.",
  },
  "bookkeeping-vat": {
    name: "Cloud Bookkeeping & MTD VAT",
    slug: "bookkeeping-vat",
    category: "Daily Bookkeeping",
    shortDescription: "Complete double-entry cloud bookkeeping with direct UK open banking feeds, sales invoicing, purchase receipt capture, and MTD VAT submissions.",
    fullDescription: "Give your practice and your business clients an intuitive, high-speed bookkeeping platform. Process multi-currency sales invoices, scan purchase receipts, reconcile bank statements with AI-assisted rule matching, and compute 9-box VAT returns with direct electronic submission under HMRC Making Tax Digital (MTD) rules.",
    features: [
      "HMRC-recognized Making Tax Digital (MTD) for VAT 9-box direct API transmission",
      "UK Open Banking direct feeds covering Barclays, HSBC, Lloyds, NatWest, Monzo, and Starling",
      "Customizable branded sales invoices, estimates, and automated customer payment reminders",
      "Purchase order tracking, receipt capture, and automated VAT rate categorization (Standard, Reduced, Zero, Exempt)",
      "Multi-dimensional Chart of Accounts with journal adjustments and detailed ledger reporting",
      "Cash accounting, standard accrual, flat rate, and margin VAT schemes supported",
    ],
    capiumComparisonHighlight: "Full functional alignment with Capium Bookkeeping plus instant open banking bank rule auto-matching.",
  },
  "corporation-tax": {
    name: "Corporation Tax (CT600)",
    slug: "corporation-tax",
    category: "Taxation",
    shortDescription: "Full CT600 computation with capital allowances, R&D tax credits, group relief, loss relief offsets, and direct HMRC gateway filing.",
    fullDescription: "Streamline annual corporation tax preparation. Pull figures directly from SanSuite Accounts Production into the CT600 computation engine, calculate capital allowances with super-deduction and AIA rules, model complex trading loss carry-backs or carry-forwards, and file the CT600 alongside tagged accounts directly to HMRC.",
    features: [
      "Direct figure ingestion from Accounts Production ensuring zero duplicate data entry",
      "Comprehensive Capital Allowances: Annual Investment Allowance (AIA), First Year Allowances, and Written Down Values",
      "SME and RDEC Research & Development (R&D) tax relief computations",
      "Trading loss relief modeling: carry forward, carry back, and group relief allocations",
      "Associated companies and marginal relief computation under the 19% - 25% corporation tax regime",
      "Direct HMRC electronic filing with instant gateway acceptance certificate",
    ],
    capiumComparisonHighlight: "Equivalent CT600 computation rigor as Capium Corporation Tax with real-time tax liability forecasting.",
  },
  "self-assessment": {
    name: "Self Assessment (SA100 / SA800 / SA900)",
    slug: "self-assessment",
    category: "Taxation",
    shortDescription: "Individual, Partnership, and Trust tax returns with automated tax computations, dividend schedules, capital gains, and one-click filing.",
    fullDescription: "Accelerate your January tax season with SanSuite Self Assessment. Complete SA100 individual returns, SA800 partnership tax computations, and SA900 trust returns with ease. Handle employment benefits, foreign income, capital gains property disposals, and student loan deductions with instant HMRC live calculation previews.",
    features: [
      "Full support for SA100 (Individuals), SA800 (Partnerships), and SA900 (Trust & Estates)",
      "All statutory schedules: Employment, Self-Employment, UK Property, Foreign, Capital Gains, and Dividends",
      "Live tax liability computation preview with Class 2 & 4 National Insurance breakdowns",
      "HMRC Pre-population API integration to pull employment and pension data directly",
      "Automated Payments on Account (POA) scheduling and reduction claim handling",
      "Direct gateway filing with instant submission confirmation receipt and reference code",
    ],
    capiumComparisonHighlight: "Complete schedule support matching Capium Self Assessment with accelerated review workflows.",
  },
  "payroll-rti": {
    name: "Payroll & RTI Auto-Enrolment",
    slug: "payroll-rti",
    category: "Payroll & HR",
    shortDescription: "Multi-company bureau payroll with full HMRC RTI submissions (FPS/EPS), workplace pension auto-enrolment, digital payslips, and P11D benefits.",
    fullDescription: "Designed for high-volume payroll bureaus and small practices alike. Run weekly, fortnightly, four-weekly, and monthly payrolls with automatic tax code updates, statutory sick pay (SSP), maternity pay (SMP), student loans, and direct integration with major workplace pension providers like Nest, The People's Pension, and Smart Pension.",
    features: [
      "Direct HMRC Real Time Information (RTI) submissions: Full Payment Submission (FPS) and Employer Payment Summary (EPS)",
      "Automated Workplace Pension assessment, postponement, and contribution export for Nest, Aviva, and Smart Pension",
      "Statutory payments calculator: SSP, SMP, SPP, SAP, and ShPP",
      "Direct employee portal delivery of tamper-proof PDF payslips, P60, and P45 certificates",
      "Complete year-end P11D benefits-in-kind reporting and Class 1A NIC computation",
      "Batch payroll processing engine allowing dozens of employer runs in a single action",
    ],
    capiumComparisonHighlight: "Matches Capium Payroll bureau capabilities with streamlined batch processing and pension reporting.",
  },
  "company-secretarial": {
    name: "Company Secretarial",
    slug: "company-secretarial",
    category: "Statutory Compliance",
    shortDescription: "Complete statutory registers, confirmation statement CS01 filing, officer appointments, PSC registers, and Companies House synchronization.",
    fullDescription: "Keep your corporate clients completely compliant with Companies House obligations. SanSuite Company Secretarial synchronizes live company data, maintains statutory registers of directors, members, and PSCs, generates professional board minutes, and files Confirmation Statements (CS01) and form AP01/TM01 electronically in seconds.",
    features: [
      "Real-time Companies House API synchronization for company profiles, filing history, and officer data",
      "Direct electronic submission of Confirmation Statement (CS01) with statutory fee integration",
      "Director & Secretary appointments (AP01/AP03) and terminations (TM01/TM02)",
      "Statutory registers: Register of Members, Directors, Residential Addresses, and Persons with Significant Control (PSC)",
      "Automated board minutes, resolutions, and share transfer / dividend voucher documentation generator",
      "Automatic reminder engine for upcoming confirmation statements and annual filing deadlines",
    ],
    capiumComparisonHighlight: "Full functional equivalence with Capium Company Secretarial with instantaneous Companies House data refreshes.",
  },
  "mtd-income-tax": {
    name: "Making Tax Digital for Income Tax (MTD IT)",
    slug: "mtd-income-tax",
    category: "MTD Next-Gen",
    shortDescription: "Future-proof your practice for HMRC MTD for ITSA. Quarterly updates, cumulative summaries, end of period statements (EOPS), and final declarations.",
    fullDescription: "The biggest change to UK tax reporting since Self Assessment is here. SanSuite MTD for Income Tax equips your practice with the tools to manage sole traders and landlords with gross income over statutory thresholds. Maintain digital records, transmit quarterly updates, review cumulative totals, and execute final declarations seamlessly.",
    features: [
      "Ready for HMRC Making Tax Digital for Income Tax (ITSA) mandates",
      "Digital records maintenance with category breakdown matching HMRC standard business categories",
      "Quarterly summary update submission with direct HMRC acknowledgment receipts",
      "Cumulative quarterly view enabling proactive year-to-date tax liability estimates",
      "End of Period Statement (EOPS) and Final Declaration submission workflows",
      "Bulk client readiness tracker to identify affected clients before statutory penalty periods",
    ],
    capiumComparisonHighlight: "Directly mirrors Capium MTD IT quarterly summary and cumulative calculation workflows with advanced readiness audits.",
  },
  "sansign": {
    name: "Unlimited SanSuite eSign",
    slug: "sansign",
    category: "E-Signatures",
    shortDescription: "Legally binding digital signatures built directly into practice workflows. Send tax returns, accounts, and engagement letters with zero per-envelope fees.",
    fullDescription: "Stop paying exorbitant third-party fees per document envelope. SanSuite eSign is fully integrated into every module across the suite. Request signatures on annual accounts, CT600 returns, engagement letters, and payroll reports with legally binding digital audit trails compliant with the UK Electronic Communications Act 2000.",
    features: [
      "Legally binding signatures fully compliant with UK eIDAS and Electronic Communications Act 2000",
      "Complete cryptographic audit trail with signer IP, timestamp, email authentication, and hash certificate",
      "Zero per-envelope charges: send unlimited signing requests across all your clients",
      "One-click signing dispatch directly from Accounts Production, Tax, and Practice Management",
      "Automated, polite SMS and email reminder sequences for outstanding signatures",
      "Mobile-friendly client signing interface requiring zero app installation for the client",
    ],
    capiumComparisonHighlight: "Zero per-envelope cost compared to standalone providers, seamlessly embedded into all SanSuite filing workflows.",
  },
  "portal-365": {
    name: "Client Portal 365 Hub",
    slug: "portal-365",
    category: "Client Engagement",
    shortDescription: "White-labeled 24/7 collaborative client portal for secure document exchange, tax return approvals, real-time messaging, and mobile receipts.",
    fullDescription: "Transform the client experience and eliminate email attachment chaos. Client Portal 365 gives your clients a modern, branded hub accessible on any desktop or smartphone. Clients can securely upload bank statements and invoices, view and approve pending tax computations, sign documents, and message your practice safely.",
    features: [
      "Secure 256-bit encrypted document repository organized by tax year and accounting period",
      "One-tap approval center for annual accounts, VAT returns, CT600, and payroll payslips",
      "Practice-branded portal login featuring your firm logo, colors, and direct web address",
      "Mobile-optimized document photo upload allowing clients to snap receipts on the go",
      "Integrated practice messenger keeping all client conversations attached to the client file",
      "Two-factor authentication (2FA) protection ensuring total compliance with GDPR data standards",
    ],
    capiumComparisonHighlight: "Elevates client collaboration beyond traditional portals with native document approvals and instant notifications.",
  },
};

const SLUG_ALIASES: Record<string, string> = {
  "bookkeeping": "bookkeeping-vat",
  "payroll": "payroll-rti",
  "mtd-it": "mtd-income-tax",
  "capisign": "sansign",
  "client-portal-365": "portal-365",
  "portal": "portal-365",
};

export default function SolutionDetailPage() {
  const [, params] = useRoute("/solutions/:slug");
  const rawSlug = params?.slug || "practice-management";
  const slug = SLUG_ALIASES[rawSlug] || rawSlug;

  const [moduleData, setModuleData] = useState<CmsModule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    fetch(`/api/public/cms/modules/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        const mod = data?.module || (data?.id ? data : null);
        const fb = MODULE_FALLBACKS[slug] || MODULE_FALLBACKS["practice-management"] || {};
        if (mod) {
          let features: string[] = [];
          if (Array.isArray(mod.features)) features = mod.features;
          else if (Array.isArray(mod.bulletPoints)) features = mod.bulletPoints;
          else if (typeof mod.bulletPoints === "string") {
            try { features = JSON.parse(mod.bulletPoints); } catch { features = []; }
          }

          let workflowSteps: any[] = [];
          if (Array.isArray(mod.workflowSteps)) workflowSteps = mod.workflowSteps;
          else if (typeof mod.workflowSteps === "string") {
            try { workflowSteps = JSON.parse(mod.workflowSteps); } catch { workflowSteps = []; }
          }

          setModuleData({
            id: mod.id,
            moduleKey: mod.moduleKey || mod.slug,
            name: mod.name || mod.title || fb.name || "UK Accounting Module",
            slug: mod.slug || slug,
            category: mod.category || fb.category || "Accounting Suite",
            shortDescription: mod.shortDescription || fb.shortDescription || "",
            fullDescription: mod.fullDescription || mod.detailedDescription || fb.fullDescription || fb.shortDescription || "",
            iconName: mod.iconName || "Building2",
            features: features.length > 0 ? features : (fb.features || []),
            workflowSteps: workflowSteps.length > 0 ? workflowSteps : undefined,
            capiumComparisonHighlight: mod.capiumComparisonHighlight || fb.capiumComparisonHighlight || "",
          });
        } else {
          // Fallback to static UK module dictionary
          setModuleData({
            id: 0,
            moduleKey: slug,
            name: fb.name || "UK Accounting Module",
            slug: slug,
            category: fb.category || "Accounting Suite",
            shortDescription: fb.shortDescription || "",
            fullDescription: fb.fullDescription || "",
            iconName: "Building2",
            features: fb.features || [],
            capiumComparisonHighlight: fb.capiumComparisonHighlight || "",
          });
        }
      })
      .catch(() => {
        const fb = MODULE_FALLBACKS[slug] || MODULE_FALLBACKS["practice-management"] || {};
        setModuleData({
          id: 0,
          moduleKey: slug,
          name: fb.name || "UK Accounting Module",
          slug: slug,
          category: fb.category || "Accounting Suite",
          shortDescription: fb.shortDescription || "",
          fullDescription: fb.fullDescription || "",
          iconName: "Building2",
          features: fb.features || [],
          capiumComparisonHighlight: fb.capiumComparisonHighlight || "",
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const current = moduleData || (MODULE_FALLBACKS[slug] as CmsModule) || (MODULE_FALLBACKS["practice-management"] as CmsModule);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-purple-50/70 via-white to-slate-50 dark:from-purple-950/25 dark:via-slate-950 dark:to-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6c5ce7_1px,transparent_1px)] [background-size:24px_24px] opacity-10 dark:opacity-15 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
            <Link href="/" className="hover:text-purple-600 dark:hover:text-purple-300 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <Link href="/#modules" className="hover:text-purple-600 dark:hover:text-purple-300 transition-colors">Solutions</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <span className="text-purple-600 dark:text-purple-300 font-medium">{current.name}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{current.category || "SanSuite Module"}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            {current.name}
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed mb-8">
            {current.shortDescription}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/book-demo"
              className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>Book a Live 1-on-1 Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/pricing"
              className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 font-semibold text-sm transition-all shadow-sm"
            >
              <span>View Pricing & Licenses</span>
            </Link>

            <a
              href="/login"
              className="px-6 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Launch Module</span>
            </a>
          </div>
        </div>
      </section>

      {/* In-Depth Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Long Description Card */}
          <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span>Engineered specifically for UK Accounting Practices</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              {current.fullDescription || current.shortDescription}
            </p>

            {current.capiumComparisonHighlight && (
              <div className="p-5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-sm text-purple-900 dark:text-purple-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block mb-1">Functional & Statutory Rigor:</strong>
                  <p className="text-purple-800 dark:text-purple-200/90 leading-relaxed">{current.capiumComparisonHighlight}</p>
                </div>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Comprehensive Module Capabilities</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                Every statutory requirement, calculation rule, and audit trail built-in by default.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(current.features || []).map((feature: string, idx: number) => (
                <div
                  key={idx}
                  className="p-6 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{feature}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Statutory-compliant, audited logic with real-time verification and zero manual recalculation.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Step Statutory Workflow */}
          <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-purple-50/60 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-purple-950/20 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Standard 4-Step Workflow</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2">
                From initial client data intake to verified government submission in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(current.workflowSteps && current.workflowSteps.length > 0
                ? current.workflowSteps
                : [
                    { step: "01", title: "Data Ingestion", desc: "Sync live bookkeeping ledger, import trial balance CSV, or connect UK Open Banking feeds." },
                    { step: "02", title: "Statutory Calculation", desc: "Automated FRS 102/105, CT600, or MTD algorithms compute liabilities instantly." },
                    { step: "03", title: "Review & E-Sign", desc: "Send pre-populated reports directly to your client via Portal 365 or SanSuite eSign." },
                    { step: "04", title: "Gateway Submission", desc: "One-click direct electronic transmission to HMRC and Companies House with proof receipt." },
                  ]
              ).map((item: any, idx: number) => (
                <div key={idx} className="relative p-5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                  <div className="text-2xl font-black text-purple-600/30 dark:text-purple-400/30 mb-2">
                    {typeof item.step === "number" ? `0${item.step}` : item.step || `0${idx + 1}`}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.desc || item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA Banner */}
          <div className="p-10 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 dark:from-purple-900/40 dark:via-purple-950/60 dark:to-slate-900 border border-purple-500/30 text-center space-y-6 relative overflow-hidden shadow-xl text-white">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="text-3xl font-extrabold text-white">
                Experience {current.name} in Action
              </h3>
              <p className="text-purple-100 dark:text-slate-300 text-sm mt-3 leading-relaxed">
                Schedule a 20-minute tailored walkthrough with our UK accounting technology team. We will demonstrate how SanSuite streamlines your practice operations and reduces filing times.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/book-demo"
                  className="px-8 py-3.5 rounded-xl bg-white text-purple-700 hover:bg-purple-50 dark:bg-purple-600 dark:hover:bg-purple-500 dark:text-white font-semibold text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105"
                >
                  <span>Book Free Practice Walkthrough</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="px-8 py-3.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-white dark:bg-slate-900 dark:hover:bg-slate-800 border border-purple-400/30 dark:border-slate-700 font-semibold text-sm transition-all"
                >
                  <span>Speak with Sales</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
