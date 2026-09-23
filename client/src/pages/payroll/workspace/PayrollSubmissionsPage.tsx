import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Send, CheckCircle2, AlertCircle, Download, FileText,
  Clock, Shield, RefreshCw, X, Play, HelpCircle
} from "lucide-react";

export default function PayrollSubmissionsPage() {
  return (
    <ClientPayrollLayout activeSection="Submissions">
      <PayrollSubmissionsContent />
    </ClientPayrollLayout>
  );
}

function PayrollSubmissionsContent() {
  const { clientId, scheme, taxYear } = useClientPayroll();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"history" | "fps" | "eps" | "zeroFps" | "bacs">("history");
  const [showEpsModal, setShowEpsModal] = useState(false);
  const [showZeroFpsModal, setShowZeroFpsModal] = useState(false);

  // Form for EPS
  const [epsForm, setEpsForm] = useState({
    taxYear: taxYear || "2024-25",
    taxMonth: 1,
    employmentAllowanceClaimed: true,
    cisDeductionsSuffered: "0.00",
    smpRecovered: "0.00",
    smpNicCompensation: "0.00",
    noPaymentForPeriod: false,
    periodOfInactivity: false,
  });

  // Form for Zero FPS
  const [zeroFpsForm, setZeroFpsForm] = useState({
    taxMonth: 1,
    taxYear: taxYear || "2024-25",
    reason: "No employee payments made during tax period",
  });

  // Fetch RTI Submissions for this scheme
  const { data: submissions = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/rti-submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/rti-submissions`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Pay Runs
  const { data: payRuns = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/runs`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/runs`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Submit EPS Mutation
  const submitEpsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/submissions/eps/${clientId}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit EPS");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/rti-submissions`] });
      setShowEpsModal(false);
      alert(`EPS Filed Successfully! Correlation ID: ${data.correlationId}`);
    },
  });

  // Submit Zero FPS Mutation
  const submitZeroFpsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/submissions/zero-fps/${clientId}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit Zero FPS");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/rti-submissions`] });
      setShowZeroFpsModal(false);
      alert(`Zero FPS Filed! Correlation ID: ${data.correlationId}`);
    },
  });

  const downloadBacs = (runId: number) => {
    window.open(`/api/payroll/submissions/bacs/${runId}`, "_blank");
  };

  const clientSubmissions = submissions.filter(
    (s) => !scheme || String(s.schemeId) === String(scheme.id) || String(s.clientId) === String(clientId)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">HMRC RTI Submissions & Gateway</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real Time Information statutory filings: FPS on pay date, EPS (allowance & CIS recovery), Nil Returns, and BACS bank files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowZeroFpsModal(true)}
            className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Clock size={13} /> Zero FPS (Nil Return)
          </button>
          <button
            onClick={() => setShowEpsModal(true)}
            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Send size={14} /> Submit EPS
          </button>
        </div>
      </div>

      {/* Gateway Status Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-700 font-bold">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">HMRC Transaction Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Sender ID: <strong className="font-mono text-gray-700">RTI-PROD-LIVE</strong> • PAYE Reference: <strong className="font-mono text-gray-700">{scheme?.payeReference || "Configured"}</strong>
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <span className="text-gray-400 block">Total Filings</span>
          <span className="font-bold text-gray-900">{clientSubmissions.length} returns</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white px-4 pt-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "history"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Send size={14} /> Submission Log ({clientSubmissions.length})
        </button>

        <button
          onClick={() => setActiveTab("bacs")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "bacs"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Download size={14} /> BACS File Exports
        </button>
      </div>

      {/* Panels */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-xs">
        {activeTab === "history" && (
          <div className="space-y-4">
            <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-2.5">Submission Type</th>
                  <th className="px-4 py-2.5">Tax Period</th>
                  <th className="px-4 py-2.5">Correlation ID</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">HMRC Status</th>
                  <th className="px-4 py-2.5 text-right">Receipt XML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-400">Loading submissions...</td></tr>
                ) : clientSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      <Send size={24} className="mx-auto text-gray-300 mb-1" />
                      No RTI submissions filed yet. When you complete a pay run, you can file the FPS here.
                    </td>
                  </tr>
                ) : (
                  clientSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-purple-700 uppercase">
                        {s.submissionType || "FPS"}
                      </td>
                      <td className="px-4 py-2.5">Month {s.taxMonth || 1} ({s.taxYear || taxYear})</td>
                      <td className="px-4 py-2.5 font-mono text-gray-600">{s.correlationId || "CORR-000"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={10} /> {s.status || "Accepted"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-purple-700 hover:underline font-medium cursor-pointer">
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "bacs" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-800">BACS Payment Files (Standard 18 Format)</h3>
            <p className="text-xs text-gray-500">
              Download payment files for bank batch payment processing (Barclays, HSBC, Lloyds, NatWest, RBS, Santander).
            </p>

            {payRuns.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center border border-dashed rounded-lg">
                No finalized pay runs found. Calculate and process a pay run to generate BACS files.
              </p>
            ) : (
              <div className="space-y-2">
                {payRuns.map((r) => (
                  <div key={r.id} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between text-xs hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-800">Pay Run: {r.name || `Period ${r.periodNumber || 1}`}</p>
                      <p className="text-gray-500 text-[11px]">Pay Date: {r.paymentDate || "—"}</p>
                    </div>
                    <button
                      onClick={() => downloadBacs(r.id)}
                      className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Download size={13} /> Export BACS (.txt)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EPS Modal */}
      {showEpsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Employer Payment Summary (EPS)</h3>
              <button onClick={() => setShowEpsModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tax Month</label>
                  <select
                    value={epsForm.taxMonth}
                    onChange={(e) => setEpsForm({ ...epsForm, taxMonth: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>Month {m} (6th - 5th)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tax Year</label>
                  <input
                    value={epsForm.taxYear}
                    onChange={(e) => setEpsForm({ ...epsForm, taxYear: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-900">
                  <input
                    type="checkbox"
                    checked={epsForm.employmentAllowanceClaimed}
                    onChange={(e) => setEpsForm({ ...epsForm, employmentAllowanceClaimed: e.target.checked })}
                  />
                  <span>Claim Employment Allowance (£5,000 max relief)</span>
                </label>
                <p className="text-[11px] text-purple-700 pl-5">
                  Reduces secondary Class 1 National Insurance liabilities by up to £5,000 per tax year.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">CIS Deductions Suffered (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={epsForm.cisDeductionsSuffered}
                  onChange={(e) => setEpsForm({ ...epsForm, cisDeductionsSuffered: e.target.value })}
                  placeholder="0.00"
                  className="w-full border rounded-lg p-2 font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">Offset subcontractor deductions suffered by this company against PAYE liability.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Statutory Pay Recovered (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={epsForm.smpRecovered}
                    onChange={(e) => setEpsForm({ ...epsForm, smpRecovered: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">NIC Compensation (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={epsForm.smpNicCompensation}
                    onChange={(e) => setEpsForm({ ...epsForm, smpNicCompensation: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={epsForm.noPaymentForPeriod}
                    onChange={(e) => setEpsForm({ ...epsForm, noPaymentForPeriod: e.target.checked })}
                  />
                  <span>No payment was made to any employee for this tax month</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={epsForm.periodOfInactivity}
                    onChange={(e) => setEpsForm({ ...epsForm, periodOfInactivity: e.target.checked })}
                  />
                  <span>Period of inactivity (Scheme temporarily closed/inactive)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowEpsModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => submitEpsMutation.mutate(epsForm)}
                disabled={submitEpsMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                {submitEpsMutation.isPending ? "Transmitting..." : "Submit EPS to HMRC"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zero FPS Modal */}
      {showZeroFpsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Submit Zero FPS (Nil Return)</h3>
              <button onClick={() => setShowZeroFpsModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                File a Zero FPS when no staff were paid during a tax month. This informs HMRC that no payments were made and avoids automatic late filing penalties.
              </p>
              <div>
                <label className="block font-semibold mb-1">Tax Month *</label>
                <select
                  value={zeroFpsForm.taxMonth}
                  onChange={(e) => setZeroFpsForm({ ...zeroFpsForm, taxMonth: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>Month {m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason / Explanation</label>
                <input
                  value={zeroFpsForm.reason}
                  onChange={(e) => setZeroFpsForm({ ...zeroFpsForm, reason: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowZeroFpsModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => submitZeroFpsMutation.mutate(zeroFpsForm)}
                disabled={submitZeroFpsMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                {submitZeroFpsMutation.isPending ? "Submitting..." : "Submit Zero FPS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
