import { useQuery } from "@tanstack/react-query";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest } from "../../lib/queryClient";
import { Users, Calendar, ShieldCheck, Download, CheckCircle2, Clock } from "lucide-react";

export default function SmePayrollPage() {
  const { data: workspace, isLoading } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load payroll data");
      return res.json();
    },
  });

  const client = workspace?.client;

  return (
    <SmeLayout module="Payroll & RTI">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={22} className="text-indigo-600" />
              Payroll & RTI Overview
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review employee payroll processing, HMRC RTI submissions, and payslips prepared by your accountant.
            </p>
          </div>
        </div>

        {/* Summary Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Users size={16} className="text-indigo-600" />
              Payroll Scheme
            </div>
            <h3 className="text-lg font-bold text-gray-900">{client?.name || "Company Payroll"}</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={13} /> Active RTI Processing
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Calendar size={16} className="text-indigo-600" />
              Pay Schedule
            </div>
            <h3 className="text-lg font-bold text-gray-900">Monthly</h3>
            <p className="text-xs text-gray-500 mt-1">Tax Month cut-off: 5th of each month</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              HMRC Submissions
            </div>
            <h3 className="text-lg font-bold text-gray-900">FPS / EPS Automated</h3>
            <p className="text-xs text-gray-500 mt-1">Submitted directly by your practice</p>
          </div>
        </div>

        {/* Payslips / Records Empty State */}
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No Recent Payslips Released</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            When your accountant finalizes the monthly payroll run, finalized payslips and P60/P45 certificates will appear here for download.
          </p>
        </div>
      </div>
    </SmeLayout>
  );
}
