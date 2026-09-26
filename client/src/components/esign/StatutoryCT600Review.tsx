import React, { useState } from "react";
import {
  Building2, Calendar, FileText, CheckCircle2, ShieldCheck,
  Calculator, Printer, ChevronDown, ChevronRight, Download, Info,
  TrendingUp, Landmark, Shield, AlertCircle
} from "lucide-react";

export interface StatutoryCT600Data {
  returnId?: number;
  clientId?: number;
  companyName: string;
  companyNumber?: string;
  utrNumber?: string;
  taxYear?: string;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  turnover: number;
  netAccountingProfit: number;
  disallowableExpenses: number;
  depreciationAddBack: number;
  capitalAllowancesClaimed: number;
  tradingLossesBroughtForward: number;
  tradingLossesRelievedCurrentYear: number;
  taxableTradingProfit: number;
  nonTradingIncome: number;
  qualifyingDonations: number;
  profitsChargeableToCt: number;
  ctRatePercentage: number;
  marginalReliefAmount: number;
  corporationTaxPayable: number;
  taxDeductedAtSource: number;
  netTaxDue: number;
  paymentDueDate?: string | null;
  filingDueDate?: string | null;
  status?: string;
}

interface StatutoryCT600ReviewProps {
  ct600: StatutoryCT600Data;
  signerName?: string;
  signerRole?: string;
}

