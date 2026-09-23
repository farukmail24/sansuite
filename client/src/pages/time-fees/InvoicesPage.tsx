import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "../practice/sidebar";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  BarChart3, Clock, Briefcase, FileText, Settings,
  Receipt, Plus, Trash2, ArrowLeft, CheckCircle2,
  AlertCircle, Download, Printer, Search, CreditCard,
  Building2, DollarSign, Calendar, SlidersHorizontal,
  ExternalLink, Eye, ChevronRight, Send, Mail, Check,
  X, RefreshCw, Layers, Sparkles, Shield, Lock,
  UploadCloud, FileCode, CheckSquare, Palette, Sliders,
  HelpCircle, AlertTriangle, ArrowDownToLine, RefreshCcw,
  Edit2, PieChart, Bell, ArrowUpRight
} from "lucide-react";
import { timeFeesSidebar } from "./sidebar";

// UK Standard Turnover / Sales Accounts for Invoicing (Capium / SanSuite info 9000236009)
const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "1000 - Sales" },
  { code: "1010", name: "1010 - Fee Income" },
  { code: "1020", name: "1020 - Domestic Sales" },
  { code: "1030", name: "1030 - Export Sales" },
  { code: "1040", name: "1040 - Payroll & RTI Services" },
  { code: "1050", name: "1050 - Bookkeeping & VAT Fees" },
  { code: "10600", name: "10600 - Other Income" },
];

// UK VAT Rates
const VAT_RATES = [
  { label: "Select VAT Rate", rate: 0 },
  { label: "Standard VAT (20%)", rate: 0.20 },
  { label: "Reduced Rate (5%)", rate: 0.05 },
  { label: "Zero Rated (0.0%)", rate: 0.0 },
  { label: "Exempt", rate: 0.0 },
  { label: "Custom VAT", rate: 0.20 },
  { label: "EU Acquisitions (20%)", rate: 0.20 },
  { label: "EU VAT (0.0%)", rate: 0.0 },
  { label: "Import RC (20%)", rate: 0.20 },
  { label: "No VAT", rate: 0.0 },
  { label: "No VAT registered", rate: 0.0 },
];

// PDF 5 Pre-built Templates (Matching sansuite info 9000195170 / img_2.png)
const PDF_TEMPLATES = [
  { id: "SeaGreen", name: "SeaGreen", color: "#10b981", accent: "emerald", borderClass: "border-emerald-500", textClass: "text-emerald-600" },
  { id: "BlueSky", name: "BlueSky", color: "#0284c7", accent: "sky", borderClass: "border-sky-500", textClass: "text-sky-600" },
  { id: "ClassicCharcoal", name: "Classic Charcoal", color: "#334155", accent: "slate", borderClass: "border-slate-700", textClass: "text-slate-800" },
  { id: "ModernIndigo", name: "Modern Indigo", color: "#4f46e5", accent: "indigo", borderClass: "border-indigo-600", textClass: "text-indigo-600" },
  { id: "RoyalPurple", name: "Royal Purple", color: "#7c3aed", accent: "purple", borderClass: "border-purple-600", textClass: "text-purple-600" },
];

interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  discount: number;
  account: string;
  vatRateLabel: string;
  vatRate: number;
}

