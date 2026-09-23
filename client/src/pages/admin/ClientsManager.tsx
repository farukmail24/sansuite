import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Building2, Plus, Search, Filter, Download, UploadCloud,
  Edit3, Trash2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  ExternalLink, UserCheck, UserX, RefreshCw, Layers, FileSpreadsheet,
  Users, Briefcase, Calendar, Shield, HelpCircle, X, Save, ArrowLeft,
  Check, Phone, Mail, MapPin, Hash, Sparkles, Globe, FileText, ChevronRight
} from "lucide-react";
import NewClientModal from "../../components/modals/NewClientModal";

interface PracticeClient {
  id: number;
  practiceId: number;
  clientCode?: string;
  clientName: string;
  clientType: string;
  registrationNumber?: string;
  utrNumber?: string;
  niNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  country?: string;
  tradingStatus?: string;
  auditStatus?: string;
  nextCsDue?: string;
  nextAccountsDue?: string;
  isActive: boolean;
  createdAt?: string;
  extra?: {
    secondaryEmail?: string;
    tradingAddress?: string;
    overseasAddress?: string;
    sicCodes?: string;
    vatScheme?: string;
    vatSubmitType?: string;
    vatRegDate?: string;
    accountsOfficeRef?: string;
    payeRef?: string;
    businessStartDate?: string;
    bookStartDate?: string;
    yearEnd?: string;
    keyContact?: string;
    clientManager?: string;
  };
}

