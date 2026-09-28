import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/queryClient";
import { downloadAuthorizedFile } from "../../../lib/authDownload";
import { useToast } from "../../../hooks/useToast";
import {
  Printer, Download, X, Calculator, Calendar, Building2,
  FileText, CheckCircle2, ChevronRight, ExternalLink
} from "lucide-react";

interface CTComputationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  client: any;
  currentReturn: any;
  returns: any[];
  onSelectReturn?: (id: number) => void;
}

export default function CTComputationReportModal({
  isOpen,
  onClose,
  clientId,
  client,
  currentReturn,
  returns,
  onSelectReturn,
}: CTComputationReportModalProps) {
  const [activeReturnId, setActiveReturnId] = useState<number | null>(
    currentReturn?.id || (returns.length > 0 ? returns[0].id : null)
  );

  const selectedRet = returns.find((r) => r.id === (activeReturnId || currentReturn?.id)) || currentReturn;

  const { data: compData, isLoading } = useQuery<any>({
    queryKey: [`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/computation-report`],
    queryFn: async () => {
      if (!selectedRet?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${selectedRet.id}/computation-report`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!selectedRet?.id,
  });

  const { toast } = useToast();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!selectedRet?.id) return;
    const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      toast({ title: "Downloading Computation", description: "Preparing official CT Computation PDF..." });
      await downloadAuthorizedFile(`/api/corporation-tax/${clientId}/returns/${selectedRet.id}/computation-pdf`, `${safeName}_CT_Calc.pdf`);
      toast({ title: "Download Complete", description: `${safeName}_CT_Calc.pdf downloaded successfully.` });
    } catch (err: any) {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadDoc = async () => {
    if (!selectedRet?.id) return;
    const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      toast({ title: "Downloading Cover Letter", description: "Preparing Client Tax Summary Document..." });
      await downloadAuthorizedFile(`/api/corporation-tax/${clientId}/returns/${selectedRet.id}/tax-summary-doc`, `${safeName}_CT_Calc.doc`);
      toast({ title: "Download Complete", description: `${safeName}_CT_Calc.doc downloaded successfully.` });
    } catch (err: any) {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    }
  };

  const startDate = selectedRet?.accountingPeriodStart ? new Date(selectedRet.accountingPeriodStart) : new Date();
  const endDate = selectedRet?.accountingPeriodEnd ? new Date(selectedRet.accountingPeriodEnd) : new Date();

  const periodLabel = `${startDate.toLocaleDateString("en-GB")} - ${endDate.toLocaleDateString("en-GB")}`;
  const startDateStr = startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const endDateStr = endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const netProfit = compData ? compData.netProfit : parseFloat(selectedRet?.netAccountingProfit || "0");
  const disallowables = compData ? compData.disallowables : parseFloat(selectedRet?.disallowableExpenses || "0");
  const depreciation = compData ? compData.depreciation : parseFloat(selectedRet?.depreciationAddBack || "0");
  const capitalAllowances = compData ? compData.capitalAllowances : parseFloat(selectedRet?.capitalAllowancesClaimed || "0");
  const lossRelief = compData ? compData.lossRelief : parseFloat(selectedRet?.tradingLossesRelievedCurrentYear || "0");
  const nonTrading = compData ? compData.nonTrading : parseFloat(selectedRet?.nonTradingIncome || "0");
  const donations = compData ? compData.donations : parseFloat(selectedRet?.qualifyingDonations || "0");
  const profitsChargeable = compData ? compData.profitsChargeable : parseFloat(selectedRet?.profitsChargeableToCt || selectedRet?.taxableTradingProfit || "0");
  const fyBreakdown = compData?.fyBreakdown || [];
  const totalTaxChargeable = compData ? compData.totalTaxChargeable : parseFloat(selectedRet?.corporationTaxPayable || selectedRet?.netTaxDue || "0");
  const taxOutstanding = compData ? compData.taxOutstanding : parseFloat(selectedRet?.netTaxDue || "0");

  const companyName = client?.clientName || "JAS DEALS LIMITED";
  const taxReference = selectedRet?.utrNumber || client?.utrNumber || "2206901577";
  const taxDistrict = "623";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-t-xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Corporation Tax Computation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statutory UK Tax Computation (Commercial Profit & Loss Reconciliation to CT600)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print official statutory computation schedule"
            >
              <Printer size={14} className="text-indigo-600" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Download official Corporation Tax Computation PDF directly"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadDoc}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Client Cover Letter (.doc format)"
            >
              <FileText size={14} className="text-teal-600" />
              <span>Cover Letter (.doc)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Period Tabs Bar (Capium Style) */}
        {returns.length > 0 && (
          <div className="bg-slate-100/70 dark:bg-slate-950/80 px-6 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto print:hidden">
            {returns.map((ret) => {
              const rStart = new Date(ret.accountingPeriodStart).toLocaleDateString("en-GB");
              const rEnd = new Date(ret.accountingPeriodEnd).toLocaleDateString("en-GB");
              const isSelected = ret.id === (activeReturnId || currentReturn?.id);
              return (
                <button
                  key={ret.id}
                  onClick={() => {
                    setActiveReturnId(ret.id);
                    if (onSelectReturn) onSelectReturn(ret.id);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 border-b-transparent -mb-[1px]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 border-transparent hover:bg-slate-200/50"
                  }`}
                >
                  {rStart} - {rEnd}
                </button>
              );
            })}
          </div>
        )}

        {/* Printable & Scrollable Computation Report Container */}
        <div className="flex-1 overflow-y-auto p-8 font-sans bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[13px] print:p-0 print:m-0 print:overflow-visible">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Loading statutory tax computation data...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Report Header Metadata (Matches Page 1) */}
              <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-4">
                    <span className="w-32 font-bold text-slate-900 dark:text-slate-100">Company Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-wide">{companyName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-32 font-bold text-slate-900 dark:text-slate-100">Tax District:</span>
                    <span>{taxDistrict}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-32 font-bold text-slate-900 dark:text-slate-100">Tax Reference:</span>
                    <span className="font-mono font-semibold">{taxReference}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-4">
                    <span className="w-36 font-bold text-slate-900 dark:text-slate-100">Accounting period:</span>
                    <span>from {startDateStr} to {endDateStr}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-36 font-bold text-slate-900 dark:text-slate-100">Return for period:</span>
                    <span>from {startDateStr} to {endDateStr}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Trading and Professional Profits Summary */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  1. Trading and Professional Profits Summary
                </h3>

                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-slate-700 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                      <th className="text-left py-1 w-1/2"></th>
                      <th className="py-1 w-24">£</th>
                      <th className="py-1 w-24">£</th>
                      <th className="py-1 w-24">£</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent font-medium">
                    <tr>
                      <td className="text-left py-1.5">Net Profit Per Accounts</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono">{netProfit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5"></td>
                    </tr>
                    {disallowables > 0 && (
                      <tr>
                        <td className="text-left py-1 text-slate-600 dark:text-slate-400 pl-4">Add: Disallowable expenses</td>
                        <td className="py-1 font-mono">{disallowables.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                        <td className="py-1"></td>
                        <td className="py-1"></td>
                      </tr>
                    )}
                    {depreciation > 0 && (
                      <tr>
                        <td className="text-left py-1 text-slate-600 dark:text-slate-400 pl-4">Add: Depreciation add-back</td>
                        <td className="py-1 font-mono">{depreciation.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                        <td className="py-1"></td>
                        <td className="py-1"></td>
                      </tr>
                    )}
                    {capitalAllowances > 0 && (
                      <tr>
                        <td className="text-left py-1 text-slate-600 dark:text-slate-400 pl-4">Less: Capital allowances claimed</td>
                        <td className="py-1 font-mono">({capitalAllowances.toLocaleString("en-GB", { minimumFractionDigits: 2 })})</td>
                        <td className="py-1"></td>
                        <td className="py-1"></td>
                      </tr>
                    )}
                    {lossRelief > 0 && (
                      <tr>
                        <td className="text-left py-1 text-slate-600 dark:text-slate-400 pl-4">Less: Trading losses relieved</td>
                        <td className="py-1 font-mono">({lossRelief.toLocaleString("en-GB", { minimumFractionDigits: 2 })})</td>
                        <td className="py-1"></td>
                        <td className="py-1"></td>
                      </tr>
                    )}

                    <tr className="border-t border-slate-300 dark:border-slate-700">
                      <td className="text-left py-1.5">Adjusted profit for the period</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono font-semibold">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="border-t-2 border-b-2 border-slate-800 dark:border-slate-200 font-bold">
                      <td className="text-left py-1.5">Profit chargeable to corporation tax profits</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Page Break in Print Mode */}
              <div className="print:break-before-page pt-6"></div>

              {/* Section 2: Corporation Tax Computation */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  2. Corporation Tax Computation
                </h3>

                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-slate-700 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                      <th className="text-left py-1 w-1/2"></th>
                      <th className="py-1 w-24">£</th>
                      <th className="py-1 w-24">£</th>
                      <th className="py-1 w-24">£</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent font-medium">
                    <tr>
                      <td className="text-left py-1.5">Adjusted trading profit of this period</td>
                      <td className="py-1.5 font-mono">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td className="text-left py-1.5">Net trading profits</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5"></td>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td className="text-left py-1.5 font-semibold">Profits before other deductions and reliefs</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono font-semibold">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>

                    <tr>
                      <td className="text-left py-2 font-bold text-slate-900 dark:text-slate-100" colSpan={4}>
                        <u>Deductions and reliefs:</u>
                      </td>
                    </tr>

                    <tr className="border-t border-slate-300 dark:border-slate-700">
                      <td className="text-left py-1.5 font-semibold">Profits before qualifying donations and group relief</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono font-semibold">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-t-2 border-b-2 border-slate-800 dark:border-slate-200 font-bold">
                      <td className="text-left py-1.5">Total profits chargeable to corporation tax</td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5"></td>
                      <td className="py-1.5 font-mono">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Calculation (Financial Year Split) */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  <u>Tax calculation:</u>
                </h4>

                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                      <th className="text-left py-1 w-2/5"></th>
                      <th className="py-1 w-24">£</th>
                      <th className="py-1 w-20 text-center">%</th>
                      <th className="py-1 w-24">£</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent font-medium">
                    {fyBreakdown.length > 0 ? (
                      fyBreakdown.map((fy: any, idx: number) => (
                        <tr key={idx}>
                          <td className="text-left py-1.5">{fy.periodLabel}</td>
                          <td className="py-1.5 font-mono">{parseFloat(fy.profit).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 font-mono text-center">{parseFloat(fy.rate).toFixed(2)}</td>
                          <td className="py-1.5 font-mono">{parseFloat(fy.tax).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-left py-1.5">Financial Year : {endDate.getFullYear()}</td>
                        <td className="py-1.5 font-mono">{profitsChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 font-mono text-center">19.00</td>
                        <td className="py-1.5 font-mono">{totalTaxChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}

                    <tr className="border-t border-slate-800 dark:border-slate-200 font-bold">
                      <td className="text-left py-2">Corporation Tax chargeable</td>
                      <td className="py-2"></td>
                      <td className="py-2"></td>
                      <td className="py-2 font-mono">{totalTaxChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculation of tax outstanding or overpaid */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  <u>Calculation of tax outstanding or overpaid:</u>
                </h4>

                <table className="w-full text-right">
                  <tbody className="font-medium">
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td className="text-left py-1.5">Net corporation tax payable</td>
                      <td className="py-1.5 w-24 font-mono font-semibold">{taxOutstanding.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="text-left py-1.5">Corporation Tax chargeable</td>
                      <td className="py-1.5 w-24 font-mono font-semibold">{totalTaxChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-300 dark:border-slate-700">
                      <td className="text-left py-1.5">Self-assessment of tax payable</td>
                      <td className="py-1.5 w-24 font-mono font-semibold">{totalTaxChargeable.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Reconciliation */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  <u>Tax reconciliation:</u>
                </h4>

                <table className="w-full text-right">
                  <tbody className="font-medium">
                    <tr className="border-t-2 border-b-2 border-slate-800 dark:border-slate-200 font-bold">
                      <td className="text-left py-2">Tax outstanding</td>
                      <td className="py-2 w-24 font-mono">£{taxOutstanding.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Print Footer */}
              <div className="pt-8 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Official SanSuite Corporation Tax Computation Schedule • Form CT600 Supporting Schedule
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-b-xl print:hidden">
          <div className="text-xs text-slate-500">
            HMRC Ref: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{taxReference}</span> • District: {taxDistrict}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadDoc}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={13} />
              Download Client .doc Letter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
