import { useState } from "react";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import {
  FileSpreadsheet, Printer, Download, Calculator, CheckCircle2,
  AlertCircle, RefreshCw, ArrowRight, Shield, CreditCard, ChevronRight, HelpCircle
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "../../../hooks/useToast";

export default function SACalculationPage() {
  return (
    <SAWorkspaceLayout activeSection="Tax Calculation & SA302">
      <SACalculationContent />
    </SAWorkspaceLayout>
  );
}

function SACalculationContent() {
  const { clientId, client, currentReturn, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Parse values
  const totalIncome = parseFloat(currentReturn.totalIncomeReceived || "0");
  const personalAllowance = parseFloat(currentReturn.personalAllowance || "12570");
  const taxableIncome = parseFloat(currentReturn.totalTaxableIncome || "0");

  const nonSavingsTax = parseFloat(currentReturn.nonSavingsTax || "0");
  const savingsTax = parseFloat(currentReturn.savingsTax || "0");
  const dividendTax = parseFloat(currentReturn.dividendTax || "0");
  const class2Nic = parseFloat(currentReturn.class2Nic || "0");
  const class4Nic = parseFloat(currentReturn.class4Nic || "0");
  const cgtDue = parseFloat(currentReturn.cgtDue || "0");
  const studentLoanDue = parseFloat(currentReturn.studentLoanDue || "0");
  const totalTaxAndNic = parseFloat(currentReturn.totalTaxAndNic || "0");
  const taxDeductedAtSource = parseFloat(currentReturn.taxDeductedAtSource || "0");
  const netTaxDue = parseFloat(currentReturn.netTaxDue || "0");
  const firstPaymentOnAccount = parseFloat(currentReturn.firstPaymentOnAccount || "0");
  const secondPaymentOnAccount = parseFloat(currentReturn.secondPaymentOnAccount || "0");

  let schedules: any = {};
  if (currentReturn.schedulesData) {
    try {
      schedules = typeof currentReturn.schedulesData === "string" ? JSON.parse(currentReturn.schedulesData) : currentReturn.schedulesData;
    } catch {}
  }
  const employments = schedules.employments || [];
  const soleTraders = schedules.soleTraders || [];
  const properties = schedules.properties || [];
  const partnerships = schedules.partnerships || [];

  const cgtBox51Adjustment = parseFloat(currentReturn.cgtBox51Adjustment || schedules.cgtBox51Adjustment || "0");
  const seisTaxReducer = parseFloat(currentReturn.seisTaxReducer || schedules.seisTaxReducer || "0");
  const eisTaxReducer = parseFloat(currentReturn.eisTaxReducer || schedules.eisTaxReducer || "0");
  const vctTaxReducer = parseFloat(currentReturn.vctTaxReducer || schedules.vctTaxReducer || "0");
  const totalInvestmentReliefs = parseFloat(currentReturn.totalInvestmentReliefs || schedules.totalInvestmentReliefs || "0") || (seisTaxReducer + eisTaxReducer + vctTaxReducer);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    setIsRecalculating(true);
    await refetchReturns();
    setTimeout(() => {
      setIsRecalculating(false);
      toast({
        title: "SA302 Calculation Refreshed",
        description: "Tax liability updated with latest core incomes and supplementary schedules.",
        type: "success",
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-emerald-600" />
            HMRC Statutory Tax Calculation (SA302 Overview)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Full statutory breakdown of Income Tax, Class 2 & 4 NICs, Capital Gains, and Student Loans for Tax Year {currentReturn.taxYear}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRecalculating}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRecalculating ? "animate-spin text-emerald-600" : ""} />
            <span>Recalculate</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span>Print / Save SA302 PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Income Received
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            £{totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Across all income sources</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Personal Allowance
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            £{personalAllowance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {totalIncome > 100000 ? "Tapered above £100,000" : "Full statutory rate"}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Tax Deducted At Source
          </span>
          <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            £{taxDeductedAtSource.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">PAYE & CIS tax credits</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block mb-1">
            Total Balancing Tax Due
          </span>
          <span className="text-xl font-extrabold font-mono text-emerald-900 dark:text-emerald-100">
            £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">Due by 31 January</span>
        </div>
      </div>

      {/* Official SA302 Computation Document */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 block mb-1">
              HM Revenue & Customs • Self Assessment SA302
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Tax Calculation Summary for {currentReturn.taxYear}
            </h1>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
              <p>
                Taxpayer: <strong className="text-slate-900 dark:text-slate-200">{client?.clientName}</strong>
              </p>
              <p>
                Unique Taxpayer Reference (UTR):{" "}
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {currentReturn.utrNumber || client?.utrNumber || "Not recorded"}
                </span>{" "}
                • National Insurance:{" "}
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {currentReturn.niNumber || client?.niNumber || "Not recorded"}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block mb-0.5">Date of Calculation</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {new Date().toLocaleDateString("en-GB")}
            </span>
            <span className="block mt-1 text-[11px] text-emerald-600 font-medium">HMRC Compliant</span>
          </div>
        </div>

        {/* Section 1: Income Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
            <span>1. Income Received (before allowances)</span>
            <span className="font-mono text-slate-500 text-[11px]">Amount (£)</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {employments.map((emp: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Employment: {emp.employerName || `Employer ${idx + 1}`}
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(emp.payReceived || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {soleTraders.map((st: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Self-employment profit: {st.businessName || `Business ${idx + 1}`}
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(st.netProfit || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {properties.map((prop: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Property rental profit: {prop.address || `Property ${idx + 1}`}
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(prop.netProfit || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {partnerships.map((p: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between bg-purple-50/40 dark:bg-purple-950/20 px-2 rounded">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Partnership profit (SA104): {p.partnershipName || `Partnership ${idx + 1}`}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  £{parseFloat(p.allocatedTradingProfit || p.allocatedTotalProfit || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {parseFloat(currentReturn.savingsInterestUntaxed || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Untaxed UK interest & savings</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.savingsInterestUntaxed).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.dividendsUk || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Dividends from UK companies</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.dividendsUk).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.statePension || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">State Pension</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.statePension).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.privatePensions || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Other pensions & retirement annuities</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.privatePensions).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.otherIncome || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Other taxable income</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.otherIncome).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.foreignIncome || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Foreign income & overseas gains</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{parseFloat(currentReturn.foreignIncome).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="py-2.5 flex justify-between bg-slate-50 dark:bg-slate-800/40 px-3 font-semibold rounded-lg">
              <span className="text-slate-800 dark:text-slate-200">Total income received</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                £{totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Deductions & Allowances */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
            <span>2. Deductions, Reliefs & Personal Allowances</span>
            <span className="font-mono text-slate-500 text-[11px]">Amount (£)</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-600 dark:text-slate-400 block">Personal Allowance</span>
                {totalIncome > 100000 && (
                  <span className="text-[10px] text-amber-600 block">
                    Income exceeds £100,000; tapered by £1 for every £2 over £100,000
                  </span>
                )}
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                - £{personalAllowance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {parseFloat(currentReturn.pensionContributions || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Relief at source pension payments (grossed up)</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  Band extension £{(parseFloat(currentReturn.pensionContributions) * 1.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {parseFloat(currentReturn.giftAidDonations || "0") > 0 && (
              <div className="py-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Gift Aid charitable payments</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  Band extension £{(parseFloat(currentReturn.giftAidDonations) * 1.25).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="py-2.5 flex justify-between bg-slate-50 dark:bg-slate-800/40 px-3 font-semibold rounded-lg">
              <span className="text-slate-800 dark:text-slate-200">Total taxable income</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                £{taxableIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Tax Calculation Breakdown by Band */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
            <span>3. Calculation of Income Tax Liability</span>
            <span className="font-mono text-slate-500 text-[11px]">Tax (£)</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium block">
                  Non-savings Income Tax (Employment, Trade, Property, Pensions)
                </span>
                <span className="text-[11px] text-slate-400">Taxed at 20% Basic, 40% Higher, 45% Additional</span>
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{nonSavingsTax.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium block">
                  Savings Income Tax (Interest & Bonds)
                </span>
                <span className="text-[11px] text-slate-400">
                  Includes Personal Savings Allowance nil-rate band
                </span>
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{savingsTax.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium block">
                  Dividend Income Tax
                </span>
                <span className="text-[11px] text-slate-400">
                  £500 allowance @ 0%, then 8.75% / 33.75% / 39.35%
                </span>
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{dividendTax.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* National Insurance Contributions */}
            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium block">
                  Class 2 National Insurance (Self-employed flat rate)
                </span>
                <span className="text-[11px] text-slate-400">
                  {class2Nic > 0 ? "Voluntary / Credited" : "Nil liability / Profits below SPT"}
                </span>
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{class2Nic.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="py-2 flex justify-between">
              <div>
                <span className="text-slate-700 dark:text-slate-300 font-medium block">
                  Class 4 National Insurance (Self-employed profits)
                </span>
                <span className="text-[11px] text-slate-400">
                  6% between £12,570 and £50,270, 2% thereafter
                </span>
              </div>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                £{class4Nic.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Capital Gains Tax */}
            {cgtDue > 0 && (
              <>
                <div className="py-2 flex justify-between">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium block">Capital Gains Tax</span>
                    <span className="text-[11px] text-slate-400">After £3,000 statutory annual exempt amount</span>
                  </div>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    £{cgtDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {cgtBox51Adjustment > 0 && (
                  <div className="py-1.5 flex justify-between bg-amber-50/70 dark:bg-amber-950/40 px-2.5 rounded text-amber-900 dark:text-amber-200">
                    <div>
                      <span className="font-bold block text-[11px]">Box CGT51: Autumn Budget 2024 Rate Differential</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400">Rate increase adjustment on/after 30 Oct 2024 (18% / 24%)</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-100 text-xs">
                      + £{cgtBox51Adjustment.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Venture Investment Reliefs (SEIS / EIS / VCT) */}
            {totalInvestmentReliefs > 0 && (
              <div className="py-2 flex justify-between text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 px-2.5 rounded">
                <div>
                  <span className="font-medium block">Less: SA101 Venture Investment Tax Reliefs</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500">
                    {seisTaxReducer > 0 ? `SEIS (50%): -£${seisTaxReducer.toFixed(2)} ` : ""}
                    {eisTaxReducer > 0 ? `EIS (30%): -£${eisTaxReducer.toFixed(2)} ` : ""}
                    {vctTaxReducer > 0 ? `VCT (30%): -£${vctTaxReducer.toFixed(2)}` : ""}
                  </span>
                </div>
                <span className="font-mono font-semibold">
                  - £{totalInvestmentReliefs.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Student Loan */}
            {studentLoanDue > 0 && (
              <div className="py-2 flex justify-between">
                <div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium block">Student Loan Repayments</span>
                  <span className="text-[11px] text-slate-400">Plan 1/2/4 or Postgraduate threshold assessment</span>
                </div>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  £{studentLoanDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="py-2.5 flex justify-between bg-slate-50 dark:bg-slate-800/40 px-3 font-semibold rounded-lg">
              <span className="text-slate-800 dark:text-slate-200">Total Income Tax and NICs liability</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                £{totalTaxAndNic.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="py-2 flex justify-between text-indigo-700 dark:text-indigo-400">
              <span className="font-medium">Less: Total tax deducted at source (PAYE, CIS, etc.)</span>
              <span className="font-mono font-medium">
                - £{taxDeductedAtSource.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Final Net Tax */}
            <div className="py-3 flex justify-between bg-emerald-50 dark:bg-emerald-950/40 px-3 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-900 dark:text-emerald-100 text-sm">
                Total Tax, NIC and Loan Due for {currentReturn.taxYear}
              </span>
              <span className="font-mono text-emerald-900 dark:text-emerald-100 text-base">
                £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Payments on Account for Next Year */}
        {(firstPaymentOnAccount > 0 || secondPaymentOnAccount > 0) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Payments on Account for Next Tax Year</span>
              <span className="text-[11px] font-normal text-slate-500">TMA 1970 s59A</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Because your balancing tax liability is £1,000 or more and less than 80% was collected at source, you are required to make 2 Payments on Account:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">1st Payment Due 31 January</span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  £{firstPaymentOnAccount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">50% of Income Tax & Class 4 NIC</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">2nd Payment Due 31 July</span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  £{secondPaymentOnAccount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">50% of Income Tax & Class 4 NIC</span>
              </div>
            </div>
          </div>
        )}

        {/* Declaration Footnote */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-[10px] text-slate-400 text-center leading-relaxed">
          This document is generated by SanSuite Self Assessment in accordance with HMRC Statutory Rules (Income Tax Act 2007, NIC Act 2015, TMA 1970). It reflects all declarations submitted in the SA100 return and supplementary pages.
        </div>
      </div>

      {/* Quick Navigation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl print:hidden">
        <Link
          to={`/self-assessment/${clientId}/calculators`}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5"
        >
          <span>Back to Statutory Calculators</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/self-assessment/${clientId}/poa`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <CreditCard size={13} />
            <span>Payments on Account</span>
          </Link>

          <Link
            to={`/self-assessment/${clientId}/tax-due`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>View Tax Due Slip</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
