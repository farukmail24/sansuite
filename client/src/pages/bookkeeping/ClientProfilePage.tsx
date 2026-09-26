import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import {
  FileText, ShoppingCart, Wallet, Users, BarChart2,
  Mail, Phone, MapPin, Building2, ExternalLink, Plus,
  TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle,
  CheckCircle2, ArrowRight, RefreshCw, Landmark, ArrowUpRight,
  Receipt, ArrowDownLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area
} from "recharts";
import { getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function ClientProfilePage() {
  const [match, params] = useRoute("/bookkeeping/:id");
  const [, navigate] = useLocation();
  const clientId = params?.id;

  // Guard: only render for numeric IDs
  const isNumericId = !!clientId && /^\d+$/.test(clientId);

  const [activeChartTab, setActiveChartTab] = useState<"debtorsCreditors" | "salesPurchases">("debtorsCreditors");
  const [activeAgeingTab, setActiveAgeingTab] = useState<"debtors" | "creditors">("debtors");

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isNumericId,
  });

  const client = clients.find((c: any) => String(c.id) === clientId);

  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: [`/api/bookkeeping/client/${clientId}/dashboard-analytics`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/client/${clientId}/dashboard-analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isNumericId,
  });

  if (!isNumericId) return null;
  if (!clientId) return <ClientGuard featureTitle="Client Dashboard" />;

  if (isLoadingClients || isLoadingAnalytics) {
    return (
      <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
        <div className="p-8 flex items-center justify-center space-x-3 text-slate-500">
          <RefreshCw size={20} className="animate-spin text-purple-600" />
          <span className="text-sm font-medium">Loading live client dashboard...</span>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
        <div className="p-8 text-slate-500 text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-amber-500" />
          <p className="text-sm">Client not found. Please return to the client list.</p>
          <Link href="/bookkeeping" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold inline-block">
            View All Clients
          </Link>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (val: number | string | undefined) => {
    const num = typeof val === "string" ? parseFloat(val) : (val || 0);
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
  };

  const turnover = analytics?.turnover || {
    salesCurrentMonth: 0,
    salesCurrentMonthCount: 0,
    salesPrevMonth: 0,
    salesPrevMonthCount: 0,
    salesVariancePct: 0,
    purchasesCurrentMonth: 0,
    purchasesCurrentMonthCount: 0,
    purchasesPrevMonth: 0,
    purchasesPrevMonthCount: 0,
    purchasesVariancePct: 0,
  };

  const debtorsAgeing = analytics?.debtorsAgeing || {
    current: 0,
    bucket1_30: 0,
    bucket31_60: 0,
    bucket61_90: 0,
    bucket91_120: 0,
    bucketOver120: 0,
    totalOverdue: 0,
    totalOutstanding: 0,
    count: 0,
  };

  const creditorsAgeing = analytics?.creditorsAgeing || {
    current: 0,
    bucket1_30: 0,
    bucket31_60: 0,
    bucket61_90: 0,
    bucket91_120: 0,
    bucketOver120: 0,
    totalOverdue: 0,
    totalOutstanding: 0,
    count: 0,
  };

  const trailing6Months = analytics?.trailing6Months || [];
  const bankAccountsList = analytics?.bankSummary || [];
  const vatSummary = analytics?.vatSummary || {};
  const totalCash = analytics?.totalCashPosition || 0;

  const currentAgeing = activeAgeingTab === "debtors" ? debtorsAgeing : creditorsAgeing;

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Header & Fast Action Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link href="/bookkeeping" className="hover:text-purple-600 transition-colors font-medium">
                  Bookkeeping
                </Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{client.clientName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {client.clientType || "Company"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 size={22} className="text-purple-600 shrink-0" />
                <span>{client.clientName}</span>
              </h1>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                {client.clientCode && <span>Code: <strong className="font-mono text-slate-700 dark:text-slate-300">{client.clientCode}</strong></span>}
                {client.registrationNumber && (
                  <span>
                    CRN: <strong className="font-mono text-slate-700 dark:text-slate-300">{client.registrationNumber}</strong>
                  </span>
                )}
                {client.utrNumber && (
                  <span>
                    UTR: <strong className="font-mono text-slate-700 dark:text-slate-300">{client.utrNumber}</strong>
                  </span>
                )}
              </p>
            </div>

            {/* Quick Action Buttons (Capium Direct Shortcuts) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refetchAnalytics()}
                className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="Refresh live metrics"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookkeeping/${clientId}/invoices/new`)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={14} /> +Sales Invoice
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Plus size={14} /> +Purchase Bill
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookkeeping/${clientId}/quotes`)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Receipt size={14} /> +Quote
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookkeeping/${clientId}/contacts?type=Customer`)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Users size={14} /> Customers
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookkeeping/${clientId}/bank`)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Wallet size={14} /> Bank
              </button>
            </div>
          </div>
        </div>

        {/* Turnover Summary KPI Grid (Capium Parity: Current vs Prior Month & Outstanding) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Monthly Sales Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Sales Turnover (MTD)</span>
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 block">
                {formatCurrency(turnover.salesCurrentMonth)}
              </span>
              <p className="text-[11px] text-slate-400">
                {turnover.salesCurrentMonthCount} invoice(s) this month
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Prior Month: <strong>{formatCurrency(turnover.salesPrevMonth)}</strong></span>
              <span className={`font-semibold inline-flex items-center gap-0.5 ${turnover.salesVariancePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {turnover.salesVariancePct >= 0 ? "+" : ""}{turnover.salesVariancePct}%
              </span>
            </div>
          </div>

          {/* 2. Monthly Purchases Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Purchases &amp; Expenses (MTD)</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <ShoppingCart size={14} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 block">
                {formatCurrency(turnover.purchasesCurrentMonth)}
              </span>
              <p className="text-[11px] text-slate-400">
                {turnover.purchasesCurrentMonthCount} bill(s) this month
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Prior Month: <strong>{formatCurrency(turnover.purchasesPrevMonth)}</strong></span>
              <span className={`font-semibold inline-flex items-center gap-0.5 ${turnover.purchasesVariancePct <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {turnover.purchasesVariancePct >= 0 ? "+" : ""}{turnover.purchasesVariancePct}%
              </span>
            </div>
          </div>

          {/* 3. Debtors vs Creditors Outstanding Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Accounts Receivable (Debtors)</span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                <ArrowDownLeft size={14} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 block">
                {formatCurrency(debtorsAgeing.totalOutstanding)}
              </span>
              <p className="text-[11px] text-slate-400">
                {debtorsAgeing.count} unpaid invoice(s) • {formatCurrency(debtorsAgeing.totalOverdue)} overdue
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Creditors Payable:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(creditorsAgeing.totalOutstanding)}
              </span>
            </div>
          </div>

          {/* 4. Cash Position & VAT Liability Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Cash Position &amp; VAT</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Wallet size={14} />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={`text-xl sm:text-2xl font-bold block ${totalCash >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>
                {formatCurrency(totalCash)}
              </span>
              <p className="text-[11px] text-slate-400">
                Across {bankAccountsList.length} bank account(s)
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Est. Net VAT:</span>
              <span className="font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(vatSummary.netVatLiability)}
              </span>
            </div>
          </div>
        </div>

        {/* 6-Month Trailing Comparison Analytics Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 size={16} className="text-purple-600" />
                <span>6-Month Trailing Financial Breakdown</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Month-by-month comparative analysis of debtors, creditors, and trade turnover.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveChartTab("debtorsCreditors")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeChartTab === "debtorsCreditors"
                    ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Debtors vs Creditors
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("salesPurchases")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeChartTab === "salesPurchases"
                    ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Sales vs Purchases Trend
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "debtorsCreditors" ? (
                <BarChart data={trailing6Months} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), ""]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="debtors" name="Debtors (Unpaid Sales)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="creditors" name="Creditors (Unpaid Bills)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={trailing6Months} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), ""]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Area type="monotone" dataKey="sales" name="Sales Turnover" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="purchases" name="Purchases / Bills" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#purchasesGrad)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* UK Standard 5-Bucket Invoice Ageing Summary (Capium Parity Article 9000150604) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span>UK Standard 5-Bucket Invoice Ageing Summary</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Real-time debt aging analysis (Current, 1-30, 31-60, 61-90, 91-120, and &gt;120 days overdue).
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveAgeingTab("debtors")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeAgeingTab === "debtors"
                    ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Aged Debtors ({debtorsAgeing.count})
              </button>
              <button
                type="button"
                onClick={() => setActiveAgeingTab("creditors")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeAgeingTab === "creditors"
                    ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Aged Creditors ({creditorsAgeing.count})
              </button>
            </div>
          </div>

          {/* Ageing 5-Buckets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current</span>
              <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 block">
                {formatCurrency(currentAgeing.current)}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Not overdue</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block tracking-wider">1 - 30 Days</span>
              <span className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 block">
                {formatCurrency(currentAgeing.bucket1_30)}
              </span>
              <span className="text-[10px] text-slate-400">Early overdue</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-300/80 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block tracking-wider">31 - 60 Days</span>
              <span className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 block">
                {formatCurrency(currentAgeing.bucket31_60)}
              </span>
              <span className="text-[10px] text-slate-400">Follow-up due</span>
            </div>

            <div className="p-3.5 rounded-xl border border-orange-300/80 dark:border-orange-800/40 bg-orange-50/60 dark:bg-orange-950/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-300 block tracking-wider">61 - 90 Days</span>
              <span className="text-sm sm:text-base font-bold text-orange-950 dark:text-orange-100 block">
                {formatCurrency(currentAgeing.bucket61_90)}
              </span>
              <span className="text-[10px] text-orange-600 font-medium">Overdue warning</span>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block tracking-wider">91 - 120 Days</span>
              <span className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200 block">
                {formatCurrency(currentAgeing.bucket91_120)}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Critical overdue</span>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block tracking-wider">&gt; 120 Days</span>
              <span className="text-sm sm:text-base font-bold text-rose-950 dark:text-rose-100 block">
                {formatCurrency(currentAgeing.bucketOver120)}
              </span>
              <span className="text-[10px] text-rose-700 font-bold">Severe overdue</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Total Outstanding {activeAgeingTab === "debtors" ? "Debtors" : "Creditors"}:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(currentAgeing.totalOutstanding)} (Overdue: {formatCurrency(currentAgeing.totalOverdue)})
            </span>
          </div>
        </div>

        {/* Bank Accounts & Cash Strip (Capium Parity Article 9000150604) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Landmark size={16} className="text-purple-600" />
                <span>Bank Accounts &amp; Reconciliation Status ({bankAccountsList.length})</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Real-time statement vs computed book balances and unreconciled feed transactions.
              </p>
            </div>

            <Link
              href={`/bookkeeping/${clientId}/bank`}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Manage Bank Accounts</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {bankAccountsList.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <Landmark size={28} className="mx-auto text-slate-400" />
              <p className="text-xs text-slate-500">No bank accounts registered for this client yet.</p>
              <Link
                href={`/bookkeeping/${clientId}/bank`}
                className="px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Bank Account
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccountsList.map((acc: any) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{acc.bankName}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {acc.accountType} • Sort: {acc.sortCode} • Acc: {acc.accountNumber}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {acc.currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Book Balance</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {formatCurrency(acc.computedBookBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Statement</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                        {formatCurrency(acc.statementBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${acc.unreconciledCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {acc.unreconciledCount > 0 ? (
                        <>
                          <AlertCircle size={12} />
                          <span>{acc.unreconciledCount} Unreconciled</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Fully Reconciled</span>
                        </>
                      )}
                    </span>

                    <Link
                      href={`/bookkeeping/${clientId}/bank/${acc.id}/reconcile`}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Reconcile</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Profile Information Drawer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              <span>Statutory Entity &amp; Contact Records</span>
            </h2>
            <Link
              href={`/practice/clients/${clientId}`}
              className="text-xs text-purple-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Edit Client Profile</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {client.email && (
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Primary Email</span>
                <a href={`mailto:${client.email}`} className="text-purple-600 hover:underline font-semibold flex items-center gap-1.5 truncate">
                  <Mail size={13} className="shrink-0" />
                  <span className="truncate">{client.email}</span>
                </a>
              </div>
            )}

            {client.phone && (
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Telephone</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                  <Phone size={13} className="shrink-0 text-slate-400" />
                  <span>{client.phone}</span>
                </span>
              </div>
            )}

            {client.registrationNumber && (
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Companies House Gateway</span>
                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-700 dark:text-purple-300 font-mono font-bold hover:underline flex items-center gap-1"
                >
                  <span>{client.registrationNumber}</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            )}

            {client.address && (
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Registered Office</span>
                <span className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-snug">
                  <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                  <span className="truncate">{client.address}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

