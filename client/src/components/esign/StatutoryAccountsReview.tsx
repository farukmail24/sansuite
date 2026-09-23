import React, { useState } from "react";
import {
  Building2, Calendar, FileText, CheckCircle2, ShieldCheck,
  Scale, Printer, ChevronDown, ChevronRight, Download, Info,
  TrendingUp, Landmark, Shield
} from "lucide-react";

export interface StatutoryAccountsData {
  clientId?: number;
  companyName: string;
  registrationNumber?: string;
  companyType?: string;
  periodId?: number | null;
  periodName?: string;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  accountingStandard?: string;
  turnover: number;
  costOfSales: number;
  grossProfit: number;
  adminExpenses: number;
  operatingProfit: number;
  profitBeforeTax: number;
  taxation: number;
  profitAfterTax: number;
  fixedAssets: number;
  currentAssets: number;
  currentLiabilities: number;
  netCurrentAssets: number;
  totalAssetsLessCurrentLiabilities: number;
  longTermLiabilities: number;
  netAssets: number;
  shareCapital: number;
  retainedEarnings: number;
  averageEmployees?: number;
  basisOfPreparation?: string;
  turnoverPolicy?: string;
  lines?: Array<{
    nominalCode: string;
    accountName: string;
    category?: string;
    debit: number;
    credit: number;
  }>;
}

interface StatutoryAccountsReviewProps {
  accounts: StatutoryAccountsData;
  signerName?: string;
  signerRole?: string;
}

