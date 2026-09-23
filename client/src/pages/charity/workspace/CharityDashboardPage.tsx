import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  Coins, HandHeart, FileSpreadsheet, ArrowUpRight,
  TrendingUp, ShieldCheck, Plus, Sparkles,
  PieChart, ExternalLink, ArrowRight
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";

export default function CharityDashboardPage() {
  return (
    <CharityWorkspaceLayout activeTab="dashboard">
      <CharityDashboardContent />
    </CharityWorkspaceLayout>
  );
}

function CharityDashboardContent() {
  const { charityId, charity, currentPeriod } = useCharityWorkspace();

  // Fetch funds summary
  const { data: fundsData, isLoading: isLoadingFunds } = useQuery({
    queryKey: [`/api/charity/${charityId}/funds`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/funds`);
      if (!res.ok) return { funds: [], summary: { totalBalance: "0.00", totalIncome: "0.00" } };
      return res.json();
    },
    enabled: !!charityId,
  });

  // Fetch donations summary
  const { data: donationsData, isLoading: isLoadingDonations } = useQuery({
    queryKey: [`/api/charity/${charityId}/donations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/donations`);
      if (!res.ok) return { donations: [], summary: { totalDonations: "0.00", potentialGiftAid: "0.00" } };
      return res.json();
    },
    enabled: !!charityId,
  });

  const funds = fundsData?.funds || [];
  const fundSummary = fundsData?.summary || { totalBalance: "0.00", totalIncome: "0.00" };
  const donations = donationsData?.donations || [];
  const donationSummary = donationsData?.summary || { totalDonations: "0.00", potentialGiftAid: "0.00" };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Funds Balance</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            £{parseFloat(fundSummary.totalBalance).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across all active funds</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Donations Received</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HandHeart size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            £{parseFloat(donationSummary.totalDonations).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {donationSummary.totalCount || 0} donations recorded
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Claimable Gift Aid</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            £{parseFloat(donationSummary.potentialGiftAid).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">HMRC 25% tax uplift</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filing Framework</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {charity?.accountingMethod === "Cash" ? "Receipts & Payments" : "SORP (FRS 102)"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {charity?.reportingType || "Independent Examination"}
          </p>
        </div>
      </div>

      {/* Main Grid: Fund Breakdown & Recent Donations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funds List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-orange-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Funds Allocation & Balances</h2>
            </div>
            <Link href={`/charity-accounts/${charityId}/funds`}>
              <button className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
                Manage Funds <ArrowRight size={13} />
              </button>
            </Link>
          </div>

          <div className="p-4">
            {isLoadingFunds ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading funds...</div>
            ) : funds.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                <Coins size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">No funds registered yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Create your Unrestricted, Restricted, or Endowment funds to begin tracking balances.</p>
                <Link href={`/charity-accounts/${charityId}/funds`}>
                  <button className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors">
                    + Add New Fund
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {funds.map((fund: any) => {
                  const balance = parseFloat(fund.currentBalance || "0");
                  const total = parseFloat(fundSummary.totalBalance || "1") || 1;
                  const pct = Math.max(0, Math.min(100, Math.round((balance / total) * 100)));

                  return (
                    <div key={fund.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-xs">{fund.fundName}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                            fund.fundType === 'Restricted'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : fund.fundType === 'Endowment'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {fund.fundType}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-sm">
                          £{balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fund.fundType === 'Restricted' ? 'bg-purple-600' : fund.fundType === 'Endowment' ? 'bg-amber-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Donations */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-3">Charity Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/charity-accounts/${charityId}/donations`}>
                <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-xs font-medium text-slate-700 hover:text-orange-700 transition-all text-center">
                  <HandHeart size={14} className="text-orange-600" /> Record Donation
                </button>
              </Link>
              <Link href={`/charity-accounts/${charityId}/funds`}>
                <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-xs font-medium text-slate-700 hover:text-orange-700 transition-all text-center">
                  <Coins size={14} className="text-orange-600" /> Transfer Funds
                </button>
              </Link>
              <Link href={`/charity-accounts/${charityId}/accounts-production`}>
                <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-xs font-medium text-slate-700 hover:text-orange-700 transition-all text-center">
                  <FileSpreadsheet size={14} className="text-orange-600" /> Trial Balance
                </button>
              </Link>
              <Link href={`/charity-accounts/${charityId}/manage`}>
                <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-xs font-medium text-slate-700 hover:text-orange-700 transition-all text-center">
                  <ShieldCheck size={14} className="text-orange-600" /> Charity Profile
                </button>
              </Link>
            </div>
          </div>

          {/* Recent Donations Feed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Recent Donations</h2>
              <Link href={`/charity-accounts/${charityId}/donations`}>
                <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">View All</button>
              </Link>
            </div>
            <div className="p-4">
              {isLoadingDonations ? (
                <div className="py-6 text-center text-slate-400 text-xs">Loading donations...</div>
              ) : donations.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No donations recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {donations.slice(0, 4).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-none">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{d.donorName}</div>
                        <div className="text-[11px] text-slate-500">{d.donationDate} &bull; {d.fundName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">£{parseFloat(d.amount).toFixed(2)}</div>
                        {d.isGiftAidEligible && (
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Gift Aid</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
