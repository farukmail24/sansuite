import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  FileSpreadsheet, Download, Printer, Calculator,
  Calendar, FileText, CheckCircle2, UserCheck, Award
} from "lucide-react";

export default function PayrollReportsPage() {
  return (
    <ClientPayrollLayout activeSection="Payroll Reports">
      <PayrollReportsContent />
    </ClientPayrollLayout>
  );
}

function PayrollReportsContent() {
  const { clientId, taxYear } = useClientPayroll();
  const [activeTab, setActiveTab] = useState<"p32" | "summary" | "p45" | "p60" | "calc">("p32");

  // Calculator state
  const [calcSalary, setCalcSalary] = useState("35000");
  const [calcTaxCode, setCalcTaxCode] = useState("1257L");

  // Fetch P32 Report
  const { data: p32Data, isLoading: loadingP32 } = useQuery<any>({
    queryKey: [`/api/payroll/reports/p32/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/reports/p32/${clientId}`);
      if (!res.ok) return { periodicLiabilities: [], totals: {} };
      return res.json();
    },
  });

  // Fetch Employees for P45 / P60
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/employees`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Calculate Forward Projection
  const gross = parseFloat(calcSalary) || 0;
  const personalAllowance = 12570;
  const taxable = Math.max(0, gross - personalAllowance);
  const projectedTax = taxable * 0.20; // 20% basic rate
  const niPrimaryThreshold = 12570;
  const projectedEeNi = Math.max(0, gross - niPrimaryThreshold) * 0.08; // 8% EE NI
  const niSecondaryThreshold = 9100;
  const projectedErNi = Math.max(0, gross - niSecondaryThreshold) * 0.138; // 13.8% ER NI
  const projectedNet = gross - projectedTax - projectedEeNi;
  const projectedTotalCost = gross + projectedErNi;

  const liabilities = p32Data?.periodicLiabilities || [];
  const totals = p32Data?.totals || {
    tax: 0,
    employeeNi: 0,
    employerNi: 0,
    totalNic: 0,
    allowanceDeducted: 0,
    statutoryPayRecovered: 0,
    amountDueToHmrc: 0
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Statutory Payroll Reports & Certificates</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            HMRC Form P32 Employer Payment Record, Form P45 leaving certificates, Form P60 end-of-year certificates, and forward PAYE tax calculators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={13} /> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white px-4 pt-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab("p32")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p32"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileSpreadsheet size={14} /> P32 Employer Payment Record
        </button>

        <button
          onClick={() => setActiveTab("calc")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "calc"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Calculator size={14} /> PAYE Forward Projection Calculator
        </button>

        <button
          onClick={() => setActiveTab("p60")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p60"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Award size={14} /> Form P60 Certificates
        </button>

        <button
          onClick={() => setActiveTab("p45")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p45"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <UserCheck size={14} /> Form P45 (Leaving)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-xs">
        {/* P32 TAB */}
        {activeTab === "p32" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-800">Form P32: Monthly Tax & NI Liability Record</h3>
                <p className="text-xs text-gray-500">Tax Year {taxYear} (6th April - 5th April)</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Net Due to HMRC YTD:</span>
                <span className="font-mono text-base font-bold text-purple-900 ml-2">
                  £{(totals.amountDueToHmrc || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-gray-100 rounded-lg">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-3 py-2.5">Month</th>
                    <th className="px-3 py-2.5">Period Dates</th>
                    <th className="px-3 py-2.5">Tax (PAYE)</th>
                    <th className="px-3 py-2.5">EE NIC</th>
                    <th className="px-3 py-2.5">ER NIC</th>
                    <th className="px-3 py-2.5">Total NIC</th>
                    <th className="px-3 py-2.5">Emp. Allowance</th>
                    <th className="px-3 py-2.5">Stat. Recovery</th>
                    <th className="px-3 py-2.5 font-bold">Net Due to HMRC</th>
                    <th className="px-3 py-2.5">Payment Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingP32 ? (
                    <tr><td colSpan={10} className="py-6 text-center text-gray-400">Loading P32 record...</td></tr>
                  ) : liabilities.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">
                        <FileSpreadsheet size={24} className="mx-auto text-gray-300 mb-1" />
                        No pay runs processed for tax year {taxYear}. Calculate a pay run to generate monthly P32 liabilities.
                      </td>
                    </tr>
                  ) : (
                    liabilities.map((m: any) => (
                      <tr key={m.month} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-bold text-purple-700">Month {m.month}</td>
                        <td className="px-3 py-2 text-gray-500">{m.periodDates}</td>
                        <td className="px-3 py-2 font-mono">£{Number(m.tax || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono">£{Number(m.employeeNi || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono">£{Number(m.employerNi || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono font-semibold">£{Number(m.totalNic || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-emerald-700">-£{Number(m.allowanceDeducted || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-emerald-700">-£{Number(m.statutoryPayRecovered || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-gray-900">£{Number(m.amountDueToHmrc || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-600">{m.paymentDueDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-purple-50/50 font-bold border-t border-purple-100">
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5 text-purple-900">YTD Totals</td>
                    <td className="px-3 py-2.5 font-mono">£{totals.tax.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">£{totals.employeeNi.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">£{totals.employerNi.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">£{totals.totalNic.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-700">-£{totals.allowanceDeducted.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-700">-£{totals.statutoryPayRecovered.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono text-purple-950 text-sm">£{totals.amountDueToHmrc.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-400">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* CALCULATOR TAB */}
        {activeTab === "calc" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="font-bold text-sm text-gray-800">Forward Projection & Gross-to-Net Calculator</h3>
            <p className="text-xs text-gray-500">
              Model annual salary packages, tax deductions, employee NI, employer NI (Class 1), and true employer cost.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Annual Gross Salary (£)</label>
                <input
                  type="number"
                  step="1000"
                  value={calcSalary}
                  onChange={(e) => setCalcSalary(e.target.value)}
                  className="w-full border rounded-lg p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tax Code</label>
                <input
                  value={calcTaxCode}
                  onChange={(e) => setCalcTaxCode(e.target.value.toUpperCase())}
                  className="w-full border rounded-lg p-2 font-mono uppercase"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Annual Gross Salary:</span>
                <span className="font-mono font-bold text-gray-900">£{gross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Projected Income Tax (PAYE):</span>
                <span className="font-mono font-semibold text-purple-700">-£{projectedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Projected Employee NI (8%):</span>
                <span className="font-mono font-semibold text-indigo-700">-£{projectedEeNi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 bg-emerald-50 px-2 rounded">
                <span className="font-bold text-emerald-900">Projected Annual Take-Home (Net):</span>
                <span className="font-mono font-bold text-emerald-900">£{projectedNet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Projected Employer NI (13.8%):</span>
                <span className="font-mono font-semibold text-gray-800">£{projectedErNi.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 bg-purple-50 px-2 rounded">
                <span className="font-bold text-purple-900">Total Annual Employer Cost:</span>
                <span className="font-mono font-bold text-purple-900">£{projectedTotalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* P60 TAB */}
        {activeTab === "p60" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-800">End of Year Form P60 Certificates</h3>
            <p className="text-xs text-gray-500">
              Statutory certificate provided to all employees employed on the final day of the tax year (5th April).
            </p>

            <div className="space-y-2">
              {employees.map((e) => (
                <div key={e.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between text-xs hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{e.name || `${e.firstName} ${e.lastName}`}</p>
                    <p className="text-gray-500 text-[11px]">NINO: <span className="font-mono">{e.nationalInsuranceNumber || "—"}</span> • Tax Code: <span className="font-mono">{e.taxCode || "1257L"}</span></p>
                  </div>
                  <button
                    onClick={() => window.open(`/api/payroll/reports/p60/${e.id}`, "_blank")}
                    className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Download size={13} /> Generate P60 PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* P45 TAB */}
        {activeTab === "p45" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-800">Form P45 Details of Employee Leaving Work</h3>
            <p className="text-xs text-gray-500">
              Generate Parts 1A, 2, and 3 when an employee ceases employment with this scheme.
            </p>

            <div className="space-y-2">
              {employees.filter((e) => e.status === "Terminated" || e.leavingDate).length === 0 ? (
                <div className="py-8 text-center text-gray-400 border border-dashed rounded-lg">
                  <UserCheck size={24} className="mx-auto text-gray-300 mb-1" />
                  No leavers recorded. When an employee leaves, their Form P45 can be downloaded here.
                </div>
              ) : (
                employees.filter((e) => e.status === "Terminated" || e.leavingDate).map((e) => (
                  <div key={e.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between text-xs hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{e.name || `${e.firstName} ${e.lastName}`}</p>
                      <p className="text-gray-500 text-[11px]">Leaving Date: {e.leavingDate || "Recorded"}</p>
                    </div>
                    <button
                      onClick={() => window.open(`/api/payroll/reports/p45/${e.id}`, "_blank")}
                      className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Download size={13} /> Download Form P45
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
