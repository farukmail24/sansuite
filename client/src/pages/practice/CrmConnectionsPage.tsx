import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  UserPlus, Search, Filter, Building2,
  Phone, Mail, CheckCircle2, AlertCircle,
  Plus, X, ChevronRight, Upload, Download,
  Layers, DollarSign, Briefcase, RefreshCw, Check,
  ArrowUpDown, ArrowUp, ArrowDown, UserCheck,
  TrendingUp, Send, FileSignature, ArrowRight,
  ShieldCheck, HelpCircle, Tag
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import TablePagination from "../../components/common/TablePagination";
import { formatDate } from "../../lib/dateUtils";

// Pipeline Stages according to Capium CRM Article #9000235439
type PipelineFilter = "all" | "lead" | "prospect" | "proposal" | "client" | "lost";

const LEAD_SOURCES = [
  "Website / Direct",
  "LinkedIn / Social",
  "Client Referral",
  "Google Ads",
  "Cold Outreach",
  "Networking Event",
  "Partner Directory",
  "Other"
];

export default function CrmConnectionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active Pipeline Filter Tab
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("All");
  const [filterClientType, setFilterClientType] = useState("All");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<number[]>([]);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals State
  const [isNewConnectionModalOpen, setIsNewConnectionModalOpen] = useState(false);
  const [convertModalClient, setConvertModalClient] = useState<any>(null);
  const [convertManager, setConvertManager] = useState("");

  // Companies House Lookup State
  const [isLookingUpCH, setIsLookingUpCH] = useState(false);
  const [chSearchResults, setChSearchResults] = useState<any[]>([]);
  const [showChDropdown, setShowChDropdown] = useState(false);

  // New Connection Form State
  const [newConnForm, setNewConnForm] = useState({
    name: "",
    company: "",
    clientType: "Limited",
    companyNumber: "",
    email: "",
    phone: "",
    source: "Website / Direct",
    pipelineStage: "Lead",
    employeeCount: "",
    turnover: "",
    dealValue: "1200",
    clientManager: "",
    address: "",
    postcode: "",
    yearEnd: "",
    sicCode: "",
    notes: "",
  });

  // Fetch Clients / Connections from Backend
  const { data: rawConnections = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Team Members for Assignment
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    }
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
    const term = newConnForm.company || newConnForm.companyNumber;
    if (!term) {
      toast({ title: "Lookup Required", description: "Please enter Company Name or CRN.", variant: "destructive" });
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
          toast({ title: "No Company Found", description: "No matching registered company found.", variant: "destructive" });
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
      let dirName = "";

      if (crn) {
        const pRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}`);
        if (pRes.ok) fullProfile = await pRes.json();

        try {
          const offRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/officers`);
          if (offRes.ok) {
            const offData = await offRes.json();
            const primaryOfficer = (offData.items || [])[0];
            if (primaryOfficer?.name) dirName = primaryOfficer.name;
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

      setNewConnForm(prev => ({
        ...prev,
        company: fullProfile.title || fullProfile.company_name || prev.company,
        companyNumber: crn || prev.companyNumber,
        clientType: mappedType,
        name: dirName || prev.name,
        address: addr || prev.address,
        postcode: roa.postal_code || prev.postcode,
        yearEnd: parsedYearEnd || prev.yearEnd,
        sicCode: (fullProfile.sic_codes || [])[0] || "",
      }));

      toast({ title: "Company Loaded", description: `Loaded details for ${fullProfile.title || fullProfile.company_name}` });
    } catch (e: any) {
      toast({ title: "Notice", description: e.message || "Failed to load company details." });
    } finally {
      setIsLookingUpCH(false);
    }
  };

  // Create Connection Mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/pm/clients", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create connection");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      toast({ title: "Lead Logged", description: `Added ${data.clientName || "new connection"} to CRM pipeline.` });
      setIsNewConnectionModalOpen(false);
      setNewConnForm({
        name: "",
        company: "",
        clientType: "Limited",
        companyNumber: "",
        email: "",
        phone: "",
        source: "Website / Direct",
        pipelineStage: "Lead",
        employeeCount: "",
        turnover: "",
        dealValue: "1200",
        clientManager: "",
        address: "",
        postcode: "",
        yearEnd: "",
        sicCode: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newConnForm.company || newConnForm.name;
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Company Name or Contact Name is required.", variant: "destructive" });
      return;
    }

    const payload = {
      clientCode: `CRM-${Date.now().toString(36).toUpperCase()}`,
      clientName: title,
      clientType: newConnForm.clientType,
      registrationNumber: newConnForm.companyNumber || null,
      email: newConnForm.email || null,
      phone: newConnForm.phone || null,
      address: newConnForm.address || null,
      postcode: newConnForm.postcode || null,
      country: "United Kingdom",
      clientManager: newConnForm.clientManager || null,
      tradingStatus: newConnForm.pipelineStage === "Client" ? "Trading" : (newConnForm.pipelineStage === "Lost" ? "Inactive" : newConnForm.pipelineStage),
      leadSource: newConnForm.source,
      industry: newConnForm.source,
      pipelineStage: newConnForm.pipelineStage,
      annualTurnover: newConnForm.turnover || null,
      employeeCount: newConnForm.employeeCount || null,
      dealValue: newConnForm.dealValue || null,
      yearEnd: newConnForm.yearEnd || null,
      sicCode: newConnForm.sicCode || null,
      customFieldsJson: JSON.stringify({
        contactName: newConnForm.name,
        source: newConnForm.source,
        leadSource: newConnForm.source,
        pipelineStage: newConnForm.pipelineStage,
        turnover: newConnForm.turnover,
        employeeCount: newConnForm.employeeCount,
        dealValue: newConnForm.dealValue,
        clientManager: newConnForm.clientManager,
        notes: newConnForm.notes,
      })
    };

    createConnectionMutation.mutate(payload);
  };

  // Convert to Client Mutation (Capium Article #9000235439)
  const convertClientMutation = useMutation({
    mutationFn: async ({ clientId, clientManager }: { clientId: number; clientManager?: string }) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/convert`, { clientManager });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to convert lead to client");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/deadlines"] });
      toast({
        title: "Successfully Converted",
        description: data.message || "Lead is now an Active Accounting Client with statutory deadlines initialized."
      });
      setConvertModalClient(null);
    },
    onError: (err: any) => {
      toast({ title: "Conversion Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleExecuteConvert = () => {
    if (!convertModalClient) return;
    convertClientMutation.mutate({
      clientId: convertModalClient.id,
      clientManager: convertManager || convertModalClient.clientManager,
    });
  };

  // Metrics Calculation from Real Database Records
  const pipelineMetrics = useMemo(() => {
    const total = rawConnections.length;
    let leads = 0;
    let prospects = 0;
    let proposals = 0;
    let clients = 0;
    let lost = 0;

    rawConnections.forEach((c: any) => {
      const stage = (c.pipelineStage || "").toLowerCase();
      const status = (c.tradingStatus || "").toLowerCase();

      if (stage === "lead" || status === "lead") leads++;
      else if (stage === "prospect" || status === "prospect") prospects++;
      else if (stage === "proposal" || stage === "loe sent") proposals++;
      else if (stage === "lost") lost++;
      else clients++; // Trading / Active
    });

    const conversionRate = total > 0 ? Math.round((clients / total) * 100) : 0;

    return { total, leads, prospects, proposals, clients, lost, conversionRate };
  }, [rawConnections]);

  // Filtered Connections
  const filteredConnections = useMemo(() => {
    return rawConnections.filter((c: any) => {
      const stage = (c.pipelineStage || (c.tradingStatus === "Lead" ? "Lead" : (c.tradingStatus === "Prospect" ? "Prospect" : "Client"))).toLowerCase();

      // Pipeline Filter
      if (pipelineFilter === "lead" && stage !== "lead") return false;
      if (pipelineFilter === "prospect" && stage !== "prospect") return false;
      if (pipelineFilter === "proposal" && stage !== "proposal" && stage !== "loe sent") return false;
      if (pipelineFilter === "client" && stage !== "client" && stage !== "trading" && stage !== "active") return false;
      if (pipelineFilter === "lost" && stage !== "lost") return false;

      // Source Filter
      if (filterSource !== "All") {
        const src = (c.leadSource || c.industry || "").toLowerCase();
        if (!src.includes(filterSource.toLowerCase())) return false;
      }

      // Client Type Filter
      if (filterClientType !== "All") {
        const ct = (c.clientType || "").toLowerCase();
        if (filterClientType === "Limited" && ct !== "limited") return false;
        if (filterClientType === "SoleTrader" && ct !== "soletrader" && ct !== "sole trader" && ct !== "individual") return false;
        if (filterClientType === "Partnership" && ct !== "partnership" && ct !== "llp") return false;
      }

      // Quick Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.clientName || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchReg = (c.registrationNumber || "").toLowerCase().includes(q);
        const matchManager = (c.clientManager || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchReg && !matchManager) return false;
      }

      return true;
    });
  }, [rawConnections, pipelineFilter, filterSource, filterClientType, searchQuery]);

  // Sorted Connections
  const sortedConnections = useMemo(() => {
    const list = [...filteredConnections];
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
  }, [filteredConnections, sortField, sortOrder]);

  // Paginated Connections
  const paginatedConnections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedConnections.slice(start, start + pageSize);
  }, [sortedConnections, currentPage, pageSize]);

  // Selection
  const toggleSelectAll = () => {
    if (selectedConnectionIds.length === paginatedConnections.length) {
      setSelectedConnectionIds([]);
    } else {
      setSelectedConnectionIds(paginatedConnections.map((c: any) => c.id));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedConnectionIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredConnections.length === 0) {
      toast({ title: "No Data", description: "No records to export.", variant: "destructive" });
      return;
    }
    const headers = ["Name/Company", "Stage", "Source", "Type", "Email", "Phone", "CRN", "Est. Turnover", "Employees", "Target Fee (£)", "Created On"];
    const rows = filteredConnections.map((c: any) => [
      `"${(c.clientName || "").replace(/"/g, '""')}"`,
      c.pipelineStage || "Lead",
      c.leadSource || "Website / Direct",
      c.clientType || "Limited",
      c.email || "",
      c.phone || "",
      c.registrationNumber || "",
      c.annualTurnover || "",
      c.employeeCount || "",
      c.dealValue || "",
      formatDate(c.createdAt),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CRM_Sales_Pipeline_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Exported ${filteredConnections.length} CRM connections to CSV.` });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="text-[#5c469c] dark:text-purple-400" size={24} />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                CRM Sales Pipeline & Connections
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Source new prospects, track sales conversion stages, and onboard leads into active clients. (Capium Guide #9000235439)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              title="Refresh Pipeline"
              className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 rounded text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-purple-600" : ""} />
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>

            <button
              onClick={() => setIsNewConnectionModalOpen(true)}
              className="px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Log New Lead
            </button>
          </div>
        </div>

        {/* Real Pipeline KPI Metrics Cards (Article #9000235439) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Pipeline</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{pipelineMetrics.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Recorded connections</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">New Leads</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{pipelineMetrics.leads}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Inquiries to qualify</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Prospects</div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{pipelineMetrics.prospects}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Under evaluation</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Converted Clients</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{pipelineMetrics.clients}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active paying portfolio</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Conversion Rate</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{pipelineMetrics.conversionRate}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Won deal ratio</div>
          </div>
        </div>

        {/* Pipeline Stage Tabs (Article #9000235439) */}
        <div className="border-b border-slate-200 dark:border-slate-800 mb-5 flex space-x-6 overflow-x-auto">
          {[
            { id: "all", label: "All Connections", count: pipelineMetrics.total },
            { id: "lead", label: "Leads", count: pipelineMetrics.leads },
            { id: "prospect", label: "Prospects", count: pipelineMetrics.prospects },
            { id: "client", label: "Won / Converted", count: pipelineMetrics.clients },
            { id: "lost", label: "Lost Deals", count: pipelineMetrics.lost },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setPipelineFilter(tab.id as any); setCurrentPage(1); }}
              className={`pb-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                pipelineFilter === tab.id
                  ? "border-[#5c469c] text-[#5c469c] dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                pipelineFilter === tab.id
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, company, email, phone..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="All">All Lead Sources</option>
              {LEAD_SOURCES.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>

            {/* Entity Type Filter */}
            <select
              value={filterClientType}
              onChange={(e) => { setFilterClientType(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="All">All Business Types</option>
              <option value="Limited">Limited Company</option>
              <option value="SoleTrader">Sole Trader</option>
              <option value="Partnership">Partnership</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-500">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredConnections.length}</span> pipeline connections
          </div>
        </div>

        {/* Connections Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={paginatedConnections.length > 0 && paginatedConnections.every((c: any) => selectedConnectionIds.includes(c.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => handleSort("clientName")}
                    className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                  >
                    Prospect / Company Name {renderSortIndicator("clientName")}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Pipeline Stage</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Lead Source</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                  <th className="py-2.5 px-3">Contact Email / Phone</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Est. Turnover</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Target Fee</th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700 whitespace-nowrap"
                  >
                    Logged Date {renderSortIndicator("createdAt")}
                  </th>
                  <th className="py-2.5 px-3 text-right">Pipeline Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <RefreshCw size={20} className="animate-spin text-purple-600 mx-auto mb-2" />
                      Loading pipeline connections...
                    </td>
                  </tr>
                ) : paginatedConnections.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <UserPlus size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Pipeline Records Found</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No prospective clients match your active filters. Log your first inbound lead to begin tracking your sales funnel.
                      </p>
                      <button
                        onClick={() => setIsNewConnectionModalOpen(true)}
                        className="mt-4 px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> Log First Inbound Lead
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedConnections.map((conn: any) => {
                    const stage = conn.pipelineStage || (conn.tradingStatus === "Lead" ? "Lead" : (conn.tradingStatus === "Prospect" ? "Prospect" : "Client"));
                    const isConvertible = stage === "Lead" || stage === "Prospect" || stage === "Proposal";

                    return (
                      <tr key={conn.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedConnectionIds.includes(conn.id)}
                            onChange={() => toggleSelectId(conn.id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {conn.clientName}
                          </div>
                          {conn.registrationNumber && (
                            <div className="text-[10px] font-mono text-slate-400">CRN: {conn.registrationNumber}</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            stage === "Client"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : stage === "Prospect"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : stage === "Proposal"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          }`}>
                            {stage === "Client" ? "Converted Client" : stage}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {conn.leadSource || conn.industry || "Direct / Website"}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {conn.clientType || "Limited"}
                        </td>

                        <td className="py-2.5 px-3">
                          {conn.email && (
                            <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" /> {conn.email}
                            </div>
                          )}
                          {conn.phone && (
                            <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="text-slate-400" /> {conn.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {conn.annualTurnover ? `£${Number(conn.annualTurnover).toLocaleString()}` : "-"}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-purple-700 dark:text-purple-400 font-semibold whitespace-nowrap">
                          {conn.dealValue ? `£${Number(conn.dealValue).toLocaleString()}` : "-"}
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {formatDate(conn.createdAt)}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isConvertible ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setConvertModalClient(conn);
                                  setConvertManager(conn.clientManager || "");
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Convert this Lead/Prospect into an Active Accounting Client"
                              >
                                <UserCheck size={12} /> Convert to Client
                              </button>

                              <Link href={`/practice/proposals?clientId=${conn.id}`}>
                                <span className="p-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded text-slate-500 hover:text-purple-600 inline-flex items-center cursor-pointer" title="Send Letter of Engagement / Proposal">
                                  <FileSignature size={13} />
                                </span>
                              </Link>
                            </div>
                          ) : (
                            <Link href={`/practice/clients/${conn.id}`}>
                              <span className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold cursor-pointer text-xs">
                                360 Workspace <ChevronRight size={13} />
                              </span>
                            </Link>
                          )}
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
            totalItems={filteredConnections.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
            itemName="Connections"
          />
        </div>

        {/* ========================================================================= */}
        {/* CONVERT TO CLIENT MODAL (Capium Article #9000235439)                      */}
        {/* ========================================================================= */}
        {convertModalClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                <UserCheck size={20} />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Convert Lead to Active Client
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                You are about to convert <strong className="text-slate-900 dark:text-white">{convertModalClient.clientName}</strong> from a sales prospect into an official accounting client.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700/60 space-y-2 mb-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <Check size={14} /> Automatically calculates statutory deadlines (Accounts, CT600, CS01)
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <Check size={14} /> Initializes KYC & Onboarding Compliance Checklist
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <Check size={14} /> Enables direct access to Client 360 Workspace
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Client Manager *
                  </label>
                  <select
                    value={convertManager}
                    onChange={(e) => setConvertManager(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="">Select Team Member</option>
                    {teamMembers.map((m: any) => {
                      const mName = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.name || m.email;
                      return <option key={m.id} value={mName}>{mName} ({m.role || "Staff"})</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertModalClient(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConvert}
                  disabled={convertClientMutation.isPending}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {convertClientMutation.isPending && <RefreshCw size={12} className="animate-spin" />}
                  Confirm Conversion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NEW LEAD / PROSPECT MODAL (Article #9000235439)                           */}
        {/* ========================================================================= */}
        {isNewConnectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-xl my-8 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-[#5c469c]" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Log New Prospect / Lead into CRM
                  </h3>
                </div>
                <button
                  onClick={() => setIsNewConnectionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveConnection} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Companies House Search for Leads */}
                <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 p-3 rounded-lg">
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                    UK Companies House Lookup
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Company Name or Reg No..."
                      value={newConnForm.company}
                      onChange={(e) => setNewConnForm({ ...newConnForm, company: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCompaniesHouseLookup}
                      disabled={isLookingUpCH}
                      className="px-3 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isLookingUpCH ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                      Search
                    </button>
                  </div>

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
                            <div className="text-[10px] text-slate-400">CRN: {comp.company_number}</div>
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
                      Company / Deal Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newConnForm.company}
                      onChange={(e) => setNewConnForm({ ...newConnForm, company: e.target.value })}
                      placeholder="e.g. Apex Consulting Ltd"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person Name
                    </label>
                    <input
                      type="text"
                      value={newConnForm.name}
                      onChange={(e) => setNewConnForm({ ...newConnForm, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pipeline Stage *
                    </label>
                    <select
                      value={newConnForm.pipelineStage}
                      onChange={(e) => setNewConnForm({ ...newConnForm, pipelineStage: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden font-semibold"
                    >
                      <option value="Lead">Lead (Inbound inquiry)</option>
                      <option value="Prospect">Prospect (Under negotiation)</option>
                      <option value="Proposal">Proposal / LoE Sent</option>
                      <option value="Client">Direct Client (Won)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lead Acquisition Source *
                    </label>
                    <select
                      value={newConnForm.source}
                      onChange={(e) => setNewConnForm({ ...newConnForm, source: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    >
                      {LEAD_SOURCES.map((s, idx) => (
                        <option key={idx} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={newConnForm.email}
                      onChange={(e) => setNewConnForm({ ...newConnForm, email: e.target.value })}
                      placeholder="contact@lead.com"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={newConnForm.phone}
                      onChange={(e) => setNewConnForm({ ...newConnForm, phone: e.target.value })}
                      placeholder="+44 20 1234 5678"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Est. Annual Turnover (£)
                    </label>
                    <input
                      type="number"
                      value={newConnForm.turnover}
                      onChange={(e) => setNewConnForm({ ...newConnForm, turnover: e.target.value })}
                      placeholder="e.g. 250000"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Fee / Deal Value (£)
                    </label>
                    <input
                      type="number"
                      value={newConnForm.dealValue}
                      onChange={(e) => setNewConnForm({ ...newConnForm, dealValue: e.target.value })}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Employee Count
                    </label>
                    <input
                      type="number"
                      value={newConnForm.employeeCount}
                      onChange={(e) => setNewConnForm({ ...newConnForm, employeeCount: e.target.value })}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Sales Rep / Manager
                    </label>
                    <select
                      value={newConnForm.clientManager}
                      onChange={(e) => setNewConnForm({ ...newConnForm, clientManager: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    >
                      <option value="">Select Team Member</option>
                      {teamMembers.map((m: any) => {
                        const mName = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.name || m.email;
                        return <option key={m.id} value={mName}>{mName}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewConnectionModalOpen(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createConnectionMutation.isPending}
                    className="px-4 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {createConnectionMutation.isPending && <RefreshCw size={12} className="animate-spin" />}
                    Save Lead to Pipeline
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
