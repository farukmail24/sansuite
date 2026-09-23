import { useState, createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import {
  HeartHandshake, LayoutDashboard, Coins, HandHeart,
  CalendarDays, FileSpreadsheet, Settings, ArrowLeft,
  Building2, Plus, CheckCircle2, ShieldAlert,
  ChevronRight, Calendar, ExternalLink, Landmark
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";

interface CharityWorkspaceContextType {
  charityId: number;
  charity: any;
  isLoadingCharity: boolean;
  periods: any[];
  selectedPeriodId: number | null;
  setSelectedPeriodId: (id: number | null) => void;
  currentPeriod: any;
  refetchDetails: () => void;
}

const CharityWorkspaceContext = createContext<CharityWorkspaceContextType | null>(null);

export function useCharityWorkspace() {
  const context = useContext(CharityWorkspaceContext);
  if (!context) {
    throw new Error("useCharityWorkspace must be used within a CharityWorkspaceLayout");
  }
  return context;
}

interface CharityWorkspaceLayoutProps {
  children: ReactNode;
  activeTab?: string;
}

export default function CharityWorkspaceLayout({ children, activeTab = "dashboard" }: CharityWorkspaceLayoutProps) {
  const [, paramsDirect] = useRoute("/charity-accounts/:charityId");
  const [, paramsSub] = useRoute("/charity-accounts/:charityId/:subpage*");
  const charityIdStr = paramsDirect?.charityId || paramsSub?.charityId || "";
  const charityId = parseInt(charityIdStr);

  const [location] = useLocation();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Fetch Charity Profile & Accounting Periods
  const { data, isLoading, refetch } = useQuery({
    queryKey: [`/api/charity/${charityId}/details`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/details`);
      if (!res.ok) throw new Error("Failed to load charity details");
      return res.json();
    },
    enabled: !!charityId,
  });

  const charity = data?.charity || null;
  const periods = data?.periods || [];
  const currentPeriod = periods.find((p: any) => selectedPeriodId ? p.id === selectedPeriodId : p.isActive) || periods[0] || null;

  // Workspace sub-navigation tabs
  const navTabs = [
    { id: "dashboard", label: "Overview", icon: <LayoutDashboard size={15} />, path: `/charity-accounts/${charityId}/dashboard` },
    { id: "funds", label: "Funds Management", icon: <Coins size={15} />, path: `/charity-accounts/${charityId}/funds` },
    { id: "bookkeeping", label: "Bookkeeping & Bank", icon: <Landmark size={15} />, path: `/charity-accounts/${charityId}/bookkeeping` },
    { id: "donations", label: "Donations & Gift Aid", icon: <HandHeart size={15} />, path: `/charity-accounts/${charityId}/donations` },
    { id: "accounts-production", label: "Accounts Production", icon: <FileSpreadsheet size={15} />, path: `/charity-accounts/${charityId}/accounts-production` },
    { id: "manage", label: "Manage & Profile", icon: <Settings size={15} />, path: `/charity-accounts/${charityId}/manage` },
  ];

  const sidebar = [
    { label: "Charities Hub", icon: <HeartHandshake size={15} />, route: "/charity-accounts" },
    { label: "Overview", icon: <LayoutDashboard size={15} />, route: `/charity-accounts/${charityId}/dashboard` },
    { label: "Funds", icon: <Coins size={15} />, route: `/charity-accounts/${charityId}/funds` },
    { label: "Bookkeeping & Bank", icon: <Landmark size={15} />, route: `/charity-accounts/${charityId}/bookkeeping` },
    { label: "Donations", icon: <HandHeart size={15} />, route: `/charity-accounts/${charityId}/donations` },
    { label: "Accounts Production", icon: <FileSpreadsheet size={15} />, route: `/charity-accounts/${charityId}/accounts-production` },
    { label: "Charity Profile", icon: <Settings size={15} />, route: `/charity-accounts/${charityId}/manage` },
  ];

  return (
    <AppLayout sidebar={sidebar} module="Charity Accounts">
      <CharityWorkspaceContext.Provider
        value={{
          charityId,
          charity,
          isLoadingCharity: isLoading,
          periods,
          selectedPeriodId: currentPeriod?.id || null,
          setSelectedPeriodId,
          currentPeriod,
          refetchDetails: refetch,
        }}
      >
        <div className="bg-slate-50 min-h-screen pb-16">
          {/* Header Banner */}
          <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Link href="/charity-accounts">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      <ArrowLeft size={14} /> Hub
                    </button>
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold shadow-inner">
                      <HeartHandshake size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">
                          {charity ? charity.name : "Charity Workspace"}
                        </h1>
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {charity?.accountingMethod === "Cash" ? "Cash Basis (R&P)" : "Accruals (SORP FRS 102)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-mono">
                        {charity?.charityRegNumber && (
                          <span>Reg No: <strong className="text-slate-700">{charity.charityRegNumber}</strong></span>
                        )}
                        {charity?.companyRegNumber && (
                          <span>Co No: <strong className="text-slate-700">{charity.companyRegNumber}</strong></span>
                        )}
                        <span>{charity?.charityType}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period Selector & Regulator Link */}
                <div className="flex items-center gap-3">
                  {periods.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs border border-slate-200">
                      <Calendar size={13} className="text-slate-500" />
                      <span className="text-slate-500 font-medium">Period:</span>
                      <select
                        className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer text-xs"
                        value={currentPeriod?.id || ""}
                        onChange={(e) => setSelectedPeriodId(parseInt(e.target.value))}
                      >
                        {periods.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.startDate} to {p.endDate} {p.isActive ? "(Active)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {charity?.charityRegNumber && (
                    <a
                      href={`https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/${encodeURIComponent(charity.charityRegNumber)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      title="View on Charity Commission"
                    >
                      <span>Commission</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex space-x-1 overflow-x-auto pt-1 no-scrollbar">
                {navTabs.map((tab) => {
                  const isActive = activeTab === tab.id || location === tab.path;
                  return (
                    <Link key={tab.id} href={tab.path}>
                      <button
                        className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? "border-orange-600 text-orange-600 bg-orange-50/50 font-semibold"
                            : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Body */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {children}
          </main>
        </div>
      </CharityWorkspaceContext.Provider>
    </AppLayout>
  );
}
