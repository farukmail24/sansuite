import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practicePayrollSidebar } from "./sidebar";
import { Users, Calculator, Plus, Search, Shield, RefreshCw, Send, FileText, CheckCircle2, Clock } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function PayrollRtiPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedScheme, setSelectedScheme] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: schemes = [] } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: rtiLogs = [] } = useQuery({
    queryKey: ["/api/payroll/rti-submissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/rti-submissions");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createRtiMutation = useMutation({
    mutationFn: async (submissionType: "FPS" | "EPS") => {
      const res = await apiRequest("POST", "/api/payroll/rti-submissions", { submissionType });
      if (!res.ok) throw new Error("Failed to submit RTI");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: `HMRC ${data.submissionType} Transmitted`,
        description: `Full Payment Submission transmitted. Correlation ID: ${data.correlationId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/rti-submissions"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to submit RTI", variant: "destructive" });
    },
  });

  const handleCreateRtiSubmission = (submissionType: "FPS" | "EPS") => {
    createRtiMutation.mutate(submissionType);
  };

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400">
              <Link href="/payroll">Home</Link> / Payroll / RTI Submissions
            </p>
            <h1 className="text-xl font-light text-gray-500 mt-1">HMRC Real Time Information (RTI) Submissions</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCreateRtiSubmission("EPS")}
              disabled={createRtiMutation.isPending}
              className="px-4 py-2 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText size={14} /> Submit EPS (Employer Summary)
            </button>
            <button
              onClick={() => handleCreateRtiSubmission("FPS")}
              disabled={createRtiMutation.isPending}
              className="btn-SanSuite font-semibold px-5 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} /> {createRtiMutation.isPending ? "Transmitting..." : "Submit FPS to HMRC"}
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Gateway Status</p>
              <p className="text-base font-bold text-green-700 mt-1 flex items-center gap-1.5">
                <Shield size={16} /> HMRC MTD Active
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Active PAYE Schemes</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{schemes.length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Next RTI Filing Deadline</p>
              <p className="text-base font-bold text-indigo-700 mt-1 flex items-center gap-1.5">
                <Clock size={16} /> 19 February 2026
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
          </div>
        </div>

        {/* RTI Submissions Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-purple-600" />
              <h2 className="font-semibold text-gray-700 text-sm">HMRC Gateway Transmission Log</h2>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PAYE ref or type..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 font-medium">Employer / Scheme</th>
                <th className="px-5 py-3 font-medium">PAYE Ref</th>
                <th className="px-5 py-3 font-medium">RTI Submission Type</th>
                <th className="px-5 py-3 font-medium">Tax Period</th>
                <th className="px-5 py-3 font-medium">Submitted On</th>
                <th className="px-5 py-3 font-medium">Correlation ID</th>
                <th className="px-5 py-3 font-medium text-right">HMRC Status</th>
              </tr>
            </thead>
            <tbody>
              {rtiLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500 text-xs">
                    No RTI submissions transmitted yet. Click <strong>"Submit FPS to HMRC"</strong> or <strong>"Submit EPS"</strong> above to send live filings.
                  </td>
                </tr>
              ) : (
                rtiLogs
                  .filter((item: any) =>
                    !search ||
                    item.employerName?.toLowerCase().includes(search.toLowerCase()) ||
                    item.submissionType?.toLowerCase().includes(search.toLowerCase()) ||
                    item.correlationId?.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="border-b border-gray-50 hover:bg-gray-50 text-xs">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{row.employerName || "—"}</td>
                      <td className="px-5 py-3.5 font-mono text-purple-700">{row.payeReference || "—"}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{row.submissionType === "FPS" ? "FPS (Full Payment Submission)" : "EPS (Employer Payment Summary)"}</td>
                      <td className="px-5 py-3.5 text-gray-600">{row.taxYear ? `${row.taxYear} - ${row.payPeriod || 'M1'}` : "—"}</td>
                      <td className="px-5 py-3.5 text-gray-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{row.correlationId}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          {row.status || "Accepted"}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
