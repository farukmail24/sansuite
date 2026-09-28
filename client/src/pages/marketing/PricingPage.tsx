import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TrustBar from "./TrustBar";
import { Check, CheckCircle2, ArrowRight, Sparkles, HelpCircle, ShieldCheck } from "lucide-react";

interface ComparisonFeatureRow {
  feature: string;
  starter: boolean;
  growth: boolean;
  enterprise: boolean;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const { data: pricingPlans = [] } = useQuery({
    queryKey: ["/api/public/cms/pricing"],
    queryFn: async () => {
      const res = await fetch("/api/public/cms/pricing");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: siteSettings = {} } = useQuery({
    queryKey: ["/api/public/cms/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/cms/site-settings");
      if (!res.ok) return {};
      return res.json();
    },
  });

  let pageConfig: any = {};
  try {
    pageConfig = typeof (siteSettings as any).pageSectionsConfig === "string"
      ? JSON.parse((siteSettings as any).pageSectionsConfig)
      : ((siteSettings as any).pageSectionsConfig || {});
  } catch {
    pageConfig = {};
  }

  const defaultComparisonFeatures = [
    { feature: "Unlimited Staff Users & Interns", starter: true, growth: true, enterprise: true },
    { feature: "Practice Management & CRM", starter: true, growth: true, enterprise: true },
    { feature: "AML & Risk Assessment Verification", starter: true, growth: true, enterprise: true },
    { feature: "Accounts Production (FRS 102 1A / 105)", starter: true, growth: true, enterprise: true },
    { feature: "Corporation Tax (CT600) Direct Filing", starter: true, growth: true, enterprise: true },
    { feature: "Bookkeeping & MTD for VAT Gateway", starter: true, growth: true, enterprise: true },
    { feature: "Unlimited SanSuite eSignatures (eIDAS)", starter: true, growth: true, enterprise: true },
    { feature: "Self Assessment (SA100, SA800, SA900)", starter: false, growth: true, enterprise: true },
    { feature: "Payroll & RTI Auto-Enrolment Pensions", starter: false, growth: true, enterprise: true },
    { feature: "Company Secretarial & Formations", starter: false, growth: true, enterprise: true },
    { feature: "Making Tax Digital for Income Tax (MTD IT)", starter: false, growth: true, enterprise: true },
    { feature: "Client Portal 365 SME Mobile Hub", starter: false, growth: true, enterprise: true },
    { feature: "Priority UK Phone & Remote Desktop Support", starter: false, growth: true, enterprise: true },
    { feature: "Full White-Label & Custom Subdomain", starter: false, growth: false, enterprise: true },
    { feature: "Dedicated UK Customer Success Manager", starter: false, growth: false, enterprise: true },
  ];

  const comparisonFeatures: ComparisonFeatureRow[] = pageConfig.pricingMatrix && pageConfig.pricingMatrix.length > 0
    ? pageConfig.pricingMatrix
    : defaultComparisonFeatures;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
      <Navbar />

      <main className="py-16 md:py-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={14} className="text-[#6c5ce7]" />
            <span>Transparent UK Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Predictable Practice Pricing. Zero Per-Seat Penalties.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Every SanSuite package includes unlimited staff users, automated cloud backups, and direct statutory filing gateways to HMRC and Companies House.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${billingCycle === "monthly" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              Monthly Billed
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="w-14 h-7 bg-slate-200 dark:bg-slate-800 rounded-full p-1 relative border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#6c5ce7] shadow-md transition-transform duration-200 ${
                  billingCycle === "annual" ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${billingCycle === "annual" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                Annual Billed
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                Save 15%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan: any) => {
            const price = billingCycle === "annual" ? plan.annualPriceMonthlyBilled : plan.monthlyPrice;
            let featureList: string[] = [];
            try {
              featureList = Array.isArray(plan.featuresList)
                ? plan.featuresList
                : JSON.parse(plan.featuresList || "[]");
            } catch {
              featureList = [];
            }

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 flex flex-col justify-between relative shadow-lg transition-all ${
                  plan.popularBadge
                    ? "bg-white dark:bg-slate-900 border-2 border-[#6c5ce7] ring-4 ring-purple-500/10 shadow-purple-900/15 dark:shadow-purple-950/40"
                    : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {plan.popularBadge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#6c5ce7] to-indigo-600 text-white shadow-md">
                    Most Popular Choice
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.planName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.targetAudience}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">£{parseFloat(price).toFixed(0)}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ month + VAT</span>
                    </div>
                    <span className="text-[11px] text-purple-600 dark:text-purple-300 block font-medium">
                      {billingCycle === "annual" ? "Billed annually" : "Billed monthly, cancel anytime"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Client Allowance:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{plan.clientLimit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">User Licenses:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{plan.userLimit}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Included in Plan:
                    </span>
                    {featureList.map((f: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check size={14} className="text-[#6c5ce7] flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/book-demo?plan=${encodeURIComponent(plan.planName)}`}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                      plan.popularBadge
                        ? "bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white shadow-purple-500/25 hover:shadow-purple-500/40"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <span>{plan.ctaLabel || "Book 14-Day Free Trial"}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="space-y-6 pt-12 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Full Plan Feature Comparison</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Transparent comparison across all three SanSuite practice subscription tiers.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4">Module / Capability</th>
                  <th className="p-4 text-center">Starter Suite</th>
                  <th className="p-4 text-center bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">Growth Practice</th>
                  <th className="p-4 text-center">Full Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.feature}</td>
                    <td className="p-4 text-center">
                      {row.starter ? <Check size={16} className="text-emerald-500 mx-auto" /> : <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center bg-purple-50/50 dark:bg-purple-950/20">
                      {row.growth ? <Check size={16} className="text-[#6c5ce7] mx-auto font-bold" /> : <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {row.enterprise ? <Check size={16} className="text-emerald-500 mx-auto" /> : <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <TrustBar />
      <Footer />
    </div>
  );
}
