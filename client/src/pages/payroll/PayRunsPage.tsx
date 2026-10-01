import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import ClientPayrollLayout from "./workspace/ClientPayrollLayout";
import { practicePayrollSidebar } from "./sidebar";
import {
  LayoutDashboard, Users, Calculator, Settings, Plus, X,
  PlayCircle, FileText, CheckCircle, ChevronDown, ChevronUp,
  BookOpen, Download, RotateCcw, RefreshCw, AlertTriangle,
  ArrowRight, ShieldCheck, FileSpreadsheet
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
        <div className="w-full">
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
  const [bacsRunId, setBacsRunId] = useState<number | null>(null);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverStep, setRolloverStep] = useState(1);
  const [rolloverForm, setRolloverForm] = useState({
    schemeId: 0,
    upliftLCode: true,
    lCodeIncrease: 0,
    resetWeek1Month1: true,
  });

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

  const rollbackRun = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/payroll/runs/${id}/rollback`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to rollback pay run");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Pay Run Rolled Back to Draft",
        description: data.message,
        type: "success",
      });
      qc.invalidateQueries({ queryKey: ["/api/payroll/runs"] });
    },
    onError: (e: any) => toast({ title: "Rollback Failed", description: e.message, type: "error" }),
  });

  const rolloverMutation = useMutation({
    mutationFn: async (payload: any) => {
      const targetSchemeId = payload.schemeId || schemes[0]?.id || 1;
      const res = await apiRequest("POST", `/api/payroll/schemes/${targetSchemeId}/year-end-rollover`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to execute Tax Year Rollover");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Tax Year Rollover Complete",
        description: data.message,
        type: "success",
      });
      qc.invalidateQueries({ queryKey: ["/api/payroll/runs"] });
      qc.invalidateQueries({ queryKey: ["/api/payroll/schemes"] });
      qc.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      setShowRolloverModal(false);
      setRolloverStep(1);
    },
    onError: (e: any) => toast({ title: "Rollover Failed", description: e.message, type: "error" }),
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
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (schemes.length > 0) {
                setRolloverForm(f => ({ ...f, schemeId: schemes[0].id }));
              }
              setRolloverStep(1);
              setShowRolloverModal(true);
            }} 
            className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw size={13} /> Tax Year Rollover
          </button>
          <button onClick={() => setShowNew(true)} className="btn-SanSuite flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <Plus size={14} /> New Pay Run
          </button>
        </div>
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

                      {/* Rollback button */}
                      {(r.status === "Calculated" || r.status === "Approved") && (
                        <button
                          onClick={() => {
                            if (confirm(`Roll back Pay Run Period ${r.payPeriod} (${r.taxYear}) to Draft? This will allow editing timesheets, hourly rates, or employee tax codes before re-calculating.`)) {
                              rollbackRun.mutate(r.id);
                            }
                          }}
                          disabled={rollbackRun.isPending}
                          title="Roll back pay run to Draft status to edit or recalculate"
                          className="text-amber-600 hover:text-amber-800 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          {rollbackRun.isPending && rollbackRun.variables === r.id ? "Rolling..." : "Rollback"}
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
                        onClick={() => setBacsRunId(r.id)}
                        title="Download BACS Payment File (Standard 18 or Banking CSV)"
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-xs font-semibold cursor-pointer"
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

      {/* BACS Export Modal */}
      {bacsRunId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Export BACS Payment File</h3>
                  <p className="text-[11px] text-purple-200">Pay Run #{bacsRunId}</p>
                </div>
              </div>
              <button onClick={() => setBacsRunId(null)} className="text-white/70 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-600">
                Choose the payment format required for transmitting employee salaries to your banking provider:
              </p>

              <div className="space-y-3">
                <div 
                  onClick={() => {
                    window.open(`/api/payroll/bacs/${bacsRunId}?format=bac`, "_blank");
                    setBacsRunId(null);
                  }}
                  className="p-3.5 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 text-white rounded-lg">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs group-hover:text-purple-700">UK Standard 18 Format (.bac)</h4>
                      <p className="text-[11px] text-gray-500">Official clearing house format for direct corporate BACS submission</p>
                    </div>
                  </div>
                  <Download size={14} className="text-purple-600" />
                </div>

                <div 
                  onClick={() => {
                    window.open(`/api/payroll/bacs/${bacsRunId}?format=csv`, "_blank");
                    setBacsRunId(null);
                  }}
                  className="p-3.5 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs group-hover:text-indigo-700">Online Banking CSV (.csv)</h4>
                      <p className="text-[11px] text-gray-500">Ready for Barclays, NatWest, Lloyds, HSBC, Santander portal import</p>
                    </div>
                  </div>
                  <Download size={14} className="text-indigo-600" />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>Ensure employee sort codes and account numbers are fully verified prior to executing payments.</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setBacsRunId(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Year Rollover 3-Step Wizard Modal */}
      {showRolloverModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Tax Year End Rollover Wizard</h3>
                  <p className="text-[11px] text-purple-200">Capium-inspired automated year-end closeout & tax code uplift</p>
                </div>
              </div>
              <button onClick={() => setShowRolloverModal(false)} className="text-white/70 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            {/* Stepper Header */}
            <div className="bg-gray-50 border-b px-6 py-3 flex items-center justify-between text-xs">
              {[
                { num: 1, title: "1. Pre-Checklist" },
                { num: 2, title: "2. Tax Code Uplift" },
                { num: 3, title: "3. Execute Rollover" },
              ].map(s => (
                <div key={s.num} className={`flex items-center gap-2 font-semibold ${rolloverStep === s.num ? "text-purple-700" : rolloverStep > s.num ? "text-emerald-600" : "text-gray-400"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    rolloverStep === s.num ? "bg-purple-600 text-white" : rolloverStep > s.num ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-500"
                  }`}>{s.num}</span>
                  <span>{s.title}</span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="p-6 text-xs space-y-4">
              {rolloverStep === 1 && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-gray-900 text-sm">Pre-Rollover Compliance Verification</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Before advancing to the new UK statutory tax year, verify that all statutory requirements for the closing year are completed:
                  </p>

                  <div className="space-y-2 border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-gray-800">Final Pay Run for Month 12 / Week 52 has been calculated and approved.</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-gray-800">Final RTI FPS has been transmitted to HMRC Gateway on or before pay date.</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-gray-800">Final EPS with tax year cessation/final submission declaration filed.</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-gray-800">Form P60 certificates generated for all active staff employed at 5th April.</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Select PAYE Scheme</label>
                    <select 
                      value={rolloverForm.schemeId} 
                      onChange={(e) => setRolloverForm({ ...rolloverForm, schemeId: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg p-2 font-medium"
                    >
                      {schemes.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.employerName || `Scheme #${s.id}`} (Current Year: {s.taxYear || "2024-25"})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {rolloverStep === 2 && (
                <div className="space-y-3.5">
                  <h4 className="font-bold text-gray-900 text-sm">HMRC Tax Code Uplift Rules</h4>
                  <p className="text-gray-600">
                    Configure standard UK Budget statutory adjustments to apply to all active employees during year rollover:
                  </p>

                  <div className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rolloverForm.upliftLCode} 
                        onChange={(e) => setRolloverForm({ ...rolloverForm, upliftLCode: e.target.checked })}
                        className="mt-0.5 rounded text-purple-600" 
                      />
                      <div>
                        <span className="font-bold text-gray-900">Uplift Standard Suffix 'L' Tax Codes</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Increases personal allowance tax codes (e.g. 1257L) as announced in the UK Budget.</p>
                      </div>
                    </label>

                    {rolloverForm.upliftLCode && (
                      <div className="pl-6 pt-1">
                        <label className="block font-medium text-gray-700 mb-1">Increase amount (numeric points, e.g. 0 to retain 1257L or 50 for +£500 allowance):</label>
                        <input 
                          type="number" 
                          value={rolloverForm.lCodeIncrease} 
                          onChange={(e) => setRolloverForm({ ...rolloverForm, lCodeIncrease: parseInt(e.target.value) || 0 })}
                          className="w-32 border border-gray-300 rounded-lg p-1.5 font-mono"
                        />
                      </div>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-gray-200">
                      <input 
                        type="checkbox" 
                        checked={rolloverForm.resetWeek1Month1} 
                        onChange={(e) => setRolloverForm({ ...rolloverForm, resetWeek1Month1: e.target.checked })}
                        className="mt-0.5 rounded text-purple-600" 
                      />
                      <div>
                        <span className="font-bold text-gray-900">Reset 'Week 1 / Month 1' Emergency Basis to Cumulative</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">HMRC rules stipulate non-cumulative emergency bases reset to standard cumulative at start of new tax year.</p>
                      </div>
                    </label>

                    <div className="p-3 bg-purple-50 rounded-lg text-purple-900 border border-purple-100 flex items-start gap-2">
                      <ShieldCheck size={14} className="text-purple-600 shrink-0 mt-0.5" />
                      <span>Year-to-date balances (Gross Pay, Tax Paid, Employee NI, Employer NI) will automatically be cleared to £0.00 for the new tax year.</span>
                    </div>
                  </div>
                </div>
              )}

              {rolloverStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 text-sm">Confirm & Execute Tax Year Rollover</h4>
                  
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs py-1 border-b border-emerald-100">
                      <span className="text-emerald-800 font-medium">Selected PAYE Scheme:</span>
                      <span className="font-bold text-emerald-950 font-mono">
                        {schemes.find((s: any) => s.id === rolloverForm.schemeId)?.employerName || `Scheme #${rolloverForm.schemeId}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1 border-b border-emerald-100">
                      <span className="text-emerald-800 font-medium">Current Tax Year:</span>
                      <span className="font-bold text-emerald-950 font-mono">
                        {schemes.find((s: any) => s.id === rolloverForm.schemeId)?.taxYear || "2024-25"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-emerald-800 font-medium">New Tax Year (Target):</span>
                      <span className="font-bold text-emerald-900 font-mono text-sm">
                        2025-26
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs">
                    Clicking <strong>Execute Rollover</strong> will advance the scheme's tax year, apply tax code uplifts, zero all employee YTD figures, and initialize Period 1 in Draft status.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
              {rolloverStep > 1 ? (
                <button 
                  onClick={() => setRolloverStep(s => s - 1)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <button 
                  onClick={() => setShowRolloverModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {rolloverStep < 3 ? (
                <button 
                  onClick={() => setRolloverStep(s => s + 1)}
                  className="btn-SanSuite inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                >
                  Continue <ArrowRight size={13} />
                </button>
              ) : (
                <button 
                  onClick={() => rolloverMutation.mutate(rolloverForm)}
                  disabled={rolloverMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw size={13} />
                  {rolloverMutation.isPending ? "Executing Rollover..." : "Execute Rollover"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
