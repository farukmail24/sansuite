import React, { useState, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { 
  Users, Plus, Search, X, User, Phone, Mail, Building2, Pencil, Trash2, 
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, History, 
  HelpCircle, ChevronRight, UserCheck, CreditCard, ArrowRight, RefreshCw, 
  Check, Share2, Briefcase, FileText, Calendar, ExternalLink, Shield
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";
import { useToast } from "@/hooks/useToast";

type ContactTab = "Customer" | "Supplier" | "Director" | "Shareholder";

interface Contact {
  id: number;
  practiceId: number;
  clientId: number | null;
  contactType: ContactTab;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  county: string | null;
  country: string | null;
  openingBalance: string | null;
  openingBalanceDate: string | null;
  isActive: boolean | null;
  recurringEmail: boolean | null;
  notes: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  iban: string | null;
  designation: string | null;
  shareType: string | null;
  numberOfShares: string | null;
  shareValue: string | null;
  vatNumber: string | null;
  balance?: string;
  createdAt: string | null;
}

interface ParsedContactRow {
  contactType: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postcode: string;
  country: string;
  openingBalance: string;
  notes: string;
}

export default function ContactsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/contacts");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="Contacts" />;

  // URL search params sync for active tab
  const searchParams = new URLSearchParams(window.location.search);
  const typeParam = searchParams.get("type");
  const initialTab: ContactTab = 
    typeParam === "Supplier" ? "Supplier" :
    typeParam === "Director" ? "Director" :
    typeParam === "Shareholder" ? "Shareholder" : "Customer";

  const [activeTab, setActiveTab] = useState<ContactTab>(initialTab);
  const [search, setSearch] = useState("");
  const [shareTypeFilter, setShareTypeFilter] = useState("All");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"import" | "history">("import");
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statement / Ledger Drawer
  const [selectedStatementContact, setSelectedStatementContact] = useState<Contact | null>(null);

  // Form State
  const defaultFormData = {
    contactType: activeTab,
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    county: "",
    country: "United Kingdom",
    openingBalance: "0.00",
    openingBalanceDate: new Date().toISOString().split("T")[0],
    isActive: true,
    recurringEmail: true,
    notes: "",
    sortCode: "",
    accountNumber: "",
    iban: "",
    designation: "Director",
    shareType: "Equity",
    numberOfShares: "0.00",
    shareValue: "1.00",
    vatNumber: "",
  };
  const [formData, setFormData] = useState(defaultFormData);

  // Query contacts with live calculated balance
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [`/api/bookkeeping/contacts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
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
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Statement Ledger Query
  const { data: statementData, isLoading: isLoadingStatement } = useQuery({
    queryKey: [`/api/bookkeeping/contacts/${selectedStatementContact?.id}/statement`],
    queryFn: async () => {
      if (!selectedStatementContact) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/${selectedStatementContact.id}/statement`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedStatementContact,
  });

  // Create / Update Mutation
  const saveContactMutation = useMutation({
    mutationFn: async (payload: any) => {
      const body = {
        ...payload,
        clientId: parseInt(clientId),
      };
      if (editingContact) {
        const res = await apiRequest("PUT", `/api/bookkeeping/contacts/${editingContact.id}`, body);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update contact");
        }
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/bookkeeping/contacts", body);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to create contact");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/contacts/client/${clientId}`] });
      toast({
        title: editingContact ? "Contact Updated" : "Contact Created",
        description: `Successfully saved ${formData.name}.`,
      });
      setShowFormModal(false);
      setEditingContact(null);
      setFormData(defaultFormData);
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "An error occurred while saving contact.",
        variant: "destructive",
      });
    },
  });

  // Delete Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/contacts/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete contact");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/contacts/client/${clientId}`] });
      toast({ title: "Contact Deleted", description: "The contact record has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    },
  });

  // Make Director Mutation
  const makeDirectorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/contacts/${id}/make-director`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to promote to Director");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/contacts/client/${clientId}`] });
      toast({ title: "Role Updated", description: data.message || "Shareholder promoted to Director." });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  // Batch CSV Import Mutation
  const importContactsMutation = useMutation({
    mutationFn: async (rowsToImport: ParsedContactRow[]) => {
      const res = await apiRequest("POST", `/api/bookkeeping/contacts/import/${clientId}`, {
        contacts: rowsToImport,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to import contacts");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/contacts/client/${clientId}`] });
      toast({
        title: "Import Completed",
        description: data.message || `Successfully imported ${data.importedCount} contacts.`,
      });
      setShowImportModal(false);
      setParsedRows([]);
      setImportFileName("");
      setImportStep(1);
    },
    onError: (err: any) => {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to complete CSV import.",
        variant: "destructive",
      });
    },
  });

  // Filter contacts by active tab, search, and share type
  const tabContacts = useMemo(() => {
    return contacts.filter(c => c.contactType === activeTab);
  }, [contacts, activeTab]);

  const filteredContacts = useMemo(() => {
    return tabContacts.filter(c => {
      const matchesSearch = 
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.phone && c.phone.includes(search));

      const matchesShareType = 
        activeTab !== "Shareholder" ||
        shareTypeFilter === "All" ||
        (c.shareType && c.shareType.toLowerCase() === shareTypeFilter.toLowerCase());

      return matchesSearch && matchesShareType;
    });
  }, [tabContacts, search, shareTypeFilter, activeTab]);

  // Paginated contacts
  const totalEntries = filteredContacts.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Total shares sum for Shareholders tab
  const totalSharesCount = useMemo(() => {
    if (activeTab !== "Shareholder") return 0;
    return tabContacts.reduce((acc, curr) => acc + (parseFloat(curr.numberOfShares || "0") || 0), 0);
  }, [tabContacts, activeTab]);

  // Tab change handler
  const handleTabChange = (tab: ContactTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    navigate(`/bookkeeping/${clientId}/contacts?type=${tab}`, { replace: true });
  };

  // Open Edit Modal
  const handleEdit = (c: Contact) => {
    setEditingContact(c);
    setFormData({
      contactType: c.contactType,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      addressLine1: c.addressLine1 || c.address || "",
      addressLine2: c.addressLine2 || "",
      city: c.city || "",
      postcode: c.postcode || "",
      county: c.county || "",
      country: c.country || "United Kingdom",
      openingBalance: c.openingBalance || "0.00",
      openingBalanceDate: c.openingBalanceDate ? c.openingBalanceDate.split("T")[0] : new Date().toISOString().split("T")[0],
      isActive: c.isActive !== false,
      recurringEmail: c.recurringEmail !== false,
      notes: c.notes || "",
      sortCode: c.sortCode || "",
      accountNumber: c.accountNumber || "",
      iban: c.iban || "",
      designation: c.designation || "Director",
      shareType: c.shareType || "Equity",
      numberOfShares: c.numberOfShares || "0.00",
      shareValue: c.shareValue || "1.00",
      vatNumber: c.vatNumber || "",
    });
    setShowFormModal(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData({
      ...defaultFormData,
      contactType: activeTab,
    });
    setShowFormModal(true);
  };

  // Download Sample Template CSV
  const handleDownloadSampleTemplate = () => {
    const headers = [
      "Contact Name",
      "Contact Type",
      "Email",
      "Phone",
      "Address Line 1",
      "City",
      "Postcode",
      "Country",
      "Opening Balance",
      "Notes"
    ];

    const sampleRows = [
      ["Apex Global Solutions Ltd", "Customer", "contact@apexsolutions.co.uk", "02079460123", "45 High Street", "London", "EC1A 1BB", "United Kingdom", "1250.00", "Key enterprise client"],
      ["Office Supplies UK Ltd", "Supplier", "accounts@officesupplies.co.uk", "01614960890", "12 Trading Estate", "Manchester", "M1 4BT", "United Kingdom", "450.00", "Stationery vendor"],
      ["Green Energy Consulting", "Customer", "billing@greenenergy.co.uk", "01134960789", "88 Park Avenue", "Leeds", "LS1 2TP", "United Kingdom", "0.00", "Monthly retainer client"]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Sample_Contacts_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Contacts to CSV
  const handleExportCSV = () => {
    if (filteredContacts.length === 0) {
      toast({ title: "No Contacts", description: `No ${activeTab.toLowerCase()} records to export.` });
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === "Shareholder") {
      headers = ["Name", "Share Type", "No. of Shares", "Phone", "Email", "Country"];
      rows = filteredContacts.map(c => [
        c.name,
        c.shareType || "Equity",
        parseFloat(c.numberOfShares || "0").toFixed(2),
        c.phone || "",
        c.email || "",
        c.country || "United Kingdom",
      ]);
    } else if (activeTab === "Director") {
      headers = ["Name", "Designation", "Phone", "Email", "Country", "Active"];
      rows = filteredContacts.map(c => [
        c.name,
        c.designation || "Director",
        c.phone || "",
        c.email || "",
        c.country || "United Kingdom",
        c.isActive ? "Active" : "Inactive",
      ]);
    } else {
      headers = ["Type", "Contact Name", "Phone", "Email", "Active", "Recurring Email", "Balance", "Country"];
      rows = filteredContacts.map(c => [
        c.contactType,
        c.name,
        c.phone || "",
        c.email || "",
        c.isActive ? "Active" : "Inactive",
        c.recurringEmail ? "Yes" : "No",
        c.balance || "0.00",
        c.country || "United Kingdom",
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r: any[]) => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}s_Export_${client?.clientName?.replace(/\s+/g, "_") || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV file is empty or missing data rows.");
        }

        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        const rows: ParsedContactRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          if (cols.length === 0 || cols.every(c => !c)) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = cols[idx] || "";
          });

          const name = rowData["contactname"] || rowData["name"] || rowData["companyname"] || "";
          if (!name) continue;

          const contactType = rowData["contacttype"] || rowData["type"] || activeTab;
          const email = rowData["email"] || rowData["emailaddress"] || "";
          const phone = rowData["phone"] || rowData["phoneno"] || rowData["telephone"] || "";
          const addressLine1 = rowData["addressline1"] || rowData["address"] || "";
          const city = rowData["city"] || rowData["town"] || "";
          const postcode = rowData["postcode"] || rowData["postalcode"] || "";
          const country = rowData["country"] || "United Kingdom";
          const openingBalance = rowData["openingbalance"] || rowData["balance"] || "0.00";
          const notes = rowData["notes"] || rowData["memo"] || "";

          rows.push({
            contactType,
            name,
            email,
            phone,
            addressLine1,
            city,
            postcode,
            country,
            openingBalance,
            notes,
          });
        }

        if (rows.length === 0) {
          throw new Error("Could not extract any valid contact records from the file.");
        }

        setParsedRows(rows);
        setImportStep(3);
      } catch (err: any) {
        setParseError(err.message || "Failed to parse CSV file.");
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setParseError("Failed to read the uploaded file.");
      setIsProcessingFile(false);
    };

    reader.readAsText(file);
  };

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        
        {/* Top Breadcrumb */}
        <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-xs text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={13} className="mx-1 text-gray-400" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={13} className="mx-1 text-gray-400" />
            <span className="text-gray-800 font-medium">Contacts</span>
            <ChevronRight size={13} className="mx-1 text-gray-400" />
            <span className="text-purple-700 font-semibold">{activeTab}s</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-5">
          
          {/* Header Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Contact Directory</h1>
              <p className="text-gray-500 text-xs mt-0.5">Manage customers, suppliers, directors, and shareholder equity registers.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>+ {activeTab}</span>
              </button>

              {(activeTab === "Customer" || activeTab === "Supplier") && (
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setImportTab("import");
                    setImportStep(1);
                    setParsedRows([]);
                    setParseError(null);
                    setImportFileName("");
                  }}
                  className="px-3.5 py-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Upload size={14} />
                  <span>Import</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            
            {/* 4 Dedicated Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 px-4 pt-2 gap-1 overflow-x-auto">
              {(["Customer", "Supplier", "Director", "Shareholder"] as ContactTab[]).map(tab => {
                const count = contacts.filter(c => c.contactType === tab).length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-2.5 px-4 text-xs font-semibold rounded-t-xl border-t-2 border-x transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? "bg-white border-t-purple-600 border-x-gray-200 text-purple-700 shadow-2xs"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                    }`}
                  >
                    {tab === "Customer" && <Building2 size={14} />}
                    {tab === "Supplier" && <Briefcase size={14} />}
                    {tab === "Director" && <Shield size={14} />}
                    {tab === "Shareholder" && <Share2 size={14} />}
                    <span>{tab}s</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-purple-100 text-purple-800" : "bg-gray-200/80 text-gray-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filters Toolbar */}
            <div className="p-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder={`Search ${activeTab.toLowerCase()}s by name, email, phone...`}
                  className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>

              {activeTab === "Shareholder" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium">Share Type:</span>
                  <select
                    value={shareTypeFilter}
                    onChange={(e) => { setShareTypeFilter(e.target.value); setCurrentPage(1); }}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="All">All Share Types</option>
                    <option value="Equity">Equity</option>
                    <option value="Preference">Preference</option>
                    <option value="Ordinary">Ordinary</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dynamic Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                    {activeTab === "Customer" && (
                      <>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Contact Name</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3 text-center">Active</th>
                        <th className="px-5 py-3 text-center">Recurring Email</th>
                        <th className="px-5 py-3 text-right">Balance</th>
                        <th className="px-5 py-3 text-center">Action</th>
                      </>
                    )}

                    {activeTab === "Supplier" && (
                      <>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Contact Name</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3 text-center">Active</th>
                        <th className="px-5 py-3 text-right">Balance</th>
                        <th className="px-5 py-3 text-center">Action</th>
                      </>
                    )}

                    {activeTab === "Director" && (
                      <>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Designation</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Country</th>
                        <th className="px-5 py-3 text-center">Active</th>
                        <th className="px-5 py-3 text-center">Action</th>
                      </>
                    )}

                    {activeTab === "Shareholder" && (
                      <>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Share Type</th>
                        <th className="px-5 py-3 text-right">No. of Shares</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Country</th>
                        <th className="px-5 py-3 text-center">Action</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400">Loading {activeTab.toLowerCase()} records...</td>
                    </tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 bg-purple-50 text-purple-400 rounded-full flex items-center justify-center mb-3">
                            <Users size={24} />
                          </div>
                          <p className="text-sm font-semibold text-gray-700">No {activeTab.toLowerCase()} contacts found</p>
                          <p className="text-xs text-gray-400 max-w-sm mt-0.5 mb-4">
                            Click the button below to add your first {activeTab.toLowerCase()} or import records from CSV.
                          </p>
                          <button
                            onClick={handleOpenCreate}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            <span>Add {activeTab}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map(c => {
                      const bal = parseFloat(c.balance || "0") || 0;
                      return (
                        <tr key={c.id} className="hover:bg-purple-50/20 transition-colors">
                          
                          {/* CUSTOMERS ROW */}
                          {activeTab === "Customer" && (
                            <>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-medium">
                                  Customer
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-medium">
                                <button
                                  onClick={() => setSelectedStatementContact(c)}
                                  className="text-purple-600 hover:text-purple-800 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                  <span>{c.name}</span>
                                  <ExternalLink size={12} className="opacity-60" />
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{c.phone || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.email || "—"}</td>
                              <td className="px-5 py-3.5 text-center">
                                {c.isActive !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={11} /> Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {c.recurringEmail !== false ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    Enabled
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                    Disabled
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold">
                                <button
                                  onClick={() => setSelectedStatementContact(c)}
                                  className={`hover:underline cursor-pointer ${bal > 0 ? "text-amber-700 font-bold" : "text-gray-700"}`}
                                >
                                  £{bal.toFixed(2)}
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEdit(c)}
                                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Edit Customer"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedStatementContact(c)}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View Statement & Ledger"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${c.name}?`)) {
                                        deleteContactMutation.mutate(c.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Customer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}

                          {/* SUPPLIERS ROW */}
                          {activeTab === "Supplier" && (
                            <>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium">
                                  Supplier
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-medium">
                                <button
                                  onClick={() => setSelectedStatementContact(c)}
                                  className="text-purple-600 hover:text-purple-800 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                  <span>{c.name}</span>
                                  <ExternalLink size={12} className="opacity-60" />
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{c.phone || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.email || "—"}</td>
                              <td className="px-5 py-3.5 text-center">
                                {c.isActive !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={11} /> Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold">
                                <button
                                  onClick={() => setSelectedStatementContact(c)}
                                  className={`hover:underline cursor-pointer ${bal > 0 ? "text-red-700 font-bold" : "text-gray-700"}`}
                                >
                                  £{bal.toFixed(2)}
                                </button>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEdit(c)}
                                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Edit Supplier"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedStatementContact(c)}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View Statement & Ledger"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${c.name}?`)) {
                                        deleteContactMutation.mutate(c.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Supplier"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}

                          {/* DIRECTORS ROW */}
                          {activeTab === "Director" && (
                            <>
                              <td className="px-5 py-3.5 font-semibold text-purple-700">{c.name}</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-medium">
                                  {c.designation || "Director"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{c.phone || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.email || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.country || "United Kingdom"}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={11} /> Active
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEdit(c)}
                                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Edit Director"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete Director ${c.name}?`)) {
                                        deleteContactMutation.mutate(c.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Director"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}

                          {/* SHAREHOLDERS ROW */}
                          {activeTab === "Shareholder" && (
                            <>
                              <td className="px-5 py-3.5 font-semibold text-purple-700">{c.name}</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium">
                                  {c.shareType || "Equity"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-800">
                                {parseFloat(c.numberOfShares || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{c.phone || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.email || "—"}</td>
                              <td className="px-5 py-3.5 text-gray-600">{c.country || "United Kingdom"}</td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => makeDirectorMutation.mutate(c.id)}
                                    disabled={makeDirectorMutation.isPending}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Promote to Director"
                                  >
                                    <Shield size={11} />
                                    <span>Make Director</span>
                                  </button>
                                  <button
                                    onClick={() => handleEdit(c)}
                                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Edit Shareholder"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete Shareholder ${c.name}?`)) {
                                        deleteContactMutation.mutate(c.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Shareholder"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Grand Total Footer for Shareholders */}
                {activeTab === "Shareholder" && paginatedContacts.length > 0 && (
                  <tfoot>
                    <tr className="bg-purple-50/50 border-t-2 border-purple-200 font-bold text-gray-800">
                      <td className="px-5 py-3 uppercase tracking-wider">Grand Total</td>
                      <td className="px-5 py-3 text-purple-700">All Equity</td>
                      <td className="px-5 py-3 text-right font-mono text-purple-900 text-sm">
                        {totalSharesCount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={4} className="px-5 py-3 text-gray-500 text-[11px] font-normal">
                        Total shares registered across active shareholders
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination & Summary Bar */}
            <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  entries &middot; Showing {totalEntries > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} {activeTab.toLowerCase()}s
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  &laquo; First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  &lt; Previous
                </button>
                <span className="px-3 py-1 font-semibold text-purple-700 bg-purple-50 rounded border border-purple-200">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next &gt;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Last &raquo;
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ADD / EDIT CONTACT MODAL */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      {editingContact ? `Edit ${formData.contactType}` : `Add New ${formData.contactType}`}
                    </h3>
                    <p className="text-xs text-gray-500">Enter personal, address, and financial details.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveContactMutation.mutate(formData);
                }}
                className="overflow-y-auto p-6 space-y-5 flex-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* LEFT COLUMN: Identity & Address */}
                  <div className="space-y-3.5">
                    <h4 className="font-semibold text-gray-800 text-xs flex items-center gap-1.5 border-b pb-1.5 text-purple-700">
                      <Building2 size={13} /> General & Address Details
                    </h4>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Contact Type *</label>
                      <select
                        value={formData.contactType}
                        onChange={(e) => setFormData({ ...formData, contactType: e.target.value as ContactTab })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="Customer">Customer</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Director">Director</option>
                        <option value="Shareholder">Shareholder</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Contact Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Apex Global Ltd or John Smith"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    {formData.contactType === "Director" && (
                      <div>
                        <label className="block text-gray-600 font-medium mb-1">Designation</label>
                        <input
                          type="text"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          placeholder="e.g. Managing Director / Secretary"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {formData.contactType === "Shareholder" && (
                      <div className="grid grid-cols-2 gap-2 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                        <div>
                          <label className="block text-gray-600 font-medium mb-1">Share Type</label>
                          <input
                            type="text"
                            value={formData.shareType}
                            onChange={(e) => setFormData({ ...formData, shareType: e.target.value })}
                            placeholder="Equity / Ordinary"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 font-medium mb-1">No. of Shares</label>
                          <input
                            type="number"
                            step="any"
                            value={formData.numberOfShares}
                            onChange={(e) => setFormData({ ...formData, numberOfShares: e.target.value })}
                            placeholder="1000.00"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                        placeholder="Street address or building number"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        placeholder="Suite, unit, floor"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-600 font-medium mb-1">City / Town</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="City"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-medium mb-1">Postcode</label>
                        <input
                          type="text"
                          value={formData.postcode}
                          onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                          placeholder="e.g. W1A 1AA"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Country *</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="United Kingdom"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    {(formData.contactType === "Customer" || formData.contactType === "Supplier") && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                        <label className="block text-amber-900 font-semibold mb-1">Opening Balance (£)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.openingBalance}
                            onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                            placeholder="0.00"
                            className="border border-amber-300 rounded-lg px-3 py-1.5 text-xs bg-white"
                          />
                          <input
                            type="date"
                            value={formData.openingBalanceDate}
                            onChange={(e) => setFormData({ ...formData, openingBalanceDate: e.target.value })}
                            className="border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-amber-700 mt-1">Recorded as initial ledger balance on period migration.</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Contact, Status & Banking */}
                  <div className="space-y-3.5">
                    <h4 className="font-semibold text-gray-800 text-xs flex items-center gap-1.5 border-b pb-1.5 text-purple-700">
                      <Mail size={13} /> Communication & Banking
                    </h4>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="accounts@example.com"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="020 7946 0000"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">VAT Registration No.</label>
                      <input
                        type="text"
                        value={formData.vatNumber}
                        onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                        placeholder="GB 123 4567 89"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-5 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-medium text-gray-700">Active Record</span>
                      </label>

                      {formData.contactType === "Customer" && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.recurringEmail}
                            onChange={(e) => setFormData({ ...formData, recurringEmail: e.target.checked })}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-medium text-gray-700">Recurring Email</span>
                        </label>
                      )}
                    </div>

                    {/* Banking Information */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5 text-xs">
                        <CreditCard size={13} className="text-purple-600" /> Banking Information
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-500 text-[11px] mb-0.5">Sort / Branch Code</label>
                          <input
                            type="text"
                            value={formData.sortCode}
                            onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
                            placeholder="00-00-00"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[11px] mb-0.5">Account Number</label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="12345678"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-500 text-[11px] mb-0.5">IBAN</label>
                        <input
                          type="text"
                          value={formData.iban}
                          onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                          placeholder="GB00 BARC 2000 0012 3456 78"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Notes</label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Internal instructions or delivery memo..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveContactMutation.isPending}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {saveContactMutation.isPending ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Contact</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* 3-STEP CSV IMPORT MODAL */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Upload size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Import Contacts</h3>
                    <p className="text-xs text-gray-500">Batch upload customers and suppliers via standardized CSV.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-200 px-6 bg-gray-50/50">
                <button
                  onClick={() => setImportTab("import")}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    importTab === "import"
                      ? "border-purple-600 text-purple-700 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <FileSpreadsheet size={14} />
                  <span>Import Contacts</span>
                </button>
                <button
                  onClick={() => setImportTab("history")}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    importTab === "history"
                      ? "border-purple-600 text-purple-700 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <History size={14} />
                  <span>Import History</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {importTab === "import" ? (
                  <>
                    {/* Stepper Wizard */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 1 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : importStep > 1 
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800" 
                            : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {importStep > 1 ? (
                            <CheckCircle2 size={15} className="text-emerald-600" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                          )}
                          <span className="text-xs font-semibold">Download Template</span>
                        </div>
                        <p className="text-[11px] opacity-80">Use standard CSV with customer/supplier columns</p>
                      </div>

                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 2 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : importStep > 2 
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800" 
                            : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {importStep > 2 ? (
                            <CheckCircle2 size={15} className="text-emerald-600" />
                          ) : (
                            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                              importStep === 2 ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-600"
                            }`}>2</span>
                          )}
                          <span className="text-xs font-semibold">Upload CSV</span>
                        </div>
                        <p className="text-[11px] opacity-80">Drag and drop file for parsing</p>
                      </div>

                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 3 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                            importStep === 3 ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-600"
                          }`}>3</span>
                          <span className="text-xs font-semibold">Preview & Commit</span>
                        </div>
                        <p className="text-[11px] opacity-80">Verify contacts & import</p>
                      </div>
                    </div>

                    {importStep < 3 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div>
                            <h4 className="text-xs font-bold text-gray-800">Sample Contacts CSV Template</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Compatible with Customers and Suppliers in a single file.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadSampleTemplate}
                            className="px-3 py-1.5 bg-white border border-gray-300 hover:border-purple-400 hover:text-purple-600 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Download Template</span>
                          </button>
                        </div>

                        {/* File Dropzone */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/40 rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv,text/csv"
                            className="hidden"
                          />
                          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mb-2 shadow-inner">
                            <Upload size={22} />
                          </div>
                          <h4 className="text-xs font-bold text-gray-800 mb-0.5">Click to browse or drag CSV file here</h4>
                          <p className="text-[11px] text-gray-400 max-w-sm mb-2">Upload formatted CSV matching the template columns</p>
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-md shadow-2xs">
                            Select CSV File
                          </span>
                        </div>

                        {parseError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{parseError}</span>
                          </div>
                        )}

                        {/* Available Fields Reference */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                          <div className="bg-gray-100/70 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                            <HelpCircle size={14} className="text-gray-500" />
                            <h5 className="font-semibold text-gray-700 text-xs">Available CSV Fields Guide</h5>
                          </div>
                          <div className="p-3 bg-white overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-gray-100 text-gray-400 font-medium">
                                  <th className="pb-1.5">Field Name</th>
                                  <th className="pb-1.5">Required</th>
                                  <th className="pb-1.5">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-gray-600">
                                <tr>
                                  <td className="py-1.5 font-semibold text-purple-700">Contact Name</td>
                                  <td><span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">YES</span></td>
                                  <td>Full trading name of customer or supplier</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-purple-700">Contact Type</td>
                                  <td>Optional</td>
                                  <td>Customer or Supplier (defaults to {activeTab})</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-gray-700">Email</td>
                                  <td>Optional</td>
                                  <td>Official contact email address</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-gray-700">Phone</td>
                                  <td>Optional</td>
                                  <td>Telephone number</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-gray-700">Country</td>
                                  <td>Optional</td>
                                  <td>Country of customer/supplier (default United Kingdom)</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-gray-700">Opening Balance</td>
                                  <td>Optional</td>
                                  <td>Initial ledger balance due (£)</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Preview */}
                    {importStep === 3 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet size={18} className="text-purple-700" />
                            <div>
                              <span className="text-xs font-bold text-gray-800">{importFileName}</span>
                              <p className="text-[11px] text-purple-700 font-medium">
                                Found {parsedRows.length} contacts ready to import
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setParsedRows([]);
                              setImportFileName("");
                              setImportStep(2);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer"
                          >
                            Change File
                          </button>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                              <tr className="text-[11px] text-gray-500 font-semibold uppercase">
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Phone</th>
                                <th className="px-3 py-2 text-right">Opening Bal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                              {parsedRows.map((r, i) => (
                                <tr key={i} className="hover:bg-purple-50/20">
                                  <td className="px-3 py-2 font-semibold text-purple-700">{r.name}</td>
                                  <td className="px-3 py-2">{r.contactType}</td>
                                  <td className="px-3 py-2 text-gray-500">{r.email || "—"}</td>
                                  <td className="px-3 py-2 text-gray-500">{r.phone || "—"}</td>
                                  <td className="px-3 py-2 text-right font-mono">£{parseFloat(r.openingBalance || "0").toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* History Tab */
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2.5">
                      <History size={22} />
                    </div>
                    <h4 className="text-xs font-bold text-gray-700">No Import History</h4>
                    <p className="text-xs text-gray-400 max-w-sm mt-0.5">
                      Previously imported CSV files and upload logs will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {importTab === "import" && importStep === 3 && (
                  <button
                    type="button"
                    onClick={() => importContactsMutation.mutate(parsedRows)}
                    disabled={importContactsMutation.isPending || parsedRows.length === 0}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {importContactsMutation.isPending ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Importing Contacts...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm & Import ({parsedRows.length} Contacts)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* CONTACT LEDGER STATEMENT DRAWER / MODAL */}
        {selectedStatementContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-2xs p-0 animate-in fade-in duration-200">
            <div className="bg-white h-full w-full max-w-2xl shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden">
              
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50/80 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{selectedStatementContact.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedStatementContact.contactType} Account Statement & Transaction Ledger
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStatementContact(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
                
                {/* 3 Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200">
                    <span className="text-[11px] text-purple-700 font-medium">Opening Balance</span>
                    <h4 className="text-base font-bold text-purple-900 mt-1">
                      £{parseFloat(selectedStatementContact.openingBalance || "0").toFixed(2)}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Initial migrated balance</p>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                    <span className="text-[11px] text-amber-700 font-medium">Unpaid Transactions</span>
                    <h4 className="text-base font-bold text-amber-900 mt-1">
                      £{statementData?.accountStatus?.totalDue ? (parseFloat(statementData.accountStatus.totalDue) - parseFloat(selectedStatementContact.openingBalance || "0")).toFixed(2) : "0.00"}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Active invoices / bills</p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 font-medium">Total Ledger Due</span>
                    <h4 className="text-base font-bold text-emerald-900 mt-1">
                      £{statementData?.accountStatus?.balance || selectedStatementContact.balance || "0.00"}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Net balance outstanding</p>
                  </div>
                </div>

                {/* Contact Card Details */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Contact Info</span>
                    <p className="text-xs text-gray-700 font-medium">
                      Email: {selectedStatementContact.email || "—"} &middot; Phone: {selectedStatementContact.phone || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Address: {[selectedStatementContact.addressLine1, selectedStatementContact.city, selectedStatementContact.postcode, selectedStatementContact.country].filter(Boolean).join(", ") || "No address on file"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const contactToEdit = selectedStatementContact;
                      setSelectedStatementContact(null);
                      handleEdit(contactToEdit);
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:border-purple-400 hover:text-purple-600 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Transaction Ledger Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <FileSpreadsheet size={14} className="text-purple-600" /> Recent Transactions
                    </h4>
                    <span className="text-[11px] text-gray-400">
                      {statementData?.transactions?.length || 0} record(s)
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] font-semibold uppercase">
                        <tr>
                          <th className="px-3.5 py-2.5">Date</th>
                          <th className="px-3.5 py-2.5">Ref No.</th>
                          <th className="px-3.5 py-2.5">Type</th>
                          <th className="px-3.5 py-2.5 text-right">Amount</th>
                          <th className="px-3.5 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {isLoadingStatement ? (
                          <tr><td colSpan={5} className="text-center py-6 text-gray-400">Loading ledger...</td></tr>
                        ) : !statementData?.transactions || statementData.transactions.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-gray-400">No recorded invoices or bills for this contact.</td></tr>
                        ) : (
                          statementData.transactions.map((tx: any, idx: number) => (
                            <tr key={idx} className="hover:bg-purple-50/20">
                              <td className="px-3.5 py-2 text-gray-600">
                                {tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "—"}
                              </td>
                              <td className="px-3.5 py-2 font-medium text-purple-700">{tx.refNo}</td>
                              <td className="px-3.5 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  tx.type === "Invoice" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 text-right font-bold text-gray-800">£{tx.amount}</td>
                              <td className="px-3.5 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  tx.status === "Paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {tx.status || "Unpaid"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStatementContact(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
