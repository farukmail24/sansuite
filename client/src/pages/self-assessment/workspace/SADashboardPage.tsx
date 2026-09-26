import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { Link } from "wouter";
import {
  UserCheck, Calendar, Calculator, Shield, FileText, ArrowRight,
  Clock, AlertCircle, CheckCircle2, DollarSign, Plus, CreditCard,
  FileSpreadsheet, HelpCircle, Layers, ExternalLink, Copy
} from "lucide-react";

export default function SADashboardPage() {
  return (
    <SAWorkspaceLayout activeSection="Dashboard">
      <SADashboardContent />
    </SAWorkspaceLayout>
  );
}

function SADashboardContent() {
  const { clientId, client, currentReturn, selectedTaxYear, setOpenNewReturnModal, handleDuplicateAmended, isDuplicatingAmended } = useSAWorkspace();

  // Calculate deadline days
  const now = new Date();
  const paymentDeadline = currentReturn.paymentDueDate ? new Date(currentReturn.paymentDueDate) : new Date("2026-01-31");
  const secondPoaDeadline = currentReturn.secondPoaDueDate ? new Date(currentReturn.secondPoaDueDate) : new Date("2026-07-31");

  const diffPaymentDays = Math.ceil((paymentDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const diffSecondPoaDays = Math.ceil((secondPoaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const totalIncome = parseFloat(currentReturn.netIncome || "0");
  const taxableIncome = parseFloat(currentReturn.taxableIncome || "0");
  const incomeTaxDue = parseFloat(currentReturn.incomeTaxDue || "0");
  const class2NicDue = parseFloat(currentReturn.class2NicDue || "0");
  const class4NicDue = parseFloat(currentReturn.class4NicDue || "0");
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const poaFirst = parseFloat(currentReturn.poaFirstPayment || "0");

  const isSubmitted = currentReturn.status === "Submitted" || currentReturn.status === "Accepted";
  const isAmended = currentReturn.taxYear?.includes("Amended") || currentReturn.isAmended;

  return (
    <div className="space-y-6">
      {/* Submitted Status & Amended Option Banner (Capium Art 31, 51) */}
      {isSubmitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                Tax Return Filed to HMRC for {currentReturn.taxYear}
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                {currentReturn.irMark ? `IR Mark: ${currentReturn.irMark} • ` : ""}
                Locked for direct editing. To correct figures or submit an amendment, duplicate as an amended return.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDuplicateAmended}
            disabled={isDuplicatingAmended}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Copy size={13} className={isDuplicatingAmended ? "animate-spin" : ""} />
            <span>Duplicate as Amended Return</span>
          </button>
        </div>
      )}

      {/* Amended Return Indicator Banner */}
      {isAmended && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Amended Return in Progress:</strong> Figures in this return can be adjusted and re-transmitted to HMRC as an official amendment under TMA 1970 s9ZA.
          </span>
        </div>
      )}
      {/* 1. Profile and Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Taxpayer Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assessee Profile</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              {client?.clientType || "Individual"}
            </span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{client?.clientName}</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{client?.clientCode || "Client ID: " + clientId}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">UTR Number</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {currentReturn.utrNumber || client?.utrNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">NI Number</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {currentReturn.niNumber || client?.niNumber || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Filing & Balancing Payment Deadline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filing & Balancing Payment</span>
            <Calendar size={15} className="text-purple-600" />
          </div>

          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              31 January {paymentDeadline.getFullYear()}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Online SA100 Submission & Balance Due</p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Days Remaining:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              diffPaymentDays > 60
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : diffPaymentDays > 30
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            }`}>
              {diffPaymentDays > 0 ? `${diffPaymentDays} days left` : "Overdue"}
            </span>
          </div>
        </div>

        {/* Second Payment on Account Deadline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Second Payment on Account</span>
            <Clock size={15} className="text-blue-600" />
          </div>

          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              31 July {secondPoaDeadline.getFullYear()}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">50% Advance Payment on Account</p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Days Remaining:</span>
            <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              {diffSecondPoaDays > 0 ? `${diffSecondPoaDays} days left` : "Passed"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tax Computation Overview Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calculator size={16} className="text-purple-600" />
              Tax Computation Summary ({currentReturn.taxYear})
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Statutory personal tax liability and National Insurance overview
            </p>
          </div>

          <Link
            href={`/self-assessment/${clientId}/calculation`}
            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={13} />
            Full SA302 Breakdown
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Figures Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Total Income</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              £{totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Personal Allowance</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              £{parseFloat(currentReturn.personalAllowance || "12570").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Taxable Income</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              £{taxableIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Income Tax</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              £{incomeTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Class 2 & 4 NIC</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              £{(class2NicDue + class4NicDue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block uppercase tracking-wider">Net Tax Due</span>
            <span className="text-base font-black text-purple-900 dark:text-purple-100 font-mono mt-0.5 block">
              £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Workflow Navigation Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wider">
          Statutory Workflow & Forms
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href={`/self-assessment/${clientId}/forms`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <FileText size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">1. SA100 Core Income</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Bank interest, dividends, pensions, state benefits, Gift Aid, and student loan details.
            </p>
          </Link>

          <Link
            href={`/self-assessment/${clientId}/schedules`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                <Layers size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">2. Supplementary Schedules</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              SA102 Employment, SA103 Sole Trader, SA105 Property, and SA108 Capital Gains schedules.
            </p>
          </Link>

          <Link
            href={`/self-assessment/${clientId}/calculators`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                <Calculator size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">3. Capital Allowances & Losses</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              AIA £1M claim, Main Pool 18% WDA, Special Pool 6% WDA, and trading losses brought forward (s83/s64).
            </p>
          </Link>

          <Link
            href={`/self-assessment/${clientId}/poa`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <CreditCard size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">4. Payments on Account (PoA)</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Calculate January & July advance payments, de minimis thresholds, and claim to reduce PoA.
            </p>
          </Link>

          <Link
            href={`/self-assessment/${clientId}/tax-due`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                <FileText size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">5. Tax Due Notice</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Official client payment slip with 10-digit UTR + K reference and HMRC Shipley bank account details.
            </p>
          </Link>

          <Link
            href={`/self-assessment/${clientId}/submit`}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                <Shield size={18} />
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">6. HMRC Submit Gateway</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Canonical 4-step electronic filing wizard, IR Mark generation, and live HMRC GovTalk XML submission.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
