import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Users, UserPlus, Search, Filter, Building2,
  Phone, Mail, CheckCircle2, AlertCircle, Clock,
  Plus, X, ChevronRight, Download, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown, User, ShieldCheck,
  Check, Calendar, Briefcase, FileSpreadsheet, Eye,
  SlidersHorizontal, CheckSquare, Layers
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import TablePagination from "../../components/common/TablePagination";
import { formatDate } from "../../lib/dateUtils";

// Standard Statutory & Compliance Services for Practice
const MASTER_SERVICES = [
  { code: "accounts", title: "Accounts Production", category: "Compliance", defaultFee: 350 },
  { code: "ct600", title: "Corporation Tax (CT600)", category: "Tax", defaultFee: 250 },
  { code: "sa100", title: "Self-Assessment (SA100)", category: "Tax", defaultFee: 150 },
  { code: "vat", title: "Bookkeeping & MTD VAT", category: "Bookkeeping", defaultFee: 80 },
  { code: "payroll", title: "Payroll & RTI", category: "Payroll", defaultFee: 55 },
  { code: "cs01", title: "Confirmation Statement (CS01)", category: "Corporate", defaultFee: 45 },
  { code: "mtd-it", title: "MTD for Income Tax", category: "Tax", defaultFee: 120 },
  { code: "advisory", title: "Business Advisory", category: "Advisory", defaultFee: 200 },
];

