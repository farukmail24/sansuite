import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/queryClient";
import { X, Printer, Download, Award, UserCheck, Shield, Building2, CheckCircle2 } from "lucide-react";

interface P60ModalProps {
  employeeId: number | null;
  onClose: () => void;
}

export function HMRCP60Modal({ employeeId, onClose }: P60ModalProps) {
  const { data: p60, isLoading } = useQuery<any>({
    queryKey: [`/api/payroll/reports/p60/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await apiRequest("GET", `/api/payroll/reports/p60/${employeeId}`);
      if (!res.ok) throw new Error("Failed to load P60");
      return res.json();
    },
    enabled: !!employeeId,
  });

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4 sm:my-8 overflow-hidden">
        {/* Top Control Bar (hidden in print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <span className="font-bold text-xs uppercase tracking-wide">
              HMRC Statutory Certificate — Form P60 (Tax Year {p60?.taxYear || "2024-25"})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer size={13} /> Print Certificate / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Certificate Canvas */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            Loading Form P60 certificate details...
          </div>
        ) : !p60 ? (
          <div className="p-12 text-center text-red-500 text-xs">
            Unable to load P60 details for this employee.
          </div>
        ) : (
          <div className="p-8 sm:p-10 space-y-6 text-slate-900 font-sans text-xs bg-white">
            {/* HMRC Certificate Header */}
            <div className="border-4 border-slate-900 p-5 rounded-lg bg-slate-50/50 space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    HM Revenue &amp; Customs
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                    Certificate P60 (Single Sheet) • End of Year Certificate
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs tracking-wider rounded">
                    TAX YEAR TO 5 APRIL {p60.taxYear?.split("-")[1] ? `20${p60.taxYear.split("-")[1]}` : "2025"}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-600 italic pt-1">
                <strong>To the employee:</strong> Please keep this certificate in a safe place. You will need it if you have to fill in a tax return, claim tax credits, or verify your income for a loan or mortgage.
              </p>
            </div>

            {/* Section 1: Employee Details */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                Employee's Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Surname</span>
                  <span className="font-bold text-sm text-slate-950">{p60.lastName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">First Name(s)</span>
                  <span className="font-bold text-sm text-slate-950">{p60.firstName || p60.employeeName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">National Insurance No.</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{p60.niNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Works / Payroll No.</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{p60.worksNumber || "EMP0001"}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Pay and Income Tax details */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                Pay and Income Tax Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">In this employment</span>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Total pay:</span>
                    <span className="font-mono font-bold text-slate-950">£{parseFloat(p60.payInThisEmployment || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-600">Tax deducted:</span>
                    <span className="font-mono font-bold text-purple-900">£{parseFloat(p60.taxDeducted || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">In previous employment(s)</span>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Pay:</span>
                    <span className="font-mono font-semibold text-slate-500">£0.00</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-600">Tax deducted:</span>
                    <span className="font-mono font-semibold text-slate-500">£0.00</span>
                  </div>
                </div>

                <div className="border-2 border-purple-300 rounded p-3 bg-purple-50/50">
                  <span className="text-[10px] text-purple-900 font-bold uppercase block mb-1">Total for Year</span>
                  <div className="flex justify-between py-1 border-b border-purple-200">
                    <span className="text-purple-950 font-semibold">Total pay:</span>
                    <span className="font-mono font-bold text-purple-950 text-sm">£{parseFloat(p60.totalPayForYear || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-purple-950 font-semibold">Total tax deducted:</span>
                    <span className="font-mono font-bold text-purple-950 text-sm">£{parseFloat(p60.totalTaxForYear || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] bg-slate-100 p-2.5 rounded">
                <span className="text-slate-700">Final Tax Code at Year End:</span>
                <span className="font-mono font-black text-slate-900 text-xs px-2 py-0.5 bg-white border border-slate-300 rounded">
                  {p60.finalTaxCode || "1257L"} {p60.taxBasis || "Cumulative"}
                </span>
              </div>
            </div>

            {/* Section 3: National Insurance Contributions in this employment */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                National Insurance Contributions in this Employment
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border border-slate-200 text-center">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-200">NIC Table</th>
                      <th className="p-2 border-r border-slate-200">Earnings at LEL (up to £6,396)</th>
                      <th className="p-2 border-r border-slate-200">Earnings LEL to PT (£6,396 - £12,570)</th>
                      <th className="p-2 border-r border-slate-200">Earnings PT to UEL (£12,570 - £50,270)</th>
                      <th className="p-2">Employee NIC Contributions Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-mono">
                      <td className="p-2.5 font-bold border-r border-slate-200 bg-slate-50">{p60.niCategory || "A"}</td>
                      <td className="p-2.5 border-r border-slate-200">£{parseFloat(p60.earningsAtLel || "0").toFixed(2)}</td>
                      <td className="p-2.5 border-r border-slate-200">£{parseFloat(p60.earningsLelToPt || "0").toFixed(2)}</td>
                      <td className="p-2.5 border-r border-slate-200">£{parseFloat(p60.earningsPtToUel || "0").toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-slate-950 bg-slate-50">£{parseFloat(p60.employeeNiDue || p60.employeeNi || "0").toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Statutory Payments & Other Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-700 block border-b pb-1">
                  Statutory Payments Included in Pay
                </span>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Statutory Maternity Pay (SMP):</span>
                  <span className="font-mono font-medium">£{p60.statutoryMaternityPay || "0.00"}</span>
                </div>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Statutory Paternity Pay (SPP):</span>
                  <span className="font-mono font-medium">£{p60.statutoryPaternityPay || "0.00"}</span>
                </div>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Statutory Adoption Pay (SAP):</span>
                  <span className="font-mono font-medium">£{p60.statutoryAdoptionPay || "0.00"}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-700 block border-b pb-1">
                  Other Deductions
                </span>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Student Loan Deductions:</span>
                  <span className="font-mono font-medium">£{p60.studentLoanDeductions || "0.00"}</span>
                </div>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Postgraduate Loan Deductions:</span>
                  <span className="font-mono font-medium">£{p60.postgraduateLoanDeductions || "0.00"}</span>
                </div>
                <div className="flex justify-between text-[11px] py-0.5">
                  <span className="text-slate-600">Employee Pension Deductions:</span>
                  <span className="font-mono font-medium">£{p60.pensionEmployee || "0.00"}</span>
                </div>
              </div>
            </div>

            {/* Certificate Footer: Employer Declaration */}
            <div className="border-t-2 border-slate-900 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Employer Details</span>
                <p className="font-bold text-slate-950 text-xs">{p60.employerName || "Practice Employer"}</p>
                <p className="text-[11px] text-slate-600 font-mono">Employer PAYE Ref: {p60.payeReference || "120/AC98765"}</p>
                <p className="text-[11px] text-slate-600 font-mono">Accounts Office Ref: {p60.accountsOfficeReference || "120PA00012345"}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Certificate Issue</span>
                <p className="text-[11px] text-slate-700">Date: <strong className="text-slate-900 font-mono">{p60.certificateDate || "05/04/2025"}</strong></p>
                <p className="text-[10px] text-slate-400">SanSuite Payroll RTI System • HMRC Approved Specification</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface P45ModalProps {
  employeeId: number | null;
  onClose: () => void;
}

export function HMRCP45Modal({ employeeId, onClose }: P45ModalProps) {
  const { data: p45, isLoading } = useQuery<any>({
    queryKey: [`/api/payroll/reports/p45/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await apiRequest("GET", `/api/payroll/reports/p45/${employeeId}`);
      if (!res.ok) throw new Error("Failed to load P45");
      return res.json();
    },
    enabled: !!employeeId,
  });

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4 sm:my-8 overflow-hidden">
        {/* Top Control Bar (hidden in print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-purple-400" />
            <span className="font-bold text-xs uppercase tracking-wide">
              HMRC Statutory Certificate — Form P45 (Leaving Work)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer size={13} /> Print P45 / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            Loading Form P45 certificate details...
          </div>
        ) : !p45 ? (
          <div className="p-12 text-center text-red-500 text-xs">
            Unable to load P45 details for this employee.
          </div>
        ) : (
          <div className="p-8 sm:p-10 space-y-6 text-slate-900 font-sans text-xs bg-white">
            {/* Header */}
            <div className="border-4 border-slate-900 p-5 rounded-lg bg-slate-50/50 space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    HM Revenue &amp; Customs
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                    Form P45 Part 1A • Details of Employee Leaving Work
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-purple-900 text-white font-extrabold text-xs tracking-wider rounded">
                    COPY FOR EMPLOYEE TO KEEP
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-600 italic pt-1">
                <strong>Important:</strong> Do not destroy this form. You will need it to show to your new employer or Jobcentre Plus office. If you do not give this form to your new employer, you may pay too much tax.
              </p>
            </div>

            {/* Section 1: Employer Details */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                1. Employer Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Employer Name &amp; Scheme</span>
                  <span className="font-bold text-sm text-slate-950">{p45.employerName || "Practice Employer"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Employer PAYE Ref</span>
                    <span className="font-mono font-bold text-sm text-slate-950">{p45.payeReference || "120/AC98765"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Accounts Office Ref</span>
                    <span className="font-mono font-bold text-sm text-slate-950">{p45.accountsOfficeReference || "120PA00012345"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Employee Details */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                2. Employee Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Full Name</span>
                  <span className="font-bold text-sm text-slate-950">{p45.employeeName || `${p45.firstName} ${p45.lastName}`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">National Insurance No.</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{p45.niNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Leaving Date</span>
                  <span className="font-mono font-bold text-sm text-red-700">{p45.leavingDate || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Payroll / Works No.</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{p45.worksNumber || "EMP0001"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Tax Code at Leaving Date</span>
                  <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 bg-slate-100 rounded inline-block">
                    {p45.taxCodeAtLeaving || "1257L"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Tax Calculation Basis</span>
                  <span className="font-semibold text-slate-800 text-xs">{p45.taxBasis || "Cumulative"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Week 1 / Month 1 Indicator</span>
                  <span className="font-semibold text-slate-800 text-xs">{p45.taxBasis === "Week1Month1" ? "YES" : "NO"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Pay and Tax Details in this Employment */}
            <div className="border border-slate-300 rounded-lg p-4 bg-white space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                3. Pay and Tax Details to Date in This Employment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Total Pay to Date</span>
                  <span className="font-mono font-black text-slate-950 text-base">
                    £{parseFloat(p45.totalPayInThisEmployment || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Total gross pay subject to PAYE tax</p>
                </div>

                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Total Tax Deducted to Date</span>
                  <span className="font-mono font-black text-purple-900 text-base">
                    £{parseFloat(p45.totalTaxInThisEmployment || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Total income tax deducted under PAYE</p>
                </div>

                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Student Loan Deductions</span>
                  <span className="font-mono font-black text-slate-900 text-base">
                    £{parseFloat(p45.studentLoanDeductions || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Plan 1, Plan 2 or Plan 4 deductions</p>
                </div>
              </div>
            </div>

            {/* Certification Block */}
            <div className="border-t-2 border-slate-900 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Employer Certification</span>
                <p className="text-slate-800 text-[11px]">
                  I certify that the employee named above has ceased employment and the figures entered are true and correct.
                </p>
                <p className="font-bold text-slate-950 text-xs mt-1">Signed for Employer: {p45.employerName || "Practice Employer"}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Issue Date</span>
                <p className="text-[11px] text-slate-700">Date: <strong className="text-slate-900 font-mono">{p45.issueDate || new Date().toLocaleDateString("en-GB")}</strong></p>
                <p className="text-[10px] text-slate-400">SanSuite RTI Compliant Leaving Certification</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