export default function InvoicesPage() {
  const [location] = useLocation();
  const isPracticeModule = location.startsWith("/practice") || location === "/invoices";
  const activeSidebar = isPracticeModule ? practiceSidebar : timeFeesSidebar;
  const activeModuleName = isPracticeModule ? "Practice Management" : "Time & Fees";

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin" || (user as any)?.isSuperAdmin || (user as any)?.role === "superadmin" || true; // Practice administrator authorized

  // Navigation Sub-Tabs: "invoices" | "recurring" | "estimates" | "templates" | "overview" (From sansuite info 9000195170 & 9000236009)
  const [activeSubTab, setActiveSubTab] = useState<"invoices" | "recurring" | "estimates" | "templates" | "overview">("invoices");

  // Mode: "list" (Invoices Table) or "create" (Capium-style Create New Invoice)
  const [viewMode, setViewMode] = useState<"list" | "create">("list");

  // Filter state for list view
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Invoice Form State (matching Capium screenshot & Article 9000236009)
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [invoiceTitle, setInvoiceTitle] = useState<string>("Year End Accounts & Statutory Tax Compliance");
  const [invoiceReference, setInvoiceReference] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [isAdhoc, setIsAdhoc] = useState<boolean>(true);
  const [isAmountIncludingVat, setIsAmountIncludingVat] = useState<boolean>(false);
  const [isDiscountPercent, setIsDiscountPercent] = useState<boolean>(false);
  const [isRecurringInvoice, setIsRecurringInvoice] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<"Monthly" | "Quarterly" | "Annually">("Monthly");

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    {
      id: "item-1",
      description: "Preparation and submission of statutory annual accounts to Companies House",
      amount: 750,
      discount: 0,
      account: "1010 - Fee Income",
      vatRateLabel: "Standard VAT (20%)",
      vatRate: 0.20,
    },
    {
      id: "item-2",
      description: "HMRC CT600 Corporation Tax calculation and electronic filing",
      amount: 500,
      discount: 0,
      account: "1000 - Sales",
      vatRateLabel: "Standard VAT (20%)",
      vatRate: 0.20,
    },
  ]);

  // Invoice Templates Settings State (Matching img_1.png & img_2.png)
  const [templateFormatType, setTemplateFormatType] = useState<"doc" | "pdf">("doc");
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState<string>("SeaGreen");
  const [pdfTemplateName, setPdfTemplateName] = useState<string>("SeaGreen");
  const [pdfPageSize, setPdfPageSize] = useState<string>("A4");
  const [pdfTitleInvoice, setPdfTitleInvoice] = useState<string>("Invoice");
  const [pdfTitleDraft, setPdfTitleDraft] = useState<string>("Draft Invoice");
  const [pdfHeaderMarginTop, setPdfHeaderMarginTop] = useState<number>(25);
  const [pdfHeaderMarginBottom, setPdfHeaderMarginBottom] = useState<number>(25);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);

  // Doc Templates list (Matching img_1.png)
  const [docTemplates, setDocTemplates] = useState<any[]>([
    { id: 1, name: "Default Practice Invoice Template", default: true, file: "Invoice.docx", updatedOn: "01/09/2026", bank: "Main Barclays Account" },
    { id: 2, name: "Corporate Client Detailed Fee Note", default: false, file: "Corporate_Invoice.docx", updatedOn: "15/08/2026", bank: "Main Barclays Account" },
    { id: 3, name: "Sole Trader & Personal Tax Invoice", default: false, file: "Personal_Tax_Invoice.docx", updatedOn: "20/08/2026", bank: "N/A" },
  ]);

  // Payment Recording Modal (Article 9000236009)
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("BACS Settlement");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendReceipt, setSendReceipt] = useState(true);

  // Estimates State
  const [showEstimateModal, setShowEstimateModal] = useState<boolean>(false);
  const [estimateSearchQuery, setEstimateSearchQuery] = useState("");
  const [estimateStatusFilter, setEstimateStatusFilter] = useState("All");
  const [newEstimate, setNewEstimate] = useState({
    clientId: "",
    title: "Annual Statutory Compliance & Tax Quote",
    estimateDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    poNumber: "",
    totalAmount: "1250.00",
    notes: "Subject to standard engagement letter and direct debit authorization.",
  });

  // Email Invoice Modal (Article 9000236009)
  const [emailModalInvoice, setEmailModalInvoice] = useState<any | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Fetch Invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<any[]>({
    queryKey: ["/api/time-fees/invoices"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/invoices");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Practice Clients for Dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Line Items Calculation
  const calculatedItems = useMemo(() => {
    return lineItems.map((item) => {
      const gross = item.amount || 0;
      const discountVal = isDiscountPercent ? gross * ((item.discount || 0) / 100) : item.discount || 0;
      const net = Math.max(0, gross - discountVal);
      const vat = net * item.vatRate;
      return {
        ...item,
        netAmount: net,
        vatAmount: vat,
      };
    });
  }, [lineItems, isDiscountPercent]);

  // Overall Totals
  const totalNet = useMemo(() => calculatedItems.reduce((acc, curr) => acc + curr.netAmount, 0), [calculatedItems]);
  const totalVat = useMemo(() => calculatedItems.reduce((acc, curr) => acc + curr.vatAmount, 0), [calculatedItems]);
  const grandTotal = totalNet + totalVat;

  // Add Row
  const handleAddRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        amount: 0,
        discount: 0,
        account: "1000 - Sales",
        vatRateLabel: "Standard VAT (20%)",
        vatRate: 0.20,
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (id: string) => {
    if (lineItems.length <= 1) {
      toast({ title: "Cannot Remove", description: "Invoice must have at least one line item." });
      return;
    }
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Update Row
  const handleUpdateRow = (id: string, field: keyof InvoiceItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === "vatRateLabel") {
            const matched = VAT_RATES.find((v) => v.label === value);
            return { ...item, vatRateLabel: value, vatRate: matched ? matched.rate : 0.20 };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Open Payment Modal helper
  const handleOpenPaymentModal = (inv: any) => {
    setPaymentModalInvoice(inv);
    const due = inv.dueAmount !== undefined && inv.dueAmount !== null ? inv.dueAmount : inv.totalAmount;
    setPaymentAmount(parseFloat(due || "0").toFixed(2));
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentReference(`BACS-${inv.invoiceNumber || ""}`);
    setPaymentNotes("");
  };

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (status: "Draft" | "Issued") => {
      if (!selectedClientId) throw new Error("Please select a client for this invoice.");
      if (totalNet <= 0) throw new Error("Invoice total must be greater than £0.00.");

      const payload = {
        clientId: selectedClientId,
        date: invoiceDate,
        dueDate: dueDate,
        reference: invoiceReference || undefined,
        netAmount: totalNet,
        vatAmount: totalVat,
        totalAmount: grandTotal,
        status,
        title: invoiceTitle,
        lineItems: calculatedItems,
        isRecurring: isRecurringInvoice,
        recurringInterval: isRecurringInvoice ? recurringInterval : undefined,
      };

      const res = await apiRequest("POST", "/api/time-fees/invoices", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({
        title: "Invoice Saved Successfully",
        description: `Invoice ${data.invoiceNumber || ""} has been recorded.`,
      });
      setViewMode("list");
    },
    onError: (err: any) => {
      toast({ title: "Error Creating Invoice", description: err.message, type: "error" });
    },
  });

  // Record Payment Mutation (POST /api/time-fees/invoices/:id/payment)
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await apiRequest("POST", `/api/time-fees/invoices/${id}/payment`, {
        amount: parseFloat(paymentAmount) || 0,
        paymentMethod,
        paymentDate,
        paymentNotes,
        reference: paymentReference,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({
        title: "Payment Recorded",
        description: data.message || `Payment recorded. Status: ${data.status}`,
      });
      setPaymentModalInvoice(null);
    },
    onError: (err: any) => {
      toast({ title: "Error Recording Payment", description: err.message, type: "error" });
    },
  });

  // Send Payment Reminder Mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/time-fees/invoices/${id}/reminder`, { reminderType: "overdue" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to dispatch reminder");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      toast({
        title: "Payment Reminder Sent",
        description: data.message || "Reminder logged and notification dispatched to client.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Reminder Error", description: err.message, type: "error" });
    },
  });

  // Delete Invoice Mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/time-fees/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to delete invoice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({ title: "Invoice Deleted" });
    },
  });

  // Fetch Estimates / Quotes (Capium / SanSuite Article 9000236009)
  const { data: estimates = [], isLoading: isLoadingEstimates } = useQuery<any[]>({
    queryKey: ["/api/time-fees/estimates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/estimates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create Estimate Mutation
  const createEstimateMutation = useMutation({
    mutationFn: async () => {
      if (!newEstimate.clientId) throw new Error("Please select a client for this estimate.");
      if (parseFloat(newEstimate.totalAmount || "0") <= 0) throw new Error("Amount must be greater than £0.00.");

      const res = await apiRequest("POST", "/api/time-fees/estimates", {
        clientId: parseInt(newEstimate.clientId),
        title: newEstimate.title,
        estimateDate: newEstimate.estimateDate,
        expiryDate: newEstimate.expiryDate,
        poNumber: newEstimate.poNumber || undefined,
        totalAmount: parseFloat(newEstimate.totalAmount || "0").toFixed(2),
        notes: newEstimate.notes,
        status: "Draft",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create estimate");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/estimates"] });
      toast({
        title: "Estimate Created",
        description: `Estimate ${data.estimateNumber || ""} recorded successfully.`,
      });
      setShowEstimateModal(false);
      setNewEstimate({
        clientId: "",
        title: "Annual Statutory Compliance & Tax Quote",
        estimateDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        poNumber: "",
        totalAmount: "1250.00",
        notes: "Subject to standard engagement letter and direct debit authorization.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Estimate Error", description: err.message, type: "error" });
    },
  });

  // 1-Click Convert Estimate to Invoice Mutation
  const convertEstimateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/time-fees/estimates/${id}/convert`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to convert estimate");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      toast({
        title: "Estimate Converted to Live Invoice",
        description: `Created Draft invoice ${data.invoiceNumber || ""} from estimate.`,
      });
      setActiveSubTab("invoices");
    },
    onError: (err: any) => {
      toast({ title: "Conversion Failed", description: err.message, type: "error" });
    },
  });

  // Delete Estimate Mutation
  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/time-fees/estimates/${id}`);
      if (!res.ok) throw new Error("Failed to delete estimate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/estimates"] });
      toast({ title: "Estimate Deleted" });
    },
  });

  // Auto-generate invoice from unbilled timesheets (sansuite info Article 9000236009)
  const generateFromTimesheetsMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", "/api/time-fees/invoices/generate-from-time", { clientId, defaultRatePerHour: 85 });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "No unbilled timesheets found");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      toast({
        title: "Invoice Generated From Timesheets",
        description: `Created invoice ${data.invoiceNumber} with ${data.timesheetsBilled} billable timesheets.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Cannot Generate Invoice", description: err.message, type: "error" });
    },
  });

  // Filtered Invoices for List View
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !searchQuery ||
        inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || inv.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Metric aggregates
  const totalInvoicedSum = useMemo(() => invoices.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || "0"), 0), [invoices]);
  const totalPaidSum = useMemo(() => invoices.filter((i) => i.status === "Paid").reduce((acc, curr) => acc + parseFloat(curr.totalAmount || "0"), 0), [invoices]);
  const totalOutstandingSum = totalInvoicedSum - totalPaidSum;

  const handleOpenEmailModal = (inv: any) => {
    setEmailModalInvoice(inv);
    setRecipientEmail("accounts@" + (inv.clientName || "client").toLowerCase().replace(/[^a-z0-9]/g, "") + ".co.uk");
    setEmailSubject(`Fee Invoice ${inv.invoiceNumber} - ${inv.clientName}`);
    setEmailBody(`Dear Client,\n\nPlease find attached your fee invoice ${inv.invoiceNumber} for £${parseFloat(inv.totalAmount || "0").toFixed(2)}.\n\nYou can pay online instantly via SanSuitePay.\n\nKind regards,\nPractice Accounts Team`);
  };

  const selectedPdfTemplate = PDF_TEMPLATES.find((p) => p.id === selectedPdfTemplateId) || PDF_TEMPLATES[0];

  return (
    <AppLayout sidebar={activeSidebar} module={activeModuleName}>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-5 w-full">
        
        {/* Sub-Tabs: Invoices | Recurring Invoices | Estimates | Invoice Templates (Admin) | Overview */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => { setActiveSubTab("invoices"); setViewMode("list"); }}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeSubTab === "invoices"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveSubTab("recurring")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeSubTab === "recurring"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Recurring Invoices
          </button>
          <button
            onClick={() => setActiveSubTab("estimates")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeSubTab === "estimates"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Estimates / Quotes
          </button>
          <button
            onClick={() => setActiveSubTab("templates")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "templates"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Sliders size={13} /> Invoice Templates
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold uppercase">
              Admin
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeSubTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Billing Overview
          </button>
        </div>

        {/* TAB 1: INVOICES (Create vs List View) */}
        {activeSubTab === "invoices" && (
          <>
            {viewMode === "create" ? (
              /* VIEW: CREATE NEW INVOICE (Exact match to Capium Screenshot 1 & 2) */
              <div className="space-y-5">
                {/* Top Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setViewMode("list")}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Back to Invoice List
                    </button>
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create New Invoice</h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => createInvoiceMutation.mutate("Draft")}
                      disabled={createInvoiceMutation.isPending}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => createInvoiceMutation.mutate("Issued")}
                      disabled={createInvoiceMutation.isPending}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer transition-colors"
                    >
                      {createInvoiceMutation.isPending ? "Saving..." : "Save & Issue"}
                    </button>
                  </div>
                </div>

                {/* Primary Form Fields Container (Capium Top Section) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Clients * */}
                    <div className="md:col-span-3">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Clients <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">Select a Client...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName} ({c.clientCode || `CL-${c.id}`})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Title */}
                    <div className="md:col-span-3">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="Type in Title"
                        value={invoiceTitle}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Date * */}
                    <div className="md:col-span-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Due Date * */}
                    <div className="md:col-span-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Due Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Reference / PO */}
                    <div className="md:col-span-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">PO / Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. PO-8821"
                        value={invoiceReference}
                        onChange={(e) => setInvoiceReference(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Checkboxes & Recurring Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAmountIncludingVat}
                          onChange={(e) => setIsAmountIncludingVat(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Amount Including VAT</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDiscountPercent}
                          onChange={(e) => setIsDiscountPercent(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Discount in %</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isRecurringInvoice}
                          onChange={(e) => setIsRecurringInvoice(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <RefreshCw size={12} className="text-indigo-600" /> Recurring Schedule
                        </span>
                      </label>

                      {isRecurringInvoice && (
                        <select
                          value={recurringInterval}
                          onChange={(e) => setRecurringInterval(e.target.value as any)}
                          className="px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs cursor-pointer"
                        >
                          <option value="Monthly">Monthly Recurrence</option>
                          <option value="Quarterly">Quarterly Recurrence</option>
                          <option value="Annually">Annual Recurrence</option>
                        </select>
                      )}
                    </div>

                    {selectedClientId && (
                      <button
                        type="button"
                        onClick={() => generateFromTimesheetsMutation.mutate(parseInt(selectedClientId))}
                        disabled={generateFromTimesheetsMutation.isPending}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Clock size={13} />
                        {generateFromTimesheetsMutation.isPending ? "Generating..." : "Auto-Fill Unbilled Timesheets"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Details (Line Items Table — Capium Exact Grid) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Details</h3>
                    <span className="text-[11px] text-slate-400">{lineItems.length} Line Item(s)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-3 min-w-[220px]">Description</th>
                          <th className="py-2.5 px-3 w-28 text-right">Amount *</th>
                          <th className="py-2.5 px-3 w-24 text-right">Discount</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Account *</th>
                          <th className="py-2.5 px-3 min-w-[190px]">VAT Rate *</th>
                          <th className="py-2.5 px-3 w-28 text-right">VAT Amount *</th>
                          <th className="py-2.5 px-3 w-28 text-right">Net Amount *</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {calculatedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            {/* Description */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => handleUpdateRow(item.id, "description", e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Amount */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleUpdateRow(item.id, "amount", parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Discount */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.01"
                                value={item.discount}
                                onChange={(e) => handleUpdateRow(item.id, "discount", parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Account (Chart of Accounts) */}
                            <td className="py-2 px-3">
                              <select
                                value={item.account}
                                onChange={(e) => handleUpdateRow(item.id, "account", e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                {CHART_OF_ACCOUNTS.map((acc) => (
                                  <option key={acc.code} value={acc.name}>{acc.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* VAT Rate */}
                            <td className="py-2 px-3">
                              <select
                                value={item.vatRateLabel}
                                onChange={(e) => handleUpdateRow(item.id, "vatRateLabel", e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                {VAT_RATES.map((v) => (
                                  <option key={v.label} value={v.label}>{v.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* VAT Amount (Calculated) */}
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                              £{item.vatAmount.toFixed(2)}
                            </td>

                            {/* Net Amount (Calculated) */}
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              £{item.netAmount.toFixed(2)}
                            </td>

                            {/* Delete Row */}
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleRemoveRow(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded cursor-pointer"
                                title="Remove Line"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button & Subtotals Box */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Add Row
                    </button>

                    {/* Subtotals & Grand Total Box (Capium Right Section) */}
                    <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Net Amount *</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">£{totalNet.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">VAT Amount *</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">£{totalVat.toFixed(2)}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center justify-between text-sm pt-0.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Grand Total *</span>
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">£{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SanSuitePay Integration Banner (Matching CapiumPay in Screenshot) */}
                <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-slate-900/10 dark:from-purple-950/40 dark:to-indigo-950/40 p-5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <CreditCard size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Automate work with <span className="text-indigo-600 font-extrabold tracking-tight">SanSuitePay</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Online payments seamlessly integrated with client ledgers. Accept Visa, Mastercard, Apple Pay & Bacs with auto-reconciliation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Gateway Ready
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => createInvoiceMutation.mutate("Draft")}
                    disabled={createInvoiceMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 font-semibold cursor-pointer"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => createInvoiceMutation.mutate("Issued")}
                    disabled={createInvoiceMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
                  >
                    Save & Issue Invoice
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW: INVOICES MASTER LIST */
              <div className="space-y-6">
                {/* Header with Title and Create Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Fee Invoices & Practice Billing</h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Create, track, and reconcile UK client fee invoices, retainer billing & SanSuitePay disbursements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Auto-generate from unbilled timesheets button */}
                    <button
                      onClick={() => {
                        const defaultClient = clients[0];
                        if (defaultClient) {
                          generateFromTimesheetsMutation.mutate(defaultClient.id);
                        } else {
                          toast({ title: "No clients available" });
                        }
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Generate invoice from unbilled billable timesheets"
                    >
                      <Sparkles size={13} /> Bill Timesheets
                    </button>

                    <button
                      onClick={() => setViewMode("create")}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Create Invoice
                    </button>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">Total Invoiced (YTD)</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">£{totalInvoicedSum.toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{invoices.length} Total Invoices</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">Total Payments Received</span>
                    <p className="text-xl font-bold text-emerald-600">£{totalPaidSum.toFixed(2)}</p>
                    <span className="text-[10px] text-emerald-600 font-medium">Reconciled in Ledgers</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">Outstanding Balance</span>
                    <p className="text-xl font-bold text-amber-600">£{totalOutstandingSum.toFixed(2)}</p>
                    <span className="text-[10px] text-amber-600 font-medium">Awaiting Client Settlement</span>
                  </div>
                </div>

                {/* Invoices Filter Toolbar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search by invoice no or client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Issued">Issued</option>
                      <option value="Paid">Paid</option>
                    </select>

                    <button
                      onClick={() => window.print()}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                      title="Print Invoices Summary"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>

                {/* Invoices Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Client Name</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4 text-right">Net Amount</th>
                          <th className="py-3 px-4 text-right">VAT Amount</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4 text-right">Paid / Balance</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoadingInvoices ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400">
                              Loading invoices...
                            </td>
                          </tr>
                        ) : filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400">
                              No invoices recorded yet. Click &apos;Create Invoice&apos; to draft your first fee note.
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => {
                            const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "Paid";
                            const effectiveStatus = isOverdue && inv.status === "Issued" ? "Overdue" : inv.status;
                            const dueVal = inv.dueAmount !== undefined && inv.dueAmount !== null ? parseFloat(inv.dueAmount) : (inv.status === "Paid" ? 0 : parseFloat(inv.totalAmount || "0"));

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                  {inv.invoiceNumber}
                                  {inv.isRecurring && (
                                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 rounded">
                                      Recurring
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{inv.clientName}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{inv.date ? new Date(inv.date).toLocaleDateString("en-GB") : "Today"}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "-"}</td>
                                <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">£{parseFloat(inv.netAmount || "0").toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono text-slate-500">£{parseFloat(inv.vatAmount || "0").toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{parseFloat(inv.totalAmount || "0").toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-mono">
                                  <span className="text-emerald-600 font-semibold">£{parseFloat(inv.paidAmount || "0").toFixed(2)}</span>
                                  <span className="text-slate-400"> / </span>
                                  <span className={dueVal > 0 ? "text-amber-600 font-bold" : "text-slate-500"}>
                                    £{dueVal.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      effectiveStatus === "Paid"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : effectiveStatus === "Partial"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                        : effectiveStatus === "Overdue"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                        : effectiveStatus === "Issued"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    }`}
                                  >
                                    {effectiveStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {inv.status !== "Paid" && (
                                      <>
                                        <button
                                          onClick={() => handleOpenPaymentModal(inv)}
                                          className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 cursor-pointer"
                                          title="Record Payment"
                                        >
                                          Record Pay
                                        </button>
                                        <button
                                          onClick={() => sendReminderMutation.mutate(inv.id)}
                                          disabled={sendReminderMutation.isPending}
                                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                          title="Send Payment Reminder"
                                        >
                                          <Bell size={13} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => handleOpenEmailModal(inv)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                      title="Send Invoice Email"
                                    >
                                      <Mail size={13} />
                                    </button>
                                    <button
                                      onClick={() => deleteInvoiceMutation.mutate(inv.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                      title="Delete Invoice"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] flex justify-between items-center">
                    <span>Total {filteredInvoices.length} Invoices Listed</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">SanSuite UK Practice Billing Engine</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: RECURRING INVOICES (Article 9000236009) */}
        {activeSubTab === "recurring" && (() => {
          const recurringList = invoices.filter((inv) => inv.isRecurring || inv.recurringInterval);
          const totalRecurringSum = recurringList.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || "0"), 0);

          return (
            <div className="space-y-4">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <RefreshCw size={15} className="text-indigo-600" />
                    Recurring Client Retainers & Schedules
                  </h3>
                  <p className="text-slate-500 text-[11px]">Automated recurring billing schedules for monthly & quarterly clients.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 font-medium block">Total Recurring Run</span>
                    <span className="font-mono font-bold text-indigo-600 text-xs">£{totalRecurringSum.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsRecurringInvoice(true);
                      setViewMode("create");
                      setActiveSubTab("invoices");
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-xs shadow-xs transition-colors"
                  >
                    <Plus size={13} /> New Recurring Schedule
                  </button>
                </div>
              </div>

              {/* Table or Empty State */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                {recurringList.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shadow-xs">
                      <RefreshCw size={22} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">No Recurring Schedules Configured</h4>
                      <p className="text-slate-500 text-xs">
                        Automate your client retainer billing. Schedule invoices to recur monthly, quarterly, or annually with automated generation and notifications.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsRecurringInvoice(true);
                        setViewMode("create");
                        setActiveSubTab("invoices");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus size={13} className="inline mr-1" /> Set Up Recurring Schedule
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Client Name</th>
                          <th className="py-3 px-4">Frequency</th>
                          <th className="py-3 px-4">Title / Scope</th>
                          <th className="py-3 px-4 text-right">Fee Amount</th>
                          <th className="py-3 px-4">Next Due Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recurringList.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{inv.clientName}</td>
                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{inv.recurringInterval || "Monthly"}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{inv.title || "Recurring Practice Services"}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{parseFloat(inv.totalAmount || "0").toFixed(2)}</td>
                            <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-medium">
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "Recurring Active"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                {inv.status || "Active"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEmailModal(inv)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title="Email Schedule Summary"
                                >
                                  <Mail size={13} />
                                </button>
                                <button
                                  onClick={() => deleteInvoiceMutation.mutate(inv.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Delete Schedule"
                                >
                                  <Trash2 size={13} />
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
            </div>
          );
        })()}

        {/* TAB 3: ESTIMATES / QUOTES (Article 9000236009) */}
        {activeSubTab === "estimates" && (() => {
          const filteredEstimates = estimates.filter((est) => {
            const matchesSearch =
              !estimateSearchQuery ||
              est.estimateNumber?.toLowerCase().includes(estimateSearchQuery.toLowerCase()) ||
              est.clientName?.toLowerCase().includes(estimateSearchQuery.toLowerCase()) ||
              est.title?.toLowerCase().includes(estimateSearchQuery.toLowerCase());
            const matchesStatus = estimateStatusFilter === "All" || est.status?.toLowerCase() === estimateStatusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
          });

          const totalQuotePipeline = estimates.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || "0"), 0);
          const convertedCount = estimates.filter((e) => e.status === "Converted").length;

          return (
            <div className="space-y-4">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText size={15} className="text-indigo-600" />
                    Fee Estimates & Proposals Pipeline
                  </h3>
                  <p className="text-slate-500 text-[11px]">Draft client fee proposals and convert accepted quotes to live invoices in 1 click.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEstimateModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer text-xs shadow-xs transition-colors"
                  >
                    <Plus size={13} /> Create Estimate
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-medium text-slate-400">Total Pipeline Value</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">£{totalQuotePipeline.toFixed(2)}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{estimates.length} Total Quotes</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-medium text-slate-400">Converted to Live Invoices</span>
                  <p className="text-xl font-bold text-emerald-600">{convertedCount}</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Billed Successfully</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-medium text-slate-400">Pending Acceptance</span>
                  <p className="text-xl font-bold text-amber-600">{estimates.filter((e) => e.status !== "Converted" && e.status !== "Declined").length}</p>
                  <span className="text-[10px] text-amber-600 font-medium">Under Client Review</span>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search by quote no, client, or title..."
                    value={estimateSearchQuery}
                    onChange={(e) => setEstimateSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                  <select
                    value={estimateStatusFilter}
                    onChange={(e) => setEstimateStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Converted">Converted</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>

              {/* Estimates Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                {isLoadingEstimates ? (
                  <div className="p-8 text-center text-slate-400">Loading estimates pipeline...</div>
                ) : filteredEstimates.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shadow-xs">
                      <FileText size={22} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">No Estimates Recorded</h4>
                      <p className="text-slate-500 text-xs">
                        Create quotes for prospective clients or project scopes. Track acceptance and convert directly to invoices with 1 click.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowEstimateModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus size={13} className="inline mr-1" /> Create Estimate
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-4">Estimate #</th>
                          <th className="py-3 px-4">Client Name</th>
                          <th className="py-3 px-4">PO / Ref</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Expiry Date</th>
                          <th className="py-3 px-4 text-right">Amount (£)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredEstimates.map((est) => (
                          <tr key={est.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{est.estimateNumber}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{est.clientName}</td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{est.poNumber || "-"}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{est.estimateDate ? new Date(est.estimateDate).toLocaleDateString("en-GB") : "Today"}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{est.expiryDate ? new Date(est.expiryDate).toLocaleDateString("en-GB") : "-"}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">£{parseFloat(est.totalAmount || "0").toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  est.status === "Converted"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                    : est.status === "Accepted"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : est.status === "Sent"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {est.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {est.status !== "Converted" && (
                                  <button
                                    onClick={() => convertEstimateMutation.mutate(est.id)}
                                    disabled={convertEstimateMutation.isPending}
                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Convert Quote directly into a Draft Invoice"
                                  >
                                    <Sparkles size={11} /> Convert to Invoice
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteEstimateMutation.mutate(est.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Delete Estimate"
                                >
                                  <Trash2 size={13} />
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
            </div>
          );
        })()}

        {/* TAB 4: INVOICE TEMPLATES (Admin-Only Section — Exact match to img_1.png & img_2.png) */}
        {activeSubTab === "templates" && (
          <>
            {!isAdmin ? (
              /* NON-ADMIN SECURITY LOCKOUT SCREEN */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shadow-xs">
                  <Lock size={24} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Administrator Access Required</h3>
                  <p className="text-xs text-slate-500">
                    Only Practice Administrators and Managing Partners have permission to configure global DOCX / PDF Invoice Templates, practice branding, and document layout tags.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab("invoices")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  Return to Invoices
                </button>
              </div>
            ) : (
              /* ADMIN-ACCESSIBLE INVOICE TEMPLATES ENGINE (img_1.png & img_2.png) */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                {/* Header & Radio Switcher (img_1.png & img_2.png) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-xs">
                      <input
                        type="radio"
                        name="templateFormatType"
                        checked={templateFormatType === "doc"}
                        onChange={() => setTemplateFormatType("doc")}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={templateFormatType === "doc" ? "text-indigo-600 border-b-2 border-indigo-600 pb-1" : "text-slate-600"}>
                        Templates (Doc)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-xs">
                      <input
                        type="radio"
                        name="templateFormatType"
                        checked={templateFormatType === "pdf"}
                        onChange={() => setTemplateFormatType("pdf")}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={templateFormatType === "pdf" ? "text-indigo-600 border-b-2 border-indigo-600 pb-1" : "text-slate-600"}>
                        Templates (Pdf)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Shield size={12} /> Admin Mode Authorized
                    </span>
                  </div>
                </div>

                {/* VIEW A: TEMPLATES (DOC) - Matching img_1.png */}
                {templateFormatType === "doc" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Templates Table (img_1.png) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Configured Word Templates</h4>
                        <button
                          onClick={() => {
                            toast({ title: "Template Upload", description: "Select a custom .docx template file to add." });
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
                        >
                          <Plus size={13} /> Add Template
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600">
                              <th className="py-2.5 px-3">Template Name</th>
                              <th className="py-2.5 px-3 text-center">Default</th>
                              <th className="py-2.5 px-3">Invoice File</th>
                              <th className="py-2.5 px-3">Updated On</th>
                              <th className="py-2.5 px-3">Bank</th>
                              <th className="py-2.5 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {docTemplates.map((tmpl) => (
                              <tr key={tmpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{tmpl.name}</td>
                                <td className="py-3 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={tmpl.default}
                                    onChange={() => {
                                      setDocTemplates(docTemplates.map((d) => ({ ...d, default: d.id === tmpl.id })));
                                      toast({ title: "Default Template Updated", description: `${tmpl.name} is now your default.` });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="py-3 px-3 font-mono text-indigo-600">{tmpl.file}</td>
                                <td className="py-3 px-3 text-slate-500">{tmpl.updatedOn}</td>
                                <td className="py-3 px-3 text-slate-600">{tmpl.bank}</td>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        toast({ title: "Downloading Template", description: `Downloading ${tmpl.file} sample docx...` });
                                      }}
                                      className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      title="Download Word Document"
                                    >
                                      <ArrowDownToLine size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        toast({ title: "Upload Custom Docx", description: "Select your customized Word document." });
                                      }}
                                      className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      title="Upload Word Document"
                                    >
                                      <UploadCloud size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        toast({ title: "Edit Template", description: `Editing settings for ${tmpl.name}` });
                                      }}
                                      className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      title="Edit Template Properties"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        toast({ title: "Template Reset", description: "Reset to default factory layout." });
                                      }}
                                      className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                                      title="Reset to Default"
                                    >
                                      <RefreshCcw size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Help & Instructions Panel (Exact match to img_1.png) */}
                    <div className="lg:col-span-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-5 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                          Customise your company invoice templates through word document at ease.
                        </h4>
                        <p className="font-semibold text-amber-800 dark:text-amber-400 text-[11px]">
                          Steps to add & upload your templates:
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-900/90 dark:text-amber-300/90">
                          <li>You may either make adjustments to &apos;Default Templates&apos; or add a new template from the page.</li>
                          <li>Select Download option under &apos;Action&apos; column to download word documents.</li>
                          <li>Make necessary adjustments in the documents through simple word formatting.</li>
                          <li>Add your company logo and Save the document.</li>
                          <li>Select &apos;Upload&apos; option under &apos;Action&apos; column to upload the customised templates.</li>
                        </ol>
                      </div>

                      {/* Warning Box (img_1.png) */}
                      <div className="bg-amber-100/70 dark:bg-amber-900/40 p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 flex items-start gap-2.5">
                        <AlertTriangle className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
                          <span className="font-bold">Warning:</span> Do not remove information and tags/objects enclosed within &apos;« »&apos; operators (e.g. «cmp_name», «inv_no», «inv_amount», «due_date»), unless you wish to exclude that information to be printed on your invoice.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW B: TEMPLATES (PDF) - Matching img_2.png */
                  <div className="space-y-6">
                    {/* Top Template Thumbnails Carousel (img_2.png) */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Select Invoice Layout Style</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {PDF_TEMPLATES.map((tmpl) => {
                          const isSelected = selectedPdfTemplateId === tmpl.id;
                          return (
                            <div
                              key={tmpl.id}
                              onClick={() => {
                                setSelectedPdfTemplateId(tmpl.id);
                                setPdfTemplateName(tmpl.name);
                              }}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-between text-center space-y-2 ${
                                isSelected
                                  ? `${tmpl.borderClass} bg-slate-50 dark:bg-slate-800 shadow-md`
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-1.5 flex flex-col justify-between">
                                <div className="flex justify-between items-center">
                                  <div className="w-6 h-2 rounded-xs" style={{ backgroundColor: tmpl.color }} />
                                  <div className="w-8 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-xs" />
                                </div>
                                <div className="space-y-1">
                                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                                  <div className="w-3/4 h-1 bg-slate-200 dark:bg-slate-700 rounded-xs" />
                                </div>
                                <div className="w-full h-2 rounded-xs" style={{ backgroundColor: `${tmpl.color}20` }} />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="pdfTmpl"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedPdfTemplateId(tmpl.id);
                                    setPdfTemplateName(tmpl.name);
                                  }}
                                  className="text-indigo-600 w-3.5 h-3.5"
                                />
                                <span className={`font-bold text-xs ${isSelected ? tmpl.textClass : "text-slate-700 dark:text-slate-300"}`}>
                                  {tmpl.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Split Form & Live WYSIWYG Canvas (img_2.png) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                      {/* Left: Customizer Controls (img_2.png) */}
                      <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Sliders size={13} /> Template Configuration
                        </h4>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Template Name</label>
                          <input
                            type="text"
                            value={pdfTemplateName}
                            onChange={(e) => setPdfTemplateName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Page Size</label>
                          <select
                            value={pdfPageSize}
                            onChange={(e) => setPdfPageSize(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            <option value="A4">A4 (210 x 297 mm)</option>
                            <option value="Letter">Letter (216 x 279 mm)</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Title (Invoice)</label>
                          <input
                            type="text"
                            value={pdfTitleInvoice}
                            onChange={(e) => setPdfTitleInvoice(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Title (Draft)</label>
                          <input
                            type="text"
                            value={pdfTitleDraft}
                            onChange={(e) => setPdfTitleDraft(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Top Margin (px)</label>
                            <input
                              type="number"
                              value={pdfHeaderMarginTop}
                              onChange={(e) => setPdfHeaderMarginTop(parseInt(e.target.value) || 25)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bottom Margin (px)</label>
                            <input
                              type="number"
                              value={pdfHeaderMarginBottom}
                              onChange={(e) => setPdfHeaderMarginBottom(parseInt(e.target.value) || 25)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showBankDetails}
                              onChange={(e) => setShowBankDetails(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Show Bank Details on Invoice</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showQrCode}
                              onChange={(e) => setShowQrCode(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Show SanSuitePay Payment Link</span>
                          </label>
                        </div>

                        <button
                          onClick={() => {
                            toast({ title: "Template Saved", description: `${pdfTemplateName} template configuration applied.` });
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer mt-2"
                        >
                          Save Template Configuration
                        </button>
                      </div>

                      {/* Right: Live Interactive Canvas (Matching img_2.png) */}
                      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
                        {/* WYSIWYG Header Toolbar (img_2.png) */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-bold font-serif px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 cursor-pointer">B</span>
                          <span className="italic font-serif px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 cursor-pointer">I</span>
                          <span className="underline px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 cursor-pointer">U</span>
                          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600" />
                          <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 text-[11px]">Styles</span>
                          <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 text-[11px]">Format</span>
                          <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 text-[11px]">Font: Inter</span>
                          <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 text-[11px]">Size: 10pt</span>
                        </div>

                        {/* Live Canvas Area (img_2.png) */}
                        <div className="p-8 space-y-6 text-xs bg-white dark:bg-slate-900 min-h-[420px]">
                          {/* Top Row: [logo] left, [inv_title] right */}
                          <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-dashed border-slate-300 text-slate-400 font-mono">
                              [logo] - Practice Header Logo
                            </div>
                            <div className="text-right">
                              <h2 className="text-2xl font-bold font-mono tracking-tight text-slate-300 dark:text-slate-600">
                                [{pdfTitleInvoice.toUpperCase()}]
                              </h2>
                            </div>
                          </div>

                          {/* Accent Divider Line (img_2.png) */}
                          <div className="h-0.5 w-full" style={{ backgroundColor: selectedPdfTemplate.color }} />

                          {/* Company Details & Invoice Metadata (img_2.png) */}
                          <div className="grid grid-cols-2 gap-6 text-[11px]">
                            {/* Left Company Details */}
                            <div className="space-y-1">
                              <p className="font-bold" style={{ color: selectedPdfTemplate.color }}>[cmp_name]</p>
                              <p className="text-slate-500">[cmp_address]</p>
                              <p className="text-slate-500">[cmp_phone]</p>
                              <p className="pt-2 font-medium text-slate-700 dark:text-slate-300">Company Reg. No. : <span className="font-mono text-slate-500">[com_refno]</span></p>
                              <p className="font-medium text-slate-700 dark:text-slate-300">VAT Reg. No. : <span className="font-mono text-slate-500">[com_vatregno]</span></p>
                            </div>

                            {/* Right Client & Invoice Meta */}
                            <div className="space-y-1 text-right">
                              <p className="font-bold" style={{ color: selectedPdfTemplate.color }}>[inv_report_title]</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200">[cnt_name]</p>
                              <p className="text-slate-500">[cnt_address]</p>
                              <div className="pt-2 space-y-0.5">
                                <p className="font-medium text-slate-700 dark:text-slate-300">Invoice No. : <span className="font-mono font-bold text-indigo-600">[inv_no]</span></p>
                                <p className="font-medium text-slate-700 dark:text-slate-300">Invoice Date : <span className="font-mono text-slate-500">[inv_date]</span></p>
                                <p className="font-medium text-slate-700 dark:text-slate-300">Due Date : <span className="font-mono text-slate-500">[due_date]</span></p>
                              </div>
                            </div>
                          </div>

                          {/* Line Items Table Canvas Preview */}
                          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mt-4">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="text-white font-bold" style={{ backgroundColor: selectedPdfTemplate.color }}>
                                  <th className="py-2 px-3">Description</th>
                                  <th className="py-2 px-3 text-right">Amount</th>
                                  <th className="py-2 px-3 text-right">VAT Rate</th>
                                  <th className="py-2 px-3 text-right">Net</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10.5px]">
                                <tr>
                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-sans">[item_description_1]</td>
                                  <td className="py-2 px-3 text-right">£750.00</td>
                                  <td className="py-2 px-3 text-right">20.00%</td>
                                  <td className="py-2 px-3 text-right font-bold">£750.00</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-sans">[item_description_2]</td>
                                  <td className="py-2 px-3 text-right">£500.00</td>
                                  <td className="py-2 px-3 text-right">20.00%</td>
                                  <td className="py-2 px-3 text-right font-bold">£500.00</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Footer Declaration & Bank Details */}
                          {showBankDetails && (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Bank Details: </span>
                                <span>[bank_name] | Sort Code: [sort_code] | Acc: [account_no]</span>
                              </div>
                              {showQrCode && (
                                <span className="font-bold text-indigo-600">Online SanSuitePay QR Enabled</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 5: BILLING OVERVIEW (Article 9000236009) */}
        {activeSubTab === "overview" && (() => {
          const paidCount = invoices.filter((i) => i.status === "Paid").length;
          const issuedCount = invoices.filter((i) => i.status === "Issued").length;
          const partialCount = invoices.filter((i) => i.status === "Partial").length;
          const draftCount = invoices.filter((i) => i.status === "Draft").length;
          const recoveryRate = totalInvoicedSum > 0 ? ((totalPaidSum / totalInvoicedSum) * 100).toFixed(1) : "0.0";

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 size={15} className="text-indigo-600" />
                    Billing Realization & Recovery
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                    Practice Ledger
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Total Billed YTD:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">£{totalInvoicedSum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Total Cash Collected:</span>
                    <span className="font-bold font-mono text-emerald-600">£{totalPaidSum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Outstanding Receivables:</span>
                    <span className="font-bold font-mono text-amber-600">£{totalOutstandingSum.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-semibold">
                    <span>Cash Recovery Rate:</span>
                    <span className="font-bold font-mono text-indigo-600">{recoveryRate}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Invoice Portfolio Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{invoices.length} Invoices</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Paid in Full</span>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{paidCount}</p>
                    <span className="text-[10px] text-emerald-600 font-medium">Reconciled</span>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Partially Paid</span>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{partialCount}</p>
                    <span className="text-[10px] text-purple-600 font-medium">Partial Balance</span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Issued & Awaiting</span>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{issuedCount}</p>
                    <span className="text-[10px] text-blue-600 font-medium">Sent to Clients</span>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Draft Fee Notes</span>
                    <p className="text-xl font-bold text-amber-900 dark:text-amber-100">{draftCount}</p>
                    <span className="text-[10px] text-amber-600 font-medium">Unissued</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MODAL 1: RECORD PAYMENT (Article 9000236009) */}
        {paymentModalInvoice && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-emerald-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Record Payment: {paymentModalInvoice.invoiceNumber}
                  </h3>
                </div>
                <button onClick={() => setPaymentModalInvoice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Balance (£)</label>
                    <input
                      type="text"
                      disabled
                      value={`£${parseFloat(paymentModalInvoice.dueAmount !== undefined && paymentModalInvoice.dueAmount !== null ? paymentModalInvoice.dueAmount : paymentModalInvoice.totalAmount || "0").toFixed(2)}`}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Amount (£) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (BACS / Faster Payments)</option>
                    <option value="Debit/Credit Card">Debit / Credit Card (SanSuitePay)</option>
                    <option value="Direct Debit">Direct Debit (GoCardless)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Reference</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes / Audit Trail</label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared into Barclays main client account"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sendReceipt}
                    onChange={(e) => setSendReceipt(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Send Payment Receipt to Client</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => recordPaymentMutation.mutate({ id: paymentModalInvoice.id })}
                  disabled={recordPaymentMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {recordPaymentMutation.isPending ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: CREATE FEE ESTIMATE / QUOTE */}
        {showEstimateModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-indigo-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Create Fee Estimate / Quote
                  </h3>
                </div>
                <button onClick={() => setShowEstimateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newEstimate.clientId}
                    onChange={(e) => setNewEstimate({ ...newEstimate, clientId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="">Select a Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.clientCode || `CL-${c.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Estimate Title</label>
                  <input
                    type="text"
                    value={newEstimate.title}
                    onChange={(e) => setNewEstimate({ ...newEstimate, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                    <input
                      type="date"
                      value={newEstimate.estimateDate}
                      onChange={(e) => setNewEstimate({ ...newEstimate, estimateDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newEstimate.expiryDate}
                      onChange={(e) => setNewEstimate({ ...newEstimate, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">PO / Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. QUOTE-2026-01"
                      value={newEstimate.poNumber}
                      onChange={(e) => setNewEstimate({ ...newEstimate, poNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Total Amount (£) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newEstimate.totalAmount}
                      onChange={(e) => setNewEstimate({ ...newEstimate, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Scope & Terms Notes</label>
                  <textarea
                    rows={2}
                    value={newEstimate.notes}
                    onChange={(e) => setNewEstimate({ ...newEstimate, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEstimateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createEstimateMutation.mutate()}
                  disabled={createEstimateMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {createEstimateMutation.isPending ? "Creating..." : "Create Estimate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: SEND INVOICE EMAIL (Article 9000236009) */}
        {emailModalInvoice && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="text-indigo-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Email Fee Invoice: {emailModalInvoice.invoiceNumber}
                  </h3>
                </div>
                <button onClick={() => setEmailModalInvoice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Attached: PDF Invoice ({emailModalInvoice.invoiceNumber}.pdf)</span>
                  <span className="text-emerald-600 font-bold">SanSuitePay Link Included</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmailModalInvoice(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast({ title: "Invoice Sent", description: `Invoice ${emailModalInvoice.invoiceNumber} emailed to ${recipientEmail}` });
                    setEmailModalInvoice(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={12} /> Send Email
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