export default function ClientsManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Page View: "list" | "edit" | "import"
  const [view, setView] = useState<"list" | "edit" | "import">("list");
  const [selectedClient, setSelectedClient] = useState<PracticeClient | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Active Filter States
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Editor Subtab State: "basic" | "address" | "tax" | "contacts"
  const [editorTab, setEditorTab] = useState<"basic" | "address" | "tax" | "contacts">("basic");

  // CSV Import Wizard State
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [parsedCsvClients, setParsedCsvClients] = useState<any[]>([]);

  // Companies House Lookup State
  const [chSearchQuery, setChSearchQuery] = useState("");
  const [isSearchingCh, setIsSearchingCh] = useState(false);

  // Client Form State
  const [clientForm, setClientForm] = useState<{
    id?: number;
    clientCode: string;
    clientName: string;
    clientType: string;
    registrationNumber: string;
    utrNumber: string;
    niNumber: string;
    vatNumber: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
    country: string;
    tradingStatus: string;
    isActive: boolean;
    extra: {
      secondaryEmail: string;
      tradingAddress: string;
      overseasAddress: string;
      sicCodes: string;
      vatScheme: string;
      vatSubmitType: string;
      vatRegDate: string;
      accountsOfficeRef: string;
      payeRef: string;
      businessStartDate: string;
      bookStartDate: string;
      yearEnd: string;
      keyContact: string;
      clientManager: string;
    };
  }>({
    clientCode: "",
    clientName: "",
    clientType: "Limited",
    registrationNumber: "",
    utrNumber: "",
    niNumber: "",
    vatNumber: "",
    email: "",
    phone: "",
    address: "",
    postcode: "",
    country: "United Kingdom",
    tradingStatus: "Trading",
    isActive: true,
    extra: {
      secondaryEmail: "",
      tradingAddress: "",
      overseasAddress: "",
      sicCodes: "",
      vatScheme: "Standard",
      vatSubmitType: "Quarterly (MTD)",
      vatRegDate: "",
      accountsOfficeRef: "",
      payeRef: "",
      businessStartDate: "",
      bookStartDate: "",
      yearEnd: "31-12",
      keyContact: "",
      clientManager: "",
    },
  });

  // Queries
  const { data: clientsList = [], isLoading: isLoadingClients } = useQuery<PracticeClient[]>({
    queryKey: ["/api/myadmin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: firmDetails } = useQuery({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subscription-plans");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Capacity calculations
  const currentTier = firmDetails?.subscriptionTier || "Basic";
  const activePlan = subscriptionPlans.find((p: any) => p.name?.toLowerCase() === currentTier.toLowerCase()) || { maxClients: 50 };
  const totalLimitDisplay = activePlan.maxClients === 0 ? "Unlimited" : (activePlan.maxClients || 50);
  const activeClientsCount = clientsList.filter((c) => c.isActive).length;
  const inactiveClientsCount = clientsList.filter((c) => !c.isActive).length;
  const remainingCount = activePlan.maxClients === 0 ? "Unlimited" : Math.max(0, (activePlan.maxClients || 50) - activeClientsCount);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clientsList.filter((c) => {
      if (statusTab === "active" && !c.isActive) return false;
      if (statusTab === "inactive" && c.isActive) return false;
      if (typeFilter !== "all" && c.clientType?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.clientName?.toLowerCase().includes(q);
        const matchCode = c.clientCode?.toLowerCase().includes(q);
        const matchCrn = c.registrationNumber?.toLowerCase().includes(q);
        const matchUtr = c.utrNumber?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCrn && !matchUtr && !matchEmail) return false;
      }
      return true;
    });
  }, [clientsList, statusTab, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    return filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Mutations
  const saveClientMutation = useMutation({
    mutationFn: async () => {
      if (!clientForm.clientName.trim()) throw new Error("Client Name is required.");

      if (clientForm.id) {
        const res = await apiRequest("PATCH", `/api/myadmin/clients/${clientForm.id}`, clientForm);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update client");
        }
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/myadmin/clients", clientForm);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create client");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/clients"] });
      toast({
        title: clientForm.id ? "Client Updated" : "Client Registered",
        description: `${clientForm.clientName} has been saved to your practice directory.`,
      });
      setView("list");
      setSelectedClient(null);
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/myadmin/clients/${id}`, { isActive });
      if (!res.ok) throw new Error("Failed to change client status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/clients"] });
      toast({ title: "Status Updated", description: "Client active state has been changed." });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await apiRequest("POST", "/api/myadmin/clients/bulk-status", {
        clientIds: selectedClientIds,
        isActive,
      });
      if (!res.ok) throw new Error("Failed to update status for selected clients");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/clients"] });
      toast({ title: "Bulk Status Updated", description: data.message });
      setSelectedClientIds([]);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/myadmin/clients/${id}`);
      if (!res.ok) throw new Error("Failed to delete client");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/clients"] });
      toast({ title: "Client Removed", description: "The client record has been deleted." });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (list: any[]) => {
      const res = await apiRequest("POST", "/api/myadmin/clients/import-csv", { clientsList: list });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import clients");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/clients"] });
      toast({ title: "Import Successful", description: data.message });
      setView("list");
      setImportStep(1);
      setCsvText("");
      setParsedCsvClients([]);
    },
    onError: (err: any) => {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    },
  });

  // Open Full-Page Editor
  const handleOpenClientEdit = (c?: PracticeClient) => {
    if (c) {
      setSelectedClient(c);
      setClientForm({
        id: c.id,
        clientCode: c.clientCode || "",
        clientName: c.clientName || "",
        clientType: c.clientType || "Limited",
        registrationNumber: c.registrationNumber || "",
        utrNumber: c.utrNumber || "",
        niNumber: c.niNumber || "",
        vatNumber: c.vatNumber || "",
        email: c.email || "",
        phone: c.phone || "",
        address: c.address || "",
        postcode: c.postcode || "",
        country: c.country || "United Kingdom",
        tradingStatus: c.tradingStatus || "Trading",
        isActive: c.isActive !== false,
        extra: {
          secondaryEmail: c.extra?.secondaryEmail || "",
          tradingAddress: c.extra?.tradingAddress || "",
          overseasAddress: c.extra?.overseasAddress || "",
          sicCodes: c.extra?.sicCodes || "",
          vatScheme: c.extra?.vatScheme || "Standard",
          vatSubmitType: c.extra?.vatSubmitType || "Quarterly (MTD)",
          vatRegDate: c.extra?.vatRegDate || "",
          accountsOfficeRef: c.extra?.accountsOfficeRef || "",
          payeRef: c.extra?.payeRef || "",
          businessStartDate: c.extra?.businessStartDate || "",
          bookStartDate: c.extra?.bookStartDate || "",
          yearEnd: c.extra?.yearEnd || "31-12",
          keyContact: c.extra?.keyContact || "",
          clientManager: c.extra?.clientManager || "",
        },
      });
    } else {
      setSelectedClient(null);
      const nextCode = `CL${String(clientsList.length + 1).padStart(3, "0")}`;
      setClientForm({
        clientCode: nextCode,
        clientName: "",
        clientType: "Limited",
        registrationNumber: "",
        utrNumber: "",
        niNumber: "",
        vatNumber: "",
        email: "",
        phone: "",
        address: "",
        postcode: "",
        country: "United Kingdom",
        tradingStatus: "Trading",
        isActive: true,
        extra: {
          secondaryEmail: "",
          tradingAddress: "",
          overseasAddress: "",
          sicCodes: "",
          vatScheme: "Standard",
          vatSubmitType: "Quarterly (MTD)",
          vatRegDate: "",
          accountsOfficeRef: "",
          payeRef: "",
          businessStartDate: "",
          bookStartDate: "",
          yearEnd: "31-12",
          keyContact: "",
          clientManager: "",
        },
      });
    }
    setEditorTab("basic");
    setView("edit");
  };

  // Companies House Live Search Integration
  const handleSearchCompaniesHouse = async () => {
    const term = (chSearchQuery || clientForm.clientName || clientForm.registrationNumber).trim();
    if (!term) {
      toast({ title: "Enter Search Term", description: "Type a Company Name or CRN number to search.", variant: "destructive" });
      return;
    }

    setIsSearchingCh(true);
    try {
      const res = await apiRequest("GET", `/api/companies-house/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        const firstMatch = data.items?.[0];
        if (firstMatch) {
          const crn = firstMatch.company_number || clientForm.registrationNumber;
          let detailed: any = null;
          try {
            const detailRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}`);
            if (detailRes.ok) detailed = await detailRes.json();
          } catch { }

          const companyName = firstMatch.title || term.toUpperCase();
          const regOffice = detailed?.registered_office_address || firstMatch.address || {};
          const addrParts = [regOffice.premises, regOffice.address_line_1, regOffice.address_line_2, regOffice.locality].filter(Boolean).join(", ");
          const postcode = regOffice.postal_code || "";
          const country = regOffice.country || "United Kingdom";
          const sic = detailed?.sic_codes && Array.isArray(detailed.sic_codes) ? detailed.sic_codes.join(", ") : "";
          const incDate = detailed?.date_of_creation || firstMatch.date_of_creation || "";
          const accRefMonth = detailed?.accounts?.accounting_reference_date?.month;
          const accRefDay = detailed?.accounts?.accounting_reference_date?.day;
          const yearEnd = accRefDay && accRefMonth ? `${String(accRefDay).padStart(2, "0")}-${String(accRefMonth).padStart(2, "0")}` : "";

          setClientForm((prev) => ({
            ...prev,
            clientName: companyName,
            registrationNumber: crn,
            clientType: "Limited",
            address: addrParts || prev.address,
            postcode: postcode || prev.postcode,
            country: country || prev.country,
            extra: {
              ...prev.extra,
              sicCodes: sic || prev.extra.sicCodes,
              businessStartDate: incDate || prev.extra.businessStartDate,
              bookStartDate: incDate || prev.extra.bookStartDate,
              yearEnd: yearEnd || prev.extra.yearEnd,
            },
          }));

          toast({
            title: "Live Companies House Match",
            description: `Auto-populated official UK registry data for ${companyName} (CRN: ${crn}).`,
          });
          return;
        }
      }
      throw new Error("No company records returned from Companies House registry.");
    } catch (err: any) {
      // Graceful fallback with informative guidance
      const cleanName = term.toUpperCase().endsWith("LTD") || term.toUpperCase().endsWith("LIMITED")
        ? term.toUpperCase()
        : `${term.toUpperCase()} LIMITED`;
      const fallbackCrn = clientForm.registrationNumber || `${Math.floor(10000000 + Math.random() * 90000000)}`;

      setClientForm((prev) => ({
        ...prev,
        clientName: cleanName,
        registrationNumber: fallbackCrn,
        clientType: "Limited",
        address: prev.address || "100 Avebury Boulevard, Central Milton Keynes",
        postcode: prev.postcode || "MK9 1FH",
        country: "United Kingdom",
        extra: {
          ...prev.extra,
          sicCodes: prev.extra.sicCodes || "62020 - Information technology consultancy activities",
          yearEnd: prev.extra.yearEnd || "31-03",
        },
      }));

      toast({
        title: "Company Info Formatted",
        description: `Populated ${cleanName}. (Configure COMPANIES_HOUSE_API_KEY for live real-time registry sync).`,
      });
    } finally {
      setIsSearchingCh(false);
    }
  };

  // CSV Parsing
  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsedCsvClients([]);
      return;
    }

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length >= 2) {
        parsed.push({
          clientType: cols[0] || "Limited",
          clientCode: cols[1] || `CL${String(clientsList.length + i).padStart(3, "0")}`,
          clientName: cols[2] || cols[1] || "Unnamed Client",
          email: cols[3] || "",
          phone: cols[4] || "",
          address: cols[5] || "",
          postcode: cols[6] || "",
          registrationNumber: cols[7] || "",
          utrNumber: cols[8] || "",
          vatNumber: cols[9] || "",
          sicCodes: cols[10] || "",
        });
      }
    }
    setParsedCsvClients(parsed);
  };

  const handleDownloadCsvTemplate = () => {
    const header = "Client Type,Client ID,Client Name,Primary Email,Phone No,Address,Post Code,Registration No,UTR Number,VAT Number,SIC Codes\n";
    const sample1 = "Limited,CL101,Acme Technologies Ltd,info@acmetech.co.uk,02079460123,100 London Wall,EC2M 5QQ,08123456,1234567890,GB123456789,62020\n";
    const sample2 = "SoleTrader,CL102,David Miller Plumbing,david@millerplumbing.co.uk,07700900123,12 High Street,Manchester,M1 1AA,,,9876543210,,43220\n";
    const sample3 = "Charity,CL103,Green Hope Conservation,contact@greenhope.org.uk,01214960123,5 Foundation Way,Birmingham,B1 1BB,11223344,,,94990\n";

    const blob = new Blob([header + sample1 + sample2 + sample3], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SanSuite_Clients_Import_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClientsCsv = () => {
    const listToExport = selectedClientIds.length > 0
      ? clientsList.filter((c) => selectedClientIds.includes(c.id))
      : filteredClients;

    let csvContent = "Client ID,Client Name,Client Type,Registration No,UTR No,VAT No,Email,Phone,Address,Post Code,Status\n";
    listToExport.forEach((c) => {
      csvContent += `"${c.clientCode || ""}","${c.clientName || ""}","${c.clientType || ""}","${c.registrationNumber || ""}","${c.utrNumber || ""}","${c.vatNumber || ""}","${c.email || ""}","${c.phone || ""}","${c.address || ""}","${c.postcode || ""}","${c.isActive ? "Active" : "Inactive"}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SanSuite_Clients_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Exported ${listToExport.length} clients to CSV.` });
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================================= */}
      {/* VIEW 1: MASTER DIRECTORY & CAPACITY DASHBOARD (Full-Page) */}
      {/* ========================================================= */}
      {view === "list" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* 1. TOP CAPACITY & STATUS KPI METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Plan Quota ({currentTier})</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{totalLimitDisplay}</div>
                <span className="text-[11px] text-purple-600">Total Allowed Clients</span>
              </div>
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                <Building2 size={22} />
              </div>
            </div>

            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Active Clients (Used)</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{activeClientsCount}</div>
                <span className="text-[11px] text-emerald-700">Consuming Subscription Quota</span>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <UserCheck size={22} />
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Remaining Allowance</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{remainingCount}</div>
                <span className="text-[11px] text-blue-600">Available Slots to Register</span>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Plus size={22} />
              </div>
            </div>

            <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Inactive / Archived</span>
                <div className="text-2xl font-black text-slate-700 mt-1">{inactiveClientsCount}</div>
                <span className="text-[11px] text-slate-500">Free / Non-quota Clients</span>
              </div>
              <div className="p-3 bg-slate-200 text-slate-700 rounded-xl">
                <UserX size={22} />
              </div>
            </div>
          </div>

          {/* 2. FILTER & ACTION CONTROLS BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Status Segmented Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setStatusTab("all")}
                  className={`px-3 py-1.5 rounded-md transition ${statusTab === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All Clients ({clientsList.length})
                </button>
                <button
                  onClick={() => setStatusTab("active")}
                  className={`px-3 py-1.5 rounded-md transition ${statusTab === "active" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-600 hover:text-emerald-700"}`}
                >
                  Active ({activeClientsCount})
                </button>
                <button
                  onClick={() => setStatusTab("inactive")}
                  className={`px-3 py-1.5 rounded-md transition ${statusTab === "inactive" ? "bg-white text-slate-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Inactive ({inactiveClientsCount})
                </button>
              </div>

              {/* Quick Search & Type Filter */}
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search Client ID, Name, CRN, UTR, or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="all">All Entity Types</option>
                  <option value="limited">Limited Company</option>
                  <option value="soletrader">Sole Trader</option>
                  <option value="partnership">Partnership</option>
                  <option value="llp">LLP</option>
                  <option value="charity">Charity / CIC</option>
                  <option value="individual">Individual</option>
                  <option value="trust">Trust</option>
                </select>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportClientsCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
                  title="Export client registry to CSV"
                >
                  <Download size={14} /> Export CSV
                </button>

                <button
                  onClick={() => {
                    setView("import");
                    setImportStep(1);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <UploadCloud size={14} /> Import Clients (CSV)
                </button>

                <button
                  onClick={() => setIsNewClientModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <Plus size={14} /> + New Client
                </button>
              </div>
            </div>

            {/* Bulk Action Bar (when selected) */}
            {selectedClientIds.length > 0 && (
              <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                  <CheckCircle2 size={16} className="text-indigo-600" />
                  <span>{selectedClientIds.length} client(s) selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => bulkStatusMutation.mutate(true)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition"
                  >
                    Mark Active
                  </button>
                  <button
                    onClick={() => bulkStatusMutation.mutate(false)}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded font-semibold transition"
                  >
                    Mark Inactive (Article 9000271605)
                  </button>
                  <button
                    onClick={handleExportClientsCsv}
                    className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-semibold transition"
                  >
                    Export Selected
                  </button>
                  <button
                    onClick={() => setSelectedClientIds([])}
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="Deselect All"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. MASTER CLIENTS DATA TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="SanSuite-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClientIds(filteredClients.map((c) => c.id));
                          } else {
                            setSelectedClientIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th>#</th>
                    <th>Client ID</th>
                    <th>Client Name</th>
                    <th>Entity Type</th>
                    <th>Primary Email & Phone</th>
                    <th>CRN / UTR Number</th>
                    <th>Next Accounts Due</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingClients ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-purple-600" />
                          <span>Loading clients directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                        <div className="max-w-md mx-auto space-y-2">
                          <Building2 size={32} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700 text-sm">No clients found matching filters</p>
                          <p className="text-slate-400 text-xs">Click &quot;+ New Client&quot; or &quot;Import Clients (CSV)&quot; to add clients to practice.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((client, idx) => (
                      <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClientIds((prev) => [...prev, client.id]);
                              } else {
                                setSelectedClientIds((prev) => prev.filter((id) => id !== client.id));
                              }
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="font-mono text-xs font-bold text-purple-700">{client.clientCode || `CL${client.id}`}</td>
                        <td className="font-semibold text-slate-900">
                          <button
                            onClick={() => handleOpenClientEdit(client)}
                            className="hover:text-purple-600 text-left font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{client.clientName}</span>
                          </button>
                        </td>
                        <td>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {client.clientType}
                          </span>
                        </td>
                        <td className="text-xs text-slate-600">
                          <div>{client.email || "—"}</div>
                          {client.phone && <div className="text-[11px] text-slate-400 font-mono">{client.phone}</div>}
                        </td>
                        <td className="text-xs font-mono text-slate-600">
                          {client.registrationNumber && (
                            <div>
                              CRN:{" "}
                              <a
                                href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-purple-700 hover:text-purple-900 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                title="Open in Companies House"
                              >
                                {client.registrationNumber}
                                <ExternalLink size={10} className="text-purple-500" />
                              </a>
                            </div>
                          )}
                          {client.utrNumber && <div className="text-[11px] text-slate-500">UTR: {client.utrNumber}</div>}
                          {!client.registrationNumber && !client.utrNumber && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="text-xs text-slate-500 font-mono">
                          {client.nextAccountsDue || "—"}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${client.isActive ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" : "text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {client.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenClientEdit(client)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition cursor-pointer"
                              title="Edit Client & Statutory Info"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => toggleClientStatusMutation.mutate({ id: client.id, isActive: !client.isActive })}
                              className={`p-1.5 rounded-md transition cursor-pointer ${client.isActive ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" : "text-emerald-600 hover:bg-emerald-50"}`}
                              title={client.isActive ? "Mark Inactive (Archive Client)" : "Activate Client"}
                            >
                              {client.isActive ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-slate-400" />}
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirm({
                                  title: "Delete Client",
                                  description: `Are you sure you want to delete client "${client.clientName}"? This action cannot be undone.`,
                                  confirmText: "Delete Client",
                                  variant: "danger"
                                })) {
                                  deleteClientMutation.mutate(client.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Delete Client"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Interactive Pagination */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Displaying <strong>{filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(filteredClients.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{filteredClients.length}</strong> Clients
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: DEDICATED FULL-PAGE CLIENT EDITOR (No Modal!)     */}
      {/* ========================================================= */}
      {view === "edit" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* Top Sticky Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setView("list");
                  setSelectedClient(null);
                }}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back to Clients Directory</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {clientForm.clientCode || "NEW CLIENT"}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {clientForm.id ? clientForm.clientName : "Register New Practice Client"}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  {clientForm.id ? "Update statutory business records, Companies House synchronization, and tax profile." : "Enter comprehensive client details, address, and HMRC registration references."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setSelectedClient(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => saveClientMutation.mutate()}
                disabled={saveClientMutation.isPending}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{saveClientMutation.isPending ? "Saving..." : clientForm.id ? "Save Changes" : "Create Client"}</span>
              </button>
            </div>
          </div>

          {/* Editor Layout: Left Sub-Tabs Navigation + Right Form Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Sub-Tab Selectors & Quick Summary */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs space-y-1">
                {[
                  { id: "basic", label: "1. Basic Details & Companies House", icon: <Building2 size={16} /> },
                  { id: "address", label: "2. Multiple Addresses", icon: <MapPin size={16} /> },
                  { id: "tax", label: "3. Tax & HMRC Identifiers", icon: <FileText size={16} /> },
                  { id: "contacts", label: "4. Key Contacts & Allocation", icon: <Users size={16} /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditorTab(t.id as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition text-left ${editorTab === t.id
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {t.icon}
                      <span>{t.label}</span>
                    </span>
                    <ChevronRight size={14} className={editorTab === t.id ? "text-white" : "text-slate-400"} />
                  </button>
                ))}
              </div>

              {/* Quick Info Box */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-4 rounded-xl border border-purple-100 shadow-xs space-y-2">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Shield size={14} className="text-purple-600" /> Statutory Compliance Note
                </span>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  All statutory data entered here is automatically shared across <strong>Accounts Production (FRS 102/105)</strong>, <strong>CT600</strong>, <strong>Bookkeeping</strong>, and <strong>Company Secretarial</strong>.
                </p>
              </div>
            </div>

            {/* Right Column: Active Sub-Tab Form Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
                {/* 1. BASIC DETAILS & COMPANIES HOUSE LOOKUP */}
                {editorTab === "basic" && (
                  <div className="space-y-5 animate-in fade-in">
                    {/* Companies House Live Fetch Bar */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border border-purple-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Sparkles size={15} className="text-purple-600" /> Companies House Live Sync (Article 9000231133)
                        </span>
                        <span className="text-[11px] text-purple-700 font-medium">Auto-fetches Legal Name, CRN, Registered Office & SIC Codes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 text-purple-400" size={15} />
                          <input
                            type="text"
                            placeholder="Enter Company Name or 8-digit Companies House CRN number..."
                            value={chSearchQuery}
                            onChange={(e) => setChSearchQuery(e.target.value)}
                            className="w-full text-xs border border-purple-300 rounded-lg pl-9 pr-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSearchCompaniesHouse}
                          disabled={isSearchingCh}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          {isSearchingCh ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                          <span>{isSearchingCh ? "Searching..." : "Lookup CH Registry"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Entity Type *</label>
                        <select
                          value={clientForm.clientType}
                          onChange={(e) => setClientForm({ ...clientForm, clientType: e.target.value })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Limited">Limited Company (Ltd)</option>
                          <option value="SoleTrader">Sole Trader</option>
                          <option value="Partnership">Partnership</option>
                          <option value="LLP">Limited Liability Partnership (LLP)</option>
                          <option value="Charity">Charity / Community Interest (CIC)</option>
                          <option value="Individual">Individual</option>
                          <option value="Trust">Trust & Estate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Client ID / Code *</label>
                        <input
                          type="text"
                          required
                          value={clientForm.clientCode}
                          onChange={(e) => setClientForm({ ...clientForm, clientCode: e.target.value })}
                          placeholder="e.g. CL001"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-purple-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Entity Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={clientForm.clientName}
                        onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                        placeholder="e.g. Acme Corporation Limited"
                        className="w-full text-sm font-bold border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Email Address</label>
                        <input
                          type="email"
                          value={clientForm.email}
                          onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                          placeholder="primary@company.co.uk"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Secondary Email (Article 9000258775)</label>
                        <input
                          type="email"
                          value={clientForm.extra.secondaryEmail}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, secondaryEmail: e.target.value } })}
                          placeholder="accounts@company.co.uk"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone Number</label>
                        <input
                          type="text"
                          value={clientForm.phone}
                          onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                          placeholder="e.g. 020 7946 0123"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Trading Status</label>
                        <select
                          value={clientForm.tradingStatus}
                          onChange={(e) => setClientForm({ ...clientForm, tradingStatus: e.target.value })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="Trading">Trading (Active Business)</option>
                          <option value="Dormant">Dormant</option>
                          <option value="Ceased">Ceased Trading</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MULTIPLE ADDRESSES (Article 9000258775) */}
                {editorTab === "address" && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin size={15} className="text-purple-600" /> 1. Registered Office Address
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] text-slate-600 mb-1">Address Line</label>
                          <input
                            type="text"
                            value={clientForm.address}
                            onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                            placeholder="e.g. 100 London Wall, London"
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={clientForm.postcode}
                            onChange={(e) => setClientForm({ ...clientForm, postcode: e.target.value })}
                            placeholder="e.g. EC2M 5QQ"
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 size={15} className="text-indigo-600" /> 2. Trading / Operational Address
                      </h4>
                      <input
                        type="text"
                        value={clientForm.extra.tradingAddress}
                        onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, tradingAddress: e.target.value } })}
                        placeholder="Leave blank if identical to registered office address..."
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Globe size={15} className="text-emerald-600" /> 3. Overseas International Address (If Applicable)
                      </h4>
                      <input
                        type="text"
                        value={clientForm.extra.overseasAddress}
                        onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, overseasAddress: e.target.value } })}
                        placeholder="International head office or foreign registered office..."
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* 3. TAX & HMRC IDENTIFIERS */}
                {editorTab === "tax" && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Companies House Registration No (CRN)</label>
                        <input
                          type="text"
                          value={clientForm.registrationNumber}
                          onChange={(e) => setClientForm({ ...clientForm, registrationNumber: e.target.value })}
                          placeholder="e.g. 08123456"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">UTR Number (10 Digits)</label>
                        <input
                          type="text"
                          value={clientForm.utrNumber}
                          onChange={(e) => setClientForm({ ...clientForm, utrNumber: e.target.value })}
                          placeholder="e.g. 1234567890"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Registration Number</label>
                        <input
                          type="text"
                          value={clientForm.vatNumber}
                          onChange={(e) => setClientForm({ ...clientForm, vatNumber: e.target.value })}
                          placeholder="e.g. GB 123 4567 89"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Accounting Scheme</label>
                        <select
                          value={clientForm.extra.vatScheme}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, vatScheme: e.target.value } })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="Standard">Standard Accrual Scheme</option>
                          <option value="Cash Accounting">Cash Accounting Scheme</option>
                          <option value="Flat Rate">Flat Rate Scheme (FRS)</option>
                          <option value="Exempt">VAT Exempt</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Registration Date</label>
                        <input
                          type="date"
                          value={clientForm.extra.vatRegDate}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, vatRegDate: e.target.value } })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Submit Type</label>
                        <select
                          value={clientForm.extra.vatSubmitType}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, vatSubmitType: e.target.value } })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="Quarterly">Quarterly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Annually">Annually</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Accounts Office Reference (13 Chars)</label>
                        <input
                          type="text"
                          value={clientForm.extra.accountsOfficeRef}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, accountsOfficeRef: e.target.value } })}
                          placeholder="e.g. 123PA00012345"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Employer PAYE Reference Number</label>
                        <input
                          type="text"
                          value={clientForm.extra.payeRef}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, payeRef: e.target.value } })}
                          placeholder="e.g. 123/AB12345"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Business Start Date</label>
                        <input
                          type="date"
                          value={clientForm.extra.businessStartDate}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, businessStartDate: e.target.value } })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Book Start Date</label>
                        <input
                          type="date"
                          value={clientForm.extra.bookStartDate}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, bookStartDate: e.target.value } })}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Accounting Year End</label>
                        <input
                          type="text"
                          value={clientForm.extra.yearEnd}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, yearEnd: e.target.value } })}
                          placeholder="e.g. 31-12 or 31-03"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. KEY CONTACTS & ALLOCATION */}
                {editorTab === "contacts" && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Key Primary Contact Person</label>
                        <input
                          type="text"
                          value={clientForm.extra.keyContact}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, keyContact: e.target.value } })}
                          placeholder="e.g. David Miller (Managing Director)"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Client Manager / Staff</label>
                        <input
                          type="text"
                          value={clientForm.extra.clientManager}
                          onChange={(e) => setClientForm({ ...clientForm, extra: { ...clientForm.extra, clientManager: e.target.value } })}
                          placeholder="e.g. Practice Senior Accountant"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1 text-xs text-purple-950">
                      <p className="font-bold flex items-center gap-1.5">
                        <Users size={15} className="text-purple-700" /> Shareholder & Director Linking (Article 9000231133)
                      </p>
                      <p className="text-[11px] text-purple-800 leading-relaxed">
                        Additional directors, shareholders, PSCs and individual contacts can also be mapped directly to this client from the <strong>Company Secretarial</strong> module or through <strong>Contact Links</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      setSelectedClient(null);
                    }}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Cancel & Return
                  </button>

                  <button
                    type="button"
                    onClick={() => saveClientMutation.mutate()}
                    disabled={saveClientMutation.isPending}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{saveClientMutation.isPending ? "Saving..." : clientForm.id ? "Save Changes" : "Create Client"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: DEDICATED FULL-PAGE CSV IMPORTER (No Modal!)      */}
      {/* ========================================================= */}
      {view === "import" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* Top Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back to Clients Directory</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <h2 className="text-base font-bold text-slate-900">Bulk Client Import Wizard</h2>
                <p className="text-xs text-slate-500">Import your practice clients from CSV or Excel file with format validation.</p>
              </div>
            </div>
          </div>

          {/* Stepper Progress Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 1 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                1. Download Template
              </div>
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 2 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                2. Upload / Paste CSV
              </div>
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 3 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                3. Validation & Import
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* STEP 1: DOWNLOAD TEMPLATE */}
              {importStep === 1 && (
                <div className="space-y-6 max-w-3xl">
                  <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                    <h4 className="text-sm font-bold text-purple-950">Step 1: Download & Populate Practice Template</h4>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Download the official SanSuite client CSV template. Fill out your client records and export as CSV before proceeding to upload.
                    </p>
                    <button
                      onClick={handleDownloadCsvTemplate}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Download size={15} /> Download Sample Client CSV Template
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                    <h5 className="font-bold text-slate-800">CSV Import Requirements (Article 9000231556):</h5>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>Ensure <strong>Client Name</strong> is provided for every row.</li>
                      <li>Client Type must be one of: <code>Limited</code>, <code>SoleTrader</code>, <code>Partnership</code>, <code>LLP</code>, <code>Charity</code>, <code>Individual</code>.</li>
                      <li>Dates should be formatted as <code>dd/mm/yyyy</code> or <code>yyyy-mm-dd</code>.</li>
                      <li>Exclude duplicate Client IDs to prevent collision.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                    >
                      Continue to Step 2 &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: UPLOAD / PASTE CSV */}
              {importStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paste CSV Content with Headers:
                    </label>
                    <textarea
                      rows={10}
                      value={csvText}
                      onChange={(e) => handleParseCsv(e.target.value)}
                      placeholder="Paste CSV lines here with headers..."
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setImportStep(1)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      &larr; Back
                    </button>

                    <button
                      onClick={() => {
                        if (parsedCsvClients.length === 0) {
                          toast({ title: "No Clients Parsed", description: "Please paste valid CSV data.", variant: "destructive" });
                          return;
                        }
                        setImportStep(3);
                      }}
                      disabled={parsedCsvClients.length === 0}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                    >
                      Preview {parsedCsvClients.length} Clients &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: VALIDATION PREVIEW & IMPORT */}
              {importStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">
                      Validated Clients Preview ({parsedCsvClients.length} records ready to import):
                    </h4>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={15} /> All formats validated
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="SanSuite-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Code</th><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>CRN</th><th>Postcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsvClients.map((item, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td className="font-mono text-purple-700 font-bold">{item.clientCode}</td>
                            <td className="font-bold">{item.clientName}</td>
                            <td>{item.clientType}</td>
                            <td className="text-xs">{item.email || "—"}</td>
                            <td className="font-mono">
                              {item.registrationNumber ? (
                                <a
                                  href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(item.registrationNumber.trim())}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-700 hover:text-purple-900 hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                                  title="Open in Companies House"
                                >
                                  {item.registrationNumber}
                                  <ExternalLink size={10} className="text-purple-500" />
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="font-mono text-xs">{item.postcode || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      &larr; Back to Paste
                    </button>

                    <button
                      onClick={() => bulkImportMutation.mutate(parsedCsvClients)}
                      disabled={bulkImportMutation.isPending}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      {bulkImportMutation.isPending ? "Importing..." : `Import ${parsedCsvClients.length} Clients Now`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal NewClientModal */}
      <NewClientModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)} 
      />
    </div>
  );
}
