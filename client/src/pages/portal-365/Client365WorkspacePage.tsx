import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { generateSanSuiteInvoicePdf } from "../../lib/sanSuiteInvoicePdfGenerator";
import {
  Sparkles, Receipt, FileText, Landmark, FolderCheck, Plus,
  UploadCloud, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  LogOut, RefreshCw, X, ChevronRight, Download, Eye, ShieldCheck,
  Building2, Calendar, DollarSign
} from "lucide-react";

export default function Client365WorkspacePage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"receipts" | "invoices" | "bank" | "requests" | "payslips">("receipts");

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDocReq, setSelectedDocReq] = useState<any>(null);
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);

  // Receipt form state
  const [receiptSupplier, setReceiptSupplier] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptVat, setReceiptVat] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  // Invoice form state
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceVat, setInvoiceVat] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Query Workspace Data
  const { data: workspace, isLoading, refetch } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load 365 workspace");
      return res.json();
    },
  });

  // Receipt Upload Mutation
  const uploadReceiptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-receipts", {
        supplierName: receiptSupplier,
        amount: receiptAmount,
        vatAmount: receiptVat || "0.00",
        notes: receiptNotes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Receipt Uploaded", description: "Expense receipt bridged directly to your accountant." });
      setShowReceiptModal(false);
      setReceiptSupplier("");
      setReceiptAmount("");
      setReceiptVat("");
      setReceiptNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-invoices", {
        customerName: invoiceCustomer,
        totalAmount: invoiceAmount,
        vatAmount: invoiceVat || "0.00",
        notes: invoiceNotes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Created", description: "Sales invoice recorded and synced." });
      setShowInvoiceModal(false);
      setInvoiceCustomer("");
      setInvoiceAmount("");
      setInvoiceVat("");
      setInvoiceNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    },
  });

  // Fulfill Document Request Mutation
  const fulfillDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadDocFile || !selectedDocReq) throw new Error("Please select a file to upload.");
      const formData = new FormData();
      formData.append("file", uploadDocFile);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/portal/document-requests/${selectedDocReq.id}/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload document");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document Submitted", description: "Document sent directly to your accountant." });
      setShowDocModal(false);
      setSelectedDocReq(null);
      setUploadDocFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  const handlePreviewPdf = (inv: any) => {
    try {
      generateSanSuiteInvoicePdf(
        {
          documentType: "Invoice",
          invoiceNumber: inv.invoiceNumber || "INV-001",
          invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          companyName: client?.companyName || client?.name || "SanSuite Client",
          customerName: inv.customerName || "Customer",
          netAmount: inv.subTotal || inv.grandTotal || "0.00",
          vatAmount: inv.vatTotal || inv.vatAmount || "0.00",
          totalAmount: inv.grandTotal || inv.totalAmount || "0.00",
          items: inv.items || [
            {
              description: inv.notes || "Professional Accounting Services",
              quantity: 1,
              unitPrice: inv.grandTotal || inv.totalAmount || "0.00",
              netAmount: inv.grandTotal || inv.totalAmount || "0.00",
              grossAmount: inv.grandTotal || inv.totalAmount || "0.00",
            }
          ],
        },
        "preview"
      );
    } catch (e: any) {
      toast({ title: "Preview Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDownloadPdf = (inv: any) => {
    try {
      generateSanSuiteInvoicePdf(
        {
          documentType: "Invoice",
          invoiceNumber: inv.invoiceNumber || "INV-001",
          invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          companyName: client?.companyName || client?.name || "SanSuite Client",
          customerName: inv.customerName || "Customer",
          netAmount: inv.subTotal || inv.grandTotal || "0.00",
          vatAmount: inv.vatTotal || inv.vatAmount || "0.00",
          totalAmount: inv.grandTotal || inv.totalAmount || "0.00",
          items: inv.items || [
            {
              description: inv.notes || "Professional Accounting Services",
              quantity: 1,
              unitPrice: inv.grandTotal || inv.totalAmount || "0.00",
              netAmount: inv.grandTotal || inv.totalAmount || "0.00",
              grossAmount: inv.grandTotal || inv.totalAmount || "0.00",
            }
          ],
        },
        "download"
      );
      toast({ title: "Downloading PDF", description: `Downloading invoice ${inv.invoiceNumber}.` });
    } catch (e: any) {
      toast({ title: "Download Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDownloadDocx = async (inv: any) => {
    try {
      const res = await fetch(`/api/bookkeeping/invoices/${inv.id}/download-doc`);
      if (!res.ok) {
        throw new Error("Docx template could not be rendered.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoiceNumber || "Invoice"}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Word Document Downloaded", description: `${inv.invoiceNumber}.docx downloaded.` });
    } catch (e: any) {
      toast({ title: "Download Error", description: e.message, variant: "destructive" });
    }
  };

  const client = workspace?.client;
  const stats = {
    totalSales: Number(workspace?.stats?.totalInvoiced ?? workspace?.stats?.totalSales ?? 0),
    totalBills: Number(workspace?.stats?.totalExpenses ?? workspace?.stats?.totalBills ?? 0),
    invoiceCount: Number(workspace?.stats?.invoicesCount ?? workspace?.stats?.invoiceCount ?? 0),
    billCount: Number(workspace?.stats?.purchasesCount ?? workspace?.stats?.billCount ?? 0),
    bankCount: Number(workspace?.stats?.bankAccountsCount ?? workspace?.stats?.bankCount ?? 0),
    pendingRequestsCount: Number(workspace?.stats?.pendingDocRequestsCount ?? workspace?.stats?.pendingRequestsCount ?? 0),
  };
  const invoices = workspace?.invoices || workspace?.recentInvoices || [];
  const bills = workspace?.purchases || workspace?.recentBills || [];
  const bankAccounts = workspace?.bankAccounts || [];
  const documentRequests = workspace?.documentRequests || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">SanSuite</span>
                <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                  SanSuite 365
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {user?.clientName || client?.name || "Client Portal"}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>Accountant Live Sync</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <UploadCloud size={14} /> Upload Receipt
            </button>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus size={14} /> New Invoice
            </button>

            <div className="h-5 w-px bg-gray-200" />

            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-500">{user?.email}</p>
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/login?portal=365");
              }}
              title="Sign Out"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 lg:px-8 flex items-center gap-1 border-t border-gray-100 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab("receipts")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "receipts"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Receipt size={15} /> Receipts & DocScan
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-purple-100 text-purple-700 rounded-full font-bold">
              {stats.billCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "invoices"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FileText size={15} /> Invoices & Billing
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-gray-200 text-gray-700 rounded-full font-bold">
              {stats.invoiceCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("bank")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "bank"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Landmark size={15} /> Bank Feeds
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-gray-200 text-gray-700 rounded-full font-bold">
              {stats.bankCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "requests"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FolderCheck size={15} /> Accountant Requests
            {stats.pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                {stats.pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("payslips")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "payslips"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Download size={15} /> Payslips
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">
              {workspace?.payslips?.length || 0}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipts Processed</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                £{stats.totalBills.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{stats.billCount} expense records</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Invoiced</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                £{stats.totalSales.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{stats.invoiceCount} issued invoices</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Feeds</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.bankCount} Active</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Live Open Banking sync</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CA Requests</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingRequestsCount} Pending</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Secure Doc Delivery</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FolderCheck size={20} />
            </div>
          </div>
        </div>

        {/* Tab 1: Receipts & DocScan */}
        {activeTab === "receipts" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/20">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Receipt size={18} className="text-purple-600" />
                  DocScan & Receipt Capture
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Snap or upload receipts. Receipts are securely OCR-parsed and bridged directly into your accountant's ledger.
                </p>
              </div>
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <UploadCloud size={14} /> Snap / Upload Receipt
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading receipts...</div>
            ) : bills.length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No Receipts Uploaded Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Keep your accounts compliant by submitting supplier invoices, receipts, and meal slips in seconds.
                </p>
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Upload First Receipt
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Supplier Name</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">DocScan Status</th>
                      <th className="px-5 py-3">VAT</th>
                      <th className="px-5 py-3 text-right">Total (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bills.map((bill: any) => (
                      <tr key={bill.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-gray-900">{bill.supplierName || "Direct Supplier"}</span>
                          {bill.billNumber && (
                            <span className="block text-[11px] text-gray-400 font-mono mt-0.5">
                              #{bill.billNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">
                          {bill.billDate ? new Date(bill.billDate).toLocaleDateString("en-GB") : "Recent"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            Bridged to Accountant
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">
                          £{parseFloat(bill.vatTotal || "0").toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                          £{parseFloat(bill.grandTotal || "0").toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Invoices & Billing */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/20">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  Sales Invoices & Receivables
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Generate instant client invoices. Real-time synchronisation with your firm's bookkeeping ledger.
                </p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus size={14} /> Create New Invoice
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No Sales Invoices Created Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Send clear, professional invoices directly to your clients and get paid faster.
                </p>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Create First Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Invoice Number</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Total (£)</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-5 py-3.5 text-gray-800 font-medium">
                          {inv.customerName || "Direct Client"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "Recent"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            <CheckCircle2 size={11} />
                            {inv.status || "Issued"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                          £{parseFloat(inv.grandTotal || "0").toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePreviewPdf(inv)}
                              title="Preview Dynamic Invoice"
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(inv)}
                              title="Download PDF"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded cursor-pointer transition"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadDocx(inv)}
                              title="Download Word Template (.docx)"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer transition"
                            >
                              <FileText size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Bank Feeds */}
        {activeTab === "bank" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-blue-50/20">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Landmark size={18} className="text-blue-600" />
                  Connected Bank Feeds
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time Open Banking connections and account reconciliations monitored by your accountant.
                </p>
              </div>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Landmark size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No Bank Accounts Linked</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Bank feeds configured by your accountant will automatically appear here with live balances.
                </p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccounts.map((acc: any) => (
                  <div key={acc.id} className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                          <Landmark size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{acc.accountName || "Business Account"}</h4>
                          <p className="text-xs text-gray-500 font-mono">
                            {acc.accountNumber ? `•••• ${acc.accountNumber.slice(-4)}` : "Open Banking"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                        Live Feed
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline justify-between">
                      <span className="text-xs text-gray-500">Available Balance</span>
                      <span className="text-xl font-bold text-gray-900 font-mono">
                        £{parseFloat(acc.currentBalance || "0").toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Accountant Requests */}
        {activeTab === "requests" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-amber-50/20">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FolderCheck size={18} className="text-amber-600" />
                  Accountant Document Requests & eSign
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Items requested by your CA firm (e.g. VAT proofs, year-end bank statements, Capisign digital signatures).
                </p>
              </div>
            </div>

            {documentRequests.length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">All Requests Completed</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  You have no outstanding document or signature requests from your accountant. Everything is up to date!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {documentRequests.map((req: any) => (
                  <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <FolderCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{req.title || "Document Request"}</h4>
                        <p className="text-xs text-gray-500">{req.description || "Requested by Practice Accountant"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDocReq(req);
                        setShowDocModal(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <UploadCloud size={13} /> Submit Document
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Payslips */}
        {activeTab === "payslips" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-emerald-50/20">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Download size={18} className="text-emerald-600" />
                  Payroll & Payslips
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Official employee payslips generated from RTI-compliant payroll runs.
                </p>
              </div>
            </div>

            {(workspace?.payslips || []).length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No Payslips Generated Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  When your accountant processes a payroll run for your company, all employee payslips and tax deduction breakdowns will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Employee Name</th>
                      <th className="px-5 py-3">Tax Period</th>
                      <th className="px-5 py-3">Gross Pay</th>
                      <th className="px-5 py-3">Tax Deducted</th>
                      <th className="px-5 py-3 text-right">Net Pay</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workspace.payslips.map((ps: any) => (
                      <tr key={ps.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {ps.employeeName || "Employee"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">
                          Month {ps.taxMonth || 1} ({ps.taxYear || "2025/26"})
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 font-mono">
                          £{parseFloat(ps.grossPay || "0").toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-red-600 font-mono">
                          £{parseFloat(ps.taxDeducted || "0").toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-700 font-mono">
                          £{parseFloat(ps.netPay || "0").toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              toast({ title: "Payslip Download", description: `Downloading payslip for ${ps.employeeName || "Employee"}.` });
                            }}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download size={13} /> View Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>


      {/* Modal: Snap / Upload Receipt */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Receipt size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Snap / Upload Receipt</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadReceiptMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adobe Systems, British Airways, Stationers"
                  value={receiptSupplier}
                  onChange={(e) => setReceiptSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Gross Total Amount (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    VAT Included (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={receiptVat}
                    onChange={(e) => setReceiptVat(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes / Expense Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client lunch meeting, Software subscription, Office supplies"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 text-center bg-purple-50/30">
                <UploadCloud size={24} className="mx-auto text-purple-600 mb-1" />
                <p className="text-xs font-medium text-gray-700">Attach Document / Photo</p>
                <p className="text-[11px] text-gray-400">PDF, JPG, PNG (Max 10MB)</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadReceiptMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {uploadReceiptMutation.isPending ? "Uploading..." : "Save & Sync to Firm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Invoice */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Create Sales Invoice</h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createInvoiceMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer / Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Ltd, Green Energy Solutions"
                  value={invoiceCustomer}
                  onChange={(e) => setInvoiceCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Invoice Amount (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    VAT Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceVat}
                    onChange={(e) => setInvoiceVat(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes & Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Due within 30 days. Thank you for your business."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm disabled:opacity-50"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Issue Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fulfill Document Request */}
      {showDocModal && selectedDocReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UploadCloud size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Upload Requested Document</h3>
                  <p className="text-[11px] text-gray-500">{selectedDocReq.title || "Accountant Document Request"}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDocModal(false);
                  setSelectedDocReq(null);
                  setUploadDocFile(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fulfillDocMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-900">
                <p className="font-semibold">{selectedDocReq.title}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">{selectedDocReq.description || "Please submit the requested documentation."}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Choose Document File (PDF, DOCX, PNG, JPG) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadDocFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocModal(false);
                    setSelectedDocReq(null);
                    setUploadDocFile(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fulfillDocMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {fulfillDocMutation.isPending ? "Submitting..." : "Submit to Accountant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

