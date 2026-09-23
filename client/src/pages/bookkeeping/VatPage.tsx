import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, ShoppingCart, Wallet, BarChart2, Settings,
  Plus, X, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Send,
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

const STEPS = ["Set-up VAT Period", "Review Transactions", "Review Return", "Submit to HMRC"];

export default function VatPage() {
  const [match, params] = useRoute("/bookkeeping/:id/vat");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();

  if (!clientId) return <ClientGuard featureTitle="VAT Return" />;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [viewPeriodDetails, setViewPeriodDetails] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [vatForm, setVatForm] = useState({
    clientId: clientId || "", 
    description: "", 
    fromDate: "", 
    toDate: "", 
    lateClaimsIncluded: false,
    deregistered: false,
  });

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/vat", clientId],
    queryFn: async () => { 
      const r = await apiRequest("GET", `/api/bookkeeping/vat/client/${clientId}`); 
      return r.ok ? r.json() : []; 
    },
    enabled: !!clientId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/bookkeeping/invoices/client", clientId],
    queryFn: async () => { 
      const r = await apiRequest("GET", `/api/bookkeeping/invoices/client/${clientId}`); 
      return r.ok ? r.json() : []; 
    },
    enabled: !!clientId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/bookkeeping/purchases/client", clientId],
    queryFn: async () => { 
      const r = await apiRequest("GET", `/api/bookkeeping/purchases/client/${clientId}`); 
      return r.ok ? r.json() : []; 
    },
    enabled: !!clientId,
  });

  // Statutory VAT 9-Box Calculation (Signed Net VAT supporting HMRC Refund)
  const vatOnSales = invoices.reduce((s: number, i: any) => s + parseFloat(i.vatTotal || "0"), 0);
  const vatOnPurchases = purchases.reduce((s: number, p: any) => s + parseFloat(p.vatTotal || "0"), 0);
  const netVatDue = vatOnSales - vatOnPurchases; // Preserves signed value
  const isRefund = netVatDue < 0;
  const totalValueSales = invoices.reduce((s: number, i: any) => s + parseFloat(i.subTotal || "0"), 0);
  const totalValuePurchases = purchases.reduce((s: number, p: any) => s + parseFloat(p.subTotal || "0"), 0);

  const createPeriod = useMutation({
    mutationFn: async () => {
      if (!vatForm.fromDate || !vatForm.toDate) throw new Error("Please select From and To dates");
      const r = await apiRequest("POST", "/api/bookkeeping/vat-period", {
        clientId: parseInt(clientId),
        description: vatForm.description || `VAT Return (${vatForm.fromDate} to ${vatForm.toDate})`,
        fromDate: vatForm.fromDate,
        toDate: vatForm.toDate,
        lateClaimsIncluded: vatForm.lateClaimsIncluded,
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "VAT Return Saved", description: "VAT period successfully calculated and saved.", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/vat", clientId] });
      setShowWizard(false);
      setStep(0);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const resetWizard = () => { setShowWizard(false); setStep(0); };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Bookkeeping / VAT / Making Tax Digital</p>
            <h1 className="text-xl font-bold text-gray-800">VAT Returns (HMRC MTD)</h1>
          </div>
          <button 
            onClick={() => {
              setVatForm(f => ({ ...f, clientId: clientId || "" }));
              setShowWizard(true);
            }} 
            className="btn-SanSuite flex items-center gap-2"
          >
            <Plus size={14} /> New VAT Period
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="SanSuite-card p-5 border-l-4 border-l-red-500">
            <p className="text-xs font-semibold text-gray-500 uppercase">VAT Due on Sales (Box 1)</p>
            <p className="text-2xl font-bold mt-2 text-red-600">£{vatOnSales.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">Total output VAT on all client sales</p>
          </div>

          <div className="SanSuite-card p-5 border-l-4 border-l-emerald-500">
            <p className="text-xs font-semibold text-gray-500 uppercase">VAT Reclaimed on Purchases (Box 4)</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">£{vatOnPurchases.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">Total deductible input VAT on expenses</p>
          </div>

          <div className={`SanSuite-card p-5 border-l-4 ${isRefund ? "border-l-emerald-600 bg-emerald-50/20" : "border-l-purple-600 bg-purple-50/20"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                {isRefund ? "Net VAT Reclaim from HMRC (Box 5)" : "Net VAT Payable to HMRC (Box 5)"}
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isRefund ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
              }`}>
                {isRefund ? "Refund Due" : "Payment Due"}
              </span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${isRefund ? "text-emerald-700" : "text-purple-700"}`}>
              {isRefund ? `£${Math.abs(netVatDue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : `£${netVatDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isRefund ? "Statutory reclaim from HMRC (Inputs > Outputs)" : "Statutory tax payment due to HMRC"}
            </p>
          </div>
        </div>

        {/* VAT Periods Table */}
        <div className="SanSuite-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-gray-700">VAT Return History</h3>
              <p className="text-xs text-gray-400">Statutory 9-Box periodic returns saved for this client</p>
            </div>
          </div>
          <table className="SanSuite-table">
            <thead>
              <tr>
                <th>Period From</th>
                <th>Period To</th>
                <th>Description</th>
                <th className="text-right">Box 1 (Sales VAT)</th>
                <th className="text-right">Box 4 (Input VAT)</th>
                <th className="text-right">Box 5 (Net Due / Reclaim)</th>
                <th>Status</th>
                <th>Late Claims</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading VAT returns...</td></tr>
              ) : periods.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-xs">
                  No VAT returns recorded. Click "+ New VAT Period" to compute a statutory return.
                </td></tr>
              ) : periods.map((p: any) => {
                const net = parseFloat(p.box5NetVat || p.netVatDue || "0");
                const isPeriodRefund = net < 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="font-medium text-gray-800">{p.fromDate ? new Date(p.fromDate).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="font-medium text-gray-800">{p.toDate ? new Date(p.toDate).toLocaleDateString("en-GB") : "—"}</td>
                    <td>{p.description || "—"}</td>
                    <td className="text-right font-mono text-xs text-red-600">
                      £{parseFloat(p.box1VatDueSales || p.vatDueOnSales || "0").toFixed(2)}
                    </td>
                    <td className="text-right font-mono text-xs text-emerald-600">
                      £{parseFloat(p.box4VatReclaimed || p.vatReclaimedOnPurchases || "0").toFixed(2)}
                    </td>
                    <td className="text-right font-mono text-xs font-bold">
                      <span className={isPeriodRefund ? "text-emerald-700" : "text-purple-700"}>
                        {isPeriodRefund ? `-£${Math.abs(net).toFixed(2)} (Refund)` : `£${net.toFixed(2)}`}
                      </span>
                    </td>
                    <td>
                      <span className={p.vatStatus === "Filed" ? "badge-success" : p.vatStatus === "Calculated" ? "badge-info" : "badge-gray"}>
                        {p.vatStatus}
                      </span>
                    </td>
                    <td>
                      {p.lateClaimsIncluded ? (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Included</span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => setViewPeriodDetails(p)} 
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                      >
                        <FileText size={12} /> View 9-Box
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4-Step VAT Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Wizard Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h2 className="font-bold text-gray-800">New VAT Return — {STEPS[step]}</h2>
              <button onClick={resetWizard}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex items-center gap-2 text-xs font-medium ${i === step ? "text-purple-700" : i < step ? "text-green-600" : "text-gray-400"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-400"
                        }`}>
                        {i < step ? <CheckCircle2 size={12} /> : i + 1}
                      </div>
                      <span className="hidden md:block">{s}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    Set up the VAT period dates and description. The system will automatically calculate statutory 9 boxes from client sales invoices and purchase bills.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">From Date *</label>
                      <input 
                        type="date" 
                        value={vatForm.fromDate} 
                        onChange={e => setVatForm({ ...vatForm, fromDate: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">To Date *</label>
                      <input 
                        type="date" 
                        value={vatForm.toDate} 
                        onChange={e => setVatForm({ ...vatForm, toDate: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Return Description</label>
                      <input 
                        value={vatForm.description} 
                        onChange={e => setVatForm({ ...vatForm, description: e.target.value })}
                        placeholder="e.g. Q1 2026/27 MTD VAT Return" 
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="col-span-2 space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="lateClaims" 
                          checked={vatForm.lateClaimsIncluded} 
                          onChange={e => setVatForm({ ...vatForm, lateClaimsIncluded: e.target.checked })} 
                        />
                        <label htmlFor="lateClaims" className="text-xs text-gray-700 font-medium">
                          Include Late Claims (Include previously unfiled transactions prior to From Date)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="dereg" 
                          checked={vatForm.deregistered} 
                          onChange={e => setVatForm({ ...vatForm, deregistered: e.target.checked })} 
                        />
                        <label htmlFor="dereg" className="text-xs text-gray-600">De-registered for VAT (Final Return)</label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    The following transactions have been identified in the selected period. Review transactions before generating the 9-box return.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="SanSuite-card p-4">
                      <h4 className="text-xs font-bold text-gray-600 mb-3">Sales Invoices (Outputs)</h4>
                      <p className="text-lg font-bold text-gray-800">{invoices.length} invoices</p>
                      <p className="text-xs text-gray-500 mt-1">Output VAT: <span className="font-semibold text-red-600">£{vatOnSales.toFixed(2)}</span></p>
                      <p className="text-xs text-gray-500">Net Sales (Excl. VAT): £{totalValueSales.toFixed(2)}</p>
                    </div>
                    <div className="SanSuite-card p-4">
                      <h4 className="text-xs font-bold text-gray-600 mb-3">Purchases & Expenses (Inputs)</h4>
                      <p className="text-lg font-bold text-gray-800">{purchases.length} bills</p>
                      <p className="text-xs text-gray-500 mt-1">Input VAT: <span className="font-semibold text-emerald-600">£{vatOnPurchases.toFixed(2)}</span></p>
                      <p className="text-xs text-gray-500">Net Purchases (Excl. VAT): £{totalValuePurchases.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    Official UK HMRC Statutory 9-Box Return preview.
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Box</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">HMRC Description</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Amount (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { box: "Box 1", desc: "VAT due on sales and other outputs", val: vatOnSales, cls: "text-red-600 font-medium" },
                        { box: "Box 2", desc: "VAT due on acquisitions from other EU member states", val: 0, cls: "" },
                        { box: "Box 3", desc: "Total VAT due (Box 1 + Box 2)", val: vatOnSales, cls: "font-semibold" },
                        { box: "Box 4", desc: "VAT reclaimed on purchases and all other inputs", val: vatOnPurchases, cls: "text-emerald-600 font-medium" },
                        { 
                          box: "Box 5", 
                          desc: isRefund ? "Net VAT to reclaim from HMRC (Box 4 - Box 3 Refund)" : "Net VAT to pay to HMRC (Box 3 - Box 4)", 
                          val: isRefund ? -Math.abs(netVatDue) : netVatDue, 
                          cls: isRefund ? "font-bold text-emerald-700 bg-emerald-50/50" : "font-bold text-purple-700 bg-purple-50/50" 
                        },
                        { box: "Box 6", desc: "Total value of sales and all other outputs (excl. VAT)", val: totalValueSales, cls: "" },
                        { box: "Box 7", desc: "Total value of purchases and all other inputs (excl. VAT)", val: totalValuePurchases, cls: "" },
                        { box: "Box 8", desc: "Total value of dispatches to EU member states", val: 0, cls: "" },
                        { box: "Box 9", desc: "Total value of acquisitions from EU member states", val: 0, cls: "" },
                      ].map(r => (
                        <tr key={r.box} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs font-bold text-gray-500">{r.box}</td>
                          <td className="px-4 py-2 text-xs text-gray-600">{r.desc}</td>
                          <td className={`px-4 py-2 text-right text-sm ${r.cls}`}>
                            {r.val < 0 ? `-£${Math.abs(r.val).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : `£${r.val.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-800">
                      <strong>HMRC MTD Ready:</strong> This VAT return will be calculated according to HMRC Making Tax Digital rules and saved into the SanSuite database for audit compliance.
                    </p>
                  </div>
                  <div className="SanSuite-card p-4">
                    <h4 className="text-xs font-bold text-gray-600 mb-3">Return Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Period</span><span className="font-medium">{vatForm.fromDate} → {vatForm.toDate}</span></div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Result</span>
                        <span className={`font-bold ${isRefund ? "text-emerald-700" : "text-purple-700"}`}>
                          {isRefund ? `£${Math.abs(netVatDue).toFixed(2)} (HMRC Refund)` : `£${netVatDue.toFixed(2)} (To Pay)`}
                        </span>
                      </div>
                      <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="badge-info">Calculated</span></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Click "Save Return" to finalize this period and lock the 9-box calculation.
                  </p>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
              <button onClick={() => step > 0 ? setStep(s => s - 1) : resetWizard()}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-1">
                <ChevronLeft size={14} /> {step === 0 ? "Cancel" : "Previous"}
              </button>
              {step < STEPS.length - 1 ? (
                <button 
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 0 && (!vatForm.fromDate || !vatForm.toDate)}
                  className="btn-SanSuite flex items-center gap-1 disabled:opacity-50"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => createPeriod.mutate()} disabled={createPeriod.isPending}
                  className="btn-SanSuite flex items-center gap-2 disabled:opacity-50">
                  <CheckCircle2 size={14} />
                  {createPeriod.isPending ? "Saving..." : "Save Return"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View 9-Box Period Modal */}
      {viewPeriodDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="font-bold text-gray-800">Statutory 9-Box VAT Return</h2>
                <p className="text-xs text-gray-500">
                  {viewPeriodDetails.fromDate ? new Date(viewPeriodDetails.fromDate).toLocaleDateString("en-GB") : ""} — {viewPeriodDetails.toDate ? new Date(viewPeriodDetails.toDate).toLocaleDateString("en-GB") : ""} ({viewPeriodDetails.description || "VAT Period"})
                </p>
              </div>
              <button onClick={() => setViewPeriodDetails(null)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Box</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">HMRC Description</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Amount (£)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { box: "Box 1", desc: "VAT due on sales and other outputs", val: parseFloat(viewPeriodDetails.box1VatDueSales || viewPeriodDetails.vatDueOnSales || "0"), cls: "text-red-600 font-medium" },
                    { box: "Box 2", desc: "VAT due on acquisitions from EU", val: parseFloat(viewPeriodDetails.box2VatDueAcquisitions || "0"), cls: "" },
                    { box: "Box 3", desc: "Total VAT due (Box 1 + Box 2)", val: parseFloat(viewPeriodDetails.box3TotalVatDue || viewPeriodDetails.vatDueOnSales || "0"), cls: "font-semibold" },
                    { box: "Box 4", desc: "VAT reclaimed on purchases and inputs", val: parseFloat(viewPeriodDetails.box4VatReclaimed || viewPeriodDetails.vatReclaimedOnPurchases || "0"), cls: "text-emerald-600 font-medium" },
                    { 
                      box: "Box 5", 
                      desc: parseFloat(viewPeriodDetails.box5NetVat || viewPeriodDetails.netVatDue || "0") < 0 ? "Net VAT to reclaim from HMRC (Refund)" : "Net VAT to pay to HMRC", 
                      val: parseFloat(viewPeriodDetails.box5NetVat || viewPeriodDetails.netVatDue || "0"), 
                      cls: parseFloat(viewPeriodDetails.box5NetVat || viewPeriodDetails.netVatDue || "0") < 0 ? "font-bold text-emerald-700 bg-emerald-50/50" : "font-bold text-purple-700 bg-purple-50/50" 
                    },
                    { box: "Box 6", desc: "Total value of sales (excl. VAT)", val: parseFloat(viewPeriodDetails.box6TotalSalesExVat || "0"), cls: "" },
                    { box: "Box 7", desc: "Total value of purchases (excl. VAT)", val: parseFloat(viewPeriodDetails.box7TotalPurchasesExVat || "0"), cls: "" },
                    { box: "Box 8", desc: "Total value of EC supplies", val: parseFloat(viewPeriodDetails.box8TotalEuSupplies || "0"), cls: "" },
                    { box: "Box 9", desc: "Total value of EC acquisitions", val: parseFloat(viewPeriodDetails.box9TotalEuAcquisitions || "0"), cls: "" },
                  ].map(r => (
                    <tr key={r.box} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-gray-500">{r.box}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700">{r.desc}</td>
                      <td className={`px-4 py-2.5 text-right text-sm ${r.cls}`}>
                        {r.val < 0 ? `-£${Math.abs(r.val).toFixed(2)}` : `£${r.val.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button onClick={() => setViewPeriodDetails(null)} className="btn-SanSuite">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