export default function StatutoryCT600Review({
  ct600,
  signerName = "Director",
  signerRole = "Director",
}: StatutoryCT600ReviewProps) {
  const [activeTab, setActiveTab] = useState<"computation" | "boxes" | "allowances" | "declaration">("computation");

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

  const periodStart = formatDate(ct600.periodStartDate, "01 June 2026");
  const periodEnd = formatDate(ct600.periodEndDate, "31 May 2027");
  const paymentDue = formatDate(ct600.paymentDueDate, "01 March 2028");
  const filingDue = formatDate(ct600.filingDueDate, "31 May 2028");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0">
      {/* Top Banner: Statutory CT600 Tax Approval Scope */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ShieldCheck size={12} /> HMRC Form CT600 Tax Return &amp; Computation Approval
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 size={20} className="text-purple-400 shrink-0" />
              {ct600.companyName}
            </h3>
            <p className="text-xs text-slate-300">
              Company No: <strong className="text-white font-mono">{ct600.companyNumber || "England & Wales"}</strong> • UTR: <strong className="text-white font-mono">{ct600.utrNumber || "Verified"}</strong> • Period: <strong className="text-white">{periodStart} to {periodEnd}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Print or Save official PDF of Corporation Tax Computation pack"
            >
              <Printer size={14} /> Print / Save Tax Computation (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip: Core Tax Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 block">Net Tax Due to HMRC</span>
          <span className={`text-base sm:text-lg font-bold block ${ct600.netTaxDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {formatCurrency(ct600.netTaxDue)}
          </span>
          <span className="text-[10px] text-slate-400">
            {ct600.netTaxDue > 0 ? "Tax Payable to HMRC" : "Nil Liability (£0.00)"}
          </span>
        </div>

        <div className="p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 block">Profits Chargeable to CT</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 block">
            {formatCurrency(ct600.profitsChargeableToCt)}
          </span>
          <span className="text-[10px] text-slate-400">Taxable Trading Profit</span>
        </div>

        <div className="p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 block">Corporation Tax Rate</span>
          <span className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-300 block">
            {Number(ct600.ctRatePercentage || 19).toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-400">
            {Number(ct600.ctRatePercentage || 19) <= 19 ? "Small Profits Rate (≤£50k)" : "Standard CT Rate"}
          </span>
        </div>

        <div className="p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 block">HMRC Payment Due Date</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 block">
            {paymentDue}
          </span>
          <span className="text-[10px] text-slate-400">9 months &amp; 1 day rule</span>
        </div>
      </div>

      {/* Tabs Navigation (No horizontal scrollbar) */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 pt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 no-print">
        <button
          type="button"
          onClick={() => setActiveTab("computation")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "computation"
              ? "border-purple-600 text-purple-700 dark:text-purple-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calculator size={13} />
          <span>1. Tax Computation Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("boxes")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "boxes"
              ? "border-purple-600 text-purple-700 dark:text-purple-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText size={13} />
          <span>2. HMRC Form CT600 (Boxes)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("allowances")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "allowances"
              ? "border-purple-600 text-purple-700 dark:text-purple-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <TrendingUp size={13} />
          <span>3. Capital Allowances</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("declaration")}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === "declaration"
              ? "border-purple-600 text-purple-700 dark:text-purple-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Shield size={13} />
          <span>4. Director Declaration</span>
        </button>
      </div>

      {/* Tab 1: Tax Computation Schedule */}
      {activeTab === "computation" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Corporation Tax Computation Breakdown
              </h4>
              <p className="text-[11px] text-slate-500">
                Statutory reconciliation from accounting profit to profits chargeable to Corporation Tax.
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Tax Year: {ct600.taxYear || "2026/2027"}
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 text-left">Computation Line Item</th>
                  <th className="py-2.5 px-4 text-center">Tax Treatment</th>
                  <th className="py-2.5 px-4 text-right">Amount (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                <tr>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-semibold font-sans">
                    Turnover / Total Trading Receipts
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-sans text-[11px]">Gross Revenue</td>
                  <td className="py-2.5 px-4 text-right font-bold">{formatCurrency(ct600.turnover)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-semibold font-sans">
                    Net Profit / (Loss) per Accounts
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-sans text-[11px]">Before Tax</td>
                  <td className="py-2.5 px-4 text-right">{formatCurrency(ct600.netAccountingProfit)}</td>
                </tr>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                    Add: Disallowable Expenses (Client Entertainment, Fines, etc.)
                  </td>
                  <td className="py-2.5 px-4 text-center text-rose-600 font-sans text-[11px]">+ Add-back</td>
                  <td className="py-2.5 px-4 text-right text-rose-600">{formatCurrency(ct600.disallowableExpenses)}</td>
                </tr>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                    Add: Depreciation Add-Back
                  </td>
                  <td className="py-2.5 px-4 text-center text-rose-600 font-sans text-[11px]">+ Add-back</td>
                  <td className="py-2.5 px-4 text-right text-rose-600">{formatCurrency(ct600.depreciationAddBack)}</td>
                </tr>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                    Less: Capital Allowances Claimed (AIA, WDA)
                  </td>
                  <td className="py-2.5 px-4 text-center text-emerald-600 font-sans text-[11px]">- Deduction</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">({formatCurrency(ct600.capitalAllowancesClaimed)})</td>
                </tr>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100/60 dark:bg-slate-800/60">
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-sans">
                    Taxable Trading Profit / (Loss)
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-500 font-sans text-[11px]">Subtotal</td>
                  <td className="py-2.5 px-4 text-right">{formatCurrency(ct600.taxableTradingProfit)}</td>
                </tr>
                {ct600.tradingLossesRelievedCurrentYear > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                      Less: Trading Losses Brought Forward Relieved
                    </td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-sans text-[11px]">- Loss Relief</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600">({formatCurrency(ct600.tradingLossesRelievedCurrentYear)})</td>
                  </tr>
                )}
                <tr className="bg-purple-50/40 dark:bg-purple-950/20 font-bold text-purple-950 dark:text-purple-200">
                  <td className="py-3 px-4 font-sans text-xs">
                    Profits Chargeable to Corporation Tax
                  </td>
                  <td className="py-3 px-4 text-center text-[11px] font-sans">Chargeable Amount</td>
                  <td className="py-3 px-4 text-right text-sm">{formatCurrency(ct600.profitsChargeableToCt)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                    Corporation Tax Charged at {Number(ct600.ctRatePercentage || 19).toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-sans text-[11px]">Gross Tax</td>
                  <td className="py-2.5 px-4 text-right">{formatCurrency(ct600.corporationTaxPayable)}</td>
                </tr>
                {ct600.marginalReliefAmount > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                      Less: Marginal Relief
                    </td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-sans text-[11px]">- Relief</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600">({formatCurrency(ct600.marginalReliefAmount)})</td>
                  </tr>
                )}
                <tr className="bg-purple-100/70 dark:bg-purple-900/40 font-bold text-slate-900 dark:text-white border-t-2 border-purple-300 dark:border-purple-700">
                  <td className="py-3.5 px-4 font-sans text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600" />
                    <span>Net Corporation Tax Due and Payable to HMRC</span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-[11px] font-sans">Final Liability</td>
                  <td className="py-3.5 px-4 text-right text-base text-purple-950 dark:text-purple-100">
                    {formatCurrency(ct600.netTaxDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: HMRC CT600 Form (Statutory Boxes) */}
      {activeTab === "boxes" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                HMRC Form CT600 Box-by-Box Mapping
              </h4>
              <p className="text-[11px] text-slate-500">
                Standard electronic filing tags for direct submission via HMRC Government Gateway.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">HMRC Specification 2026</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { box: "Box 1", label: "Unique Taxpayer Reference (UTR)", value: ct600.utrNumber || "Verified" },
              { box: "Box 3", label: "Accounting Period Start", value: periodStart },
              { box: "Box 4", label: "Accounting Period End", value: periodEnd },
              { box: "Box 145", label: "Turnover from Trade", value: formatCurrency(ct600.turnover) },
              { box: "Box 155", label: "Trading Profit / (Loss)", value: formatCurrency(ct600.taxableTradingProfit) },
              { box: "Box 175", label: "Capital Allowances Claimed", value: formatCurrency(ct600.capitalAllowancesClaimed) },
              { box: "Box 200", label: "Profits Chargeable to CT", value: formatCurrency(ct600.profitsChargeableToCt) },
              { box: "Box 300", label: "Corporation Tax Chargeable", value: formatCurrency(ct600.corporationTaxPayable) },
              { box: "Box 475", label: "Net Corporation Tax Payable", value: formatCurrency(ct600.netTaxDue) },
              { box: "Box 525", label: "Statutory Payment Due Date", value: paymentDue },
            ].map((b, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    {b.box}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block mt-1 font-medium">
                    {b.label}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Capital Allowances */}
      {activeTab === "allowances" && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Capital Allowances Claim Schedule
              </h4>
              <p className="text-[11px] text-slate-500">
                UK plant and machinery capital allowances replacing non-deductible depreciation.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Annual Investment Allowance (AIA - 100% First Year Relief)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatCurrency(ct600.capitalAllowancesClaimed)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Main Rate Pool (18% Writing Down Allowance)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">£0.00</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Special Rate Pool (6% Writing Down Allowance)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">£0.00</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 font-bold text-purple-700 dark:text-purple-300">
              <span>Total Capital Allowances Claimed against Trading Profit</span>
              <span className="font-mono text-sm">{formatCurrency(ct600.capitalAllowancesClaimed)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Director Declaration */}
      {activeTab === "declaration" && (
        <div className="p-6 space-y-4">
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-sm">
              <ShieldCheck size={18} className="text-purple-600" />
              <span>Statutory Declaration under Taxes Management Act 1970 &amp; Companies Act 2006</span>
            </div>
            <p>
              I declare that the information given in this return (Form CT600) and any accompanying schedules and statutory computations is correct and complete to the best of my knowledge and belief.
            </p>
            <p>
              I understand that submitting false statements or failing to declare full profits can lead to financial penalties, statutory interest, and prosecution under United Kingdom tax law.
            </p>
            <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between text-[11px] text-purple-900 dark:text-purple-300 font-mono">
              <span>Approved by Nominated Director: <strong>{signerName}</strong></span>
              <span>Capacity: <strong>{signerRole}</strong></span>
              <span>Governing Law: England &amp; Wales (HMRC)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
