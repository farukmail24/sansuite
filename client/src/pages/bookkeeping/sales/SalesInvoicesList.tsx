import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileText, Plus, Search, ChevronRight, Pencil, Trash2, Send,
  Mail, X, Building2, Download, Eye, Upload, FileSpreadsheet,
  CheckCircle2, AlertCircle, History, Info
} from "lucide-react";
import { getClientSidebar, bookkeepingSidebar } from "../sidebar";
import { generateSanSuiteInvoicePdf } from "../../../lib/sanSuiteInvoicePdfGenerator";
import CreditNotesManager from "../common/CreditNotesManager";

export default function SalesInvoicesList() {
  const [match, params] = useRoute("/bookkeeping/:id/invoices");
  const [, navigate] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"invoices" | "creditNotes">("invoices");

  // Send Email Modal State
  const [emailModalInvoice, setEmailModalInvoice] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState("");

  // CSV Import State (Capium Parity)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"import" | "history">("import");
  const [parsedInvoices, setParsedInvoices] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoiceImportHistory, setInvoiceImportHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`sansuite_invoice_imports_${clientId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const importInvoicesMutation = useMutation({
    mutationFn: async () => {
      if (!parsedInvoices.length) throw new Error("No invoice rows parsed for import.");
      const res = await apiRequest("POST", `/api/bookkeeping/invoices/import/${clientId}`, {
        invoices: parsedInvoices
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to batch import sales invoices.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      toast({
        title: "Import Completed",
        description: data.message || `Successfully imported ${data.importedInvoices} invoices.`,
      });

      const newEntry = {
        id: Date.now(),
        fileName: importFileName || "sales_invoices.csv",
        importedInvoices: data.importedInvoices,
        importedLines: data.importedLines,
        skippedInvoices: data.skippedInvoices,
        importedAt: new Date().toLocaleString(),
      };
      const updated = [newEntry, ...invoiceImportHistory];
      setInvoiceImportHistory(updated);
      try {
        localStorage.setItem(`sansuite_invoice_imports_${clientId}`, JSON.stringify(updated));
      } catch {}

      setParsedInvoices([]);
      setImportFileName("");
      setShowImportModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }
  });

  const downloadSalesTemplate = () => {
    const headers = [
      "Contact Name", "Transaction Type", "Invoice No", "Invoice Date", "Invoice Due Date",
      "Item Name / Description", "Item Qty", "Unit Price", "Account Name"
    ];
    const rows = [
      ["Acme Global Trading Ltd", "Sales", "INV-2026-001", "01/04/2026", "30/04/2026", "Q1 Financial Advisory Services", "1", "1250.00", "4000"],
      ["Acme Global Trading Ltd", "Sales", "INV-2026-001", "01/04/2026", "30/04/2026", "Statutory Filing Processing Fee", "1", "250.00", "4000"],
      ["Apex Tech Logistics", "Sales", "INV-2026-002", "05/04/2026", "05/05/2026", "Cloud Server Migration Consulting", "5", "180.00", "4000"],
    ];
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SanSuite_Sales_Template_${client?.clientName?.replace(/\s+/g, "_") || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        toast({ title: "Empty CSV", description: "CSV file must contain a header and at least one data row.", variant: "destructive" });
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
      const contactIdx = headers.findIndex(h => h.includes("contact") || h.includes("customer"));
      const transTypeIdx = headers.findIndex(h => h.includes("transaction type") || h.includes("type"));
      const invNoIdx = headers.findIndex(h => h.includes("invoice no") || h.includes("invoice number") || h.includes("inv no"));
      const invDateIdx = headers.findIndex(h => h.includes("invoice date") || h.includes("date"));
      const dueDateIdx = headers.findIndex(h => h.includes("due date") || h.includes("invoice due"));
      const itemDescIdx = headers.findIndex(h => h.includes("item name") || h.includes("description") || h.includes("item"));
      const qtyIdx = headers.findIndex(h => h.includes("qty") || h.includes("quantity"));
      const priceIdx = headers.findIndex(h => h.includes("unit price") || h.includes("price") || h.includes("rate"));
      const acctIdx = headers.findIndex(h => h.includes("account name") || h.includes("nominal") || h.includes("account"));

      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
        const cleanCols = cols.map(c => c.trim().replace(/^["']|["']$/g, ""));

        const contactName = (contactIdx !== -1 ? cleanCols[contactIdx] : cleanCols[0]) || "";
        const invNo = (invNoIdx !== -1 ? cleanCols[invNoIdx] : cleanCols[2]) || "";
        if (!invNo.trim()) continue;

        parsed.push({
          contactName: contactName.trim() || "Customer",
          transactionType: (transTypeIdx !== -1 ? cleanCols[transTypeIdx] : "Sales") || "Sales",
          invoiceNumber: invNo.trim(),
          invoiceDate: (invDateIdx !== -1 ? cleanCols[invDateIdx] : "") || new Date().toISOString().split("T")[0],
          dueDate: (dueDateIdx !== -1 ? cleanCols[dueDateIdx] : "") || "",
          description: (itemDescIdx !== -1 ? cleanCols[itemDescIdx] : cleanCols[5]) || `Item for ${invNo}`,
          quantity: parseFloat(qtyIdx !== -1 ? cleanCols[qtyIdx] : "1") || 1,
          unitPrice: parseFloat(priceIdx !== -1 ? cleanCols[priceIdx] : "0") || 0,
          accountName: (acctIdx !== -1 ? cleanCols[acctIdx] : "4000") || "4000",
        });
      }

      setParsedInvoices(parsed);
      if (parsed.length > 0) {
        toast({ title: "Sales CSV Parsed", description: `Found ${parsed.length} invoice line items ready to import.` });
      } else {
        toast({ title: "No Invoices Parsed", description: "Please check your CSV format and columns.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/invoices/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/invoices/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: singleClient } = useQuery({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practice/clients/${clientId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const client = clients.find((c: any) => String(c.id) === clientId) || singleClient;

  // Fetch real client bank accounts (no dummy fallback data)
  const { data: bankAccounts = [] } = useQuery({
    queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch client contacts
  const { data: contactsList = [] } = useQuery({
    queryKey: [`/api/bookkeeping/contacts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch specific company details for current client
  const { data: companyData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${clientId}/company-info`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${clientId}/company-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const companyInfo = companyData?.companyInfo;

  // Compute canonical company details matching SanSuite standard
  const effectiveCompanyName =
    companyInfo?.name ||
    client?.clientName ||
    client?.companyName ||
    client?.businessName ||
    "Company";

  const effectiveRegNo =
    companyInfo?.registrationNumber ||
    client?.registrationNumber ||
    client?.companyNumber ||
    "";

  const effectiveVatNo =
    companyInfo?.vatNumber ||
    client?.vatNumber ||
    "";

  const effectivePhone =
    companyInfo?.phone ||
    client?.phone ||
    client?.mobile ||
    "";

  // Build clean multi-line company address
  const addressParts: string[] = [];
  const primaryAddr = companyInfo?.address || client?.address;
  if (primaryAddr) addressParts.push(primaryAddr);

  const city = companyInfo?.city || client?.city;
  const county = companyInfo?.county || client?.county;
  const postcode = companyInfo?.postcode || client?.postcode || client?.postalCode;
  const country = companyInfo?.country || client?.country || "United Kingdom";

  const secondLine = [city, county].filter(Boolean).join(", ");
  if (secondLine && !addressParts.includes(secondLine)) addressParts.push(secondLine);

  const postalCountryLine = [postcode, country].filter(Boolean).join(", ");
  if (postalCountryLine) addressParts.push(postalCountryLine);

  const formattedCompanyAddress = addressParts.join("\n");

  // Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/bookkeeping/invoices/${id}`, { status });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      toast({ title: "Status Updated", description: "Invoice status updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
    },
  });

  // Delete Invoice Mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/invoices/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      toast({ title: "Invoice Deleted", description: "The sales invoice has been deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message || "Could not delete invoice.", variant: "destructive" });
    },
  });

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, email }: { id: number; email: string }) => {
      const res = await apiRequest("POST", `/api/bookkeeping/invoices/${id}/send-email`, { recipientEmail: email });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      toast({ title: "Invoice Dispatched", description: data.message || "Invoice emailed to customer." });
      setEmailModalInvoice(null);
    },
    onError: (err: any) => {
      toast({ title: "Email Failed", description: err.message || "Could not dispatch invoice email.", variant: "destructive" });
    },
  });

  const filteredInvoices = invoices.filter((inv: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.status?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.grandTotal?.toString().includes(q)
    );
  });

  const handleOpenEmailModal = (inv: any) => {
    setEmailModalInvoice(inv);
    setRecipientEmail(inv.customerEmail || inv.clientEmail || client?.email || "customer@example.com");
  };

  const handlePdfAction = async (inv: any, action: "download" | "preview") => {
    let fullInv = inv;
    if (!inv.items || inv.items.length === 0) {
      try {
        const res = await apiRequest("GET", `/api/bookkeeping/invoices/details/${inv.id}`);
        if (res.ok) {
          fullInv = await res.json();
        }
      } catch (_) {}
    }

    const customerName = fullInv.customerName || fullInv.clientName || "Customer";
    const customerAddress = fullInv.customerAddress || fullInv.clientAddress || "";

    const rawItems = (fullInv.items && fullInv.items.length > 0) ? fullInv.items : [];
    const itemsList = rawItems.length > 0
      ? rawItems.map((it: any) => {
          const qty = Number(it.quantity || 1);
          const uPrice = Number(it.unitPrice || it.rate || 0);
          const net = Number(it.netAmount || it.amount || (qty * uPrice));
          const vAmount = Number(it.vatAmount || 0);
          let vRateStr = "No VAT";
          if (it.vatRate !== null && it.vatRate !== undefined && it.vatRate !== "") {
            const vNum = Number(it.vatRate);
            if (!isNaN(vNum) && vNum > 0) {
              vRateStr = `${vNum}%`;
            } else if (String(it.vatRate).includes("%")) {
              vRateStr = String(it.vatRate);
            } else if (vAmount > 0) {
              vRateStr = "20%";
            }
          } else if (vAmount > 0) {
            vRateStr = "20%";
          }
          const gross = Number(it.grossAmount || it.total || (net + vAmount));
          return {
            description: it.description || "Item 1",
            unitPrice: uPrice,
            quantity: qty,
            netAmount: net,
            vatRate: vRateStr,
            vatAmount: vAmount,
            grossAmount: gross,
          };
        })
      : [{
          description: "Item 1",
          unitPrice: Number(fullInv.subTotal || fullInv.grandTotal || 0),
          quantity: 1,
          netAmount: Number(fullInv.subTotal || fullInv.grandTotal || 0),
          vatRate: Number(fullInv.vatTotal || 0) > 0 ? "20%" : "No VAT",
          vatAmount: Number(fullInv.vatTotal || 0),
          grossAmount: Number(fullInv.grandTotal || (Number(fullInv.subTotal || 0) + Number(fullInv.vatTotal || 0))),
        }];

    // Zero mock bank data: use client's authentic bank account or blank
    const activeBank = bankAccounts.find((b: any) => b.isActive) || bankAccounts[0];
    const bankName = activeBank?.bankName || "";
    const accountNo = activeBank?.accountNumber || "";
    const branchCode = activeBank?.sortCode || "";

    generateSanSuiteInvoicePdf({
      invoiceNumber: fullInv.invoiceNumber,
      invoiceDate: new Date(fullInv.invoiceDate).toLocaleDateString("en-GB"),
      dueDate: fullInv.dueDate ? new Date(fullInv.dueDate).toLocaleDateString("en-GB") : "-",
      reference: fullInv.reference || "",
      companyName: effectiveCompanyName,
      companyAddress: formattedCompanyAddress,
      companyPhone: effectivePhone,
      companyRegNo: effectiveRegNo,
      companyVatRegNo: effectiveVatNo,
      customerName,
      customerAddress,
      items: itemsList,
      netAmount: Number(fullInv.subTotal || 0),
      vatAmount: Number(fullInv.vatTotal || 0),
      totalAmount: Number(fullInv.grandTotal || 0),
      dueAmount: Number(fullInv.grandTotal || 0),
      bankName,
      accountNo,
      branchCode,
      logoUrl: companyInfo?.logoUrl || client?.logoUrl || undefined,
    }, action);
  };

  const handleDownloadDocx = (inv: any) => {
    window.location.href = `/api/bookkeeping/invoices/${inv.id}/download-doc`;
  };

  if (!clientId) {
    return (
      <AppLayout sidebar={bookkeepingSidebar} module="Bookkeeping">
        <div className="bg-gray-50 min-h-screen p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
              <Building2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Select a Client / Workspace</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sales invoices are managed within a specific client workspace. Please select a client company from the Bookkeeping Dashboard.
            </p>
            <button
              onClick={() => navigate("/bookkeeping")}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer"
            >
              Go to All Clients Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">Sales Invoices</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Sales Invoices</h1>
              <p className="text-gray-500 text-sm mt-1">Manage, dispatch, and track your client's sales invoices.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg font-medium shadow-2xs transition-colors flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <Upload size={15} className="text-purple-600" /> Import
              </button>
              <button
                onClick={() => navigate(`/bookkeeping/${clientId}/invoices/new`)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm cursor-pointer"
              >
                <Plus size={16} /> New Invoice
              </button>
            </div>
          </div>

          {/* Subtabs: Sales Invoices vs Credit Notes */}
          <div className="flex border-b border-gray-200 mb-6 gap-6">
            <button
              onClick={() => setActiveSubTab("invoices")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "invoices"
                  ? "border-purple-600 text-purple-700 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Sales Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setActiveSubTab("creditNotes")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "creditNotes"
                  ? "border-purple-600 text-purple-700 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Credit Notes
            </button>
          </div>

          {activeSubTab === "creditNotes" ? (
            <CreditNotesManager clientId={clientId} type="Sales" contacts={contactsList} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="relative w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3 uppercase tracking-wider">Invoice No.</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Due Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">Net Amount</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">VAT</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">Loading invoices...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-400 mb-4">
                            <FileText size={24} />
                          </div>
                          <p className="text-gray-600 font-medium">No sales invoices found.</p>
                          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first invoice to get started.</p>
                          <button
                            onClick={() => navigate(`/bookkeeping/${clientId}/invoices/new`)}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                          >
                            <Plus size={14} /> Create Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-purple-50/20">
                        <td className="px-5 py-4 font-medium text-purple-600">{inv.invoiceNumber}</td>
                        <td className="px-5 py-4 font-medium text-gray-800">{inv.customerName || "-"}</td>
                        <td className="px-5 py-4 text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString("en-GB")}</td>
                        <td className="px-5 py-4 text-gray-600">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : '-'}</td>
                        <td className="px-5 py-4 text-right text-gray-600">£{parseFloat(inv.subTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-right text-gray-600">£{parseFloat(inv.vatTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">£{parseFloat(inv.grandTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-center">
                          {/* STATUS DROPDOWN SELECTOR */}
                          <select
                            value={inv.status || "Draft"}
                            onChange={(e) => updateStatusMutation.mutate({ id: inv.id, status: e.target.value })}
                            className="text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-800 outline-none cursor-pointer hover:bg-purple-100 transition-colors capitalize"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="PartiallyPaid">Partially Paid</option>
                            <option value="Paid">Paid</option>
                            <option value="Void">Void</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* PREVIEW STANDARD PDF BUTTON */}
                            <button
                              onClick={() => handlePdfAction(inv, "preview")}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Preview Standard PDF (SanSuite Template)"
                            >
                              <Eye size={15} />
                            </button>
                            {/* DOWNLOAD STANDARD PDF BUTTON */}
                            <button
                              onClick={() => handlePdfAction(inv, "download")}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Download Invoice PDF"
                            >
                              <Download size={15} />
                            </button>
                            {/* DOWNLOAD WORD (.DOCX) BUTTON */}
                            <button
                              onClick={() => handleDownloadDocx(inv)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Download Word Document (Invoice.docx Template)"
                            >
                              <FileText size={15} />
                            </button>
                            {/* SEND EMAIL BUTTON */}
                            <button
                              onClick={() => handleOpenEmailModal(inv)}
                              className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                              title="Send Invoice Email to Customer"
                            >
                              <Send size={15} />
                            </button>
                            {/* EDIT BUTTON */}
                            <button
                              onClick={() => navigate(`/bookkeeping/${clientId}/invoices/${inv.id}/edit`)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                              title="Edit Invoice"
                            >
                              <Pencil size={15} />
                            </button>
                            {/* DELETE BUTTON */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}?`)) {
                                  deleteInvoiceMutation.mutate(inv.id);
                                }
                              }}
                              disabled={deleteInvoiceMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-30"
                              title="Delete Invoice"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* SEND INVOICE VIA EMAIL MODAL */}
      {emailModalInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Send Invoice via Email</h3>
                  <p className="text-[11px] text-slate-500">Dispatch {emailModalInvoice.invoiceNumber} to customer</p>
                </div>
              </div>
              <button onClick={() => setEmailModalInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendEmailMutation.mutate({ id: emailModalInvoice.id, email: recipientEmail });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email Address *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@company.co.uk"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Number:</span>
                  <span className="font-bold text-slate-800">{emailModalInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Due:</span>
                  <span className="font-bold text-purple-700">£{parseFloat(emailModalInvoice.grandTotal || "0").toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModalInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  {sendEmailMutation.isPending ? "Sending..." : "Send Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT SALES INVOICES MODAL (CAPIUM PARITY SUITE) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 !mt-0 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Import Sales Invoices</h3>
                  <p className="text-[11px] text-slate-500">Batch upload sales invoices and multi-item lines from CSV</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-semibold">
              <button
                onClick={() => setImportTab("import")}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  importTab === "import"
                    ? "border-purple-600 text-purple-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setImportTab("history")}
                className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  importTab === "history"
                    ? "border-purple-600 text-purple-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History size={13} /> History ({invoiceImportHistory.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {importTab === "import" ? (
                <>
                  {/* 3 Step Instruction Grid (Matching Capium specification) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 1. Download Template</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Download our CSV sales template file with accurate prescribed column headings.
                        </p>
                      </div>
                      <button
                        onClick={downloadSalesTemplate}
                        className="mt-3 w-full py-1.5 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Download size={13} /> Download Template
                      </button>
                    </div>

                    {/* Step 2 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 2. Fill Data in Template</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Copy invoice lines into the template file. Keep column headings intact.
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400 bg-white p-2 border border-slate-200 rounded-lg">
                        Date format: <span className="font-mono font-semibold text-slate-700">DD/MM/YYYY</span>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 3. Choose & Import File</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Select the filled template CSV from your computer to parse and preview.
                        </p>
                      </div>
                      <div className="mt-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet size={13} /> {importFileName ? "Change File" : "Choose File"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Parsed Preview Table */}
                  {parsedInvoices.length > 0 && (
                    <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>Ready to Import ({parsedInvoices.length} line items parsed from {importFileName})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Existing invoice numbers will be skipped</span>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Customer</th>
                              <th className="px-3 py-2">Invoice No</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Item / Description</th>
                              <th className="px-3 py-2 text-right">Qty</th>
                              <th className="px-3 py-2 text-right">Unit Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {parsedInvoices.slice(0, 8).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 font-sans font-medium text-slate-800">{p.contactName}</td>
                                <td className="px-3 py-1.5 text-purple-700 font-bold">{p.invoiceNumber}</td>
                                <td className="px-3 py-1.5 text-slate-600">{p.invoiceDate}</td>
                                <td className="px-3 py-1.5 font-sans text-slate-700 max-w-xs truncate">{p.description}</td>
                                <td className="px-3 py-1.5 text-right">{p.quantity}</td>
                                <td className="px-3 py-1.5 text-right">£{parseFloat(p.unitPrice || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedInvoices.length > 8 && (
                          <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 border-t border-slate-200">
                            ... and {parsedInvoices.length - 8} more line items
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Available Fields Reference Table (Capium Parity) */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info size={14} className="text-purple-600" />
                      Available Fields Specification
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5">Field Name</th>
                            <th className="px-4 py-2.5">Required</th>
                            <th className="px-4 py-2.5">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Contact Name</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Customer or client name (matched or created automatically)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Transaction Type</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Sales/Cr Note. If blank, default transaction type is Sales</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Invoice No</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Unique reference number for the sales invoice</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Invoice Date</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Date of issuance (Format: DD/MM/YYYY or YYYY-MM-DD)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Invoice Due Date</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Payment due date. If omitted, defaults to Invoice Date</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Item Name / Description</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Line item description shown on the customer invoice</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Item Qty</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Number of items billed (numeric value)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Unit Price</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Net price per unit excluding VAT</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Account Name</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Nominal account code (defaults to Sales Revenue 4000)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Instructions Callout */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-700 mb-1">Important Notes:</div>
                    <p>• Rows sharing the same <span className="font-mono font-semibold">Invoice No</span> are automatically bundled into a single multi-item invoice.</p>
                    <p>• Do not manipulate the predefined column headings.</p>
                    <p>• Existing invoices in the system will be skipped during import to prevent duplicates.</p>
                  </div>
                </>
              ) : (
                /* History Tab */
                <div className="space-y-4">
                  {invoiceImportHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No sales invoice imports recorded yet for this client.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5">File Name</th>
                            <th className="px-4 py-2.5 text-center">Invoices</th>
                            <th className="px-4 py-2.5 text-center">Lines</th>
                            <th className="px-4 py-2.5 text-center">Skipped</th>
                            <th className="px-4 py-2.5">Imported On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoiceImportHistory.map((h) => (
                            <tr key={h.id}>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{h.fileName}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-emerald-700 font-bold">{h.importedInvoices}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-600">{h.importedLines}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-400">{h.skippedInvoices}</td>
                              <td className="px-4 py-2.5 text-slate-500">{h.importedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {importTab === "import" && (
                <button
                  onClick={() => importInvoicesMutation.mutate()}
                  disabled={importInvoicesMutation.isPending || parsedInvoices.length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Upload size={14} />
                  {importInvoicesMutation.isPending
                    ? "Importing Invoices..."
                    : `Import ${parsedInvoices.length} Invoice Lines`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
