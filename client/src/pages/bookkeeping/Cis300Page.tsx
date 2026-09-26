import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  ChevronRight, FileOutput, Send, Plus, X, ShieldCheck,
  Calculator, CheckCircle2, AlertCircle, Printer, Download,
  Layers, Users, Hammer, DollarSign, Calendar, Mail
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function Cis300Page() {
  const [, navigate] = useLocation();
  const [match1, params1] = useRoute("/bookkeeping/:id/cis-300");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientId = match1 ? params1.id : (match2 ? params2.id : "");
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="CIS 300 Returns" />;

  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [period, setPeriod] = useState("2026-05"); // Default tax month ending 5 May 2026

  // Subcontractor statement modal state
  const [showPdsModal, setShowPdsModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);

  // Return lines drill-down modal state
  const [showLinesModal, setShowLinesModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  // Bulk Email state
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailReturnId, setBulkEmailReturnId] = useState<number | null>(null);
  const [bulkEmailSent, setBulkEmailSent] = useState(false);

  // Query existing returns
  const { data: returns = [], isLoading: loadingReturns } = useQuery<any[]>({
    queryKey: [`/api/cis/returns/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cis/returns/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Query live calculation when preparing return
  const { data: calcResult, isLoading: loadingCalc, refetch: refetchCalc } = useQuery({
    queryKey: [`/api/cis/returns/${clientId}/calculate`, period],
    queryFn: async () => {
      if (!showPrepareModal) return null;
      const res = await apiRequest("GET", `/api/cis/returns/${clientId}/calculate?period=${period}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && showPrepareModal,
  });

  // Query lines when viewing return drill-down
  const { data: returnLines = [], isLoading: loadingLines } = useQuery<any[]>({
    queryKey: [`/api/cis/returns/${clientId}/${selectedReturn?.id}/lines`],
    queryFn: async () => {
      if (!selectedReturn?.id) return [];
      const res = await apiRequest("GET", `/api/cis/returns/${clientId}/${selectedReturn.id}/lines`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId && !!selectedReturn?.id,
  });

  // Generate return mutation
  const generateReturnMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/cis/returns/${clientId}/generate`, payload);
      if (!res.ok) throw new Error("Failed to generate CIS return");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cis/returns/${clientId}`] });
      setShowPrepareModal(false);
      toast({ title: "CIS 300 Draft Created", description: "The statutory return has been prepared with authentic bill data." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  });

  // Submit to HMRC gateway mutation
  const submitHmrcMutation = useMutation({
    mutationFn: async (retId: number) => {
      const res = await apiRequest("POST", `/api/cis/returns/${clientId}/${retId}/submit-hmrc`);
      if (!res.ok) throw new Error("Failed to submit to HMRC gateway");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/cis/returns/${clientId}`] });
      toast({
        title: "HMRC Submission Successful",
        description: `Acknowledgment reference: ${data.submissionRef}`
      });
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message, type: "error" });
    }
  });

  // Bulk Email mutation — sends deduction statements to all subcontractors in a return
  const bulkEmailMutation = useMutation({
    mutationFn: async (retId: number) => {
      const res = await apiRequest("POST", `/api/cis/returns/${clientId}/${retId}/bulk-email`);
      if (!res.ok) throw new Error("Failed to send bulk emails");
      return res.json();
    },
    onSuccess: (data: any) => {
      setBulkEmailSent(true);
      toast({
        title: "Bulk Emails Sent",
        description: `CIS deduction statements sent to ${data.count || "all"} subcontractors.`
      });
    },
    onError: (err: any) => {
      toast({ title: "Email Failed", description: err.message, type: "error" });
    }
  });

  const handleOpenBulkEmail = (retId: number) => {
    setBulkEmailReturnId(retId);
    setBulkEmailSent(false);
    setShowBulkEmailModal(true);
  };

  const handleOpenPds = async (returnId: number, subId: number) => {
    try {
      const res = await apiRequest("GET", `/api/cis/returns/${clientId}/${returnId}/statement/${subId}`);
      if (!res.ok) throw new Error("Statement not found");
      const data = await res.json();
      setSelectedStatement(data);
      setShowPdsModal(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleCreateReturn = () => {
    if (!calcResult) return;
    generateReturnMutation.mutate({
      period,
      totalPayments: calcResult.totalPayments,
      totalMaterials: calcResult.totalMaterials,
      totalLabor: calcResult.totalLabor,
      totalDeducted: calcResult.totalDeducted,
      lines: calcResult.lines || [],
    });
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Top Breadcrumb */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-800">CIS 300 Returns</span>
          </div>
          <div className="flex items-center gap-2">
            {returns.length > 0 && (
              <button
                onClick={() => handleOpenBulkEmail(returns[0].id)}
                className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Mail size={15} /> Bulk Email Statements
              </button>
            )}
            <button
              onClick={() => {
                setShowPrepareModal(true);
                refetchCalc();
              }}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FileOutput size={15} /> Prepare Monthly Return
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CIS 300 Monthly Returns</h1>
            <p className="text-sm text-gray-500 mt-1">
              Statutory UK HMRC Construction Industry Scheme: Automatically aggregates subcontractor bills, splits Labor vs Materials, applies statutory deductions, and files CIS300 returns.
            </p>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filed Returns</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {returns.filter((r: any) => r.status === "Filed").length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Draft Returns</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {returns.filter((r: any) => r.status === "Draft").length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <FileOutput size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Statutory Tax Period</p>
                <p className="text-sm font-bold text-gray-800 mt-1">6th to 5th Monthly</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Calendar size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Standard Deduction</p>
                <p className="text-xl font-bold text-amber-600 mt-1">20% on Labor</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* Returns Register Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-600" /> Historical & Active CIS 300 Returns
              </h3>
            </div>

            {loadingReturns ? (
              <div className="p-12 text-center text-gray-500 text-sm">Loading CIS returns...</div>
            ) : returns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileOutput size={24} />
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-1">No CIS 300 Returns Generated Yet</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                  Click below to draft your monthly CIS return. It will automatically pull approved subcontractor purchase bills.
                </p>
                <button
                  onClick={() => {
                    setShowPrepareModal(true);
                    refetchCalc();
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Prepare First Return
                </button>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Tax Period</th>
                    <th className="px-6 py-3 text-right">Gross Paid (£)</th>
                    <th className="px-6 py-3 text-right">Materials (£)</th>
                    <th className="px-6 py-3 text-right">Labor (£)</th>
                    <th className="px-6 py-3 text-right">CIS Deducted (£)</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Subcontractors</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map((ret: any) => (
                    <tr key={ret.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-purple-700">
                        {ret.period}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-800 font-semibold">
                        £{parseFloat(ret.totalPayments || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">
                        £{parseFloat(ret.totalMaterials || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-blue-700 font-medium">
                        £{parseFloat(ret.totalLabor || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-red-600">
                        £{parseFloat(ret.totalDeducted || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ret.status === "Filed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-semibold text-gray-600">
                        {ret.subcontractorCount || 0}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowLinesModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 rounded transition-colors"
                        >
                          View Breakdown
                        </button>
                        {ret.status === "Draft" ? (
                          <button
                            onClick={() => submitHmrcMutation.mutate(ret.id)}
                            disabled={submitHmrcMutation.isPending}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Submit to HMRC
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Filed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Prepare Return Modal (Automated Engine) */}
        {showPrepareModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Prepare CIS 300 Return</h3>
                    <p className="text-xs text-gray-500">Automated calculation from authentic subcontractor purchase bills</p>
                  </div>
                </div>
                <button onClick={() => setShowPrepareModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Period Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">Select Tax Period (HMRC Month)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => refetchCalc()}
                        className="px-3 py-1.5 border border-purple-300 text-purple-700 bg-white hover:bg-purple-50 rounded-lg text-xs font-medium"
                      >
                        Recalculate
                      </button>
                    </div>
                  </div>

                  {calcResult && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">HMRC Tax Period Window</p>
                      <p className="text-xs font-bold text-purple-900 mt-0.5">
                        {calcResult.startDate} to {calcResult.endDate}
                      </p>
                    </div>
                  )}
                </div>

                {/* Calculation Cards */}
                {loadingCalc ? (
                  <div className="p-12 text-center text-sm text-gray-500">Aggregating subcontractor transactions...</div>
                ) : calcResult ? (
                  <>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 font-bold uppercase">Gross Payments</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">£{calcResult.totalPayments}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs text-gray-500 font-bold uppercase">Materials Cost</p>
                        <p className="text-lg font-bold text-gray-700 mt-1">£{calcResult.totalMaterials}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold uppercase">Labor (Liable)</p>
                        <p className="text-lg font-bold text-blue-900 mt-1">£{calcResult.totalLabor}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-xs text-red-600 font-bold uppercase">CIS Deducted</p>
                        <p className="text-lg font-bold text-red-700 mt-1">£{calcResult.totalDeducted}</p>
                      </div>
                    </div>

                    {/* Subcontractor Breakdown Table */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Subcontractor Line Details:</p>
                      {calcResult.lines?.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-500 border border-dashed rounded-xl">
                          No subcontractor bills found for this tax period. You can still generate a nil return.
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                              <tr>
                                <th className="py-2.5 px-3">Subcontractor</th>
                                <th className="py-2.5 px-3">UTR</th>
                                <th className="py-2.5 px-3 text-right">Gross (£)</th>
                                <th className="py-2.5 px-3 text-right">Materials (£)</th>
                                <th className="py-2.5 px-3 text-right">Labor (£)</th>
                                <th className="py-2.5 px-3 text-center">Rate</th>
                                <th className="py-2.5 px-3 text-right">Deducted (£)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {calcResult.lines.map((l: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 font-semibold text-gray-900">{l.subcontractorName}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{l.utrNumber}</td>
                                  <td className="py-2 px-3 text-right font-mono">£{l.grossAmount}</td>
                                  <td className="py-2 px-3 text-right font-mono text-gray-500">£{l.materialsAmount}</td>
                                  <td className="py-2 px-3 text-right font-mono text-blue-700">£{l.laborAmount}</td>
                                  <td className="py-2 px-3 text-center font-medium">{l.deductionRate}%</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-red-600">£{l.deductionAmount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrepareModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateReturn}
                  disabled={generateReturnMutation.isPending || !calcResult}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {generateReturnMutation.isPending ? "Generating..." : "Generate Official Return"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Return Lines Breakdown Modal */}
        {showLinesModal && selectedReturn && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-gray-100 max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900">CIS 300 Return Breakdown ({selectedReturn.period})</h3>
                  <p className="text-xs text-gray-500">Subcontractor statements and payment reconciliation</p>
                </div>
                <button onClick={() => setShowLinesModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {loadingLines ? (
                  <div className="p-8 text-center text-sm text-gray-500">Loading line items...</div>
                ) : returnLines.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">No subcontractor lines recorded for this return.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
                        <tr>
                          <th className="py-2.5 px-3">Subcontractor</th>
                          <th className="py-2.5 px-3">UTR</th>
                          <th className="py-2.5 px-3 text-right">Gross (£)</th>
                          <th className="py-2.5 px-3 text-right">Materials (£)</th>
                          <th className="py-2.5 px-3 text-right">Labor (£)</th>
                          <th className="py-2.5 px-3 text-right">CIS Deducted (£)</th>
                          <th className="py-2.5 px-3 text-right">Net Paid (£)</th>
                          <th className="py-2.5 px-3 text-center">Statement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {returnLines.map((line: any) => (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{line.subcontractorName}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-600">{line.utrNumber || "—"}</td>
                            <td className="py-2.5 px-3 text-right font-mono">£{parseFloat(line.grossAmount).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-500">£{parseFloat(line.materialsAmount).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-blue-700">£{parseFloat(line.laborAmount).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">£{parseFloat(line.deductionAmount).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">£{parseFloat(line.netAmountPaid).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleOpenPds(selectedReturn.id, line.subcontractorId)}
                                className="px-2 py-1 text-xs border border-purple-200 text-purple-700 hover:bg-purple-50 rounded"
                              >
                                View PDS
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setShowLinesModal(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statutory Payment & Deduction Statement (PDS) Modal */}
        {showPdsModal && selectedStatement && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Payment & Deduction Statement</h3>
                    <p className="text-xs text-gray-500">UK HMRC Construction Industry Scheme (CIS)</p>
                  </div>
                </div>
                <button onClick={() => setShowPdsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Printable Statement Layout */}
              <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white text-xs text-gray-700 font-sans">
                <div className="flex justify-between border-b pb-3">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{selectedStatement.contractor?.name}</p>
                    <p className="text-gray-500">Employer Ref: {selectedStatement.contractor?.employerRef}</p>
                    <p className="text-gray-500">Contractor UTR: {selectedStatement.contractor?.utrNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">Tax Month</p>
                    <p className="text-purple-700 font-semibold">{selectedStatement.period}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Subcontractor Details:</p>
                  <p className="mt-0.5"><span className="font-semibold">Name:</span> {selectedStatement.subcontractor?.name}</p>
                  <p><span className="font-semibold">UTR Number:</span> {selectedStatement.subcontractor?.utrNumber}</p>
                  <p><span className="font-semibold">NI Number:</span> {selectedStatement.subcontractor?.niNumber}</p>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between">
                    <span>Gross Amount Paid:</span>
                    <span className="font-mono font-bold">£{parseFloat(selectedStatement.grossAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Less Cost of Materials:</span>
                    <span className="font-mono">£{parseFloat(selectedStatement.materialsAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-medium">
                    <span>Amount Liable to Deduction (Labor):</span>
                    <span className="font-mono">£{parseFloat(selectedStatement.laborAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold border-t pt-2">
                    <span>CIS Tax Deducted ({selectedStatement.deductionRate}%):</span>
                    <span className="font-mono">£{parseFloat(selectedStatement.deductionAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold border-t pt-2 text-sm">
                    <span>Net Amount Paid:</span>
                    <span className="font-mono">£{parseFloat(selectedStatement.netAmountPaid).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print Statement
                </button>
                <button
                  onClick={() => setShowPdsModal(false)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Email Modal */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Bulk Email — CIS Statements</h3>
                    <p className="text-xs text-gray-500">Send deduction statements to all subcontractors</p>
                  </div>
                </div>
                <button onClick={() => { setShowBulkEmailModal(false); setBulkEmailSent(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {bulkEmailSent ? (
                  <div className="flex flex-col items-center py-6 gap-3">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 className="font-bold text-gray-800">Statements Sent Successfully</h4>
                    <p className="text-sm text-gray-500 text-center">All subcontractor deduction statements have been emailed.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                      <p className="font-semibold mb-1 flex items-center gap-2"><AlertCircle size={14} /> What this action does:</p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Generates a PDF deduction statement for each subcontractor</li>
                        <li>Emails each statement to the subcontractor's registered email address</li>
                        <li>Records the dispatch in the CIS audit log</li>
                        <li>Marks statements as "Sent" in the CIS return</li>
                      </ul>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => { setShowBulkEmailModal(false); }} className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button
                        onClick={() => bulkEmailReturnId && bulkEmailMutation.mutate(bulkEmailReturnId)}
                        disabled={bulkEmailMutation.isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                        <Send size={14} /> {bulkEmailMutation.isPending ? "Sending..." : "Send All Statements"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
