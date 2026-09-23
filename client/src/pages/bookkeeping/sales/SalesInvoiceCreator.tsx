import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import GlobalMediaLibraryModal, { MediaFile } from "../../../components/common/GlobalMediaLibraryModal";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { getClientSidebar } from "../sidebar";
import {
  ChevronRight, Plus, Trash2, Save, Paperclip, ArrowLeft, RefreshCw,
  Calendar as CalendarIcon, CreditCard, FileText, UploadCloud, Folder, Check, X, Search, ChevronDown, BarChart3, User
} from "lucide-react";

const VAT_OPTIONS = [
  { label: "Select VAT Rate", value: "" },
  { label: "Standard 20%", value: "20" },
  { label: "Reduced 5%", value: "5" },
  { label: "Zero 0%", value: "0" },
  { label: "Exempt", value: "exempt" },
];

const ACCOUNT_OPTIONS = [
  { label: "4000 - Sales Revenue", value: "4000" },
  { label: "4200 - Other Income", value: "4200" },
  { label: "5000 - Cost of Goods Sold", value: "5000" },
];

const GLOBAL_LIBRARY_DOCS = [
  { id: "1", name: "Standard Terms & Conditions.pdf", size: "245 KB", category: "Legal & Compliance", date: "2026-01-15" },
  { id: "2", name: "VAT Domestic Reverse Charge Notice.pdf", size: "180 KB", category: "Tax Templates", date: "2026-02-10" },
  { id: "3", name: "Company Engagement Letter.docx", size: "320 KB", category: "Contracts", date: "2026-03-01" },
  { id: "4", name: "Bank Account Wire Instructions.pdf", size: "115 KB", category: "Banking", date: "2026-04-20" },
  { id: "5", name: "Client Fee Schedule 2026.pdf", size: "410 KB", category: "Pricing", date: "2026-05-12" },
];

interface LineItem {
  id: number;
  item: string;
  description: string;
  qty: number;
  price: number;
  account: string;
  vatRate: string;
}

const emptyLine = (): LineItem => ({
  id: Date.now() + Math.random(),
  item: "",
  description: "",
  qty: 1,
  price: 0,
  account: "4000",
  vatRate: "20",
});

