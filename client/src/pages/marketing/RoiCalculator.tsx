import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Calculator, Clock, TrendingUp, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

interface RoiCalculatorProps {
  config?: {
    eyebrow?: string;
    heading?: string;
    subtitle?: string;
    defaultClients?: number;
    defaultTeam?: number;
    hoursPerClientMultiplier?: number;
    legacySeatCost?: number;
    legacyClientCost?: number;
  };
}

export default function RoiCalculator({ config }: RoiCalculatorProps) {
  const initialClients = config?.defaultClients || 100;
  const initialTeam = config?.defaultTeam || 4;
  const hoursMultiplier = Number(config?.hoursPerClientMultiplier) || 3.6;
  const legacySeatRate = Number(config?.legacySeatCost) || 65;
  const legacyClientRate = Number(config?.legacyClientCost) || 2.2;

  const [clientCount, setClientCount] = useState<number>(initialClients);
  const [teamSize, setTeamSize] = useState<number>(initialTeam);

  // Dynamic ROI calculation logic
  const metrics = useMemo(() => {
    const annualHoursSaved = Math.round(clientCount * hoursMultiplier);
    const monthlyHoursSaved = Math.round(annualHoursSaved / 12);

    const estimatedLegacyMonthlyCost = Math.round(teamSize * legacySeatRate + clientCount * legacyClientRate);
    
    // SanSuite estimated cost
    let sanSuiteMonthlyCost = 99;
    let recommendedPlan = "Starter Suite";
    if (clientCount > 50 && clientCount <= 150) {
      sanSuiteMonthlyCost = 160;
      recommendedPlan = "Growth Practice";
    } else if (clientCount > 150) {
      sanSuiteMonthlyCost = 250;
      recommendedPlan = "Full Enterprise Suite";
    }

    const monthlyFinancialSavings = Math.max(estimatedLegacyMonthlyCost - sanSuiteMonthlyCost, 120);
    const annualFinancialSavings = monthlyFinancialSavings * 12;

    return {
      monthlyHoursSaved,
      annualHoursSaved,
      monthlyFinancialSavings,
      annualFinancialSavings,
      recommendedPlan,
      sanSuiteMonthlyCost,
    };
  }, [clientCount, teamSize, hoursMultiplier, legacySeatRate, legacyClientRate]);

  const eyebrow = config?.eyebrow || "Interactive Practice Efficiency Calculator";
  const heading = config?.heading || "See How Much Time & Cost SanSuite Saves Your Firm";
  const subtitle = config?.subtitle || "Unlike legacy software providers who charge exorbitant per-seat license fees, SanSuite includes unlimited staff users and unified data flow across all compliance workflows.";

  return (
    <section id="why-sansuite" className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <TrendingUp size={14} />
            <span>{eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="max-w-5xl mx-auto bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Slider 1: Active Clients */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Active Practice Clients</span>
                <span className="text-base font-black text-purple-600 dark:text-purple-400 px-3 py-1 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                  {clientCount} Clients
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={clientCount}
                onChange={(e) => setClientCount(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#6c5ce7]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>20 Clients</span>
                <span>150 Clients</span>
                <span>300 Clients</span>
                <span>500+ Clients</span>
              </div>
            </div>

            {/* Slider 2: Team Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Staff Members & Accountants</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  {teamSize} Users
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1 User (Solo)</span>
                <span>5 Users</span>
                <span>15 Users</span>
                <span>25+ Users</span>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span>Unlimited Staff Users</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span>Zero Double-Entry</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span>Unlimited eSignatures</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span>Free Data Migration</span>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 bg-gradient-to-b from-purple-50/80 via-slate-50 to-white dark:from-slate-900 dark:to-slate-900/90 rounded-2xl border border-purple-200 dark:border-purple-500/30 p-6 space-y-6 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                Estimated Operational Impact
              </span>

              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#6c5ce7]" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Hours Saved / Month</span>
                  </div>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{metrics.monthlyHoursSaved} hrs</span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Est. Annual Savings</span>
                  </div>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    £{metrics.annualFinancialSavings.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-purple-100/60 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/40 space-y-1">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wider font-semibold block">
                    Recommended Package
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{metrics.recommendedPlan}</span>
                    <span className="text-xs font-black text-purple-700 dark:text-purple-300">~£{metrics.sanSuiteMonthlyCost}/mo</span>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/book-demo"
              className="w-full py-3 bg-gradient-to-r from-[#6c5ce7] to-indigo-600 hover:from-[#5b4bc4] hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <span>Get Personalized Practice Quote</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
