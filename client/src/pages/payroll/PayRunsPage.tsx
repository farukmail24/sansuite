import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import ClientPayrollLayout from "./workspace/ClientPayrollLayout";
import { practicePayrollSidebar } from "./sidebar";
import {
  LayoutDashboard, Users, Calculator, Settings, Plus, X,
  PlayCircle, FileText, CheckCircle, ChevronDown, ChevronUp,
  BookOpen, Download
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function PayRunsPage() {
  const [isClientPayruns] = useRoute("/payroll/:clientId/payruns");
  const [isClientProcess] = useRoute("/payroll/:clientId/process");

  if (isClientPayruns || isClientProcess) {
    return (
      <ClientPayrollLayout activeSection="Process Payroll">
        <PayRunsContent />
      </ClientPayrollLayout>
    );
  }

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PayRunsContent />
        </div>
      </div>
    </AppLayout>
  );
}

function PayRunsContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [newForm, setNewForm] = useState({
    taxYear: "2024-25", payPeriod: "1",
    startDate: "", endDate: "", paymentDate: "",
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/payroll/schemes");
      return r.ok ? r.json() : [];
    },
  });

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["/api/payroll/runs"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/payroll/runs");
      return r.ok ? r.json() : [];
    },
  });

  const { data: payslips = [], isLoading: slipsLoading } = useQuery({
    queryKey: ["/api/payroll/payslips", selectedRun],
    queryFn: async () => {
      if (!selectedRun) return [];
      const r = await apiRequest("GET", `/api/payroll/runs/${selectedRun}/payslips`);
      return r.ok ? r.json() : [];
    },
    enabled: !!selectedRun,
  });

  const createRun = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/payroll/runs", newForm);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Pay Run Created", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/payroll/runs"] });
      setShowNew(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const calcRun = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest("POST", `/api/payroll/runs/${id}/calculate`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data, id) => {
      toast({ title: "Pay Run Calculated", description: `${data.payslips?.length ?? 0} payslips generated`, type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/payroll/runs"] });
      setSelectedRun(id);
    },
    onError: (e: any) => toast({ title: "Calculation Failed", description: e.message, type: "error" }),
  });

  const approveRun = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/payroll/runs/${id}/approve`);
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Pay Run Approved & Filed to HMRC RTI",
        description: `RTI FPS payload transmitted to Government Gateway. Correlation ID: ${data.correlationId}`,
      });
      qc.invalidateQueries({ queryKey: ["/api/payroll/runs"] });
    },
  });

  const syncJournal = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/payroll/runs/${id}/sync-journal`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to post payroll journal");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Payroll Journal Posted",
        description: `Journal #${data.journalNumber} created with ${data.linesCount} lines in Bookkeeping general ledger.`,
        type: "success",
      });
    },
    onError: (e: any) => toast({ title: "Journal Sync Failed", description: e.message, type: "error" }),
  });

  const totalGross = payslips.reduce((s: number, p: any) => s + parseFloat(p.grossPay || "0"), 0);
  const totalNet = payslips.reduce((s: number, p: any) => s + parseFloat(p.netPay || "0"), 0);
  const totalTax = payslips.reduce((s: number, p: any) => s + parseFloat(p.incomeTax || "0"), 0);
  const totalNI = payslips.reduce((s: number, p: any) => s + parseFloat(p.employeeNi || "0"), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Process Payroll & Pay Runs</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Calculate gross-to-net PAYE, approve wages, post bookkeeping journals, and file live FPS returns.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-SanSuite flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <Plus size={14} /> New Pay Run
        </button>
      </div>

      {/* Pay Runs Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Tax Year</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">End Date</th>
              <th className="px-4 py-3">Payment Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">Loading pay runs...</td></tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Calculator size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No Pay Runs Created</p>
                  <p className="text-[11px] text-gray-400 mt-1 mb-3">Create your first monthly or weekly pay run to calculate salaries and PAYE.</p>
                  <button onClick={() => setShowNew(true)} className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <Plus size={13} /> Create First Pay Run
                  </button>
                </td>
              </tr>
            ) : (
              runs.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 text-xs">
                  <td className="px-4 py-3 font-semibold text-purple-700">{r.taxYear}</td>
                  <td className="px-4 py-3 font-medium">Period {r.payPeriod}</td>
                  <td className="px-4 py-3 text-gray-600">{r.startDate ? new Date(r.startDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.endDate ? new Date(r.endDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.status === "Calculated"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : r.status === "Approved"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => calcRun.mutate(r.id)}
                        disabled={calcRun.isPending}
                        title="Calculate PAYE/NI"
                        className="text-purple-700 hover:text-purple-900 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      >
                        <PlayCircle size={13} />
                        {calcRun.isPending && calcRun.variables === r.id ? "Calculating..." : "Calculate"}
                      </button>

                      {r.status === "Calculated" && (
                        <button
                          onClick={() => approveRun.mutate(r.id)}
                          disabled={approveRun.isPending}
                          title="Approve and submit RTI FPS to HMRC"
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle size={12} />
                          {approveRun.isPending && approveRun.variables === r.id ? "Filing..." : "Approve & RTI"}
                        </button>
                      )}

                      <button
                        onClick={() => syncJournal.mutate(r.id)}
                        disabled={syncJournal.isPending}
                        title="Post Payroll Journal into Bookkeeping General Ledger"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      >
                        <BookOpen size={12} />
                        {syncJournal.isPending && syncJournal.variables === r.id ? "Posting..." : "Journal"}
                      </button>

                      <button
                        onClick={() => window.open(`/api/payroll/submissions/bacs/${r.id}`, "_blank")}
                        title="Download BACS File for Bank Payment"
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-xs cursor-pointer"
                      >
                        <Download size={12} /> BACS
                      </button>

                      <button
                        onClick={() => setSelectedRun(selectedRun === r.id ? null : r.id)}
                        disabled={r.status === "Draft"}
                        title="View Payslips"
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs disabled:opacity-30 cursor-pointer"
                      >
                        <FileText size={13} />
                        Slips
                        {selectedRun === r.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payslips Detail Panel */}
      {selectedRun && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-gray-900">Payslips for Run #{selectedRun}</h3>
            <span className="text-xs text-gray-500">{payslips.length} payslips generated</span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Gross Pay", val: `£${totalGross.toFixed(2)}`, color: "text-gray-900" },
              { label: "Total PAYE Tax", val: `£${totalTax.toFixed(2)}`, color: "text-purple-700" },
              { label: "Total EE NI", val: `£${totalNI.toFixed(2)}`, color: "text-indigo-700" },
              { label: "Total Net Take-Home", val: `£${totalNet.toFixed(2)}`, color: "text-emerald-700" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
                <p className={`text-base font-mono font-bold mt-0.5 ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Tax Code</th>
                <th className="px-3 py-2">NI Number</th>
                <th className="px-3 py-2">Gross Pay</th>
                <th className="px-3 py-2">Tax (PAYE)</th>
                <th className="px-3 py-2">EE NI</th>
                <th className="px-3 py-2">EE Pension</th>
                <th className="px-3 py-2">Net Pay</th>
                <th className="px-3 py-2 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slipsLoading ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">Loading payslips...</td></tr>
              ) : payslips.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">No payslips yet. Click Calculate above.</td></tr>
              ) : (
                payslips.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-900">{p.firstName} {p.lastName}</td>
                    <td className="px-3 py-2 font-mono text-purple-700">{p.taxCode || "1257L"}</td>
                    <td className="px-3 py-2 font-mono">{p.niNumber || "—"}</td>
                    <td className="px-3 py-2 font-mono font-bold">£{parseFloat(p.grossPay || "0").toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-purple-700">£{parseFloat(p.incomeTax || "0").toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-indigo-700">£{parseFloat(p.employeeNi || "0").toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-amber-700">£{parseFloat(p.pensionEmployee || "0").toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-700">£{parseFloat(p.netPay || "0").toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setSelectedPayslip(p)} className="text-purple-700 hover:underline font-semibold cursor-pointer">
                        Payslip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Pay Run Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <Calculator size={15} className="text-purple-600" /> New Pay Run
              </h2>
              <button onClick={() => setShowNew(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Tax Year</label>
                  <select value={newForm.taxYear} onChange={(e) => setNewForm({ ...newForm, taxYear: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2">
                    {["2024-25", "2025-26", "2026-27"].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Pay Period (Month)</label>
                  <select value={newForm.payPeriod} onChange={(e) => setNewForm({ ...newForm, payPeriod: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Month {m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Period Start</label>
                  <input type="date" value={newForm.startDate} onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Period End</label>
                  <input type="date" value={newForm.endDate} onChange={(e) => setNewForm({ ...newForm, endDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Payment Date (On or before RTI submission)</label>
                <input type="date" value={newForm.paymentDate} onChange={(e) => setNewForm({ ...newForm, paymentDate: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button onClick={() => createRun.mutate()} disabled={createRun.isPending} className="btn-SanSuite text-xs">
                {createRun.isPending ? "Creating..." : "Create Pay Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-purple-900 text-white p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Official Payslip</p>
                <h3 className="text-base font-bold">{selectedPayslip.firstName} {selectedPayslip.lastName}</h3>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div><span className="text-gray-400 block">NI Number</span><span className="font-mono font-bold">{selectedPayslip.niNumber || "—"}</span></div>
                <div><span className="text-gray-400 block">Tax Code</span><span className="font-mono font-bold text-purple-700">{selectedPayslip.taxCode || "1257L"}</span></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b"><span className="text-gray-600">Gross Pay:</span><span className="font-mono font-bold">£{parseFloat(selectedPayslip.grossPay || "0").toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b text-red-600"><span>Income Tax (PAYE):</span><span className="font-mono">-£{parseFloat(selectedPayslip.incomeTax || "0").toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b text-indigo-700"><span>Employee NI:</span><span className="font-mono">-£{parseFloat(selectedPayslip.employeeNi || "0").toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b text-amber-700"><span>Employee Pension (5%):</span><span className="font-mono">-£{parseFloat(selectedPayslip.pensionEmployee || "0").toFixed(2)}</span></div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-sm">Net Pay (Take-Home):</span>
                <span className="font-mono font-bold text-emerald-800 text-xl">£{parseFloat(selectedPayslip.netPay || "0").toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
