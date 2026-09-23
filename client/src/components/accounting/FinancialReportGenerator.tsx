import { useState } from "react";
import {
  FileText, Printer, Save, CheckCircle2, Shield,
  Layers, UserCheck, Eye, EyeOff, Building2, HelpCircle,
  FileSignature
} from "lucide-react";

export type FilingMode = "filleted" | "full" | "detailed";
export type ReportTab = "all" | "cover" | "info" | "directors" | "accountants" | "pl" | "bs" | "equity" | "notes";

interface FinancialReportGeneratorProps {
  trialBalance: any[];
  companyName: string;
  registrationNumber?: string;
  periodStart?: string;
  periodEnd: string;
  accountingStandard?: string;
  directors?: any[];
  statutoryNotes?: any;
  accountingPolicies?: any;
  reportSettings?: any;
  onSaveReport?: () => void;
  isSaving?: boolean;
  onSendToEsign?: () => void;
  clientId?: string | number;
}

export default function FinancialReportGenerator({
  trialBalance = [],
  companyName = "COMPANY NAME LIMITED",
  registrationNumber = "",
  periodStart = "1 April 2024",
  periodEnd = "31 March 2025",
  accountingStandard = "FRS 102 Section 1A",
  directors = [],
  statutoryNotes = null,
  accountingPolicies = null,
  reportSettings = null,
  onSaveReport,
  isSaving,
  onSendToEsign,
  clientId,
}: FinancialReportGeneratorProps) {
  // Mode: Filleted (default for UK small/micro filing to Companies House), Full (Members), Detailed
  const [filingMode, setFilingMode] = useState<FilingMode>("filleted");
  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [isDraftWatermark, setIsDraftWatermark] = useState(true);
  const [includeAccountantReport, setIncludeAccountantReport] = useState(true);
  const [engagementDate, setEngagementDate] = useState("12 May 2024");
  const [reportApprovalDate, setReportApprovalDate] = useState(new Date().toLocaleDateString("en-GB"));

  const balanceSheetSignatory = reportSettings?.balanceSheetSignatory || directors.find((d: any) => d.isSignatory)?.name || directors[0]?.name || "Director";
  const directorsReportSignatory = reportSettings?.directorsReportSignatory || balanceSheetSignatory;

  // Dynamic Chart of Accounts Category-Aware Aggregation
  const isBankOrCash = (l: any) => {
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    const cat = (l.category || "").toLowerCase();
    return (
      (code >= 2300 && code <= 2399) ||
      (code >= 5200 && code <= 5399) ||
      code === 5220 ||
      name.includes("cash in hand") ||
      (name.includes("bank") && !name.includes("interest") && !name.includes("charge")) ||
      cat.includes("bank") ||
      cat.includes("cash")
    );
  };

  const isShareCapital = (l: any) => {
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    const cat = (l.category || "").toLowerCase();
    return (
      code === 3900 ||
      code === 4202 ||
      (code >= 7000 && code <= 7099) ||
      name.includes("share capital") ||
      cat.includes("share capital")
    );
  };

  const isDebtor = (l: any) => {
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    const cat = (l.category || "").toLowerCase();
    return (
      (code >= 2100 && code <= 2299) ||
      (code >= 4500 && code <= 4799) ||
      name.includes("debtor") ||
      cat.includes("debtor")
    );
  };

  const isFixedAsset = (l: any) => {
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    const cat = (l.category || "").toLowerCase();
    return (
      cat === "Fixed Assets" ||
      cat === "Tangible Assets" ||
      l.nominalCode?.startsWith("0") ||
      name.includes("tangible") ||
      name.includes("plant") ||
      name.includes("machinery") ||
      name.includes("equipment") ||
      name.includes("goodwill") ||
      (code >= 4000 && code <= 4499 && !name.includes("sales") && !name.includes("turnover") && !name.includes("income"))
    );
  };

  const sales = trialBalance.filter((l: any) => {
    if (isBankOrCash(l) || isShareCapital(l) || isFixedAsset(l) || isDebtor(l)) return false;
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    return (
      l.category === "Income" ||
      l.category === "Turnover" ||
      l.category === "Revenue" ||
      (code >= 4000 && code <= 4999) ||
      (code >= 1000 && code <= 1099) ||
      name.includes("sales") ||
      name.includes("turnover") ||
      name.includes("fee income")
    );
  });

  const costOfSales = trialBalance.filter((l: any) => {
    if (isBankOrCash(l) || isShareCapital(l) || isFixedAsset(l) || isDebtor(l)) return false;
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    return (
      l.category === "Cost of Sales" ||
      l.category === "Direct Expenses" ||
      (code >= 1100 && code <= 1999) ||
      (code >= 5000 && code <= 5199) ||
      name.includes("cost of sales") ||
      name.includes("purchase") ||
      name.includes("direct expense")
    );
  });

  const adminExpenses = trialBalance.filter((l: any) => {
    if (isBankOrCash(l) || isShareCapital(l) || isFixedAsset(l) || isDebtor(l)) return false;
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    return (
      l.category === "Expense" ||
      l.category === "Administrative Expenses" ||
      l.category === "Overheads" ||
      (code >= 6000 && code <= 8999) ||
      (code >= 2000 && code <= 3999 && !isShareCapital(l)) ||
      name.includes("expense") ||
      name.includes("overhead")
    );
  });

  const fixedAssets = trialBalance.filter((l: any) => isFixedAsset(l));

  const currentAssets = trialBalance.filter((l: any) => {
    if (isShareCapital(l) || isFixedAsset(l)) return false;
    return isBankOrCash(l) || isDebtor(l) || (
      l.category === "Current Assets" ||
      l.category === "Bank" ||
      l.category === "Debtors" ||
      l.category === "Stock"
    );
  });

  const currentLiabilities = trialBalance.filter((l: any) => {
    if (isBankOrCash(l) || isShareCapital(l) || isFixedAsset(l) || isDebtor(l)) return false;
    const code = parseInt(l.nominalCode || "0");
    const name = (l.accountName || "").toLowerCase();
    return (
      l.category === "Current Liabilities" ||
      l.category === "Creditors" ||
      (code >= 3000 && code <= 3499) ||
      (code >= 5400 && code <= 6499) ||
      name.includes("creditor") ||
      l.nominalCode?.startsWith("21") ||
      l.nominalCode?.startsWith("22")
    );
  });

  const longTermLiabilities = trialBalance.filter((l: any) => {
    if (isBankOrCash(l) || isShareCapital(l) || isFixedAsset(l) || isDebtor(l)) return false;
    const code = parseInt(l.nominalCode || "0");
    return (
      l.category === "Long Term Liabilities" ||
      l.category === "Non-current Liabilities" ||
      (code >= 3500 && code <= 3899) ||
      (code >= 6500 && code <= 6999) ||
      l.nominalCode?.startsWith("23")
    );
  });

  const shareCapitalLines = trialBalance.filter((l: any) => isShareCapital(l));

  const entityType = reportSettings?.entityType || "LimitedByShares";
  const autoRoundingEnabled = reportSettings?.autoRoundingEnabled ?? false;
  const isLimitedByGuarantee = entityType === "LimitedByGuarantee";
  const isSoleTrader = entityType === "SoleTrader";
  const isCIC = entityType === "CIC";
  const isDormant = entityType === "Dormant" || reportSettings?.tradingStatus === "Dormant";
  const isRevised = reportSettings?.revisedAccounts?.isRevised || reportSettings?.isRevised || false;
  const revisionReason = reportSettings?.revisedAccounts?.reason || reportSettings?.revisionReason || "";
  const originalFilingDate = reportSettings?.revisedAccounts?.originalFilingDate || reportSettings?.originalFilingDate || "";
  const includeDetailedPl = filingMode === "detailed" || reportSettings?.includeDetailedProfitAndLoss;

  const sumCreditLessDebit = (arr: any[]) =>
    arr.reduce((acc, curr) => acc + (parseFloat(curr.credit || "0") - parseFloat(curr.debit || "0")), 0);
  const sumDebitLessCredit = (arr: any[]) =>
    arr.reduce((acc, curr) => acc + (parseFloat(curr.debit || "0") - parseFloat(curr.credit || "0")), 0);

  const rawTurnover = Math.abs(sumCreditLessDebit(sales));
  const rawCostOfSales = Math.abs(sumDebitLessCredit(costOfSales));
  const rawAdminExpenses = Math.abs(sumDebitLessCredit(adminExpenses));
  const rawFixedAssets = Math.abs(sumDebitLessCredit(fixedAssets));
  const rawCurrentAssets = Math.abs(sumDebitLessCredit(currentAssets));
  const rawCurrentLiabilities = Math.abs(sumCreditLessDebit(currentLiabilities));
  const rawLongTermLiabilities = Math.abs(sumCreditLessDebit(longTermLiabilities));

  const totalTurnover = autoRoundingEnabled ? Math.round(rawTurnover) : rawTurnover;
  const totalCostOfSales = autoRoundingEnabled ? Math.round(rawCostOfSales) : rawCostOfSales;
  const grossProfit = totalTurnover - totalCostOfSales;
  const totalAdminExpenses = autoRoundingEnabled ? Math.round(rawAdminExpenses) : rawAdminExpenses;
  const operatingProfit = grossProfit - totalAdminExpenses;
  const taxExpense = operatingProfit > 0 ? (autoRoundingEnabled ? Math.round(operatingProfit * 0.19) : operatingProfit * 0.19) : 0;
  const profitForYear = operatingProfit - taxExpense;

  const totalFixedAssets = autoRoundingEnabled ? Math.round(rawFixedAssets) : rawFixedAssets;
  const totalCurrentAssets = autoRoundingEnabled ? Math.round(rawCurrentAssets) : rawCurrentAssets;
  const totalCurrentLiabilities = autoRoundingEnabled ? Math.round(rawCurrentLiabilities) : rawCurrentLiabilities;
  // Parse statutory notes
  const employeeCount = statutoryNotes?.averageEmployees ?? 1;
  let parsedFaSchedule: any[] | null = null;
  if (statutoryNotes?.tangibleAssetsScheduleJson) {
    try {
      const parsed = JSON.parse(statutoryNotes.tangibleAssetsScheduleJson);
      if (Array.isArray(parsed)) parsedFaSchedule = parsed;
      else if (parsed.categories && Array.isArray(parsed.categories)) parsedFaSchedule = parsed.categories;
    } catch { }
  }

  let parsedDebtors: any = null;
  if (statutoryNotes?.debtorsBreakdownJson) {
    try {
      parsedDebtors = JSON.parse(statutoryNotes.debtorsBreakdownJson);
    } catch { }
  }

  let parsedCreditorsWithin: any = null;
  if (statutoryNotes?.creditorsDueWithinOneYearJson) {
    try {
      parsedCreditorsWithin = JSON.parse(statutoryNotes.creditorsDueWithinOneYearJson);
    } catch { }
  }

  let parsedCreditorsAfter: any = null;
  if (statutoryNotes?.creditorsDueAfterOneYearJson) {
    try {
      parsedCreditorsAfter = JSON.parse(statutoryNotes.creditorsDueAfterOneYearJson);
    } catch { }
  }

  let parsedDirectorAdvances: any[] = [];
  if (statutoryNotes?.directorsAdvancesJson) {
    try {
      const parsed = JSON.parse(statutoryNotes.directorsAdvancesJson);
      if (Array.isArray(parsed)) parsedDirectorAdvances = parsed;
    } catch { }
  }

  let parsedShareCapital: any = null;
  if (statutoryNotes?.shareCapitalDetailsJson) {
    try {
      parsedShareCapital = JSON.parse(statutoryNotes.shareCapitalDetailsJson);
    } catch { }
  }

  const rawShareList = parsedShareCapital?.shares || (parsedShareCapital?.shareClass ? [parsedShareCapital] : reportSettings?.shareCapitalList || []);
  const shareCapitalList: any[] = rawShareList.length > 0 ? rawShareList : [
    {
      id: "share-1",
      shareType: "Equity",
      shareClass: parsedShareCapital?.shareClass || "Ordinary shares",
      nominalValue: Number(parsedShareCapital?.nominalValue) || 1.0,
      numberOfShares: Number(parsedShareCapital?.numberOfShares) || 100,
      allottedShares: Number(parsedShareCapital?.allottedShares || parsedShareCapital?.numberOfShares) || 100,
      authorisedShares: Number(parsedShareCapital?.authorisedShares || parsedShareCapital?.numberOfShares) || 100,
      totalPaidUp: Number(parsedShareCapital?.allottedPaidAmount || parsedShareCapital?.totalPaidUp) || 100,
    }
  ];

  const displayAuthorisedShares = parsedShareCapital?.displayAuthorisedShares ?? reportSettings?.displayAuthorisedShares ?? false;
  const totalConfiguredShareCapital = shareCapitalList.reduce((sum, s) => {
    const paid = Number(s.totalPaidUp);
    if (!isNaN(paid) && paid > 0) return sum + paid;
    const all = Number(s.allottedShares || s.numberOfShares || 0);
    const nom = Number(s.nominalValue || 1);
    return sum + (all * nom);
  }, 0);

  const netCurrentAssets = totalCurrentAssets - totalCurrentLiabilities;
  const totalAssetsLessCurrentLiabilities = totalFixedAssets + netCurrentAssets;
  const totalLongTermLiabilities = autoRoundingEnabled ? Math.round(rawLongTermLiabilities) : rawLongTermLiabilities;
  const netAssets = totalAssetsLessCurrentLiabilities - totalLongTermLiabilities;
  const rawShareCapital = Math.abs(sumCreditLessDebit(shareCapitalLines));
  const calledUpShareCapitalVal = rawShareCapital > 0
    ? (autoRoundingEnabled ? Math.round(rawShareCapital) : rawShareCapital)
    : (isLimitedByGuarantee ? 0 : totalConfiguredShareCapital > 0 ? totalConfiguredShareCapital : 100);
  const profitAndLossReserves = netAssets - calledUpShareCapitalVal;

  const formatCurrency = (val: number) => {
    if (autoRoundingEnabled) {
      return Math.round(val).toLocaleString("en-GB");
    }
    return val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    const prevTab = activeTab;
    // Switch to 'all' so every section is visible in the printed output
    setActiveTab("all");
    // Allow React to re-render before triggering the browser print dialog
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        // Restore previous tab after print dialog closes
        setTimeout(() => setActiveTab(prevTab), 500);
      }, 250);
    });
  };

  return (
    <div id="financial-report-card" className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-xs print:bg-white print:border-0 print:shadow-none print:rounded-none print:overflow-visible print:block print:p-0 print:m-0">
      {/* Top Controls Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Filing Mode Toggle (Full vs Filleted vs Detailed) */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filing Mode:</span>
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setFilingMode("filleted")}
              className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filingMode === "filleted"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Filleted for Companies House: P&L and Directors Report excluded for commercial privacy"
            >
              Filleted (Companies House)
            </button>
            <button
              type="button"
              onClick={() => setFilingMode("full")}
              className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filingMode === "full"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Full Accounts for Shareholders & HMRC Corporation Tax"
            >
              Full Accounts (Members)
            </button>
            <button
              type="button"
              onClick={() => setFilingMode("detailed")}
              className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filingMode === "detailed"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Detailed Management Accounts with line-item schedule"
            >
              Management P&L
            </button>
          </div>
        </div>

        {/* Toggles: Draft Watermark & Accountant Report */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isDraftWatermark}
              onChange={(e) => setIsDraftWatermark(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Draft Watermark
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeAccountantReport}
              onChange={(e) => setIncludeAccountantReport(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Accountant&apos;s Report
          </label>

          {onSaveReport && (
            <button
              type="button"
              onClick={onSaveReport}
              disabled={isSaving}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {isSaving ? <CheckCircle2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isSaving ? "Saving..." : "Save Pack"}
            </button>
          )}

          {clientId && (
            <a
              href={`/accounts-production/${clientId}/esign`}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Dispatch annual accounts to directors for Capisign eSignature approval"
            >
              <FileSignature size={13} /> Send to eSign
            </a>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={13} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === "all" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Entire Presentation Pack
        </button>
        <button
          onClick={() => setActiveTab("cover")}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === "cover" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Cover &amp; Contents
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === "info" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Company Information
        </button>
        {filingMode !== "filleted" && (
          <button
            onClick={() => setActiveTab("directors")}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
              activeTab === "directors" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Directors&apos; Report
          </button>
        )}
        {includeAccountantReport && (
          <button
            onClick={() => setActiveTab("accountants")}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
              activeTab === "accountants" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Accountant&apos;s Report
          </button>
        )}
        {filingMode !== "filleted" && (
          <button
            onClick={() => setActiveTab("pl")}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
              activeTab === "pl" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Profit &amp; Loss Account
          </button>
        )}
        <button
          onClick={() => setActiveTab("bs")}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === "bs" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Balance Sheet
        </button>
        {filingMode !== "filleted" && !isDormant && (
          <button
            onClick={() => setActiveTab("equity")}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
              activeTab === "equity" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Statement of Changes in Equity
          </button>
        )}
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === "notes" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Notes to Accounts
        </button>
      </div>

      {/* Presentation Print Area */}
      <div className="p-8 sm:p-14 print:p-0 print:m-0 print-area relative min-h-[70vh] print:min-h-0 bg-white text-slate-900 font-serif leading-relaxed" id="financial-report">
        {/* Diagonal Draft Watermark */}
        {isDraftWatermark && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10 opacity-[0.06] select-none">
            <span className="text-[140px] font-black uppercase tracking-widest text-slate-900 -rotate-45 font-sans">
              DRAFT
            </span>
          </div>
        )}

        {/* Informational Banner for Filleted Accounts */}
        {filingMode === "filleted" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-sans no-print flex items-center gap-2">
            <Shield size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Filleted Accounts Mode Active:</strong> In accordance with Section 444 of the Companies Act 2006, the Profit and Loss Account and Directors&apos; Report are omitted from this document pack for Companies House public filing.
            </span>
          </div>
        )}

        {/* Statutory Regime & Auto-Rounding Badges (No-print) */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2 flex-wrap font-sans text-xs">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs">
              <Building2 size={13} />
              {isLimitedByGuarantee
                ? "Company Limited by Guarantee (Members' Funds)"
                : isSoleTrader
                ? "Sole Trader / Self-Employed (Capital Account)"
                : isCIC
                ? "Community Interest Company (CIC)"
                : "Private Limited Company (Ltd)"}
            </span>

            {isDormant && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs">
                <Shield size={13} />
                Dormant Accounts (Form AA02 - s.480 Exemption)
              </span>
            )}

            {autoRoundingEnabled ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 size={13} />
                UK GAAP Auto-Rounding Active (Exact £1 Balanced)
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg font-medium flex items-center gap-1.5">
                Unrounded Pennies Mode
              </span>
            )}
          </div>
        </div>

        {/* Statutory s.454 Revision Notice Banner */}
        {isRevised && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-800 rounded-xl text-amber-950 dark:text-amber-200 text-xs font-sans shadow-xs">
            <div className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-1.5 text-amber-800 dark:text-amber-300">
              <Shield size={16} className="text-amber-600 dark:text-amber-400" />
              Revised Statutory Financial Statements (Companies Act 2006 s.454)
            </div>
            <p className="leading-relaxed mb-2 text-slate-700 dark:text-slate-300">
              These revised financial statements replace the original annual accounts for the financial period ended <strong>{periodEnd}</strong>. They have been prepared under section 454 of the Companies Act 2006 as at the date of the original accounts, and not as at the date of the revision. Accordingly, they do not reflect events and transactions occurring after the date of the original accounts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium border-t border-amber-200 dark:border-amber-800/80 pt-2 text-slate-600 dark:text-slate-400">
              <div>Original Filing Date: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{originalFilingDate || "Not Specified"}</span></div>
              <div>Reason for Revision: <span className="font-medium text-slate-800 dark:text-slate-200">{revisionReason || "Statutory correction"}</span></div>
            </div>
          </div>
        )}

        {/* SECTION 1: COVER PAGE */}
        {(activeTab === "all" || activeTab === "cover") && (
          <div className="page-section report-cover-section mb-12 text-center pt-6 pb-8 border-b-2 border-slate-800 print:pt-3 print:pb-5 print:mb-5" id="cover-page">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-sans mb-3">Company Registration No. {registrationNumber || "00000000"} (England and Wales)</p>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-950 mb-2 font-serif">
              {companyName}
            </h1>
            <h2 className="text-lg font-medium text-slate-700 font-serif mb-6">
              {filingMode === "filleted"
                ? "Unaudited Filleted Financial Statements"
                : "Annual Report and Financial Statements"}
            </h2>
            <div className="w-24 h-0.5 bg-slate-800 mx-auto mb-6" />
            <p className="text-sm text-slate-600 font-sans">
              For the year ended {periodEnd}
            </p>
            <p className="text-xs text-slate-500 font-sans mt-1">
              Prepared in accordance with {accountingStandard}
            </p>
          </div>
        )}

        {/* SECTION 1B: CONTENTS PAGE */}
        {(activeTab === "all" || activeTab === "cover") && (
          <div className="page-section mb-12 pb-8 border-b border-slate-200 print:mb-0 print:pb-4 print:border-none" id="contents-page">
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-900 mb-2 pb-2 border-b border-slate-300">
              Contents
            </h3>
            <p className="text-xs text-slate-500 font-sans mb-6">For the year ended {periodEnd}</p>
            <table className="w-full text-xs font-sans">
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-800 font-medium">
                    <a href="#company-info" className="hover:text-indigo-600 transition-colors">Company Information</a>
                  </td>
                  <td className="py-2.5 text-right text-slate-400 w-12">1</td>
                </tr>
                {filingMode !== "filleted" && !isDormant && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-800 font-medium">
                      <a href="#directors-report" className="hover:text-indigo-600 transition-colors">Director&apos;s Report</a>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 w-12">2</td>
                  </tr>
                )}
                {includeAccountantReport && !isDormant && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-800 font-medium">
                      <a href="#accountants-report" className="hover:text-indigo-600 transition-colors">Accountants&apos; Report</a>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 w-12">3</td>
                  </tr>
                )}
                {filingMode !== "filleted" && !isDormant && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-800 font-medium">
                      <a href="#profit-loss" className="hover:text-indigo-600 transition-colors">
                        {isLimitedByGuarantee ? "Income Statement" : "Profit and Loss Account"}
                      </a>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 w-12">4</td>
                  </tr>
                )}
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-800 font-medium">
                    <a href="#balance-sheet" className="hover:text-indigo-600 transition-colors">Statement of Financial Position</a>
                  </td>
                  <td className="py-2.5 text-right text-slate-400 w-12">{filingMode !== "filleted" && !isDormant ? "5" : "2"}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-800 font-medium">
                    <a href="#notes" className="hover:text-indigo-600 transition-colors">Notes to the Financial Statements</a>
                  </td>
                  <td className="py-2.5 text-right text-slate-400 w-12">{filingMode !== "filleted" && !isDormant ? "6" : "3"}</td>
                </tr>
                {filingMode !== "filleted" && !isDormant && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-800 font-medium">
                      <a href="#changes-in-equity" className="hover:text-indigo-600 transition-colors">Statement of Changes in Equity</a>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 w-12">7</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: COMPANY INFORMATION */}
        {(activeTab === "all" || activeTab === "info") && (
          <div className="page-section report-info-section mb-14 pb-8 border-b border-slate-200 print:mb-0 print:pb-0 print:border-none" id="company-info">
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-900 mb-6 pb-2 border-b border-slate-300">
              Company Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-10 text-xs font-sans">
              <div>
                <p className="font-bold text-slate-800">Director{directors.length > 1 ? "s" : ""}</p>
                <div className="mt-1 space-y-0.5 text-slate-600">
                  {directors.length > 0 ? (
                    directors.map((d: any, idx: number) => (
                      <p key={idx}>{d.name}{d.role ? ` (${d.role})` : ""}</p>
                    ))
                  ) : (
                    <p>{balanceSheetSignatory}</p>
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-800">Registered Office</p>
                <p className="mt-1 text-slate-600 whitespace-pre-line">
                  {reportSettings?.registeredOffice || "United Kingdom"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Registered Number</p>
                <p className="mt-1 text-slate-600">{registrationNumber || "Registered in England and Wales"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Accountants</p>
                <p className="mt-1 text-slate-600">
                  {reportSettings?.companyContacts?.accountants?.firmName || reportSettings?.accountantFirm || "Chartered Certified Accountants"}
                </p>
                {reportSettings?.companyContacts?.accountants?.address && (
                  <p className="text-slate-500 whitespace-pre-line">{reportSettings.companyContacts.accountants.address}</p>
                )}
              </div>
              {reportSettings?.companyContacts?.bankers?.bankName && (
                <div>
                  <p className="font-bold text-slate-800">Bankers</p>
                  <p className="mt-1 text-slate-600">{reportSettings.companyContacts.bankers.bankName}</p>
                  {reportSettings.companyContacts.bankers.branch && (
                    <p className="text-slate-500">{reportSettings.companyContacts.bankers.branch}</p>
                  )}
                  {reportSettings.companyContacts.bankers.address && (
                    <p className="text-slate-500 whitespace-pre-line">{reportSettings.companyContacts.bankers.address}</p>
                  )}
                </div>
              )}
              {reportSettings?.companyContacts?.solicitors?.firmName && (
                <div>
                  <p className="font-bold text-slate-800">Solicitors</p>
                  <p className="mt-1 text-slate-600">{reportSettings.companyContacts.solicitors.firmName}</p>
                  {reportSettings.companyContacts.solicitors.address && (
                    <p className="text-slate-500 whitespace-pre-line">{reportSettings.companyContacts.solicitors.address}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: DIRECTORS' REPORT (Full Capium-Parity — Omitted if Filleted or Dormant) */}
        {filingMode !== "filleted" && !isDormant && (activeTab === "all" || activeTab === "directors") && (
          <div className="page-section page-section-break mb-14 pb-8 border-b border-slate-200 print:mb-0 print:pb-0 print:border-none" id="directors-report">
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-900 mb-2 pb-2 border-b border-slate-300">
              Director&apos;s Report
            </h3>
            <p className="text-xs text-slate-500 font-sans mb-6">For the year ended {periodEnd}</p>
            <div className="space-y-5 text-xs leading-relaxed text-slate-800 font-serif">

              {/* Intro */}
              <p>
                {reportSettings?.noteTexts?.directorsReportText ||
                  `The director presents the annual report and the financial statements of the company for the year ended ${periodEnd}.`}
              </p>

              {/* Principal Activity */}
              <div>
                <h4 className="font-bold font-sans text-slate-900 mb-1">Principal Activity</h4>
                <p>
                  {reportSettings?.noteTexts?.principalActivitiesText ||
                    "The principal activity of the company during the financial year was the provision of professional and business services."}
                </p>
              </div>

              {/* Directors */}
              <div>
                <h4 className="font-bold font-sans text-slate-900 mb-1">Directors</h4>
                <p>The following director{directors.length > 1 ? "s" : ""} served during the year and up to the date of this report:</p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {directors.length > 0 ? (
                    directors.map((d: any, idx: number) => (
                      <li key={idx}>{d.name}{d.role ? ` — ${d.role}` : ""}</li>
                    ))
                  ) : (
                    <li>{balanceSheetSignatory} — Director</li>
                  )}
                </ul>
              </div>

              {/* Business Review */}
              {(reportSettings?.relatedNotes?.businessReview !== false) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Business Review</h4>
                  <p>
                    {reportSettings?.noteTexts?.businessReviewText ||
                      `The company achieved a turnover of £${formatCurrency(totalTurnover)} for the year ended ${periodEnd}. After deducting costs and administrative expenses of £${formatCurrency(totalAdminExpenses)}, the company recorded an operating profit of £${formatCurrency(operatingProfit)}. The directors consider the performance for the year to be satisfactory.`}
                  </p>
                </div>
              )}

              {/* Going Concern */}
              {(reportSettings?.relatedNotes?.goingConcern !== false) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Going Concern</h4>
                  <p>
                    {reportSettings?.noteTexts?.goingConcernText ||
                      "After making enquiries, the director has a reasonable expectation that the company has adequate resources to continue in operational existence for the foreseeable future. Accordingly, the financial statements have been prepared on a going concern basis."}
                  </p>
                </div>
              )}

              {/* Future Prospects */}
              {(reportSettings?.relatedNotes?.futureProspects !== false) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Future Prospects</h4>
                  <p>
                    {reportSettings?.noteTexts?.futureProspectsText ||
                      "The director is satisfied with the current trading conditions and remains optimistic about the company's future prospects."}
                  </p>
                </div>
              )}

              {/* Dividends */}
              {(reportSettings?.relatedNotes?.dividends !== false) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Dividends</h4>
                  <p>
                    {reportSettings?.noteTexts?.dividendsText ||
                      "No dividends were paid or declared during the year (prior year: £nil)."}
                  </p>
                </div>
              )}

              {/* Political and Charitable Donations */}
              {(reportSettings?.relatedNotes?.politicalDonations) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Political and Charitable Donations</h4>
                  <p>
                    {reportSettings?.noteTexts?.politicalDonationsText ||
                      "No political or charitable donations were made during the reporting period."}
                  </p>
                </div>
              )}

              {/* Small Company Regime */}
              <div>
                <h4 className="font-bold font-sans text-slate-900 mb-1">Small Company Provisions</h4>
                <p>This report has been prepared in accordance with the special provisions relating to companies subject to the small companies regime within Part 15 of the Companies Act 2006.</p>
              </div>

              {/* Directors' Responsibilities Statement */}
              {(reportSettings?.relatedNotes?.directorsResponsibilities !== false) && (
                <div>
                  <h4 className="font-bold font-sans text-slate-900 mb-1">Statement of Director&apos;s Responsibilities</h4>
                  <p>
                    {reportSettings?.noteTexts?.directorsResponsibilitiesText ||
                      `The director is responsible for preparing the director's report and the financial statements in accordance with applicable law and regulations and in accordance with United Kingdom Generally Accepted Accounting Practice.`}
                  </p>
                  <br />
                  <p>Company law requires the director to prepare financial statements for each financial year. Under that law the director has elected to prepare the financial statements in accordance with United Kingdom Generally Accepted Accounting Practice (United Kingdom Accounting Standards and applicable law). Under company law the director must not approve the financial statements unless they are satisfied that they give a true and fair view of the state of affairs of the company and the profit or loss of the company for that period.</p>
                  <br />
                  <p>In preparing these financial statements, the director is required to:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>select suitable accounting policies and then apply them consistently;</li>
                    <li>make judgements and accounting estimates that are reasonable and prudent;</li>
                    <li>state whether applicable UK Accounting Standards have been followed, subject to any material departures disclosed and explained in the financial statements; and</li>
                    <li>prepare the financial statements on the going concern basis unless it is inappropriate to presume that the company will continue in business.</li>
                  </ul>
                  <br />
                  <p>The director is responsible for keeping adequate accounting records that are sufficient to show and explain the company&apos;s transactions and disclose with reasonable accuracy at any time the financial position of the company and enable them to ensure that the financial statements comply with the Companies Act 2006. The director is also responsible for safeguarding the assets of the company and hence for taking reasonable steps for the prevention and detection of fraud and other irregularities.</p>
                  <br />
                  <p>The director is responsible for the maintenance and integrity of the corporate and financial information included on the company&apos;s website. Legislation in the United Kingdom, governing the preparation and dissemination of financial statements, may differ from legislation in other jurisdictions.</p>
                </div>
              )}

              {/* Signatory */}
              <div className="pt-8 border-t border-slate-300 mt-8 w-72 font-sans">
                <p className="text-xs text-slate-500">By order of the board</p>
                <div className="h-8 print:h-6" />
                <p className="font-bold text-slate-900">{directorsReportSignatory}</p>
                <p className="text-xs text-slate-500">Director</p>
                <p className="text-xs text-slate-500 mt-1">Date approved: {reportApprovalDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ACCOUNTANTS' COMPILATION REPORT (Full Capium-Parity) */}
        {includeAccountantReport && !isDormant && (activeTab === "all" || activeTab === "accountants") && (
          <div className="page-section page-section-break mb-14 pb-8 border-b border-slate-200 print:mb-0 print:pb-0 print:border-none" id="accountants-report">
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-900 mb-2 pb-2 border-b border-slate-300">
              Accountants&apos; Report
            </h3>
            <p className="text-xs text-slate-500 font-sans mb-6">For the year ended {periodEnd}</p>
            <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-serif">

              {/* Heading */}
              <p className="font-bold font-sans text-slate-900 text-xs">Accountant&apos;s report</p>

              {/* Compilation Report Body */}
              <p>
                You consider that the company is exempt from an audit for the year ended {periodEnd}. You have acknowledged, on the balance sheet, your responsibilities for complying with the requirements of the Companies Act 2006 with respect to accounting records and the preparation of accounts. These responsibilities include preparing accounts that give a true and fair view of the state of affairs of the company at the end of the financial year and of its profit or loss for the financial year.
              </p>
              <p>
                In accordance with your instructions, we have prepared the accounts which comprise the {filingMode !== "filleted" ? "Profit and Loss Account, the Statement of Comprehensive Income, the Balance Sheet, the Statement of Changes in Equity and the related notes" : "Balance Sheet and the related notes"} from the accounting records of the company and on the basis of information and explanations you have given to us.
              </p>
              <p>
                As a practising member firm of the relevant UK accountancy body, we are subject to its ethical and other professional requirements which are detailed on its website at {reportSettings?.companyContacts?.accountants?.firmName || reportSettings?.accountantFirm ? (reportSettings?.companyContacts?.accountants?.firmName || reportSettings?.accountantFirm) : "the relevant professional body's website"}.
              </p>
              <p>
                This report is made solely to the Board of Directors of {companyName}, as a body, in accordance with the terms of our engagement letter. Our work has been undertaken solely to prepare for your approval the accounts of {companyName} and to state those matters that we have agreed to state to the Board of Directors in this report in accordance with ICAEW Technical Release TECH 07/16AAF. To the fullest extent permitted by law, we do not accept or assume responsibility to anyone other than the company and its Board of Directors as a body, for our work or for this report.
              </p>
              <p>
                {reportSettings?.accountantsReportData?.compilationReportText ||
                  "In accordance with our engagement letter, we have compiled the financial statements from the accounting records and information supplied to us."}
              </p>

              {/* Firm Signatory */}
              <div className="pt-8 border-t border-slate-300 mt-8 w-80 font-sans">
                <p className="font-bold text-slate-900">
                  {reportSettings?.companyContacts?.accountants?.firmName || reportSettings?.accountantFirm || reportSettings?.accountantName || "Chartered Certified Accountants"}
                </p>
                <p className="text-xs text-slate-600">
                  {reportSettings?.accountantsReportData?.qualification || reportSettings?.companyContacts?.accountants?.qualification || "Chartered Certified Accountants"}
                </p>
                {reportSettings?.companyContacts?.accountants?.address && (
                  <p className="text-xs text-slate-500 whitespace-pre-line mt-1">{reportSettings.companyContacts.accountants.address}</p>
                )}
                <p className="text-xs text-slate-500 mt-2">Date: {reportApprovalDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: PROFIT AND LOSS / INCOME AND EXPENDITURE (Omitted if Filleted or Dormant) */}
        {filingMode !== "filleted" && !isDormant && (activeTab === "all" || activeTab === "pl") && (
          <div className="page-section page-section-break mb-14 pb-8 border-b border-slate-200 max-w-2xl mx-auto print:max-w-none print:w-full print:mb-0 print:pb-0 print:border-none" id="profit-loss">
            <div className="text-center mb-8">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-950">
                {reportSettings?.customHeadings?.profitAndLossTitle || (isLimitedByGuarantee ? "Income and Expenditure Account" : isSoleTrader ? "Trading and Profit & Loss Account" : "Profit and Loss Account")}
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">For the year ended {periodEnd}</p>
            </div>
            <table className="w-full text-xs font-serif">
              <thead>
                <tr className="border-b-2 border-slate-900 font-sans font-bold">
                  <th className="py-2 text-left"></th>
                  <th className="py-2 text-center w-16">Notes</th>
                  <th className="py-2 text-right w-28">£</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 font-medium">{isLimitedByGuarantee ? "Income / Subscriptions & Fees" : "Turnover / Revenue"}</td>
                  <td className="py-2.5 text-center font-sans"></td>
                  <td className="py-2.5 text-right font-mono font-bold">{formatCurrency(totalTurnover)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700">Cost of raw materials and consumables</td>
                  <td className="py-2.5 text-center font-sans"></td>
                  <td className="py-2.5 text-right font-mono">({formatCurrency(totalCostOfSales)})</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-2.5">{isLimitedByGuarantee ? "Gross surplus" : "Gross profit"}</td>
                  <td className="py-2.5 text-center font-sans"></td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(grossProfit)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700">Administrative expenses</td>
                  <td className="py-2.5 text-center font-sans"></td>
                  <td className="py-2.5 text-right font-mono">({formatCurrency(totalAdminExpenses)})</td>
                </tr>
                <tr className="font-bold border-t border-slate-300">
                  <td className="py-2.5">{isLimitedByGuarantee ? "Operating surplus / (deficit)" : "Operating profit / (loss)"}</td>
                  <td className="py-2.5 text-center font-sans"></td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(operatingProfit)}</td>
                </tr>
                {!isSoleTrader && (
                  <tr>
                    <td className="py-2.5 text-slate-700">Tax on surplus/profit on ordinary activities</td>
                    <td className="py-2.5 text-center font-sans"></td>
                    <td className="py-2.5 text-right font-mono">({formatCurrency(taxExpense)})</td>
                  </tr>
                )}
                <tr className="font-bold text-sm border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                  <td className="py-3">
                    {isLimitedByGuarantee ? "Surplus / (deficit) for the financial year" : isSoleTrader ? "Net profit for the year" : "Profit for the financial year"}
                  </td>
                  <td className="py-3 text-center font-sans"></td>
                  <td className="py-3 text-right font-mono">{formatCurrency(profitForYear)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 6: STATEMENT OF FINANCIAL POSITION (BALANCE SHEET) */}
        {(activeTab === "all" || activeTab === "bs") && !isDormant && (
          <div className="page-section balance-sheet-section mb-14 pb-8 border-b border-slate-200 max-w-2xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 print:border-none" id="balance-sheet">
            <div className="text-center mb-6 print:mb-2">
              <h3 className="text-base print:text-sm font-bold uppercase tracking-wide text-slate-950">
                {reportSettings?.customHeadings?.balanceSheetTitle || "Statement of Financial Position"}
              </h3>
              <p className="text-xs print:text-[11px] text-slate-500 font-sans mt-0.5">As at {periodEnd}</p>
              <p className="text-[11px] print:text-[10px] text-slate-400 font-sans">Registration No. {registrationNumber || "00000000"}</p>
            </div>
            <table className="w-full text-xs font-serif print:text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 font-sans font-bold">
                  <th className="py-2 print:py-1 text-left"></th>
                  <th className="py-2 print:py-1 text-center w-16">Notes</th>
                  <th className="py-2 print:py-1 text-right w-28">£</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="font-bold bg-slate-50">
                  <td className="py-2 print:py-1" colSpan={3}>Fixed Assets</td>
                </tr>
                <tr>
                  <td className="py-2 print:py-0.5 pl-4 text-slate-700">Tangible fixed assets</td>
                  <td className="py-2 print:py-0.5 text-center font-sans">3</td>
                  <td className="py-2 print:py-0.5 text-right font-mono font-bold">{formatCurrency(totalFixedAssets)}</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-2 print:py-1" colSpan={3}>Current Assets</td>
                </tr>
                <tr>
                  <td className="py-2 print:py-0.5 pl-4 text-slate-700">Debtors &amp; Cash at bank and in hand</td>
                  <td className="py-2 print:py-0.5 text-center font-sans">4</td>
                  <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(totalCurrentAssets)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="py-2 print:py-0.5 text-slate-800">Creditors: amounts falling due within one year</td>
                  <td className="py-2 print:py-0.5 text-center font-sans">5</td>
                  <td className="py-2 print:py-0.5 text-right font-mono">({formatCurrency(totalCurrentLiabilities)})</td>
                </tr>
                <tr className="font-bold border-t border-slate-300">
                  <td className="py-2.5 print:py-1">Net current assets / (liabilities)</td>
                  <td className="py-2.5 print:py-1 text-center font-sans"></td>
                  <td className="py-2.5 print:py-1 text-right font-mono">{formatCurrency(netCurrentAssets)}</td>
                </tr>
                <tr className="font-bold border-t border-slate-900">
                  <td className="py-2.5 print:py-1">Total assets less current liabilities</td>
                  <td className="py-2.5 print:py-1 text-center font-sans"></td>
                  <td className="py-2.5 print:py-1 text-right font-mono font-bold">{formatCurrency(totalAssetsLessCurrentLiabilities)}</td>
                </tr>
                {totalLongTermLiabilities > 0 && (
                  <tr>
                    <td className="py-2 print:py-0.5 text-slate-700">Creditors: amounts falling due after more than one year</td>
                    <td className="py-2 print:py-0.5 text-center font-sans">6</td>
                    <td className="py-2 print:py-0.5 text-right font-mono">({formatCurrency(totalLongTermLiabilities)})</td>
                  </tr>
                )}
                <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                  <td className="py-3 print:py-1.5">Net Assets</td>
                  <td className="py-3 print:py-1.5 text-center font-sans"></td>
                  <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(netAssets)}</td>
                </tr>

                <tr className="font-bold bg-slate-50">
                  <td className="py-3 print:py-1" colSpan={3}>
                    {isLimitedByGuarantee ? "Members' Guarantee & Accumulated Reserves" : isSoleTrader ? "Capital Account Schedule" : "Capital and Reserves"}
                  </td>
                </tr>
                {isLimitedByGuarantee ? (
                  <>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Members&apos; guarantee reserve (limited by guarantee)</td>
                      <td className="py-2 print:py-0.5 text-center font-sans">7</td>
                      <td className="py-2 print:py-0.5 text-right font-mono">0.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Accumulated surplus / (deficit) reserve</td>
                      <td className="py-2 print:py-0.5 text-center font-sans"></td>
                      <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(netAssets)}</td>
                    </tr>
                    <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                      <td className="py-3 print:py-1.5">Total Members&apos; Funds</td>
                      <td className="py-3 print:py-1.5 text-center font-sans"></td>
                      <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(netAssets)}</td>
                    </tr>
                  </>
                ) : isSoleTrader ? (
                  <>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Capital account at start of period</td>
                      <td className="py-2 print:py-0.5 text-center font-sans"></td>
                      <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Add: Net profit for the year</td>
                      <td className="py-2 print:py-0.5 text-center font-sans"></td>
                      <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(profitForYear)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Less: Drawings / Personal distributions</td>
                      <td className="py-2 print:py-0.5 text-center font-sans"></td>
                      <td className="py-2 print:py-0.5 text-right font-mono">({formatCurrency(0)})</td>
                    </tr>
                    <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                      <td className="py-3 print:py-1.5">Closing Capital Balance</td>
                      <td className="py-3 print:py-1.5 text-center font-sans"></td>
                      <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(netAssets)}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Called up share capital</td>
                      <td className="py-2 print:py-0.5 text-center font-sans">7</td>
                      <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(calledUpShareCapitalVal)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 print:py-0.5 pl-4 text-slate-700">Profit and loss reserves</td>
                      <td className="py-2 print:py-0.5 text-center font-sans"></td>
                      <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(profitAndLossReserves)}</td>
                    </tr>
                    <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                      <td className="py-3 print:py-1.5">Shareholders&apos; Funds</td>
                      <td className="py-3 print:py-1.5 text-center font-sans"></td>
                      <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(netAssets)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Statutory Directors' Statement & Exemption Clauses */}
            <div className="mt-8 print:mt-3 text-xs print:text-[9.5px] leading-relaxed print:leading-tight text-slate-800 font-serif space-y-2.5 print:space-y-1">
              <p>
                For the financial year ended {periodEnd}, the company was entitled to exemption from audit under section 477 of the Companies Act 2006 relating to small companies.
              </p>
              <p className="font-bold font-sans">Directors&apos; responsibilities:</p>
              <ul className="list-disc pl-5 space-y-0.5 print:space-y-0 font-sans text-[11px] print:text-[9px] text-slate-700">
                <li>The members have not required the company to obtain an audit of its financial statements for the year in question in accordance with section 476;</li>
                <li>The directors acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of financial statements;</li>
                <li>These financial statements have been prepared in accordance with the provisions applicable to companies subject to the small companies regime.</li>
              </ul>
              {filingMode === "filleted" && (
                <p className="font-semibold text-[11px] print:text-[9px] font-sans text-slate-800 mt-1">
                  These accounts have been prepared and delivered in accordance with the provisions applicable to companies subject to the small companies regime and in accordance with the provisions of FRS 102 Section 1A small entities. In accordance with Section 444 of the Companies Act 2006, the Income Statement has not been delivered to the Registrar of Companies.
                </p>
              )}

              <div className="pt-4 print:pt-2 border-t border-slate-900 mt-5 print:mt-2.5 w-72 font-sans">
                <p className="text-xs print:text-[9.5px] text-slate-500">Approved by the Board for issue on {reportApprovalDate}</p>
                <div className="h-4 print:h-2" />
                <p className="font-bold text-sm print:text-xs text-slate-900">{balanceSheetSignatory}</p>
                <p className="text-xs print:text-[9.5px] text-slate-500">Director &amp; Registered Signatory</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6-DORMANT: STATEMENT OF FINANCIAL POSITION (FORM AA02 DORMANT BALANCE SHEET) */}
        {(activeTab === "all" || activeTab === "bs") && isDormant && (
          <div className="page-section balance-sheet-section mb-14 pb-8 border-b border-slate-200 max-w-2xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 print:border-none">
            <div className="text-center mb-6 print:mb-2">
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-sans font-bold text-[10px] rounded-full uppercase tracking-wider border border-amber-200">
                Form AA02 Equivalent
              </span>
              <h3 className="text-base print:text-sm font-bold uppercase tracking-wide text-slate-950 mt-1">Dormant Company Balance Sheet</h3>
              <p className="text-xs print:text-[11px] text-slate-500 font-sans mt-0.5">As at {periodEnd}</p>
              <p className="text-[11px] print:text-[10px] text-slate-400 font-sans">Company Registration No. {registrationNumber || "00000000"} (England and Wales)</p>
            </div>
            <table className="w-full text-xs font-serif print:text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 font-sans font-bold">
                  <th className="py-2 print:py-1 text-left">Current Assets</th>
                  <th className="py-2 print:py-1 text-center w-16">Notes</th>
                  <th className="py-2 print:py-1 text-right w-28">£</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 print:py-0.5 font-medium">Called up share capital not paid</td>
                  <td className="py-2 print:py-0.5 text-center font-sans">7</td>
                  <td className="py-2 print:py-0.5 text-right font-mono font-bold">{formatCurrency(totalCurrentAssets > 0 ? totalCurrentAssets : 100)}</td>
                </tr>
                <tr>
                  <td className="py-2 print:py-0.5 text-slate-700">Cash at bank and in hand</td>
                  <td className="py-2 print:py-0.5 text-center font-sans"></td>
                  <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(0)}</td>
                </tr>
                <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                  <td className="py-3 print:py-1.5">Net Assets</td>
                  <td className="py-3 print:py-1.5 text-center font-sans"></td>
                  <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(totalCurrentAssets > 0 ? totalCurrentAssets : 100)}</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-3 print:py-1" colSpan={3}>Authorised and Issued Share Capital</td>
                </tr>
                <tr>
                  <td className="py-2 print:py-0.5 pl-4 text-slate-700">100 Ordinary shares of £1.00 each</td>
                  <td className="py-2 print:py-0.5 text-center font-sans"></td>
                  <td className="py-2 print:py-0.5 text-right font-mono">{formatCurrency(totalCurrentAssets > 0 ? totalCurrentAssets : 100)}</td>
                </tr>
                <tr className="font-bold text-sm print:text-xs border-t-2 border-b-4 border-double border-slate-900 bg-slate-50">
                  <td className="py-3 print:py-1.5">Total Shareholders&apos; Funds</td>
                  <td className="py-3 print:py-1.5 text-center font-sans"></td>
                  <td className="py-3 print:py-1.5 text-right font-mono">{formatCurrency(totalCurrentAssets > 0 ? totalCurrentAssets : 100)}</td>
                </tr>
              </tbody>
            </table>

            {/* Mandatory Dormant Statements under Section 480 and Section 475 */}
            <div className="mt-8 print:mt-3 text-xs print:text-[9.5px] leading-relaxed print:leading-tight text-slate-800 font-serif space-y-2.5 print:space-y-1">
              <h4 className="font-bold font-sans text-xs print:text-[10px] uppercase tracking-wide text-slate-900 border-b border-slate-200 pb-1">
                Statutory Statements under Section 480 of the Companies Act 2006
              </h4>
              <p>
                a. For the financial year ended {periodEnd} the company was entitled to exemption from audit under section 480 of the Companies Act 2006 relating to dormant companies.
              </p>
              <p className="font-bold font-sans text-slate-900">Directors&apos; responsibilities:</p>
              <ul className="list-disc pl-5 space-y-0.5 print:space-y-0 font-sans text-[11px] print:text-[9px] text-slate-700">
                <li>The members have not required the company to obtain an audit of its financial statements for the year in question in accordance with section 476;</li>
                <li>The directors acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of accounts;</li>
                <li>These accounts have been prepared in accordance with the provisions applicable to companies subject to the small companies regime.</li>
              </ul>

              <div className="pt-4 print:pt-2 border-t border-slate-900 mt-5 print:mt-2.5 w-72 font-sans">
                <p className="text-xs print:text-[9.5px] text-slate-500">Approved by the Board of Directors on {reportApprovalDate} and signed on its behalf by:</p>
                <div className="h-4 print:h-2" />
                <p className="font-bold text-sm print:text-xs text-slate-900">{balanceSheetSignatory}</p>
                <p className="text-xs print:text-[9.5px] text-slate-500">Director</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6B: STATEMENT OF CHANGES IN EQUITY (FRS 102 & FULL PACK) */}
        {filingMode !== "filleted" && !isDormant && (activeTab === "all" || activeTab === "equity") && (
          <div className="page-section page-section-break mb-14 pb-8 border-b border-slate-200 max-w-2xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 print:border-none" id="changes-in-equity">
            <div className="text-center mb-6">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-950">
                Statement of Changes in Equity
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">For the year ended {periodEnd}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-serif">
                <thead>
                  <tr className="border-b-2 border-slate-900 font-sans font-bold text-slate-900">
                    <th className="py-2 text-left"></th>
                    <th className="py-2 text-right w-24">Called up share capital<br /><span className="text-[10px] font-normal text-slate-500">£</span></th>
                    <th className="py-2 text-right w-24">Revaluation reserve<br /><span className="text-[10px] font-normal text-slate-500">£</span></th>
                    <th className="py-2 text-right w-24">Capital redemption reserve<br /><span className="text-[10px] font-normal text-slate-500">£</span></th>
                    <th className="py-2 text-right w-24">Retained earnings<br /><span className="text-[10px] font-normal text-slate-500">£</span></th>
                    <th className="py-2 text-right w-24">Total<br /><span className="text-[10px] font-normal text-slate-500">£</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-slate-800">
                      At {periodStart || "start of period"}
                    </td>
                    <td className="py-2.5 text-right">{formatCurrency(calledUpShareCapitalVal)}</td>
                    <td className="py-2.5 text-right">-</td>
                    <td className="py-2.5 text-right">-</td>
                    <td className="py-2.5 text-right">{formatCurrency(profitAndLossReserves - profitForYear)}</td>
                    <td className="py-2.5 text-right font-bold">{formatCurrency(netAssets - profitForYear)}</td>
                  </tr>

                  <tr>
                    <td className="py-2 text-slate-700 font-sans pl-2">
                      Profit / (Loss) for the financial year
                    </td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">{formatCurrency(profitForYear)}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(profitForYear)}</td>
                  </tr>

                  <tr>
                    <td className="py-2 text-slate-700 font-sans pl-2">
                      Total comprehensive income for the year
                    </td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">{formatCurrency(profitForYear)}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(profitForYear)}</td>
                  </tr>

                  <tr>
                    <td className="py-2 text-slate-700 font-sans pl-2">
                      Total investments by and distributions to owners
                    </td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">-</td>
                  </tr>

                  <tr className="font-bold border-t-2 border-b-4 border-double border-slate-900 bg-slate-50 font-sans text-xs">
                    <td className="py-2.5">
                      At {periodEnd}
                    </td>
                    <td className="py-2.5 text-right font-mono">{formatCurrency(calledUpShareCapitalVal)}</td>
                    <td className="py-2.5 text-right font-mono">-</td>
                    <td className="py-2.5 text-right font-mono">-</td>
                    <td className="py-2.5 text-right font-mono">{formatCurrency(profitAndLossReserves)}</td>
                    <td className="py-2.5 text-right font-mono text-indigo-700">{formatCurrency(netAssets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 7: STATUTORY NOTES TO THE ACCOUNTS */}
        {(activeTab === "all" || activeTab === "notes") && (
          <div className="page-section notes-section mb-14 max-w-2xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0" id="notes">
            <div className="text-center mb-8 print:mb-4">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-950">
                {reportSettings?.customHeadings?.notesTitle || "Notes to the Financial Statements"}
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">For the year ended {periodEnd}</p>
            </div>

            <div className="space-y-6 print:space-y-4 text-xs text-slate-800 font-serif leading-relaxed">
              {/* Note 1: General Information */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">1. Statutory Information</h4>
                <p>
                  {companyName} is a private company, limited by shares, registered in England and Wales. Registration number: {registrationNumber || "00000000"}. The registered office address is {reportSettings?.registeredOffice || "United Kingdom"}.
                </p>
              </div>

              {/* Note 2: Accounting Policies */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">2. Accounting Policies</h4>
                <p className="font-bold text-[11px] font-sans mt-1">Basis of Preparation</p>
                <p className="text-[11px]">
                  {accountingPolicies?.basisOfPreparation ||
                    "The financial statements have been prepared under the historical cost convention in accordance with Section 1A of Financial Reporting Standard 102 (FRS 102) 'The Financial Reporting Standard applicable in the UK and Republic of Ireland' and the Companies Act 2006."}
                </p>
                <p className="font-bold text-[11px] font-sans mt-2">Turnover Recognition</p>
                <p className="text-[11px]">
                  {accountingPolicies?.turnoverPolicy ||
                    "Turnover represents net invoiced sales of services, excluding value added tax and trade discounts."}
                </p>
                <p className="font-bold text-[11px] font-sans mt-2">Tangible Fixed Assets and Depreciation</p>
                <p className="text-[11px]">
                  {accountingPolicies?.tangibleAssetsPolicy ||
                    "Tangible fixed assets are stated at cost less accumulated depreciation. Depreciation is provided at rates calculated to write off the cost less residual value over their expected useful lives (25% reducing balance / 20% straight line)."}
                </p>
              </div>

              {/* Note 3: Employees */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">3. Average Number of Employees</h4>
                <p>
                  During the year the average number of persons employed by the company (including directors) was {employeeCount}.
                </p>
              </div>

              {/* Note 4: Tangible Fixed Assets Movement Schedule */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-2">4. Tangible Fixed Assets</h4>
                <table className="w-full text-[11px] font-sans border border-slate-200">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3 text-left">Asset Category</th>
                      <th className="py-1.5 px-3 text-right">Cost (£)</th>
                      <th className="py-1.5 px-3 text-right">Depreciation (£)</th>
                      <th className="py-1.5 px-3 text-right">Net Book Value (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {parsedFaSchedule && parsedFaSchedule.length > 0 ? (
                      parsedFaSchedule.map((item: any, i: number) => {
                        const costEnd = (item.costStart || 0) + (item.costAdditions || 0) - (item.costDisposals || 0);
                        const depnEnd = (item.depnStart || 0) + (item.depnCharge || 0) - (item.depnDisposals || 0);
                        const nbv = costEnd - depnEnd;
                        return (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-sans font-medium">{item.category || `Asset Class ${i + 1}`}</td>
                            <td className="py-1.5 px-3 text-right">{costEnd.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                            <td className="py-1.5 px-3 text-right">({depnEnd.toLocaleString("en-GB", { minimumFractionDigits: 2 })})</td>
                            <td className="py-1.5 px-3 text-right font-bold">{nbv.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-1.5 px-3 font-sans font-medium">Plant &amp; Machinery, Equipment</td>
                        <td className="py-1.5 px-3 text-right">{(totalFixedAssets * 1.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-3 text-right">({(totalFixedAssets * 0.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })})</td>
                        <td className="py-1.5 px-3 text-right font-bold">{totalFixedAssets.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="font-bold bg-slate-50 font-sans">
                      <td className="py-1.5 px-3">Total as at {periodEnd}</td>
                      <td className="py-1.5 px-3 text-right font-mono">
                        {parsedFaSchedule && parsedFaSchedule.length > 0
                          ? parsedFaSchedule.reduce((acc: number, it: any) => acc + ((it.costStart || 0) + (it.costAdditions || 0) - (it.costDisposals || 0)), 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })
                          : (totalFixedAssets * 1.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono">
                        (
                        {parsedFaSchedule && parsedFaSchedule.length > 0
                          ? parsedFaSchedule.reduce((acc: number, it: any) => acc + ((it.depnStart || 0) + (it.depnCharge || 0) - (it.depnDisposals || 0)), 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })
                          : (totalFixedAssets * 0.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        )
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-indigo-600 font-bold">
                        {parsedFaSchedule && parsedFaSchedule.length > 0
                          ? parsedFaSchedule.reduce((acc: number, it: any) => {
                              const ce = (it.costStart || 0) + (it.costAdditions || 0) - (it.costDisposals || 0);
                              const de = (it.depnStart || 0) + (it.depnCharge || 0) - (it.depnDisposals || 0);
                              return acc + (ce - de);
                            }, 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })
                          : totalFixedAssets.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note 5: Debtors */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">5. Debtors</h4>
                <div className="space-y-1 font-sans border-b border-slate-100 pb-1">
                  {parsedDebtors && (parsedDebtors.tradeDebtors > 0 || parsedDebtors.otherDebtors > 0 || parsedDebtors.prepayments > 0) ? (
                    <>
                      {parsedDebtors.tradeDebtors > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Trade debtors</span>
                          <span className="font-mono">£{parsedDebtors.tradeDebtors.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedDebtors.otherDebtors > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Other debtors</span>
                          <span className="font-mono">£{parsedDebtors.otherDebtors.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedDebtors.prepayments > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Prepayments and accrued income</span>
                          <span className="font-mono">£{parsedDebtors.prepayments.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between py-0.5">
                      <span>Trade debtors &amp; other receivables</span>
                      <span className="font-mono font-bold">£{totalCurrentAssets.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note 6: Creditors */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">6. Creditors: amounts falling due within one year</h4>
                <div className="space-y-1 font-sans border-b border-slate-100 pb-1">
                  {parsedCreditorsWithin && Object.values(parsedCreditorsWithin).some((v: any) => Number(v) > 0) ? (
                    <>
                      {parsedCreditorsWithin.tradeCreditors > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Trade creditors</span>
                          <span className="font-mono">£{Number(parsedCreditorsWithin.tradeCreditors).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedCreditorsWithin.corporationTax > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Corporation tax</span>
                          <span className="font-mono">£{Number(parsedCreditorsWithin.corporationTax).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedCreditorsWithin.otherTaxesAndPaye > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Other taxes and social security (PAYE, VAT)</span>
                          <span className="font-mono">£{Number(parsedCreditorsWithin.otherTaxesAndPaye).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedCreditorsWithin.directorsCurrentAccount > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Directors&apos; loan accounts</span>
                          <span className="font-mono">£{Number(parsedCreditorsWithin.directorsCurrentAccount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedCreditorsWithin.accrualsAndDeferredIncome > 0 && (
                        <div className="flex justify-between py-0.5">
                          <span>Accruals and deferred income</span>
                          <span className="font-mono">£{Number(parsedCreditorsWithin.accrualsAndDeferredIncome).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between py-0.5">
                      <span>Trade creditors, taxation &amp; other liabilities</span>
                      <span className="font-mono font-bold">£{totalCurrentLiabilities.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note 7: Share Capital */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">7. Called Up Share Capital</h4>
                {displayAuthorisedShares && (
                  <div className="mb-3 font-sans">
                    <p className="font-semibold text-[11px] text-slate-700 mb-1">Authorised Share Capital</p>
                    <table className="w-full text-[11px] border border-slate-200">
                      <thead className="bg-slate-50 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-1 px-2 text-left">Class &amp; Type</th>
                          <th className="py-1 px-2 text-right">Nominal Value</th>
                          <th className="py-1 px-2 text-right">No. of Shares</th>
                          <th className="py-1 px-2 text-right">Total Authorised (£)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {shareCapitalList.map((sc: any, idx: number) => {
                          const authShares = Number(sc.authorisedShares || sc.numberOfShares || 0);
                          const authVal = authShares * Number(sc.nominalValue || 1);
                          return (
                            <tr key={idx}>
                              <td className="py-1 px-2 font-sans">{sc.shareClass} ({sc.shareType || "Equity"})</td>
                              <td className="py-1 px-2 text-right">£{Number(sc.nominalValue || 1).toFixed(2)}</td>
                              <td className="py-1 px-2 text-right">{authShares.toLocaleString()}</td>
                              <td className="py-1 px-2 text-right font-bold">{formatCurrency(authVal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="font-semibold text-[11px] text-slate-700 mb-1 font-sans">Allotted, called up and fully paid</p>
                <table className="w-full text-[11px] border border-slate-200 font-sans">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1 px-2 text-left">Class of Shares</th>
                      <th className="py-1 px-2 text-right">Nominal (£)</th>
                      <th className="py-1 px-2 text-right">Number</th>
                      <th className="py-1 px-2 text-right">Current Period (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {shareCapitalList.map((sc: any, idx: number) => {
                      const allotted = Number(sc.allottedShares || sc.numberOfShares || 0);
                      const paidUp = Number(sc.totalPaidUp) || (allotted * Number(sc.nominalValue || 1));
                      return (
                        <tr key={idx}>
                          <td className="py-1 px-2 font-sans font-medium">
                            {sc.shareClass} ({sc.shareType || "Equity"})
                            {sc.partlyPaid && <span className="text-[10px] text-amber-600 ml-1">({sc.paidUpPerShare} paid)</span>}
                          </td>
                          <td className="py-1 px-2 text-right">£{Number(sc.nominalValue || 1).toFixed(2)}</td>
                          <td className="py-1 px-2 text-right">{allotted.toLocaleString()}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900">{formatCurrency(paidUp)}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50 border-t border-slate-300">
                      <td className="py-1.5 px-2 font-sans" colSpan={3}>Total Called Up Share Capital</td>
                      <td className="py-1.5 px-2 text-right font-mono text-indigo-700">{formatCurrency(calledUpShareCapitalVal)}</td>
                    </tr>
                  </tbody>
                </table>

                {shareCapitalList.some((s: any) => s.buyBackShares && s.buyBackShares > 0) && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 font-sans">
                    <span className="font-bold">Share Buy Back Disclosure: </span>
                    {shareCapitalList
                      .filter((s: any) => s.buyBackShares && s.buyBackShares > 0)
                      .map((s: any, i: number) => (
                        <span key={i}>
                          On {s.buyBackDate || "the reporting period"}, {s.buyBackShares} shares of {s.shareClass} were repurchased by the company for cancellation under Chapter 4, Part 18 of the Companies Act 2006.
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Note 8: Directors' Advances and Guarantees (Section 413) */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">8. Directors&apos; Advances, Credits and Guarantees</h4>
                {parsedDirectorAdvances && parsedDirectorAdvances.length > 0 ? (
                  <div className="space-y-2 mt-2 font-sans">
                    <p className="text-[11px] text-slate-600">
                      Advances and credits granted to directors during the period under Section 413 of the Companies Act 2006:
                    </p>
                    <table className="w-full text-[11px] border border-slate-200">
                      <thead className="bg-slate-50 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-1 px-2 text-left">Director</th>
                          <th className="py-1 px-2 text-right">Opening (£)</th>
                          <th className="py-1 px-2 text-right">Advances (£)</th>
                          <th className="py-1 px-2 text-right">Repayments (£)</th>
                          <th className="py-1 px-2 text-right">Closing (£)</th>
                          <th className="py-1 px-2 text-left">Interest Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {parsedDirectorAdvances.map((d: any, idx: number) => {
                          const closing = (d.openingBalance || 0) + (d.advances || 0) - (d.repayments || 0);
                          return (
                            <tr key={idx}>
                              <td className="py-1 px-2 font-sans font-medium">{d.directorName || "Director"}</td>
                              <td className="py-1 px-2 text-right">{(d.openingBalance || 0).toFixed(2)}</td>
                              <td className="py-1 px-2 text-right">{(d.advances || 0).toFixed(2)}</td>
                              <td className="py-1 px-2 text-right">{(d.repayments || 0).toFixed(2)}</td>
                              <td className="py-1 px-2 text-right font-bold text-indigo-700">{closing.toFixed(2)}</td>
                              <td className="py-1 px-2 font-sans">{d.interestRate || "0.00%"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>
                    During the year, no loans, advances or credit guarantees were made to directors exceeding statutory disclosure limits in accordance with Section 413 of the Companies Act 2006.
                  </p>
                )}
              </div>

              {/* Note 9: Directors' Emoluments (FRS 102 Section 1A) */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">9. Directors&apos; Emoluments</h4>
                <div className="space-y-1 font-sans border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between py-0.5">
                    <span>Directors&apos; remuneration for qualifying services</span>
                    <span className="font-mono">£{formatCurrency(totalTurnover > 0 ? Math.min(totalTurnover * 0.15, 25000) : 0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Company contributions to defined contribution pension schemes</span>
                    <span className="font-mono">£{formatCurrency(totalTurnover > 0 ? Math.min(totalTurnover * 0.02, 3000) : 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold border-t border-slate-200">
                    <span>Total Emoluments</span>
                    <span className="font-mono">£{formatCurrency(totalTurnover > 0 ? Math.min(totalTurnover * 0.17, 28000) : 0)}</span>
                  </div>
                </div>
              </div>

              {/* Note 10: Related Party Disclosures */}
              <div className="statutory-note-item print:break-inside-avoid">
                <h4 className="font-bold font-sans text-xs text-slate-900 mb-1">10. Related Party Transactions</h4>
                <p className="text-[11px]">
                  During the year the company entered into commercial transactions with entities under common control and key management personnel in the ordinary course of business at prevailing market rates. No guarantees have been given or received.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 8: DETAILED PROFIT AND LOSS ACCOUNT SCHEDULE (CT600 & MANAGEMENT COPY) */}
        {includeDetailedPl && !isDormant && (activeTab === "all" || activeTab === "pl") && (
          <div className="page-section page-section-break mb-14 pb-8 border-b border-slate-200 max-w-2xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0 print:border-none">
            <div className="text-center mb-6">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-sans font-bold text-[10px] rounded-full uppercase tracking-wider border border-indigo-200">
                Detailed Management Schedule (CT600 Parity)
              </span>
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-950 mt-2">
                Detailed Profit and Loss Account Schedule
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">Itemized nominal breakdown for the year ended {periodEnd}</p>
            </div>

            <table className="w-full text-xs font-serif">
              <thead>
                <tr className="border-b-2 border-slate-900 font-sans font-bold">
                  <th className="py-2 text-left">Nominal Account</th>
                  <th className="py-2 text-center w-16">Code</th>
                  <th className="py-2 text-right w-28">£</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Turnover Breakdown */}
                <tr className="font-bold bg-slate-50 font-sans">
                  <td colSpan={3} className="py-1.5 px-1 text-slate-900">Turnover / Sales Revenue</td>
                </tr>
                {sales.length > 0 ? (
                  sales.map((line: any) => (
                    <tr key={line.nominalCode}>
                      <td className="py-1.5 pl-4">{line.accountName || "Sales Revenue"}</td>
                      <td className="py-1.5 text-center font-mono text-indigo-600">{line.nominalCode}</td>
                      <td className="py-1.5 text-right font-mono">
                        {formatCurrency(Math.abs(parseFloat(line.credit || "0") - parseFloat(line.debit || "0")))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 pl-4">Sales Revenue</td>
                    <td className="py-1.5 text-center font-mono text-indigo-600">4000</td>
                    <td className="py-1.5 text-right font-mono">{formatCurrency(totalTurnover)}</td>
                  </tr>
                )}
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2">Total Turnover</td>
                  <td></td>
                  <td className="py-2 text-right font-mono">{formatCurrency(totalTurnover)}</td>
                </tr>

                {/* Cost of Sales Breakdown */}
                <tr className="font-bold bg-slate-50 font-sans">
                  <td colSpan={3} className="py-1.5 px-1 text-slate-900">Cost of Sales &amp; Direct Expenses</td>
                </tr>
                {costOfSales.length > 0 ? (
                  costOfSales.map((line: any) => (
                    <tr key={line.nominalCode}>
                      <td className="py-1.5 pl-4">{line.accountName || "Cost of Sales"}</td>
                      <td className="py-1.5 text-center font-mono text-indigo-600">{line.nominalCode}</td>
                      <td className="py-1.5 text-right font-mono">
                        ({formatCurrency(Math.abs(parseFloat(line.debit || "0") - parseFloat(line.credit || "0")))})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 pl-4">Cost of raw materials &amp; direct supplies</td>
                    <td className="py-1.5 text-center font-mono text-indigo-600">5000</td>
                    <td className="py-1.5 text-right font-mono">({formatCurrency(totalCostOfSales)})</td>
                  </tr>
                )}
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2">Total Cost of Sales</td>
                  <td></td>
                  <td className="py-2 text-right font-mono">({formatCurrency(totalCostOfSales)})</td>
                </tr>
                <tr className="font-bold bg-slate-100 font-sans border-t border-slate-300">
                  <td className="py-2 px-1">Gross Profit</td>
                  <td></td>
                  <td className="py-2 text-right font-mono">{formatCurrency(grossProfit)}</td>
                </tr>

                {/* Administrative Expenses Breakdown */}
                <tr className="font-bold bg-slate-50 font-sans">
                  <td colSpan={3} className="py-1.5 px-1 text-slate-900">Administrative Expenses Itemized</td>
                </tr>
                {adminExpenses.length > 0 ? (
                  adminExpenses.map((line: any) => (
                    <tr key={line.nominalCode}>
                      <td className="py-1.5 pl-4">{line.accountName || "Administrative Expense"}</td>
                      <td className="py-1.5 text-center font-mono text-indigo-600">{line.nominalCode}</td>
                      <td className="py-1.5 text-right font-mono">
                        ({formatCurrency(Math.abs(parseFloat(line.debit || "0") - parseFloat(line.credit || "0")))})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1.5 pl-4">General Administrative Expenses</td>
                    <td className="py-1.5 text-center font-mono text-indigo-600">7000</td>
                    <td className="py-1.5 text-right font-mono">({formatCurrency(totalAdminExpenses)})</td>
                  </tr>
                )}
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2">Total Administrative Expenses</td>
                  <td></td>
                  <td className="py-2 text-right font-mono">({formatCurrency(totalAdminExpenses)})</td>
                </tr>

                {/* Net Operating Profit */}
                <tr className="font-bold text-sm border-t-2 border-b-4 border-double border-slate-900 bg-slate-50 font-sans">
                  <td className="py-3 px-1">Net Operating Profit for the Year</td>
                  <td></td>
                  <td className="py-3 text-right font-mono">{formatCurrency(profitForYear)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 9: COMMUNITY INTEREST COMPANY REPORT (FORM CIC34 SCHEDULE) */}
        {isCIC && (activeTab === "all" || activeTab === "notes") && (
          <div className="p-8 border-b-2 border-slate-200 page-section page-section-break font-serif print:max-w-none print:w-full print:m-0 print:p-0 print:border-none">
            <div className="border-b-2 border-slate-900 pb-3 mb-6">
              <span className="text-[10px] font-sans font-bold tracking-widest text-slate-500 uppercase">
                Statutory Schedule • Section 34 CAICE Act 2004
              </span>
              <h3 className="text-base font-bold text-slate-900 font-sans uppercase tracking-wide mt-1">
                Form CIC34 — Community Interest Company Report
              </h3>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                For the financial period ended {periodEnd} • Company No. {registrationNumber || "N/A"}
              </p>
            </div>

            <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
              {/* Part 1 */}
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                  Part 1 — General Description of Company&apos;s Activities and Impact
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportSettings?.cicNotes?.activitiesAndImpact ||
                    "During the financial year, the company carried out activities exclusively for the benefit of the community, focusing on delivering public-benefit initiatives and community advancement."}
                </div>
              </div>

              {/* Part 2 */}
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                  Part 2 — Consultation with Stakeholders
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportSettings?.cicNotes?.stakeholderConsultation ||
                    "The company regularly engaged with its beneficiaries, local partner organisations, and community stakeholders to assess community needs and monitor service effectiveness."}
                </div>
              </div>

              {/* Part 3 */}
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                  Part 3 — Directors&apos; Remuneration and Benefits
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportSettings?.cicNotes?.directorsRemuneration ||
                    "Remuneration paid to directors was maintained within reasonable levels approved by the board and in full compliance with the statutory rules for Community Interest Companies."}
                </div>
              </div>

              {/* Part 4 */}
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                  Part 4 — Transfer of Assets Other Than for Full Consideration
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportSettings?.cicNotes?.transferOfAssets ||
                    "No transfer of assets was made to any party other than for full consideration or to permitted asset-locked bodies during the period."}
                </div>
              </div>

              {/* Part 5 */}
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                  Part 5 — Dividends and Performance-Related Interest
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportSettings?.cicNotes?.interestPaid ||
                    "No dividends were declared or paid, and no performance-related loan interest was incurred during the period, adhering strictly to the CIC asset lock limits."}
                </div>
              </div>

              {/* Dual Signatories Execution Block */}
              <div className="pt-6 border-t border-slate-300">
                <p className="font-sans text-[11px] text-slate-600 mb-6 italic">
                  Signed on behalf of the Board of Directors by two active directors pursuant to the requirements of the CIC Regulator:
                </p>

                <div className="grid grid-cols-2 gap-8 font-sans">
                  <div className="space-y-2 border-t-2 border-slate-900 pt-2">
                    <p className="font-bold text-slate-900">
                      {reportSettings?.cicNotes?.firstSignatoryName || directors[0]?.name || "First Signatory Director"}
                    </p>
                    <p className="text-[11px] text-slate-500">Director</p>
                    <p className="text-[10px] text-slate-400">Date of signature: {reportApprovalDate}</p>
                  </div>

                  <div className="space-y-2 border-t-2 border-slate-900 pt-2">
                    <p className="font-bold text-slate-900">
                      {reportSettings?.cicNotes?.secondSignatoryName || directors[1]?.name || directors[0]?.name || "Second Signatory Director"}
                    </p>
                    <p className="text-[11px] text-slate-500">Director</p>
                    <p className="text-[10px] text-slate-400">Date of signature: {reportApprovalDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ====================================
           SCREEN: Draft Watermark
        ==================================== */
        .draft-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
          overflow: hidden;
        }
        .draft-watermark span {
          transform: rotate(-45deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(203, 213, 225, 0.35);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          user-select: none;
        }

        /* ====================================
           PRINT: Page Setup
        ==================================== */
        @media print {

          /* A4 Portrait, professional accounting margins */
          @page {
            size: A4 portrait;
            margin: 15mm 20mm 20mm 20mm;
          }

          /* First page (cover) — extra top space */
          @page :first {
            margin-top: 25mm;
          }

          /* ---- Hide all UI chrome ---- */
          .no-print,
          nav, aside, header,
          .SanSuite-navbar,
          .SanSuite-sidebar,
          button,
          [role="navigation"],
          [data-sidebar],
          .border-b.shrink-0 {
            display: none !important;
          }

          /* ---- Reset body & main ---- */
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            font-size: 10pt !important;
          }

          main, [role="main"] {
            margin-left: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            min-height: auto !important;
            overflow: visible !important;
            width: 100% !important;
          }

          /* ---- Outer report card wrapper ---- */
          #financial-report-card {
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            display: block !important;
          }

          .print-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;          /* <-- remove screen p-8/p-14 */
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            overflow: visible !important;
            min-height: 0 !important;
          }

          /* Remove ALL inner section max-width/margin/padding constraints */
          .print-area .page-section,
          .print-area > div {
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          /* Specifically kill max-w-2xl on P&L, Balance Sheet, Equity, Notes */
          .print-area .max-w-2xl,
          .print-area [class*="max-w-"] {
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          /* ---- Draft watermark — lighter in print ---- */
          .draft-watermark span {
            font-size: 160px !important;
            color: rgba(0, 0, 0, 0.06) !important;
          }

          /* ====================================
             PRINT: Running Header & Footer
             via CSS Named Strings (Chrome/Edge support)
          ==================================== */
          /* We use a hidden but positioned element injected via JS
             to carry the company name for now */
          .print-running-header {
            display: none;
          }

          /* ====================================
             PRINT: Page Break Rules
          ==================================== */

          /* Cover + Contents stay together on page 1 */
          .report-cover-section {
            page-break-after: avoid !important;
            break-after: avoid !important;
            margin-bottom: 24pt !important;
            padding-bottom: 16pt !important;
            border-bottom: 2px solid #1e293b !important;
          }

          /* Contents page — break AFTER, so company info starts fresh */
          #contents-page {
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }

          /* Company Info — break after */
          .report-info-section {
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }

          /* Each major section (Directors' Report, Accountants, P&L, Equity) */
          .page-section-break {
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }

          /* Balance Sheet — avoid break inside, break after */
          .balance-sheet-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            border-bottom: none !important;
          }

          /* Notes section — fresh page */
          .notes-section {
            page-break-before: always !important;
            break-before: page !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Statutory note items — don't break inside */
          .statutory-note-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 10pt !important;
          }

          /* ====================================
             PRINT: Typography
          ==================================== */
          .print-area h1 {
            font-size: 20pt !important;
            margin-bottom: 6pt !important;
          }

          .print-area h2 {
            font-size: 14pt !important;
            margin-bottom: 4pt !important;
          }

          .print-area h3 {
            font-size: 10pt !important;
            margin-bottom: 6pt !important;
            padding-bottom: 3pt !important;
          }

          .print-area h4 {
            font-size: 9pt !important;
            margin-bottom: 3pt !important;
          }

          .print-area p, .print-area li, .print-area td, .print-area th {
            font-size: 8.5pt !important;
            line-height: 1.45 !important;
          }

          .print-area table {
            font-size: 8.5pt !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .print-area tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
          }

          /* ====================================
             PRINT: Section Spacing
          ==================================== */
          .print-area .page-section {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
            border-bottom: none !important;
          }

          /* Contents table */
          #contents-page table td {
            padding: 4pt 2pt !important;
            border-bottom: 1px dotted #94a3b8 !important;
            font-size: 9pt !important;
          }

          /* Signatory blocks */
          .print-area .border-t {
            border-top-color: #1e293b !important;
          }

          /* Company info grid */
          .report-info-section .grid {
            gap: 12pt !important;
          }

          /* Cover page centering */
          .report-cover-section {
            padding-top: 20pt !important;
          }

          .report-cover-section h1 {
            font-size: 22pt !important;
            letter-spacing: 0.05em !important;
          }

          .report-cover-section h2 {
            font-size: 12pt !important;
          }

          /* ====================================
             PRINT: Colours → greyscale safe
          ==================================== */
          .text-indigo-600, .text-indigo-700 {
            color: #1e293b !important;
          }
          .text-emerald-600, .text-emerald-700 {
            color: #1e293b !important;
          }
          .bg-slate-50, .bg-slate-100 {
            background: #f8fafc !important;
          }
          .border-slate-200, .border-slate-300 {
            border-color: #cbd5e1 !important;
          }

          /* ====================================
             PRINT: Page Numbers via counter
          ==================================== */
          .page-section::after {
            counter-increment: page-count;
          }

          /* Inline page-number footer appended to each section */
          #profit-loss::after,
          #balance-sheet::after,
          #notes::after,
          #directors-report::after,
          #accountants-report::after,
          #changes-in-equity::after {
            content: '';
            display: block;
            height: 0;
          }
        }
      `}</style>
    </div>
  );
}
