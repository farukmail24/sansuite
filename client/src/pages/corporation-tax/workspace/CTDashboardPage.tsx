import { Link } from "wouter";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import {
  Building2, Calculator, Shield, Calendar, Clock, AlertCircle,
  CheckCircle2, ArrowRight, ExternalLink, FileSpreadsheet, FileText,
  FileSignature, Printer, Layers, Trash2, Plus
} from "lucide-react";

export default function CTDashboardPage() {
  return (
    <CTWorkspaceLayout activeSection="Overview & Deadlines">
      <CTDashboardContent />
    </CTWorkspaceLayout>
  );
}

function CTDashboardContent() {
  const {
    clientId,
    client,
    returns,
    selectedReturnId,
    setSelectedReturnId,
    currentReturn,
    openNewReturnModal,
    openDeleteModal,
    openManageReturnsModal,
    updateReturnStatus
  } = useCTWorkspace();

  if (!currentReturn) {
    return null;
  }

  // Calculate Days Remaining
  const now = new Date();
  const paymentDueDate = currentReturn.paymentDueDate ? new Date(currentReturn.paymentDueDate) : null;
  const filingDueDate = currentReturn.filingDueDate ? new Date(currentReturn.filingDueDate) : null;

  const paymentDaysLeft = paymentDueDate ? Math.ceil((paymentDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const filingDaysLeft = filingDueDate ? Math.ceil((filingDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6">
      {/* 0. Guidance & Draft Status Banner */}
      {currentReturn.status === "Draft" && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-xs">
                CT600 Return #{currentReturn.id} is in Draft Status
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Financial figures were transferred from Accounts Production. Review your computation adjustments, apply capital allowances, and update the status when ready to file.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              href={`/corporation-tax/${clientId}/computation`}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Review Computation</span>
              <ArrowRight size={12} />
            </Link>
            <button
              onClick={() => updateReturnStatus(currentReturn.id, "In Review")}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 hover:bg-amber-100/50 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Mark as In Review
            </button>
          </div>
        </div>
      )}

      {/* 1. Entity & Statutory Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-indigo-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Corporate Tax Statutory Profile</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                currentReturn.status === "Accepted"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : currentReturn.status === "Validated"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {currentReturn.status || "Draft"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Company 10-Digit UTR</span>
            <span className="font-mono font-bold text-indigo-600 text-sm">
              {currentReturn.utrNumber || client.utrNumber || "Not Configured"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Companies House Reg No</span>
            {client.registrationNumber ? (
              <a
                href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 inline-flex items-center gap-1 font-mono"
              >
                <span>{client.registrationNumber}</span>
                <ExternalLink size={11} className="text-slate-400" />
              </a>
            ) : (
              <span className="font-semibold text-slate-800 dark:text-slate-200">N/A</span>
            )}
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Current Tax Year</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{currentReturn.taxYear || "2026/2027"}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">HMRC IR Mark</span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate block">
              {currentReturn.irMark || "Pending Validation"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Statutory Deadlines (HMRC 9m 1d and 12m Rules) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Deadline */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">Corporation Tax Payment Due</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {paymentDueDate ? paymentDueDate.toLocaleDateString("en-GB") : "N/A"}
              </p>
              <p className="text-[10px] text-slate-500">Rule: AP End + 9 months 1 day</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                paymentDaysLeft !== null && paymentDaysLeft <= 30
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {paymentDaysLeft !== null ? `${paymentDaysLeft} Days Remaining` : "N/A"}
            </span>
          </div>
        </div>

        {/* Filing Deadline */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400">CT600 Filing Due Date</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {filingDueDate ? filingDueDate.toLocaleDateString("en-GB") : "N/A"}
              </p>
              <p className="text-[10px] text-slate-500">Rule: AP End + 12 months</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {filingDaysLeft !== null ? `${filingDaysLeft} Days Remaining` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. All CT600 Returns & Period Management Table (Remove Duplicates / Switch Returns) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Client CT600 Returns & Filing History ({returns.length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review all accounting periods, switch the active return, or delete duplicate draft returns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openNewReturnModal}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={12} /> New CT600 Return
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Return ID</th>
                <th className="py-2.5 px-4 font-semibold">Accounting Period</th>
                <th className="py-2.5 px-4 font-semibold">Tax Year</th>
                <th className="py-2.5 px-4 font-semibold">Turnover</th>
                <th className="py-2.5 px-4 font-semibold">Taxable Profit</th>
                <th className="py-2.5 px-4 font-semibold">Net Tax Due</th>
                <th className="py-2.5 px-4 font-semibold">Workflow Status</th>
                <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {returns.map((r) => {
                const isActive = r.id === selectedReturnId;
                return (
                  <tr
                    key={r.id}
                    className={isActive ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      #{r.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {new Date(r.accountingPeriodStart).toLocaleDateString("en-GB")} – {new Date(r.accountingPeriodEnd).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {r.taxYear || "CT600"}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      £{parseFloat(r.turnover || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      £{parseFloat(r.taxableTradingProfit || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      £{parseFloat(r.netTaxDue || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={r.status || "Draft"}
                        onChange={(e) => updateReturnStatus(r.id, e.target.value)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border-0 cursor-pointer ${
                          r.status === "Accepted"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                            : r.status === "Validated"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                            : r.status === "Submitted"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="In Review">In Review</option>
                        <option value="Validated">Validated</option>
                        <option value="ReadyToSubmit">Ready to Submit</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Accepted">Accepted</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isActive ? (
                          <button
                            onClick={() => setSelectedReturnId(r.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            Set Active
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        )}
                        {r.status !== "Accepted" && (
                          <button
                            onClick={() => openDeleteModal(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                            title="Delete this Return (remove duplicate)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Computation Highlights Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Tax Computation Snapshot</h3>
          </div>
          <Link href={`/corporation-tax/${clientId}/computation`}>
            <span className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer">
              Edit Computation <ArrowRight size={12} />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-0.5">Turnover</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              £{parseFloat(currentReturn.turnover || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-0.5">Taxable Trading Profit</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              £{parseFloat(currentReturn.taxableTradingProfit || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-0.5">Applicable CT Rate</span>
            <span className="font-bold text-indigo-600 text-sm">
              {currentReturn.ctRatePercentage || "19.00"}%
            </span>
            {parseFloat(currentReturn.marginalReliefAmount || "0") > 0 && (
              <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                Marginal Relief Applied
              </span>
            )}
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mb-0.5 font-semibold">Net Tax Due to HMRC</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">
              £{parseFloat(currentReturn.netTaxDue || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Quick Workflow Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/corporation-tax/${clientId}/computation`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calculator size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between text-xs">
              <span>CT600 Computation</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </h3>
            <p className="text-[11px] text-slate-500">1-Click Accounts Production bridge & P&L tax adjustments.</p>
          </div>
        </Link>

        <Link href={`/corporation-tax/${clientId}/calculators`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between text-xs">
              <span>Calculators Hub</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </h3>
            <p className="text-[11px] text-slate-500">Capital allowances (AIA, WDA), loss schedules & s455 loans.</p>
          </div>
        </Link>

        <Link href={`/corporation-tax/${clientId}/tax-due`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Printer size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between text-xs">
              <span>Tax Due Advice</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </h3>
            <p className="text-[11px] text-slate-500">Payment slip with UTR reference & HMRC bank transfer details.</p>
          </div>
        </Link>

        <Link href={`/corporation-tax/${clientId}/submit`}>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer space-y-2 shadow-xs group">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Shield size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between text-xs">
              <span>HMRC Submit Gateway</span>
              <ArrowRight size={12} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </h3>
            <p className="text-[11px] text-slate-500">Pre-filing validation, IR Mark generation & GovTalk XML filing.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