export default function StatutoryAccountsReview({
  accounts,
  signerName = "Director",
  signerRole = "Director",
}: StatutoryAccountsReviewProps) {
  const [activeTab, setActiveTab] = useState<"bs" | "pl" | "notes" | "tb">("bs");
  const [showTbSchedule, setShowTbSchedule] = useState(false);

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    if (num < 0) {
      return `(£${Math.abs(num).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string | null, fallback = "N/A") => {
    if (!dateStr) return fallback;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const periodStart = formatDate(accounts.periodStartDate, "01 April 2025");
  const periodEnd = formatDate(accounts.periodEndDate, "31 March 2026");

  const standardLabel = accounts.accountingStandard === "FRS105"
    ? "FRS 105 (Micro-entities Regime)"
    : "FRS 102 Section 1A (Small Entities Regime)";

  const handlePrintPack = () => {
    window.print();
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0">
      {/* Top Banner: Statutory Accounts Approval Scope */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ShieldCheck size={12} /> UK Statutory Filing Approval
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 size={20} className="text-purple-400 shrink-0" />
              {accounts.companyName}
            </h3>
            <p className="text-xs text-slate-300">
              Company No: <strong className="text-white font-mono">{accounts.registrationNumber || "Registered in England & Wales"}</strong> • Period: <strong className="text-white">{periodStart} to {periodEnd}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={handlePrintPack}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Print or Save official PDF of Annual Accounts pack"
            >
              <Printer size={14} /> Print / Save Accounts Pack (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Financial Snapshot KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Turnover / Revenue</span>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
            {formatCurrency(accounts.turnover)}
          </p>
          <span className="text-[10px] text-slate-400">Total Statutory Income</span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Operating Profit / (Loss)</span>
          <p className={`text-base font-bold font-mono ${accounts.operatingProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {formatCurrency(accounts.operatingProfit)}
          </p>
          <span className="text-[10px] text-slate-400">Before Corporation Tax</span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Total Net Assets</span>
          <p className="text-base font-bold text-purple-700 dark:text-purple-400 font-mono">
            {formatCurrency(accounts.netAssets)}
          </p>
          <span className="text-[10px] text-slate-400">Balance Sheet Total</span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Shareholders&apos; Funds</span>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
            {formatCurrency(accounts.netAssets)}
          </p>
          <span className="text-[10px] text-slate-400">Reserves &amp; Capital</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="px-5 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => setActiveTab("bs")}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "bs"
              ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/20"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Scale size={13} /> Balance Sheet (Director Approval)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pl")}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "pl"
              ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/20"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <TrendingUp size={13} /> Profit and Loss Account
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "notes"
              ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/20"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <FileText size={13} /> Policies &amp; Statutory Notes
        </button>

        {accounts.lines && accounts.lines.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("tb")}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "tb"
                ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Landmark size={13} /> Trial Balance Schedule ({accounts.lines.length})
          </button>
        )}
      </div>

      {/* Tab 1: Balance Sheet */}
      {activeTab === "bs" && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wide uppercase">
              {accounts.companyName}
            </h4>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Balance Sheet (Statement of Financial Position)
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              As at {periodEnd} • Company Registration Number: {accounts.registrationNumber || "12345678"}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 text-left">Statutory Balance Sheet Category</th>
                  <th className="py-2.5 px-4 text-right font-mono">Amount (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">Fixed Assets (Tangible)</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(accounts.fixedAssets)}</td>
                </tr>

                <tr className="bg-slate-50/40 dark:bg-slate-850">
                  <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200" colSpan={2}>
                    Current Assets
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 pl-8 text-slate-600 dark:text-slate-400">Cash at bank and in hand, Debtors</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(accounts.currentAssets)}</td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 pl-8 text-slate-600 dark:text-slate-400">Creditors: amounts falling due within one year</td>
                  <td className="py-2 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                    {accounts.currentLiabilities > 0 ? `(${formatCurrency(accounts.currentLiabilities)})` : formatCurrency(0)}
                  </td>
                </tr>
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 font-semibold border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2 px-4 pl-8 text-slate-800 dark:text-slate-200">Net Current Assets / (Liabilities)</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-900 dark:text-slate-100">{formatCurrency(accounts.netCurrentAssets)}</td>
                </tr>

                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">Total Assets Less Current Liabilities</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-slate-100">{formatCurrency(accounts.totalAssetsLessCurrentLiabilities)}</td>
                </tr>

                {accounts.longTermLiabilities > 0 && (
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400">Creditors: amounts falling due after more than one year</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-600 dark:text-rose-400">({formatCurrency(accounts.longTermLiabilities)})</td>
                  </tr>
                )}

                <tr className="bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-900 dark:text-purple-200 text-xs border-t-2 border-b-2 border-purple-300 dark:border-purple-800">
                  <td className="py-3 px-4 uppercase tracking-wider">Total Net Assets / (Liabilities)</td>
                  <td className="py-3 px-4 text-right font-mono text-sm">{formatCurrency(accounts.netAssets)}</td>
                </tr>

                {/* Capital and Reserves */}
                <tr className="bg-slate-50/40 dark:bg-slate-850">
                  <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200" colSpan={2}>
                    Capital and Reserves
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 pl-8 text-slate-600 dark:text-slate-400">Called up share capital</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(accounts.shareCapital)}</td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-4 pl-8 text-slate-600 dark:text-slate-400">Profit and loss account (Retained Reserves)</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(accounts.retainedEarnings)}</td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-4 uppercase tracking-wider">Total Shareholders&apos; Funds</td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm">{formatCurrency(accounts.netAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statutory Exemption Declaration under Companies Act 2006 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <Shield size={14} className="text-purple-600" />
              <span>Statutory Audit Exemption Statement (Companies Act 2006, Section 477)</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
              For the year ending <strong>{periodEnd}</strong>, the company was entitled to exemption from audit under Section 477 of the Companies Act 2006 relating to small companies.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>
                The members have not required the company to obtain an audit of its accounts for the year in question in accordance with Section 476.
              </li>
              <li>
                The directors acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of accounts.
              </li>
              <li>
                These financial statements have been prepared in accordance with the provisions applicable to companies subject to the small companies regime under Part 15 of the Companies Act 2006 and in accordance with {standardLabel}.
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Approved by the Board of Directors on {new Date().toLocaleDateString("en-GB")}
              </span>
              <span className="text-purple-700 dark:text-purple-300 font-semibold">
                Signatory: {signerName} ({signerRole})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Profit & Loss */}
      {activeTab === "pl" && (
        <div className="p-5 sm:p-7 space-y-4">
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              {accounts.companyName}
            </h4>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Profit and Loss Account</p>
            <p className="text-[11px] text-slate-500 font-mono">For the period ended {periodEnd}</p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 text-left">P&amp;L Line Item</th>
                  <th className="py-2.5 px-4 text-right font-mono">Amount (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Turnover</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-900 dark:text-slate-100">{formatCurrency(accounts.turnover)}</td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 pl-8">Cost of Sales &amp; Direct Costs</td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                    {accounts.costOfSales > 0 ? `(${formatCurrency(accounts.costOfSales)})` : formatCurrency(0)}
                  </td>
                </tr>
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 font-bold border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">Gross Profit / (Loss)</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(accounts.grossProfit)}</td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 pl-8">Administrative Expenses &amp; Overheads</td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                    {accounts.adminExpenses > 0 ? `(${formatCurrency(accounts.adminExpenses)})` : formatCurrency(0)}
                  </td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">Operating Profit / (Loss)</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(accounts.operatingProfit)}</td>
                </tr>
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 pl-8">Tax on Profit (Corporation Tax)</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatCurrency(accounts.taxation)}</td>
                </tr>
                <tr className="bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-950 dark:text-purple-200 border-t-2 border-purple-300 dark:border-purple-800">
                  <td className="py-3 px-4 uppercase tracking-wider">Profit / (Loss) for the Financial Year</td>
                  <td className="py-3 px-4 text-right font-mono text-sm">{formatCurrency(accounts.profitAfterTax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Notes & Policies */}
      {activeTab === "notes" && (
        <div className="p-5 sm:p-7 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Info size={14} className="text-purple-600" />
              1. Statutory Accounting Framework &amp; Basis of Preparation
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {accounts.basisOfPreparation ||
                `These financial statements have been prepared in accordance with the provisions applicable to companies subject to the small companies regime under the UK Companies Act 2006 and in accordance with ${standardLabel}. The financial statements are prepared in sterling, which is the functional currency of the entity.`}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Info size={14} className="text-purple-600" />
              2. Turnover Recognition Policy
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {accounts.turnoverPolicy ||
                "Turnover is measured at the fair value of the consideration received or receivable, excluding discounts, rebates, value added tax and other sales taxes. Revenue from the sale of goods and rendering of services is recognized when the significant risks and rewards of ownership are transferred."}
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Info size={14} className="text-purple-600" />
              3. Employees Disclosure (Section 411)
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              The average number of persons employed by the company (including directors) during the financial period was <strong>{accounts.averageEmployees || 1}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Trial Balance Schedule */}
      {activeTab === "tb" && accounts.lines && (
        <div className="p-5 sm:p-7 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Recorded Nominal Ledger &amp; Trial Balance Schedule
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {accounts.lines.length} Line Items
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs max-h-96 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left">Code</th>
                  <th className="py-2 px-3 text-left">Account Name</th>
                  <th className="py-2 px-3 text-left">Category</th>
                  <th className="py-2 px-3 text-right">Debit (£)</th>
                  <th className="py-2 px-3 text-right">Credit (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {accounts.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-1.5 px-3 font-bold text-purple-700 dark:text-purple-400">{line.nominalCode}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-800 dark:text-slate-200">{line.accountName}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-500 text-[10px]">{line.category || "General"}</td>
                    <td className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-200">{line.debit > 0 ? line.debit.toFixed(2) : "0.00"}</td>
                    <td className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-200">{line.credit > 0 ? line.credit.toFixed(2) : "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Prompt before Signing */}
      <div className="bg-purple-50/60 dark:bg-purple-950/20 border-t border-purple-100 dark:border-purple-900/40 p-4 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
          <CheckCircle2 size={15} className="text-purple-600 shrink-0" />
          <span>
            Please review the balance sheet and statutory statements above thoroughly before creating your signature below.
          </span>
        </div>
        <button
          type="button"
          onClick={handlePrintPack}
          className="text-purple-700 dark:text-purple-300 font-bold hover:underline flex items-center gap-1 shrink-0 cursor-pointer no-print"
        >
          <Printer size={12} /> Print Full Pack
        </button>
      </div>
    </div>
  );
}