export default function SalesInvoiceCreator() {
  const [matchNew, paramsNew] = useRoute("/bookkeeping/:id/invoices/new");
  const [matchEdit, paramsEdit] = useRoute("/bookkeeping/:id/invoices/:invoiceId/edit");
  const [, navigate] = useLocation();

  const clientId = paramsNew?.id || paramsEdit?.id;
  const invoiceId = paramsEdit?.invoiceId;
  const isEditing = !!invoiceId;
  const { toast } = useToast();

  const isoToday = new Date().toISOString().split("T")[0];

  const [invoiceType, setInvoiceType] = useState("Invoice");
  const [batchInvoice, setBatchInvoice] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [invoiceDate, setInvoiceDate] = useState(isoToday);
  const [dueDate, setDueDate] = useState(isoToday);
  const [inDays, setInDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [amtIncVat, setAmtIncVat] = useState(false);
  const [discountPct, setDiscountPct] = useState(false);
  const [applyCis, setApplyCis] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickReportsOpen, setQuickReportsOpen] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [receiptLedger, setReceiptLedger] = useState("Trade Debtors");
  const [receiptAmount, setReceiptAmount] = useState("0.00");
  const [receiptBank, setReceiptBank] = useState("");

  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; source: string }[]>([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // Add Customer Modal State & Companies House Search
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [companyRegNo, setCompanyRegNo] = useState("");
  const [isSearchingCrn, setIsSearchingCrn] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerVat, setNewCustomerVat] = useState("");
  const [customCustomers, setCustomCustomers] = useState<{ id: string; name: string }[]>([]);

  // Add New Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemAccount, setNewItemAccount] = useState("4000");
  const [newItemVatRate, setNewItemVatRate] = useState("20");

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/practice/clients"); return r.ok ? r.json() : []; },
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts/client", clientId],
    queryFn: async () => {
      const url = clientId ? `/api/bookkeeping/contacts/client/${clientId}` : "/api/bookkeeping/contacts";
      const r = await apiRequest("GET", url);
      return r.ok ? r.json() : [];
    },
  });
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["/api/bookkeeping/items", clientId],
    queryFn: async () => {
      const url = clientId ? `/api/bookkeeping/items/client/${clientId}` : `/api/bookkeeping/items`;
      const r = await apiRequest("GET", url);
      let resData = r.ok ? await r.json() : [];
      if (!Array.isArray(resData) || resData.length === 0) {
        const rAll = await apiRequest("GET", "/api/bookkeeping/items");
        resData = rAll.ok ? await rAll.json() : [];
      }
      return Array.isArray(resData) ? resData : [];
    },
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/bank-accounts"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/bookkeeping/bank-accounts"); return r.ok ? r.json() : []; },
  });

  // Fetch Existing Invoice for Editing
  const { data: existingInvoice } = useQuery({
    queryKey: [`/api/bookkeeping/invoices/details/${invoiceId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/invoices/details/${invoiceId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingInvoice) {
      if (existingInvoice.invoiceNumber) setInvoiceNo(existingInvoice.invoiceNumber);
      if (existingInvoice.invoiceType) setInvoiceType(existingInvoice.invoiceType);
      if (existingInvoice.customerId) setCustomerId(String(existingInvoice.customerId));
      if (existingInvoice.invoiceDate) setInvoiceDate(new Date(existingInvoice.invoiceDate).toISOString().split("T")[0]);
      if (existingInvoice.dueDate) setDueDate(new Date(existingInvoice.dueDate).toISOString().split("T")[0]);
      if (existingInvoice.notes) setNotes(existingInvoice.notes);
      if (Array.isArray(existingInvoice.items) && existingInvoice.items.length > 0) {
        setLines(existingInvoice.items.map((it: any) => {
          let rawDesc = (it.description || "").trim();
          let selectedItem = "";
          let cleanDesc = rawDesc;

          if (rawDesc.includes(" — ")) {
            const parts = rawDesc.split(" — ");
            selectedItem = parts[0].trim();
            cleanDesc = parts.slice(1).join(" — ").trim();
            if (!cleanDesc) cleanDesc = selectedItem;
          } else {
            selectedItem = rawDesc;
            cleanDesc = rawDesc;
          }

          return {
            id: it.id || Date.now() + Math.random(),
            item: selectedItem,
            description: cleanDesc,
            qty: parseFloat(it.quantity || "1"),
            price: parseFloat(it.unitPrice || "0"),
            account: it.nominalCode || "4000",
            vatRate: it.vatRate ? String(Math.round(parseFloat(it.vatRate))) : "20",
          };
        }));
      }
    }
  }, [existingInvoice]);

  const client = clients.find((c: any) => String(c.id) === clientId);
  const activeClientName = client?.clientName?.toLowerCase().trim();

  const clientScopedContacts = contacts.filter((c: any) => {
    if (clientId && c.clientId && String(c.clientId) !== String(clientId)) return false;
    const cType = (c.contactType || "").toLowerCase();
    return !cType || cType === "customer" || cType === "both" || cType === "client";
  });

  const rawCustomers = [
    ...clientScopedContacts.map((c: any) => ({ id: String(c.id), name: c.name || c.contactName })),
    ...customCustomers,
  ];

  if (existingInvoice?.customerName) {
    const existingName = existingInvoice.customerName;
    if (!rawCustomers.some(c => c.name.toLowerCase().trim() === existingName.toLowerCase().trim())) {
      rawCustomers.push({ id: String(existingInvoice.customerId || `existing-${existingName}`), name: existingName });
    }
  }

  const allCustomers = rawCustomers
    .filter((c) => {
      if (!c.name) return false;
      if (activeClientName && c.name.toLowerCase().trim() === activeClientName) return false;
      return true;
    })
    .filter((c, idx, self) => self.findIndex(t => t.name.toLowerCase().trim() === c.name.toLowerCase().trim()) === idx);

  // Companies House CRN Search
  const handleLookupCrn = async () => {
    if (!companyRegNo.trim()) {
      toast({ title: "Validation Error", description: "Please enter a Company Registration Number.", variant: "destructive" });
      return;
    }
    setIsSearchingCrn(true);
    try {
      const res = await apiRequest("GET", `/api/companies-house/company/${companyRegNo.trim()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.company_name) {
          setNewCustomerName(data.company_name);
          toast({ title: "Company Found", description: `Auto-filled "${data.company_name}" from Companies House.` });
        }
      } else {
        setNewCustomerName(`Company #${companyRegNo.trim()} Ltd`);
        toast({ title: "Company Identified", description: `Set company name from CRN ${companyRegNo.trim()}.` });
      }
    } catch (err) {
      setNewCustomerName(`Company #${companyRegNo.trim()} Ltd`);
      toast({ title: "Company Identified", description: `Set company name from CRN ${companyRegNo.trim()}.` });
    } finally {
      setIsSearchingCrn(false);
    }
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast({ title: "Validation Error", description: "Customer name is required.", variant: "destructive" });
      return;
    }
    const newCust = {
      id: `custom-${Date.now()}`,
      name: newCustomerName.trim(),
    };

    try {
      await apiRequest("POST", "/api/bookkeeping/contacts", {
        name: newCustomerName,
        email: newCustomerEmail,
        phone: newCustomerPhone,
        vatNumber: newCustomerVat,
        registrationNumber: companyRegNo,
        contactType: "Customer",
        clientId: clientId ? Number(clientId) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/contacts/client", clientId] });
    } catch (err) {
      console.warn("Saving to backend contact failed, adding to local session", err);
    }

    setCustomCustomers(prev => [newCust, ...prev]);
    setCustomerId(newCust.id);
    toast({ title: "Customer Added", description: `"${newCustomerName}" added and selected.` });

    setCompanyRegNo("");
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerVat("");
    setShowAddCustomerModal(false);
  };

  // Add New Item Handler
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast({ title: "Validation Error", description: "Item name is required.", variant: "destructive" });
      return;
    }

    const priceNum = parseFloat(newItemPrice) || 0;

    try {
      await apiRequest("POST", "/api/bookkeeping/items", {
        clientId: clientId ? Number(clientId) : 17,
        name: newItemName,
        description: newItemDesc,
        salesPrice: priceNum,
        salesVatRate: newItemVatRate,
        salesNominalCode: newItemAccount,
        type: "Product",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items", clientId] });
    } catch (err) {
      console.warn("Item save to API failed, using local addition", err);
    }

    // Auto add to active line item
    setLines(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          item: newItemName,
          description: newItemDesc || newItemName,
          price: priceNum,
          account: newItemAccount,
          vatRate: newItemVatRate,
        };
      } else {
        updated.push({
          id: Date.now(),
          item: newItemName,
          description: newItemDesc || newItemName,
          qty: 1,
          price: priceNum,
          account: newItemAccount,
          vatRate: newItemVatRate,
        });
      }
      return updated;
    });

    toast({ title: "Item Added", description: `"${newItemName}" added to catalog and invoice.` });
    setNewItemName("");
    setNewItemDesc("");
    setNewItemPrice("");
    setShowAddItemModal(false);
  };
  const availableCustomers = allCustomers;

  const getVatRate = (val: string) => {
    if (val === "20") return 20;
    if (val === "5") return 5;
    if (val === "0") return 0;
    return 0;
  };

  const totals = lines.reduce(
    (acc, l) => {
      const net = (Number(l.qty) || 0) * (Number(l.price) || 0);
      const vatRate = getVatRate(l.vatRate);
      const vat = net * (vatRate / 100);
      return { net: acc.net + net, vat: acc.vat + vat };
    },
    { net: 0, vat: 0 }
  );

  const grandTotal = totals.net + totals.vat;

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (id: number) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };
  const updateLine = (id: number, field: keyof LineItem, value: any) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        if (field === "item") {
          const catItem = catalogItems.find((ci: any) => ci.name === value);
          if (catItem) {
            return {
              ...l,
              item: value,
              description: catItem.description || value,
              price: parseFloat(catItem.sellingPrice || "0"),
              account: catItem.account || "4000",
              vatRate: catItem.vatRate ? String(catItem.vatRate) : "20",
            };
          }
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: { name: string; size: string; source: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (attachedFiles.length + newFiles.length >= 3) {
        toast({ title: "Limit Exceeded", description: "You can attach a maximum of 3 files." });
        break;
      }
      const f = files[i];
      const sizeMb = f.size / (1024 * 1024);
      if (sizeMb > 1) {
        toast({ title: "File Too Large", description: `${f.name} exceeds 1MB limit.` });
        continue;
      }
      newFiles.push({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        source: "Local Upload",
      });
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const handleAttachFromLibrary = (doc: typeof GLOBAL_LIBRARY_DOCS[0]) => {
    if (attachedFiles.length >= 3) {
      toast({ title: "Limit Exceeded", description: "Maximum of 3 files allowed." });
      return;
    }
    if (attachedFiles.some(f => f.name === doc.name)) {
      toast({ title: "Already Attached", description: "This document is already attached." });
      return;
    }
    setAttachedFiles(prev => [...prev, { name: doc.name, size: doc.size, source: "Global Library" }]);
    toast({ title: "Document Attached", description: `${doc.name} attached from Global Library.` });
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async (andNew: boolean) => {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/bookkeeping/invoices/${invoiceId}` : "/api/bookkeeping/invoices";

      const res = await apiRequest(method, url, {
        clientId,
        customerId: customerId || undefined,
        invoiceNumber: invoiceNo,
        invoiceType,
        invoiceDate,
        dueDate: dueDate || undefined,
        notes,
        subTotal: totals.net.toFixed(2),
        vatTotal: totals.vat.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        items: lines.map(l => ({
          description: l.item && l.description && l.item !== l.description && !l.description.startsWith(l.item)
            ? `${l.item} — ${l.description}`
            : (l.description || l.item),
          quantity: l.qty,
          unitPrice: l.price,
          vatRate: getVatRate(l.vatRate),
          vatAmount: (Number(l.qty) * Number(l.price) * getVatRate(l.vatRate) / 100).toFixed(2),
          netAmount: (Number(l.qty) * Number(l.price)).toFixed(2),
          nominalCode: l.account,
        })),
      });
      if (!res.ok) throw new Error(isEditing ? "Failed to update invoice" : "Failed to save invoice");
      return { result: await res.json(), andNew };
    },
    onSuccess: ({ andNew }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/details/${invoiceId}`] });
      }
      toast({
        title: isEditing ? "Invoice Updated Successfully" : "Invoice Saved Successfully",
        description: `Invoice ${invoiceNo} ${isEditing ? "updated" : "created"}.`
      });
      if (andNew) {
        navigate(`/bookkeeping/${clientId}/invoices/new`);
      } else {
        navigate(clientId ? `/bookkeeping/${clientId}/invoices` : `/bookkeeping/invoices`);
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save invoice.", variant: "destructive" }),
  });

  return (
    <AppLayout sidebar={getClientSidebar(clientId || "")} module="Bookkeeping">
      <div className="bg-slate-100/70 min-h-screen pb-16">
        {/* Top Breadcrumb Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs sticky top-0 z-20">
          <div className="flex items-center text-xs font-medium text-slate-500 gap-1.5">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={13} className="text-slate-400" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || "Client"}</button>
            <ChevronRight size={13} className="text-slate-400" />
            <button onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/invoices` : `/bookkeeping/invoices`)} className="hover:text-purple-600 transition-colors">Sales Invoices</button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-800 font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200">
              {isEditing ? `Edit Invoice (${invoiceNo})` : "New Invoice"}
            </span>
          </div>
          <div className="flex gap-2 relative">
            {/* Quick Add Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setQuickAddOpen(!quickAddOpen); setQuickReportsOpen(false); }}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Plus size={12} /> Quick Add <ChevronDown size={11} />
              </button>
              {quickAddOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-40 text-xs divide-y divide-slate-100 animate-in fade-in duration-100">
                  <div className="py-1">
                    <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/invoices/new` : `/bookkeeping/invoices/new`); setQuickAddOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                      + New Sales Invoice
                    </button>
                    <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/quotes/new` : `/bookkeeping/quotes/new`); setQuickAddOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                      + New Sales Quote
                    </button>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/purchases` : `/bookkeeping/purchases`); setQuickAddOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                      + New Purchase Bill
                    </button>
                    <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/contacts` : `/bookkeeping/contacts`); setQuickAddOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                      + New Customer Contact
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reports Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setQuickReportsOpen(!quickReportsOpen); setQuickAddOpen(false); }}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <BarChart3 size={12} /> Quick Reports <ChevronDown size={11} />
              </button>
              {quickReportsOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-40 text-xs animate-in fade-in duration-100">
                  <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/reports` : `/bookkeeping/reports`); setQuickReportsOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                    Profit & Loss Report
                  </button>
                  <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/reports` : `/bookkeeping/reports`); setQuickReportsOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                    Balance Sheet
                  </button>
                  <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/reports` : `/bookkeeping/reports`); setQuickReportsOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                    Aged Debtors Summary
                  </button>
                  <button onClick={() => { navigate(clientId ? `/bookkeeping/${clientId}/reports` : `/bookkeeping/reports`); setQuickReportsOpen(false); }} className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors">
                    Trial Balance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Main Content Container */}
        <div className="w-full mx-auto px-6 pt-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-purple-600" size={20} />
                {isEditing ? `Edit Sales Invoice — ${invoiceNo}` : "Create Sales Invoice"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/invoices` : `/bookkeeping/invoices`)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded bg-white hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <Save size={13} /> {saveMutation.isPending ? "Saving..." : "Save & Close"}
              </button>
              <button
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-purple-800 hover:bg-purple-900 text-white rounded transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <RefreshCw size={13} /> Save & New
              </button>
            </div>
          </div>

          {/* CLEAN WHITE CARD 1: INVOICE DETAILS */}
          <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
            {/* Clean Light Header (Not full purple background) */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                <FileText size={14} className="text-purple-600" />
                Invoice Details
              </span>
              <span className="text-xs font-mono text-slate-500">Invoice #{invoiceNo}</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Type</label>
                  <select
                    value={invoiceType}
                    onChange={e => setInvoiceType(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:border-purple-600 outline-none"
                  >
                    <option>Invoice</option>
                    <option>Credit Note</option>
                    <option>Proforma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
                  <div className="flex gap-1">
                    <select
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      className="flex-1 text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:border-purple-600 outline-none font-medium text-slate-800"
                    >
                      <option value="">Select Customer...</option>
                      {allCustomers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="px-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Add New Customer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice No.</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                    className="w-full text-xs font-mono font-semibold text-purple-700 border border-slate-300 rounded px-2.5 py-1.5 focus:border-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <div className="relative flex items-center">
                    <CalendarIcon size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded pl-8 pr-2.5 py-1.5 bg-white focus:border-purple-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date & Terms</label>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1 flex items-center">
                      <CalendarIcon size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full text-xs h-8 border border-slate-300 rounded pl-8 pr-2 py-1 bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                    <select
                      value={inDays}
                      onChange={e => setInDays(e.target.value)}
                      className="w-20 text-xs h-8 border border-slate-300 rounded px-1.5 py-1 bg-white focus:border-purple-600 outline-none"
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tax & Invoice Options</label>
                  <div className="h-8 bg-slate-50 border border-slate-200 rounded px-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input type="checkbox" checked={amtIncVat} onChange={e => setAmtIncVat(e.target.checked)} className="rounded border-slate-300 text-purple-600" />
                      Amount Inc. VAT
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input type="checkbox" checked={discountPct} onChange={e => setDiscountPct(e.target.checked)} className="rounded border-slate-300 text-purple-600" />
                      Discount %
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input type="checkbox" checked={batchInvoice} onChange={e => setBatchInvoice(e.target.checked)} className="rounded border-slate-300 text-purple-600" />
                      Batch Invoice
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                      <input type="checkbox" checked={applyCis} onChange={e => setApplyCis(e.target.checked)} className="rounded border-slate-300 text-purple-600" />
                      CIS Reverse Charge
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Customer notes..."
                    className="w-full text-xs h-8 border border-slate-300 rounded px-2.5 py-1 focus:border-purple-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CLEAN WHITE CARD 2: LINE ITEMS GRID */}
          <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                <FileText size={14} className="text-purple-600" />
                Invoice Line Items
              </span>
              <div className="flex gap-2">
                <button
                  onClick={addLine}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus size={12} /> Row
                </button>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus size={12} /> Item
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                    <th className="px-3 py-2 w-48">Item</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 w-16 text-center">Qty</th>
                    <th className="px-3 py-2 w-24 text-right">Price (£)</th>
                    <th className="px-3 py-2 w-44">Account</th>
                    <th className="px-3 py-2 w-32">VAT Rate</th>
                    <th className="px-3 py-2 w-24 text-right">VAT Amount</th>
                    <th className="px-3 py-2 w-28 text-right">Net Amount</th>
                    <th className="px-1 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {lines.map((l) => {
                    const net = Number(l.qty) * Number(l.price);
                    const vatAmt = net * (getVatRate(l.vatRate) / 100);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-2 align-middle">
                          <select
                            value={l.item}
                            onChange={e => {
                              const selectedVal = e.target.value;
                              const found = catalogItems.find((ci: any) => ci.name === selectedVal || ci.itemCode === selectedVal);
                              if (found) {
                                updateLine(l.id, "item", found.name);
                                if (found.description) updateLine(l.id, "description", found.description);
                                if (found.salesPrice || found.unitPrice) updateLine(l.id, "price", Number(found.salesPrice || found.unitPrice));
                                if (found.vatRate) updateLine(l.id, "vatRate", String(found.vatRate));
                              } else {
                                updateLine(l.id, "item", selectedVal);
                              }
                            }}
                            className="w-full text-xs h-8 border border-slate-300 rounded px-2 py-1 bg-white focus:border-purple-600 outline-none font-medium"
                          >
                            <option value="">[Select Item]</option>
                            {l.item && !catalogItems.some((ci: any) => ci.name === l.item) && (
                              <option value={l.item}>{l.item}</option>
                            )}
                            {catalogItems.map((ci: any) => (
                              <option key={ci.id || ci.name} value={ci.name}>
                                {ci.name} {ci.salesPrice ? `(£${ci.salesPrice})` : ""}
                              </option>
                            ))}
                            {catalogItems.length === 0 && (
                              <>
                                <option value="Consulting Service">Consulting Service</option>
                                <option value="Accounting Audit">Accounting Audit</option>
                                <option value="Tax Filing Service">Tax Filing Service</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="p-2 align-middle">
                          <textarea
                            value={l.description}
                            onChange={e => updateLine(l.id, "description", e.target.value)}
                            rows={1}
                            placeholder="Line description..."
                            className="w-full text-xs h-8 border border-slate-300 rounded px-2.5 py-1 focus:border-purple-600 outline-none resize-y box-border leading-normal"
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <input
                            type="number"
                            min="1"
                            value={l.qty}
                            onChange={e => updateLine(l.id, "qty", parseFloat(e.target.value) || 0)}
                            className="w-full text-xs h-8 border border-slate-300 rounded px-1.5 py-1 text-center focus:border-purple-600 outline-none"
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.price}
                            onChange={e => updateLine(l.id, "price", parseFloat(e.target.value) || 0)}
                            className="w-full text-xs h-8 border border-slate-300 rounded px-2 py-1 text-right font-mono focus:border-purple-600 outline-none"
                          />
                        </td>
                        <td className="p-2 align-middle">
                          <select
                            value={l.account}
                            onChange={e => updateLine(l.id, "account", e.target.value)}
                            className="w-full text-xs h-8 border border-slate-300 rounded px-2 py-1 bg-white focus:border-purple-600 outline-none"
                          >
                            {ACCOUNT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                        </td>
                        <td className="p-2 align-middle">
                          <select
                            value={l.vatRate}
                            onChange={e => updateLine(l.id, "vatRate", e.target.value)}
                            className="w-full text-xs h-8 border border-slate-300 rounded px-2 py-1 bg-white focus:border-purple-600 outline-none"
                          >
                            {VAT_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="p-2 text-right font-mono text-slate-600">{vatAmt.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-slate-900 font-bold">{net.toFixed(2)}</td>
                        <td className="p-1 text-center">
                          <button
                            onClick={() => removeLine(l.id)}
                            disabled={lines.length === 1}
                            className="text-red-400 hover:text-red-600 disabled:opacity-20 transition-colors p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={addLine}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus size={12} /> Row
                </button>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus size={12} /> Item
                </button>
              </div>

              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800">£{totals.net.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span>VAT Total:</span>
                  <span className="font-mono font-bold text-slate-800">£{totals.vat.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-900 font-bold border-l border-slate-300 pl-4 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-purple-700 text-base">£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CLEAN SIDE-BY-SIDE ROW: RECEIPT & ATTACHMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* LEFT CARD: RECEIPT ENTRY */}
            <div className="bg-white border border-slate-200 rounded shadow-2xs flex flex-col overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                  <CreditCard size={14} className="text-purple-600" />
                  Receipt & Initial Payment Entry
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Account / Ledger</label>
                    <select
                      value={receiptLedger}
                      onChange={e => setReceiptLedger(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:border-purple-600 outline-none"
                    >
                      <option>Trade Debtors (Unpaid Invoice)</option>
                      <option>Petty Cash</option>
                      <option>Main Bank Account</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Receipt Amount (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={receiptAmount}
                        onChange={e => setReceiptAmount(e.target.value)}
                        className="w-full text-xs font-mono font-semibold border border-slate-300 rounded px-2.5 py-1.5 focus:border-purple-600 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Bank Account</label>
                      <select
                        value={receiptBank}
                        onChange={e => setReceiptBank(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:border-purple-600 outline-none font-medium"
                      >
                        <option value="">[Select Bank Account]</option>
                        {bankAccounts.map((b: any) => (
                          <option key={b.id} value={b.accountName || b.bankName}>
                            {b.accountName || b.bankName} ({b.accountNumber || "Bank"})
                          </option>
                        ))}
                        {bankAccounts.length === 0 && (
                          <>
                            <option value="Barclays Current Account">Barclays Current Account</option>
                            <option value="HSBC Business Account">HSBC Business Account</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100">
                  Note: Entering an amount here records immediate payment receipt against this invoice.
                </p>
              </div>
            </div>

            {/* RIGHT CARD: DOCUMENT ATTACHMENTS & GLOBAL LIBRARY */}
            <div className="bg-white border border-slate-200 rounded shadow-2xs flex flex-col overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                  <Paperclip size={14} className="text-purple-600" />
                  Document Attachments
                </span>
                <button
                  onClick={() => setShowLibraryModal(true)}
                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Folder size={11} /> Global Library
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 cursor-pointer transition-colors flex items-center gap-1.5">
                      <UploadCloud size={13} className="text-purple-600" />
                      Choose Local Files
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                        accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.txt,.csv,.gif,.xls,.xlsx"
                      />
                    </label>
                    <button
                      onClick={() => setShowLibraryModal(true)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-xs font-semibold text-purple-700 transition-colors flex items-center gap-1.5"
                    >
                      <Folder size={13} />
                      Attach from Library
                    </button>
                  </div>

                  {attachedFiles.length === 0 ? (
                    <div className="p-3 border border-dashed border-slate-200 rounded text-center bg-slate-50">
                      <Paperclip size={16} className="mx-auto text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500">No attachments linked yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Max 3 files allowed (.pdf, .docx, .png, etc.)</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip size={13} className="text-purple-600 flex-shrink-0" />
                            <span className="truncate font-medium text-slate-700">{file.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">{file.source}</span>
                          </div>
                          <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500 transition-colors ml-2">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100">
                  Supported formats: .pdf, .docx, .jpg, .png, .csv, .xlsx (Max 1MB each)
                </p>
              </div>
            </div>
          </div>

          {/* BOTTOM INVOICE ACTION BAR */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/invoices` : `/bookkeeping/invoices`)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} /> Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
                className="px-4 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Save & Create New
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} /> {saveMutation.isPending ? "Saving Invoice..." : "Save & Close Invoice"}
              </button>
            </div>
          </div>

          {/* SANSUITE PAY BANNER */}
          <div className="bg-gradient-to-r from-purple-50/90 via-purple-50/50 to-purple-50/20 border border-purple-200/80 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-purple-700 flex items-center gap-2">
                <CreditCard size={16} className="text-purple-600" />
                Automate Payments with SanSuite Pay
              </h3>
              <p className="text-xs text-slate-500">Accept online card payments directly on invoices</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-bold text-blue-700 shadow-2xs">VISA</span>
                <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-bold text-orange-600 shadow-2xs">Mastercard</span>
                <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-bold text-blue-500 shadow-2xs">AMEX</span>
                <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-800 shadow-2xs"> Pay</span>
                <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-700 shadow-2xs">G Pay</span>
              </div>
            </div>
            <button
              onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/SanSuite-pay` : `/bookkeeping/SanSuite-pay`)}
              className="px-4 py-2 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              Setup Online Payments →
            </button>
          </div>
        </div>
      </div>

      {/* ADD NEW CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 !mt-0">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Add New Customer</h3>
                  <p className="text-[11px] text-slate-500">Auto-lookup by Companies House Reg No. or enter details.</p>
                </div>
              </div>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Companies House Reg No Search */}
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-purple-900">Search by Company Reg No. (CRN)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={companyRegNo}
                  onChange={(e) => setCompanyRegNo(e.target.value)}
                  placeholder="e.g. 01234567"
                  className="flex-1 px-3 py-1.5 border border-purple-200 rounded text-xs outline-none bg-white focus:border-purple-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleLookupCrn}
                  disabled={isSearchingCrn}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isSearchingCrn ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                  Lookup
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Acme Corporation Ltd"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="+44 20 7946 0912"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">VAT / Tax Reg Number</label>
                <input
                  type="text"
                  value={newCustomerVat}
                  onChange={(e) => setNewCustomerVat(e.target.value)}
                  placeholder="GB 123 4567 89"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT / SERVICE ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 !mt-0">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Add New Item to Catalog</h3>
                  <p className="text-[11px] text-slate-500">Create a new product or service for quick line entry.</p>
                </div>
              </div>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item / Service Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Annual Audit & Advisory"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Detailed description of product or service..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-600 resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Rate (%)</label>
                  <select
                    value={newItemVatRate}
                    onChange={(e) => setNewItemVatRate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="20">Standard 20%</option>
                    <option value="5">Reduced 5%</option>
                    <option value="0">Zero Rated 0%</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Income Account</label>
                <select
                  value={newItemAccount}
                  onChange={(e) => setNewItemAccount(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-600 bg-white"
                >
                  {ACCOUNT_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Save & Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL PRACTICE MEDIA & DOCUMENT LIBRARY MODAL */}
      <GlobalMediaLibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onSelectFile={(file: MediaFile) => {
          if (attachedFiles.length >= 3) {
            toast({ title: "Limit Exceeded", description: "Maximum 3 attachments allowed.", type: "error" });
            return;
          }
          if (attachedFiles.some(f => f.name === file.name)) {
            toast({ title: "Already Attached", description: "This file is already attached." });
            return;
          }
          setAttachedFiles(prev => [...prev, { name: file.name, size: file.size, source: "Media Library" }]);
          toast({ title: "Document Attached", description: `${file.name} attached from Media Library.` });
          setShowLibraryModal(false);
        }}
        title="Global Practice Media & Document Library"
      />
    </AppLayout>
  );
}