export default function PracticeClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 4 Capium Standard Sub-Tabs (Article #9000165736)
  // "by_list" | "by_services" | "by_status" | "contacts"
  const [activeTab, setActiveTab] = useState<"by_list" | "by_services" | "by_status" | "contacts">("by_list");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClientType, setFilterClientType] = useState("All");
  const [filterManager, setFilterManager] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [statusSubFilter, setStatusSubFilter] = useState<"all" | "active" | "inactive" | "30days" | "90days">("all");

  // Selection
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("clientName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal State for New Client
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isLookingUpCH, setIsLookingUpCH] = useState(false);
  const [chSearchResults, setChSearchResults] = useState<any[]>([]);
  const [showChDropdown, setShowChDropdown] = useState(false);

  // New Client Form
  const [newClientForm, setNewClientForm] = useState({
    clientCode: "",
    clientName: "",
    clientType: "Limited",
    registrationNumber: "",
    utrNumber: "",
    vatNumber: "",
    email: "",
    phone: "",
    address: "",
    postcode: "",
    country: "United Kingdom",
    clientManager: "",
    tradingStatus: "Trading",
    auditStatus: "Unaudited",
    yearEnd: "",
    sicCode: "",
    selectedServices: ["accounts", "ct600", "cs01"] as string[],
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  // Fetch Clients
  const { data: clientsList = [], isLoading: isLoadingClients, refetch: refetchClients } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Practice Staff for Client Manager assignment
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Master Contacts
  const { data: contactsList = [], isLoading: isLoadingContacts } = useQuery<any[]>({
    queryKey: ["/api/pm/contacts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/contacts");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "contacts"
  });

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="inline ml-1 text-slate-300 dark:text-slate-600" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={11} className="inline ml-1 text-purple-600 dark:text-purple-400 font-bold" />
    ) : (
      <ArrowDown size={11} className="inline ml-1 text-purple-600 dark:text-purple-400 font-bold" />
    );
  };

  // Companies House Lookup
  const handleCompaniesHouseLookup = async () => {
    const term = newClientForm.clientName || newClientForm.registrationNumber;
    if (!term) {
      toast({ title: "Lookup Required", description: "Enter Company Name or Reg No to search Companies House.", variant: "destructive" });
      return;
    }
    setIsLookingUpCH(true);
    try {
      const res = await apiRequest("GET", `/api/companies-house/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (items.length === 1) {
          await handleSelectChCompany(items[0]);
        } else if (items.length > 1) {
          setChSearchResults(items);
          setShowChDropdown(true);
          toast({ title: "Companies House", description: `Found ${items.length} matching companies. Select below.` });
        } else {
          toast({ title: "No Match", description: "No matching registered company found on Companies House.", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Notice", description: "Lookup completed." });
    } finally {
      setIsLookingUpCH(false);
    }
  };

  const handleSelectChCompany = async (comp: any) => {
    setIsLookingUpCH(true);
    setShowChDropdown(false);
    try {
      const crn = comp.company_number || comp.companyNumber;
      let fullProfile = comp;
      let officerName = "";

      if (crn) {
        const pRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}`);
        if (pRes.ok) fullProfile = await pRes.json();

        try {
          const offRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/officers`);
          if (offRes.ok) {
            const offData = await offRes.json();
            const primaryOfficer = (offData.items || [])[0];
            if (primaryOfficer && primaryOfficer.name) {
              officerName = primaryOfficer.name;
            }
          }
        } catch { }
      }

      const roa = fullProfile.registered_office_address || {};
      const addr = [roa.address_line_1, roa.address_line_2, roa.locality].filter(Boolean).join(", ");
      const cType = (fullProfile.company_type || "").toLowerCase();
      const mappedType = cType.includes("llp") ? "Partnership" : cType.includes("sole") ? "SoleTrader" : "Limited";

      let parsedYearEnd = "";
      if (fullProfile.accounts?.accounting_reference_date) {
        const { day, month } = fullProfile.accounts.accounting_reference_date;
        parsedYearEnd = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
      }

      setNewClientForm(prev => ({
        ...prev,
        clientName: fullProfile.title || fullProfile.company_name || prev.clientName,
        registrationNumber: crn || prev.registrationNumber,
        clientType: mappedType,
        address: addr || prev.address,
        postcode: roa.postal_code || prev.postcode,
        yearEnd: parsedYearEnd || prev.yearEnd,
        sicCode: (fullProfile.sic_codes || [])[0] || "",
        contactName: officerName || prev.contactName,
      }));

      toast({ title: "Company Loaded", description: `Populated details for ${fullProfile.title || fullProfile.company_name}` });
    } catch (e: any) {
      toast({ title: "Lookup Notice", description: e.message || "Failed to load company details." });
    } finally {
      setIsLookingUpCH(false);
    }
  };

  // Create Client Mutation
  const createClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/pm/clients", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create client");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/contacts"] });
      toast({ title: "Client Created", description: `Added ${data.clientName || "new client"} to accounting portfolio.` });
      setIsAddClientModalOpen(false);
      setNewClientForm({
        clientCode: "",
        clientName: "",
        clientType: "Limited",
        registrationNumber: "",
        utrNumber: "",
        vatNumber: "",
        email: "",
        phone: "",
        address: "",
        postcode: "",
        country: "United Kingdom",
        clientManager: "",
        tradingStatus: "Trading",
        auditStatus: "Unaudited",
        yearEnd: "",
        sicCode: "",
        selectedServices: ["accounts", "ct600", "cs01"],
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.clientName.trim()) {
      toast({ title: "Validation Error", description: "Company or Client Name is required.", variant: "destructive" });
      return;
    }

    const payload = {
      clientCode: newClientForm.clientCode || `CL-${Date.now().toString(36).toUpperCase()}`,
      clientName: newClientForm.clientName,
      clientType: newClientForm.clientType,
      registrationNumber: newClientForm.registrationNumber || null,
      utrNumber: newClientForm.utrNumber || null,
      vatNumber: newClientForm.vatNumber || null,
      email: newClientForm.email || null,
      phone: newClientForm.phone || null,
      address: newClientForm.address || null,
      postcode: newClientForm.postcode || null,
      country: newClientForm.country || "United Kingdom",
      clientManager: newClientForm.clientManager || null,
      tradingStatus: newClientForm.tradingStatus || "Trading",
      auditStatus: newClientForm.auditStatus || "Unaudited",
      yearEnd: newClientForm.yearEnd || null,
      sicCode: newClientForm.sicCode || null,
      services: newClientForm.selectedServices,
      customFieldsJson: JSON.stringify({
        contactName: newClientForm.contactName,
        contactEmail: newClientForm.contactEmail,
        contactPhone: newClientForm.contactPhone,
        clientManager: newClientForm.clientManager,
      }),
    };

    createClientMutation.mutate(payload);
  };

  // Filtered Clients (Only actual clients, not unconverted pre-sales leads)
  const filteredClients = useMemo(() => {
    return clientsList.filter((c: any) => {
      // Filter out unconverted sales leads/prospects from pure accounting clients view
      const stage = (c.pipelineStage || "").toLowerCase();
      if (stage === "lead" || stage === "prospect") {
        return false;
      }

      // Filter by Client Type
      if (filterClientType !== "All") {
        const ct = (c.clientType || "").toLowerCase();
        if (filterClientType === "Limited" && ct !== "limited") return false;
        if (filterClientType === "SoleTrader" && ct !== "soletrader" && ct !== "sole trader" && ct !== "individual") return false;
        if (filterClientType === "Partnership" && ct !== "partnership" && ct !== "llp") return false;
        if (filterClientType === "Charity" && ct !== "charity") return false;
        if (filterClientType === "Trust" && ct !== "trust") return false;
      }

      // Filter by Manager
      if (filterManager !== "All") {
        if ((c.clientManager || "").toLowerCase() !== filterManager.toLowerCase()) return false;
      }

      // Filter by Status
      if (filterStatus !== "All") {
        if ((c.tradingStatus || "Trading").toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      // Sub-Filter on By Status tab
      if (activeTab === "by_status") {
        const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        const nowMs = Date.now();
        const diffDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);

        if (statusSubFilter === "active" && c.tradingStatus === "Inactive") return false;
        if (statusSubFilter === "inactive" && c.tradingStatus !== "Inactive") return false;
        if (statusSubFilter === "30days" && diffDays > 30) return false;
        if (statusSubFilter === "90days" && diffDays > 90) return false;
      }

      // Quick Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.clientName || "").toLowerCase().includes(q);
        const matchCode = (c.clientCode || "").toLowerCase().includes(q);
        const matchReg = (c.registrationNumber || "").toLowerCase().includes(q);
        const matchUtr = (c.utrNumber || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchManager = (c.clientManager || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchReg && !matchUtr && !matchEmail && !matchManager) {
          return false;
        }
      }

      return true;
    });
  }, [clientsList, filterClientType, filterManager, filterStatus, statusSubFilter, activeTab, searchQuery]);

  // Sorted Clients
  const sortedClients = useMemo(() => {
    const list = [...filteredClients];
    list.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "createdAt") {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredClients, sortField, sortOrder]);

  // Paginated Clients
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedClients.slice(start, start + pageSize);
  }, [sortedClients, currentPage, pageSize]);

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedClientIds.length === paginatedClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(paginatedClients.map((c: any) => c.id));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredClients.length === 0) {
      toast({ title: "No Data", description: "No client records to export.", variant: "destructive" });
      return;
    }
    const headers = [
      "Client Code", "Client Name", "Entity Type", "Company Reg No",
      "UTR Number", "VAT Number", "Client Manager", "Email", "Phone",
      "Trading Status", "Created Date"
    ];
    const rows = filteredClients.map((c: any) => [
      `"${(c.clientCode || "").replace(/"/g, '""')}"`,
      `"${(c.clientName || "").replace(/"/g, '""')}"`,
      c.clientType || "Limited",
      c.registrationNumber || "",
      c.utrNumber || "",
      c.vatNumber || "",
      `"${(c.clientManager || "Unassigned").replace(/"/g, '""')}"`,
      c.email || "",
      c.phone || "",
      c.tradingStatus || "Trading",
      formatDate(c.createdAt),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SanSuite_Accounting_Clients_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Exported ${filteredClients.length} clients to CSV.` });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        
        {/* Top Header & Metrics Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="text-[#5c469c] dark:text-purple-400" size={24} />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Clients Management Hub
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Centralized compliance, statutory filings, and 360 accounting portfolio for all active clients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchClients()}
              title="Refresh Clients"
              className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 rounded text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} className={isLoadingClients ? "animate-spin text-purple-600" : ""} />
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>

            <button
              onClick={() => setIsAddClientModalOpen(true)}
              className="px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Add Client
            </button>
          </div>
        </div>

        {/* 4 Capium Standard Sub-Tabs Navigation (Article #9000165736) */}
        <div className="border-b border-slate-200 dark:border-slate-800 mb-6 flex items-center justify-between">
          <div className="flex space-x-6">
            <button
              onClick={() => { setActiveTab("by_list"); setCurrentPage(1); }}
              className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === "by_list"
                  ? "border-[#5c469c] text-[#5c469c] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Users size={14} /> By List ({filteredClients.length})
            </button>

            <button
              onClick={() => { setActiveTab("by_services"); setCurrentPage(1); }}
              className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === "by_services"
                  ? "border-[#5c469c] text-[#5c469c] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Layers size={14} /> By Services Matrix
            </button>

            <button
              onClick={() => { setActiveTab("by_status"); setCurrentPage(1); }}
              className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === "by_status"
                  ? "border-[#5c469c] text-[#5c469c] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <CheckSquare size={14} /> By Status
            </button>

            <button
              onClick={() => { setActiveTab("contacts"); }}
              className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === "contacts"
                  ? "border-[#5c469c] text-[#5c469c] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <User size={14} /> Contacts Directory
            </button>
          </div>

          <div className="pb-2 hidden sm:block text-[11px] text-slate-400">
            Total Active Clients: <span className="font-semibold text-slate-700 dark:text-slate-200">{clientsList.length}</span>
          </div>
        </div>

        {/* Global Filters & Search Toolbar (Shared across By List and By Services) */}
        {activeTab !== "contacts" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search by name, code, CRN, UTR..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Client Type Filter */}
              <select
                value={filterClientType}
                onChange={(e) => { setFilterClientType(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="All">All Entity Types</option>
                <option value="Limited">Limited Company</option>
                <option value="SoleTrader">Sole Trader / Individual</option>
                <option value="Partnership">Partnership / LLP</option>
                <option value="Charity">Charity</option>
                <option value="Trust">Trust</option>
              </select>

              {/* Manager Filter */}
              <select
                value={filterManager}
                onChange={(e) => { setFilterManager(e.target.value); setCurrentPage(1); }}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="All">All Client Managers</option>
                {teamMembers.map((m: any) => {
                  const mName = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.name || m.email;
                  return <option key={m.id} value={mName}>{mName}</option>;
                })}
              </select>

              {/* Status Filter */}
              {activeTab !== "by_status" && (
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="All">All Statuses</option>
                  <option value="Trading">Active / Trading</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Dormant">Dormant</option>
                </select>
              )}
            </div>

            {/* Sub-Filters for "By Status" Tab (Article #9000165736) */}
            {activeTab === "by_status" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "inactive", label: "Inactive" },
                  { id: "30days", label: "Active last 30d" },
                  { id: "90days", label: "Active last 90d" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setStatusSubFilter(tab.id as any); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                      statusSubFilter === tab.id
                        ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: BY LIST VIEW                                                       */}
        {/* ========================================================================= */}
        {(activeTab === "by_list" || activeTab === "by_status") && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={paginatedClients.length > 0 && paginatedClients.every((c: any) => selectedClientIds.includes(c.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th
                      onClick={() => handleSort("clientCode")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700 whitespace-nowrap"
                    >
                      Client Code {renderSortIndicator("clientCode")}
                    </th>
                    <th
                      onClick={() => handleSort("clientName")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Client / Company Name {renderSortIndicator("clientName")}
                    </th>
                    <th
                      onClick={() => handleSort("clientType")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700 whitespace-nowrap"
                    >
                      Type {renderSortIndicator("clientType")}
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Assigned Manager</th>
                    <th className="py-2.5 px-3">Subscribed Services</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">CRN / UTR</th>
                    <th
                      onClick={() => handleSort("tradingStatus")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700 whitespace-nowrap"
                    >
                      Status {renderSortIndicator("tradingStatus")}
                    </th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingClients ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <RefreshCw size={20} className="animate-spin text-purple-600 mx-auto mb-2" />
                        Loading accounting clients portfolio...
                      </td>
                    </tr>
                  ) : paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <Building2 size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Accounting Clients Found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {searchQuery
                            ? "No clients match your filter criteria. Try adjusting your search term."
                            : "Your practice portfolio currently has no active clients. Add your first client to start managing compliance."}
                        </p>
                        <button
                          onClick={() => setIsAddClientModalOpen(true)}
                          className="mt-4 px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Plus size={14} /> Add First Client
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((client: any) => {
                      const services = client.assignedServices || [];
                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-purple-50/30 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={selectedClientIds.includes(client.id)}
                              onChange={() => toggleSelectId(client.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {client.clientCode || `CL-${client.id}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <Link href={`/practice/clients/${client.id}`}>
                              <span className="font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 cursor-pointer underline-offset-2 hover:underline">
                                {client.clientName}
                              </span>
                            </Link>
                            {client.address && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">{client.address}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {client.clientType || "Limited"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {client.clientManager || "Unassigned"}
                          </td>
                          <td className="py-2.5 px-3">
                            {services.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {services.slice(0, 3).map((s: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                  >
                                    {s.serviceName || s.serviceCode}
                                  </span>
                                ))}
                                {services.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    +{services.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No services assigned</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <div>CRN: {client.registrationNumber || "-"}</div>
                            <div>UTR: {client.utrNumber || "-"}</div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              client.tradingStatus === "Trading" || client.tradingStatus === "Active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}>
                              {client.tradingStatus || "Trading"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Link href={`/practice/clients/${client.id}`}>
                              <span className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold cursor-pointer text-xs">
                                360 View <ChevronRight size={13} />
                              </span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={filteredClients.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
              itemName="Clients"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BY SERVICES MATRIX VIEW (Article #9000165736)                      */}
        {/* ========================================================================= */}
        {activeTab === "by_services" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-3 bg-purple-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Layers size={14} className="text-purple-600" />
                Service Subscription Matrix across Active Accounting Clients
              </span>
              <span className="text-[11px] text-slate-500">
                Green badge indicates subscribed service with active compliance workflow
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-2xs">
                      Client Name
                    </th>
                    {MASTER_SERVICES.map(svc => (
                      <th key={svc.code} className="py-2.5 px-3 text-center whitespace-nowrap min-w-[120px]">
                        <div>{svc.title}</div>
                        <div className="text-[10px] font-normal text-slate-400">£{svc.defaultFee} base</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Total Services</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={MASTER_SERVICES.length + 2} className="py-12 text-center text-slate-400">
                        No clients found for service matrix display.
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((client: any) => {
                      const assigned = client.assignedServices || [];
                      const assignedCodes = new Set(assigned.map((a: any) => (a.serviceCode || "").toLowerCase()));

                      return (
                        <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-2xs">
                            <Link href={`/practice/clients/${client.id}`}>
                              <span className="text-purple-700 dark:text-purple-400 hover:underline cursor-pointer">
                                {client.clientName}
                              </span>
                            </Link>
                            <div className="text-[10px] font-normal text-slate-400">
                              {client.clientCode || `CL-${client.id}`} • {client.clientType}
                            </div>
                          </td>

                          {MASTER_SERVICES.map(svc => {
                            const isSubscribed = assignedCodes.has(svc.code.toLowerCase());
                            return (
                              <td key={svc.code} className="py-2.5 px-3 text-center">
                                {isSubscribed ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <Check size={13} strokeWidth={2.5} />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-center font-bold text-purple-700 dark:text-purple-400">
                            {assigned.length}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={filteredClients.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
              itemName="Clients"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CONTACTS DIRECTORY                                                 */}
        {/* ========================================================================= */}
        {activeTab === "contacts" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="p-3 bg-purple-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <User size={14} className="text-purple-600" />
                Master Contact Directory (Directors, Officers, Shareholders & Key Contacts)
              </span>
              <span className="text-[11px] text-slate-500">
                Total Contacts: {contactsList.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Contact Name</th>
                    <th className="py-2.5 px-3">Designation / Role</th>
                    <th className="py-2.5 px-3">Client / Company</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingContacts ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <RefreshCw size={20} className="animate-spin text-purple-600 mx-auto mb-2" />
                        Loading contact records...
                      </td>
                    </tr>
                  ) : contactsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <User size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Contacts Recorded</p>
                        <p className="text-xs text-slate-500 mt-1">
                          When you add clients or import from Companies House, officers and directors will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    contactsList.map((contact: any) => (
                      <tr key={contact.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {contact.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {contact.designation || contact.contactType || "Officer"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-purple-700 dark:text-purple-400">
                          {contact.clientId ? (
                            <Link href={`/practice/clients/${contact.clientId}`}>
                              <span className="hover:underline cursor-pointer">
                                {contact.clientName || `Client #${contact.clientId}`}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-purple-600 hover:underline flex items-center gap-1">
                              <Mail size={12} /> {contact.email}
                            </a>
                          ) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {contact.phone || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {contact.address || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {contact.clientId && (
                            <Link href={`/practice/clients/${contact.clientId}`}>
                              <span className="text-purple-600 hover:text-purple-800 font-semibold cursor-pointer text-xs">
                                View Profile
                              </span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD CLIENT MODAL (with Companies House Lookup)                            */}
        {/* ========================================================================= */}
        {isAddClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-2xl my-8 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#5c469c]" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Add Accounting Client to Portfolio
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Companies House Search Assist */}
                <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 p-3 rounded-lg">
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                    UK Companies House Lookup (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type Company Name or Reg No (e.g. 12345678)..."
                      value={newClientForm.clientName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientName: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCompaniesHouseLookup}
                      disabled={isLookingUpCH}
                      className="px-3 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isLookingUpCH ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                      Lookup
                    </button>
                  </div>

                  {/* Dropdown if multiple CH results */}
                  {showChDropdown && chSearchResults.length > 0 && (
                    <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-md max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {chSearchResults.map((comp, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectChCompany(comp)}
                          className="p-2 text-xs hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{comp.title || comp.company_name}</div>
                            <div className="text-[10px] text-slate-400">CRN: {comp.company_number} • {comp.address_snippet}</div>
                          </div>
                          <span className="text-[10px] font-semibold text-purple-600">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client / Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientForm.clientName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientName: e.target.value })}
                      placeholder="e.g. Acme Trading Ltd"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client Code
                    </label>
                    <input
                      type="text"
                      value={newClientForm.clientCode}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientCode: e.target.value })}
                      placeholder="e.g. CL-001 (Auto-generated if empty)"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Legal Entity Type *
                    </label>
                    <select
                      value={newClientForm.clientType}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientType: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    >
                      <option value="Limited">Limited Company (Ltd)</option>
                      <option value="SoleTrader">Sole Trader</option>
                      <option value="Partnership">Partnership</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                      <option value="Individual">Individual</option>
                      <option value="Charity">Charity</option>
                      <option value="Trust">Trust</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Client Manager
                    </label>
                    <select
                      value={newClientForm.clientManager}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientManager: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    >
                      <option value="">Select Team Member</option>
                      {teamMembers.map((m: any) => {
                        const mName = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.name || m.email;
                        return <option key={m.id} value={mName}>{mName} ({m.role || "Staff"})</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company Reg No (CRN)
                    </label>
                    <input
                      type="text"
                      value={newClientForm.registrationNumber}
                      onChange={(e) => setNewClientForm({ ...newClientForm, registrationNumber: e.target.value })}
                      placeholder="e.g. 08123456"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UTR Number (10 digits)
                    </label>
                    <input
                      type="text"
                      value={newClientForm.utrNumber}
                      onChange={(e) => setNewClientForm({ ...newClientForm, utrNumber: e.target.value })}
                      placeholder="e.g. 1234567890"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      VAT Registration No
                    </label>
                    <input
                      type="text"
                      value={newClientForm.vatNumber}
                      onChange={(e) => setNewClientForm({ ...newClientForm, vatNumber: e.target.value })}
                      placeholder="e.g. GB 123 4567 89"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Accounting Year End (DD/MM)
                    </label>
                    <input
                      type="text"
                      value={newClientForm.yearEnd}
                      onChange={(e) => setNewClientForm({ ...newClientForm, yearEnd: e.target.value })}
                      placeholder="e.g. 31/03 or 31/12"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Address
                    </label>
                    <input
                      type="text"
                      value={newClientForm.address}
                      onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                      placeholder="Street, City, Postal Code"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Contact Phone
                    </label>
                    <input
                      type="text"
                      value={newClientForm.phone}
                      onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                      placeholder="+44 20 1234 5678"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Subscribed Statutory Services Selection */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Subscribed Compliance & Statutory Services
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MASTER_SERVICES.map(svc => {
                      const isChecked = newClientForm.selectedServices.includes(svc.code);
                      return (
                        <label
                          key={svc.code}
                          className={`p-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? "bg-purple-50 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setNewClientForm(prev => ({
                                ...prev,
                                selectedServices: isChecked
                                  ? prev.selectedServices.filter(s => s !== svc.code)
                                  : [...prev.selectedServices, svc.code]
                              }));
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="truncate">{svc.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddClientModalOpen(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createClientMutation.isPending}
                    className="px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {createClientMutation.isPending && <RefreshCw size={12} className="animate-spin" />}
                    Save Client to Portfolio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
