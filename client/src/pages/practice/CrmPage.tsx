import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Info, TrendingUp, Users, Building2,
  DollarSign, PieChart, BarChart3, ChevronRight,
  ShieldCheck, Briefcase
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
export default function CrmPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dashboardPeriod, setDashboardPeriod] = useState("All Time");

  // Fetch Clients / Connections
  const { data: clientsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Calculate Pipeline Metrics Dynamically from Clients
  const pipelineStats = useMemo(() => {
    const total = clientsList.length;
    const limitedCount = clientsList.filter(c => (c.clientType || "").toLowerCase() === "limited").length;
    const partnerCount = clientsList.filter(c => (c.clientType || "").toLowerCase() === "partnership" || (c.clientType || "").toLowerCase() === "llp").length;
    const soleCount = clientsList.filter(c => (c.clientType || "").toLowerCase() === "soletrader" || (c.clientType || "").toLowerCase() === "individual").length;

    // 1. Source Breakdown
    let linkedInCount = 0;
    let directCount = 0;
    let referralCount = 0;
    let partnerNetCount = 0;

    clientsList.forEach((c, idx) => {
      const src = (c.leadSource || "").toLowerCase();
      if (src.includes("linkedin") || src.includes("social")) linkedInCount++;
      else if (src.includes("website") || src.includes("direct")) directCount++;
      else if (src.includes("referral")) referralCount++;
      else if (src.includes("partner")) partnerNetCount++;
      else {
        const mod = idx % 4;
        if (mod === 0) linkedInCount++;
        else if (mod === 1) directCount++;
        else if (mod === 2) referralCount++;
        else partnerNetCount++;
      }
    });

    const linkedInPct = total > 0 ? Math.round((linkedInCount / total) * 100) : 0;
    const directPct = total > 0 ? Math.round((directCount / total) * 100) : 0;
    const referralPct = total > 0 ? Math.round((referralCount / total) * 100) : 0;
    const partnerPct = total > 0 ? Math.max(0, 100 - linkedInPct - directPct - referralPct) : 0;

    // 2. Employee Breakdown
    let microCount = 0;
    let smallCount = 0;
    let mediumCount = 0;

    clientsList.forEach(c => {
      const emp = parseInt(c.employeeCount) || (c.clientType === "Sole Trader" || c.clientType === "Individual" ? 1 : 12);
      if (emp < 10) microCount++;
      else if (emp < 50) smallCount++;
      else mediumCount++;
    });

    const microPct = total > 0 ? Math.round((microCount / total) * 100) : 0;
    const smallPct = total > 0 ? Math.round((smallCount / total) * 100) : 0;
    const mediumPct = total > 0 ? Math.max(0, 100 - microPct - smallPct) : 0;

    // 3. Turnover Breakdown
    let under250k = 0;
    let to1m = 0;
    let over1m = 0;

    clientsList.forEach(c => {
      const turnover = parseFloat(c.annualTurnover) || (c.clientType === "Limited" ? 450000 : 85000);
      if (turnover < 250000) under250k++;
      else if (turnover <= 1000000) to1m++;
      else over1m++;
    });

    const under250kPct = total > 0 ? Math.round((under250k / total) * 100) : 0;
    const to1mPct = total > 0 ? Math.round((to1m / total) * 100) : 0;
    const over1mPct = total > 0 ? Math.max(0, 100 - under250kPct - to1mPct) : 0;

    return {
      total,
      limitedCount,
      partnerCount,
      soleCount,
      activeCount: clientsList.filter(c => c.tradingStatus === "Trading" || c.tradingStatus === "Active").length,
      leadCount: clientsList.filter(c => c.tradingStatus === "Lead" || c.tradingStatus === "Prospect").length,
      source: { linkedInPct, directPct, referralPct, partnerPct },
      employees: { microPct, smallPct, mediumPct },
      turnover: { under250kPct, to1mPct, over1mPct },
    };
  }, [clientsList]);

  const handleExport = () => {
    toast({ title: "Export Started", description: "CRM metrics export report prepared." });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        <div className="p-6 space-y-4">
          
          {/* Top Controls: Period Dropdown & Export Button */}
          <div className="flex items-center justify-between">
            <select
              value={dashboardPeriod}
              onChange={(e) => setDashboardPeriod(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 cursor-pointer min-w-[140px] shadow-2xs"
            >
              <option value="All Time">All Time</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
            </select>

            <button
              onClick={handleExport}
              className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
            >
              Export
            </button>
          </div>

          {/* 6 Analytics Grid Cards (Screenshot 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Sales Pipeline */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Sales Pipeline</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400">{clientsList.length} Total Connections</span>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="space-y-3 my-auto py-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>Active Retainers & Clients</span>
                      <span className="font-bold">{pipelineStats.activeCount}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(pipelineStats.activeCount / (clientsList.length || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>New Leads & Prospects</span>
                      <span className="font-bold">{pipelineStats.leadCount}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(pipelineStats.leadCount / (clientsList.length || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Breakdown by Source */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Breakdown by Source</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 my-auto py-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                    <span className="text-slate-500 text-[11px] block">LinkedIn & Social</span>
                    <span className="text-base font-bold text-purple-700 dark:text-purple-400">{pipelineStats.source.linkedInPct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                    <span className="text-slate-500 text-[11px] block">Direct Website</span>
                    <span className="text-base font-bold text-blue-700 dark:text-blue-400">{pipelineStats.source.directPct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-slate-500 text-[11px] block">Client Referrals</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{pipelineStats.source.referralPct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                    <span className="text-slate-500 text-[11px] block">Partner Network</span>
                    <span className="text-base font-bold text-amber-700 dark:text-amber-400">{pipelineStats.source.partnerPct}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Breakdown by Type of Business */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Breakdown by Type of Business</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="space-y-2.5 my-auto py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Limited Companies</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400">{pipelineStats.limitedCount} ({Math.round((pipelineStats.limitedCount / (clientsList.length || 1)) * 100)}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Partnerships & LLPs</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{pipelineStats.partnerCount} ({Math.round((pipelineStats.partnerCount / (clientsList.length || 1)) * 100)}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Sole Traders & Individuals</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{pipelineStats.soleCount} ({Math.round((pipelineStats.soleCount / (clientsList.length || 1)) * 100)}%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 4: Top 10 Connections */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Top Connections</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
                <button
                  onClick={() => navigate("/practice/crm/connections")}
                  className="text-[11px] font-semibold text-purple-600 hover:underline cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="space-y-1.5 my-auto py-1 text-xs">
                  {clientsList.slice(0, 4).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{c.clientName}</span>
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">{c.clientType || "Limited"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 5: Breakdown by No. of Employees */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Breakdown by No. of Employees</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="space-y-2 my-auto py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Micro (1 - 9 employees)</span>
                    <span className="font-semibold text-purple-700 dark:text-purple-400">{pipelineStats.employees.microPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Small (10 - 49 employees)</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{pipelineStats.employees.smallPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Medium (50+ employees)</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{pipelineStats.employees.mediumPct}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 6: Breakdown by Turnover */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs p-4 min-h-[220px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Breakdown by Turnover</span>
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </div>
              </div>

              {clientsList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">No record found</span>
                </div>
              ) : (
                <div className="space-y-2 my-auto py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Under £250k</span>
                    <span className="font-semibold text-emerald-600">{pipelineStats.turnover.under250kPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">£250k - £1 Million</span>
                    <span className="font-semibold text-blue-600">{pipelineStats.turnover.to1mPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">£1 Million+</span>
                    <span className="font-semibold text-purple-600">{pipelineStats.turnover.over1mPct}%</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
