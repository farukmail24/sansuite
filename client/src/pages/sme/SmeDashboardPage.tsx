import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  FileText, Receipt, CreditCard, Users, Plus, UploadCloud,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Building2, Landmark, Clock, RefreshCw, ChevronRight, X
} from "lucide-react";

export default function SmeDashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  // New Invoice Form State
  const [invCustomer, setInvCustomer] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invVat, setInvVat] = useState("");
  const [invNotes, setInvNotes] = useState("");

  // New Bill Form State
  const [billSupplier, setBillSupplier] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billVat, setBillVat] = useState("");
  const [billNotes, setBillNotes] = useState("");

  const { data: workspace, isLoading, refetch } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load workspace data");
      return res.json();
    },
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-invoices", {
        customerName: invCustomer,
        totalAmount: invAmount,
        vatAmount: invVat || "0.00",
        notes: invNotes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Created", description: "Sales invoice successfully recorded." });
      setShowInvoiceModal(false);
      setInvCustomer("");
      setInvAmount("");
      setInvVat("");
      setInvNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Upload Bill / Receipt Mutation
  const createBillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-receipts", {
        supplierName: billSupplier,
        amount: billAmount,
        vatAmount: billVat || "0.00",
        notes: billNotes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Receipt Uploaded", description: "Expense receipt bridged to accountant." });
      setShowBillModal(false);
      setBillSupplier("");
      setBillAmount("");
      setBillVat("");
      setBillNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const client = workspace?.client;
  const stats = workspace?.stats || {
    totalInvoiced: 0,
    totalExpenses: 0,
    bankBalance: 0,
    invoicesCount: 0,
    purchasesCount: 0,
    bankAccountsCount: 0,
    pendingDocRequestsCount: 0,
  };
  const invoices = workspace?.invoices || [];
  const purchases = workspace?.purchases || [];
  const docRequests = workspace?.documentRequests || [];

  return (
    <SmeLayout module="SME Dashboard">
      <div className="space-y-6">
        {/* Welcome & Connected Firm Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                Client & SME Workspace
              </span>
              <span className="text-xs text-blue-200">
                Company Reg: {client?.companyNumber || "N/A"}
              </span>
            </div>
            <h1 className="text-2xl font-black">{client?.name || "Company Dashboard"}</h1>
            <p className="text-xs text-blue-100 mt-1">
              Connected Practice: <strong className="text-white">{workspace?.accountant?.firmName || "CA Firm"}</strong> — Live Bridging Enabled.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Plus size={15} /> New Invoice
            </button>
            <button
              onClick={() => setShowBillModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <UploadCloud size={15} /> Upload Receipt
            </button>
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced (YTD)</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                £{Number(stats.totalInvoiced).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">{stats.invoicesCount} invoices recorded</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expenses & Bills</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                £{Number(stats.totalExpenses).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">{stats.purchasesCount} bills recorded</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Balance</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">
                £{Number(stats.bankBalance).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">{stats.bankAccountsCount} accounts connected</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Landmark size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accountant Requests</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {stats.pendingDocRequestsCount}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Action items pending</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Two Columns: Recent Invoices & Recent Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Invoices Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Recent Sales Invoices</h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus size={14} /> New Invoice
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h4 className="text-sm font-semibold text-gray-800">No Sales Invoices Yet</h4>
                <p className="text-xs text-gray-500 mt-1 mb-4">Create your first customer invoice to start billing.</p>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  + Create First Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold uppercase">
                      <th className="pb-2">Invoice #</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition">
                        <td className="py-2.5 font-bold text-gray-800">{inv.invoiceNumber}</td>
                        <td className="py-2.5 text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("en-GB")}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">
                          £{Number(inv.grandTotal).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Purchases / Bills Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Recent Bills & Receipts</h3>
              </div>
              <button
                onClick={() => setShowBillModal(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <UploadCloud size={14} /> Upload Receipt
              </button>
            </div>

            {purchases.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                  <Receipt size={20} />
                </div>
                <h4 className="text-sm font-semibold text-gray-800">No Expense Receipts Recorded</h4>
                <p className="text-xs text-gray-500 mt-1 mb-4">Upload expense receipts or bills to bridge data directly to your accountant.</p>
                <button
                  onClick={() => setShowBillModal(true)}
                  className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  + Upload First Receipt
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold uppercase">
                      <th className="pb-2">Bill Ref</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="py-2.5 font-bold text-gray-800">{p.billNumber || `REC-${p.id}`}</td>
                        <td className="py-2.5 text-gray-500">{new Date(p.billDate).toLocaleDateString("en-GB")}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">
                          £{Number(p.grandTotal).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                            {p.status || "Bridged"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Document Requests Section */}
        {docRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">Pending Requests from your Accountant</h3>
              </div>
            </div>
            <div className="space-y-3">
              {docRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">{req.title || "Document Upload Request"}</h5>
                    <p className="text-[11px] text-gray-600 mt-0.5">{req.description || "Please upload requested files for accounts preparation."}</p>
                  </div>
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <UploadCloud size={13} /> Respond & Upload
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: New Sales Invoice */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Create Sales Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createInvoiceMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={invCustomer}
                  onChange={(e) => setInvCustomer(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Net Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">VAT Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invVat}
                    onChange={(e) => setInvVat(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Invoice description or payment terms..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Save & Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Receipt / Bill */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Upload Receipt / Purchase Bill</h3>
              <button onClick={() => setShowBillModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBillMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={billSupplier}
                  onChange={(e) => setBillSupplier(e.target.value)}
                  placeholder="e.g. British Telecom, Shell, Amazon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">VAT Portion (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={billVat}
                    onChange={(e) => setBillVat(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Notes / Reference</label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder="Receipt reference or category..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span>This expense will be instantly bridged to your CA firm accountant for VAT and tax review.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBillMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {createBillMutation.isPending ? "Uploading..." : "Save & Bridge to Accountant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SmeLayout>
  );
}
