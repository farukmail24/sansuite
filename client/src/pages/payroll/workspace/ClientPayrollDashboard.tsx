import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Users, Calculator, Send, CheckCircle2, AlertCircle,
  Calendar, FileText, ArrowRight, Shield, TrendingUp,
  DollarSign, Clock, Layers, HelpCircle
} from "lucide-react";

export default function ClientPayrollDashboard() {
  return (
    <ClientPayrollLayout activeSection="Dashboard">
      <DashboardContent />
    </ClientPayrollLayout>
  );
}

function DashboardContent() {
  const { clientId, client, scheme, taxYear } = useClientPayroll();

  const { data, isLoading } = useQuery({
    queryKey: [`/api/payroll/client/${clientId}/dashboard`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/client/${clientId}/dashboard`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const ytd = data?.ytd || {
    grossPay: 0,
    tax: 0,
    employeeNi: 0,
    employerNi: 0,
    employeePension: 0,
    employerPension: 0,
    netPay: 0,
    totalCost: 0
  };

  const paye = data?.payeDetails || scheme || {};
  const submissions = data?.submissions || { fpsCount: 0, epsCount: 0, eyuCount: 0, lastFiledDate: null };
  const employees = data?.employees || { total: 0, active: 0, onLeave: 0 };
  const monthlyPay = data?.monthlyPay || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            HMRC PAYE Tax Year {taxYear}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {client?.clientName || "Client Payroll"} Workspace
          </h1>
          <p className="text-purple-100 text-xs mt-1 max-w-xl">
            Manage employees, statutory pay, auto enrolment pensions, process monthly pay runs, and submit live RTI returns directly to HMRC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/payroll/${clientId}/payruns`}
            className="bg-white text-purple-900 hover:bg-purple-50 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Calculator size={14} /> Process Pay Run
          </Link>
          <Link
            href={`/payroll/${clientId}/submissions`}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all border border-purple-400/40 cursor-pointer"
          >
            <Send size={14} /> File RTI
          </Link>
          <Link
            href={`/payroll/${clientId}/employees`}
            className="bg-purple-900/40 hover:bg-purple-900/60 text-white px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
          >
            <Users size={14} /> + Employee
          </Link>
        </div>
      </div>

      {/* Capium-style Payroll Workflow Stepper */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Payroll Operating Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Link
            href={`/payroll/${clientId}/employees`}
            className="p-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 group-hover:text-purple-700">Employees & Tax Codes</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{employees.active} active staff enrolled</p>
            </div>
          </Link>

          <Link
            href={`/payroll/${clientId}/additional`}
            className="p-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 group-hover:text-indigo-700">Additional Pay & Leave</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Overtime, bonus, SSP & SMP</p>
            </div>
          </Link>

          <Link
            href={`/payroll/${clientId}/payruns`}
            className="p-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700">Calculate & Process</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Payslips, BACS & nominal journal</p>
            </div>
          </Link>

          <Link
            href={`/payroll/${clientId}/submissions`}
            className="p-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              4
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 group-hover:text-amber-700">HMRC RTI Submissions</p>
              <p className="text-[11px] text-gray-500 mt-0.5">FPS on or before pay day & EPS</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Staff</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{employees.active}</p>
          <p className="text-[11px] text-gray-500 mt-1">Total {employees.total} registered in scheme</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">YTD Gross Wages</span>
            <TrendingUp size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700">£{ytd.grossPay.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-gray-500 mt-1">Net Pay: £{ytd.netPay.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">YTD PAYE & NIC</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">£{(ytd.tax + ytd.employeeNi + ytd.employerNi).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-gray-500 mt-1">Tax: £{ytd.tax.toFixed(2)} | NI: £{(ytd.employeeNi + ytd.employerNi).toFixed(2)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">RTI Filings</span>
            <Send size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{submissions.fpsCount + submissions.epsCount}</p>
          <p className="text-[11px] text-gray-500 mt-1">{submissions.fpsCount} FPS | {submissions.epsCount} EPS returns</p>
        </div>
      </div>

      {/* Main Grid: YTD Breakdown & PAYE Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: YTD Comprehensive Statutory Summary */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Year-to-Date (YTD) Statutory Summary</h3>
              <p className="text-xs text-gray-500">Cumulative payroll figures for tax year {taxYear}</p>
            </div>
            <Link
              href={`/payroll/${clientId}/reports`}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View P32 Report <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Total Gross Pay</span>
              <span className="text-base font-bold text-gray-900">£{ytd.grossPay.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Income Tax (PAYE)</span>
              <span className="text-base font-bold text-purple-700">£{ytd.tax.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Employee NIC</span>
              <span className="text-base font-bold text-indigo-700">£{ytd.employeeNi.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Employer NIC</span>
              <span className="text-base font-bold text-indigo-900">£{ytd.employerNi.toFixed(2)}</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">EE Pension Contrib.</span>
              <span className="text-base font-bold text-amber-700">£{ytd.employeePension.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">ER Pension Contrib.</span>
              <span className="text-base font-bold text-amber-900">£{ytd.employerPension.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-medium block">Total Net Wages Paid</span>
              <span className="text-base font-bold text-emerald-800">£{ytd.netPay.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <span className="text-[11px] text-purple-700 font-medium block">Total Employer Cost</span>
              <span className="text-base font-bold text-purple-900">£{ytd.totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Monthly Trend Bars */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Monthly Pay Distribution</h4>
            {monthlyPay.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-200 rounded-lg">
                <Calculator size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No Pay Runs Processed Yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">When pay runs are calculated, monthly salary trends will display here.</p>
                <Link
                  href={`/payroll/${clientId}/payruns`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
                >
                  Go to Process Payroll
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {monthlyPay.map((m: any) => (
                  <div key={m.month} className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-gray-500 font-medium">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
                      <div
                        className="bg-purple-600 h-full"
                        style={{ width: `${Math.min(100, (m.grossPay / (ytd.grossPay || 1)) * 100)}%` }}
                        title={`Gross Pay: £${m.grossPay}`}
                      />
                    </div>
                    <span className="w-20 text-right font-mono text-gray-700 font-semibold">£{m.grossPay.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: PAYE & Gateway Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-800 text-sm">HMRC PAYE Profile</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
              Verified
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Employer Name</span>
              <span className="font-semibold text-gray-800">{paye.employerName || client?.clientName || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Employer PAYE Reference</span>
              <span className="font-mono font-bold text-purple-700">{paye.payeReference || "Not configured"}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Accounts Office Reference</span>
              <span className="font-mono text-gray-800">{paye.accountsOfficeReference || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Employment Allowance</span>
              <span className="font-semibold text-gray-800">
                {paye.employmentAllowanceClaimed ? "Claimed (£5,000 allowance active)" : "Not claimed"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Payment Frequency</span>
              <span className="font-semibold text-gray-800 capitalize">{paye.taxFrequency || "Monthly"}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-700 mb-2">HMRC RTI Gateway</h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Gateway Status:</span>
                <span className="text-green-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last RTI Submission:</span>
                <span className="text-gray-800 font-medium">{submissions.lastFiledDate || "None filed yet"}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/payroll/${clientId}/settings`}
              className="w-full block text-center py-2 px-3 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Configure PAYE Scheme Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
