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
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import TablePagination from "../../components/common/TablePagination";

// Default Services Available in Practice
const DEFAULT_SERVICES = [
  { id: "mtd-it", title: "MTD - IT", frequency: "Yearly", cost: 35, type: "Default" },
  { id: "ct600", title: "Company Tax Return (CT600)", frequency: "Yearly", cost: 35, type: "Default" },
  { id: "sa100", title: "Self-Assessment (SA100)", frequency: "Yearly", cost: 25, type: "Default" },
  { id: "accounts", title: "Company Accounts (FRS 102/105)", frequency: "Yearly", cost: 15, type: "Default" },
  { id: "cs01", title: "Confirmation Statement (CS01)", frequency: "Yearly", cost: 35, type: "Default" },
  { id: "sole-trader", title: "Sole Trader Accounts", frequency: "Yearly", cost: 25, type: "Default" },
  { id: "payroll", title: "Payroll RTI", frequency: "Monthly", cost: 45, type: "Default" },
  { id: "vat", title: "Bookkeeping & MTD VAT", frequency: "Quarterly", cost: 60, type: "Default" },
];

export default function CrmConnectionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [connectionsViewMode, setConnectionsViewMode] = useState<"list" | "status">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClientType, setFilterClientType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<number[]>([]);
  const [isNewConnectionModalOpen, setIsNewConnectionModalOpen] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortOptions = [
    { label: "Created Date", value: "createdAt" },
    { label: "Client Name", value: "clientName" },
    { label: "Client Type", value: "clientType" },
    { label: "Email", value: "email" },
    { label: "Company Reg No", value: "registrationNumber" },
    { label: "Status", value: "tradingStatus" },
  ];

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

  // Modal Sub-Tab: "details" | "services"
  const [modalTab, setModalTab] = useState<"details" | "services">("details");

  // New Connection Form State
  const [newConnForm, setNewConnForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    companyNumber: "",
    clientType: "Limited",
    email: "",
    phone: "",
    source: "LinkedIn",
    employeeCount: "",
    turnover: "",
    status: "Trading",
    address: "",
    postcode: "",
    nextCsDue: "",
    nextAccountsDue: "",
    businessStartDate: "",
    bookStartDate: "",
    yearEnd: "",
    sicCode: "",
    chDataJson: "",
  });

  // Services State in Modal
  const [selectedServices, setSelectedServices] = useState<string[]>(["accounts", "ct600", "cs01"]);
  const [customServicesList, setCustomServicesList] = useState<any[]>(DEFAULT_SERVICES);
  const [newServiceForm, setNewServiceForm] = useState({
    title: "",
    frequency: "Monthly",
    cost: "",
  });

  // Companies House Lookup State & Results Dropdown
  const [isLookingUpCH, setIsLookingUpCH] = useState(false);
  const [chSearchResults, setChSearchResults] = useState<any[]>([]);
  const [showChDropdown, setShowChDropdown] = useState(false);

  // Fetch Clients / Connections
  const { data: clientsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Create Connection Mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/pm/clients", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      toast({ title: "Connection Added", description: "New connection & subscribed services recorded." });
      setIsNewConnectionModalOpen(false);
      setNewConnForm({
        firstName: "",
        lastName: "",
        company: "",
        companyNumber: "",
        clientType: "Limited",
        email: "",
        phone: "",
        source: "LinkedIn",
        employeeCount: "",
        turnover: "",
        status: "Trading",
        address: "",
        postcode: "",
        nextCsDue: "",
        nextAccountsDue: "",
        businessStartDate: "",
        bookStartDate: "",
        yearEnd: "",
        sicCode: "",
        chDataJson: "",
      });
      setChSearchResults([]);
      setShowChDropdown(false);
      setModalTab("details");
    },
    onError: (err: any) => {
      toast({ title: "Failed to add connection", description: err.message, variant: "destructive" });
    }
  });

  // Apply selected Companies House match to form
  const handleSelectChCompany = async (comp: any) => {
    setIsLookingUpCH(true);
    setShowChDropdown(false);
    try {
      const crn = comp.company_number || comp.companyNumber;
      let fullProfile = comp;
      let dirFirst = "";
      let dirLast = "";

      if (crn) {
        const pRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}`);
        if (pRes.ok) {
          fullProfile = await pRes.json();
        }

        try {
          const offRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/officers`);
          if (offRes.ok) {
            const offData = await offRes.json();
            fullProfile.officers = offData.items || [];
            const primaryOfficer = (offData.items || [])[0];
            if (primaryOfficer && primaryOfficer.name) {
              let rawName = primaryOfficer.name || "";
              if (rawName.includes(",")) {
                const parts = rawName.split(",");
                dirLast = parts[0].trim();
                dirFirst = parts[1].trim();
              } else {
                const parts = rawName.split(" ");
                if (parts.length > 1) {
                  dirLast = parts.pop() || "";
                  dirFirst = parts.join(" ");
                } else {
                  dirFirst = parts[0];
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const cType = (fullProfile.company_type || "").toLowerCase();
      const mappedType = cType.includes("llp") ? "Partnership" : cType.includes("sole") ? "SoleTrader" : "Limited";

      const roa = fullProfile.registered_office_address || {};
      const addressLines = [roa.address_line_1, roa.address_line_2, roa.locality].filter(Boolean).join(", ");
      const postcode = roa.postal_code || "";
      const nextCsDue = fullProfile.confirmation_statement?.next_due || "";
      const nextAccountsDue = fullProfile.accounts?.next_accounts?.due_on || "";

      // Format Creation Dates
      const rawCreationDate = fullProfile.date_of_creation || "";
      let formattedCreationDate = rawCreationDate;
      if (rawCreationDate.includes("-")) {
        const parts = rawCreationDate.split("-");
        if (parts.length === 3) {
          formattedCreationDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      const businessStartDate = formattedCreationDate || rawCreationDate || "";
      const bookStartDate = formattedCreationDate || rawCreationDate || "";

      // Extract Year End (DD/MM)
      const accRefDay = fullProfile.accounts?.accounting_reference_date?.day;
      const accRefMonth = fullProfile.accounts?.accounting_reference_date?.month;
      let yearEnd = "";
      if (accRefDay && accRefMonth) {
        yearEnd = `${String(accRefDay).padStart(2, "0")}/${String(accRefMonth).padStart(2, "0")}`;
      } else if (fullProfile.accounts?.next_accounts?.period_end_on) {
        const parts = fullProfile.accounts.next_accounts.period_end_on.split("-");
        if (parts.length === 3) yearEnd = `${parts[2]}/${parts[1]}`;
      }

      const sicCodes = (fullProfile.sic_codes || []).join(", ");

      setNewConnForm(prev => ({
        ...prev,
        company: fullProfile.company_name || fullProfile.title || prev.company,
        companyNumber: fullProfile.company_number || prev.companyNumber,
        clientType: mappedType,
        firstName: dirFirst || prev.firstName,
        lastName: dirLast || prev.lastName,
        address: addressLines || prev.address,
        postcode: postcode || prev.postcode,
        nextCsDue: nextCsDue || prev.nextCsDue,
        nextAccountsDue: nextAccountsDue || prev.nextAccountsDue,
        businessStartDate: businessStartDate || prev.businessStartDate,
        bookStartDate: bookStartDate || prev.bookStartDate,
        yearEnd: yearEnd || prev.yearEnd,
        sicCode: sicCodes || prev.sicCode,
        chDataJson: JSON.stringify(fullProfile),
      }));

      toast({
        title: "Companies House Match Applied",
        description: `Loaded: ${fullProfile.company_name || fullProfile.title} (CRN: ${fullProfile.company_number || "N/A"})`,
      });
    } catch (e: any) {
      toast({ title: "Lookup Error", description: e.message || "Failed to load company details.", variant: "destructive" });
    } finally {
      setIsLookingUpCH(false);
    }
  };

  // Companies House Quick Lookup
  const handleCompaniesHouseLookup = async () => {
    const term = newConnForm.company || newConnForm.companyNumber;
    if (!term) {
      toast({ title: "Lookup Required", description: "Please enter a Company Name or CRN to lookup.", variant: "destructive" });
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
          toast({ title: "Companies House Matches", description: `Found ${items.length} matching companies. Select below.` });
        } else {
          toast({ title: "No Company Found", description: "No matching company found on Companies House.", variant: "destructive" });
        }
      } else {
        const err = await res.json();
        toast({ title: "Search Error", description: err.message || "Failed to search Companies House API.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Lookup Notice", description: "Companies House lookup completed." });
    } finally {
      setIsLookingUpCH(false);
    }
  };

  // Add Custom Service
  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceForm.title) {
      toast({ title: "Validation Error", description: "Service title is required.", variant: "destructive" });
      return;
    }
    const newId = `custom-${Date.now()}`;
    const newSvc = {
      id: newId,
      title: newServiceForm.title,
      frequency: newServiceForm.frequency,
      cost: parseFloat(newServiceForm.cost) || 0,
      type: "Custom",
    };
    setCustomServicesList(prev => [...prev, newSvc]);
    setSelectedServices(prev => [...prev, newId]);
    setNewServiceForm({ title: "", frequency: "Monthly", cost: "" });
    toast({ title: "Service Added", description: `Added '${newSvc.title}' to selection list.` });
  };

  // Toggle Service Checkbox
  const toggleServiceSelect = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Date Formatter
  const formatDate = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (clientsList.length === 0) return;
    const headers = ["Name", "Company", "Type", "Email", "Phone", "Company Reg No", "Created On", "Source", "Status"];
    const rows = clientsList.map((c: any) => [
      `"${(c.clientName || "").replace(/"/g, '""')}"`,
      `"${(c.clientName || "").replace(/"/g, '""')}"`,
      c.clientType || "Limited",
      c.email || "",
      c.phone || "",
      c.registrationNumber || "",
      formatDate(c.createdAt),
      "Direct / Referral",
      c.tradingStatus || "Active"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CRM_Connections_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "CRM Connections exported to CSV." });
  };

  // Filtered Connections
  const filteredConnections = useMemo(() => {
    return clientsList.filter((c: any) => {
      if (filterClientType !== "All" && c.clientType?.toLowerCase() !== filterClientType.toLowerCase()) {
        return false;
      }
      if (filterStatus !== "All" && c.tradingStatus?.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.clientName || "").toLowerCase().includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").toLowerCase().includes(q);
        const matchReg = (c.registrationNumber || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchReg) return false;
      }
      return true;
    });
  }, [clientsList, filterClientType, filterStatus, searchQuery]);

  // Sorted Connections
  const sortedConnections = useMemo(() => {
    const list = [...filteredConnections];
    list.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "createdAt") {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredConnections, sortField, sortOrder]);

  // Paginated Connections
  const paginatedConnections = useMemo(() => {
    if (pageSize >= 999999 || pageSize >= sortedConnections.length) {
      return sortedConnections;
    }
    const start = (currentPage - 1) * pageSize;
    return sortedConnections.slice(start, start + pageSize);
  }, [sortedConnections, currentPage, pageSize]);

  const toggleSelectAll = () => {
    const pageIds = paginatedConnections.map((c: any) => c.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedConnectionIds.includes(id));
    if (allSelected) {
      setSelectedConnectionIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedConnectionIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedConnectionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Save Modal Form
  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = [newConnForm.firstName, newConnForm.lastName].filter(Boolean).join(" ");
    const finalClientName = newConnForm.company || fullName || "New Connection";
    
    if (!newConnForm.firstName && !newConnForm.company) {
      toast({ title: "Validation Error", description: "First Name or Company Name is required.", variant: "destructive" });
      return;
    }

    createConnectionMutation.mutate({
      clientName: finalClientName,
      clientType: newConnForm.clientType,
      registrationNumber: newConnForm.companyNumber || undefined,
      email: newConnForm.email || undefined,
      phone: newConnForm.phone || undefined,
      tradingStatus: newConnForm.status || "Trading",
      industry: newConnForm.source,
      address: newConnForm.address || undefined,
      postcode: newConnForm.postcode || undefined,
      nextCsDue: newConnForm.nextCsDue || undefined,
      nextAccountsDue: newConnForm.nextAccountsDue || undefined,
      businessStartDate: newConnForm.businessStartDate || undefined,
      bookStartDate: newConnForm.bookStartDate || undefined,
      yearEnd: newConnForm.yearEnd || undefined,
      sicCode: newConnForm.sicCode || undefined,
      chDataJson: newConnForm.chDataJson || undefined,
      services: selectedServices,
      customFieldsJson: JSON.stringify({
        firstName: newConnForm.firstName,
        lastName: newConnForm.lastName,
        employeeCount: newConnForm.employeeCount,
        turnover: newConnForm.turnover,
        servicesCount: selectedServices.length,
      }),
    });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        <div className="p-6 space-y-4">
          
          {/* Filter & Action Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left View Mode & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 text-xs">
                <button
                  onClick={() => setConnectionsViewMode("list")}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    connectionsViewMode === "list"
                      ? "bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-400 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setConnectionsViewMode("status")}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    connectionsViewMode === "status"
                      ? "bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-400 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  By Status
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Quick Search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-56"
                />
              </div>
            </div>

            {/* Middle Filters & Right Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterClientType}
                onChange={(e) => {
                  setFilterClientType(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[140px]"
              >
                <option value="All">Client-Type - All</option>
                <option value="Limited">Limited Company</option>
                <option value="SoleTrader">Sole Trader</option>
                <option value="Individual">Individual</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[130px]"
              >
                <option value="All">Status - All</option>
                <option value="Trading">Active / Trading</option>
                <option value="Lead">Lead</option>
                <option value="Prospect">Prospect</option>
                <option value="Dormant">Dormant</option>
              </select>

              <button
                onClick={() => toast({ title: "Import Wizard", description: "Upload CSV to import connection records." })}
                className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
              >
                Import Connections
              </button>

              <button
                onClick={() => { setIsNewConnectionModalOpen(true); setModalTab("details"); }}
                className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> New Connection
              </button>

              <button
                onClick={handleExportCsv}
                className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors shadow-xs cursor-pointer"
              >
                Export
              </button>
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
                      Name {renderSortIndicator("clientName")}
                    </th>
                    <th
                      onClick={() => handleSort("clientName")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Company {renderSortIndicator("clientName")}
                    </th>
                    <th
                      onClick={() => handleSort("clientType")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Type {renderSortIndicator("clientType")}
                    </th>
                    <th
                      onClick={() => handleSort("email")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Email {renderSortIndicator("email")}
                    </th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th
                      onClick={() => handleSort("registrationNumber")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Company Reg No {renderSortIndicator("registrationNumber")}
                    </th>
                    <th
                      onClick={() => handleSort("createdAt")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Created On {renderSortIndicator("createdAt")}
                    </th>
                    <th className="py-2.5 px-3">Source</th>
                    <th
                      onClick={() => handleSort("tradingStatus")}
                      className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-700"
                    >
                      Status {renderSortIndicator("tradingStatus")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400 font-medium text-xs">
                        <RefreshCw size={20} className="animate-spin text-purple-600 mx-auto mb-2" />
                        Loading connections...
                      </td>
                    </tr>
                  ) : paginatedConnections.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                        No Records found
                      </td>
                    </tr>
                  ) : (
                    paginatedConnections.map((conn: any) => (
                      <tr key={conn.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedConnectionIds.includes(conn.id)}
                            onChange={() => toggleSelectId(conn.id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          <Link href={`/practice/clients/${conn.id}`}>
                            <span className="text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200 cursor-pointer underline-offset-2 hover:underline">
                              {conn.clientName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <Link href={`/practice/clients/${conn.id}`}>
                            <span className="cursor-pointer hover:text-purple-600">
                              {conn.clientName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {conn.clientType || "Limited"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {conn.email || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {conn.phone || "-"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {conn.registrationNumber || "-"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {formatDate(conn.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {conn.industry || "LinkedIn"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {conn.tradingStatus || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Universal Table Pagination */}
            <TablePagination
              totalItems={filteredConnections.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[25, 50, 75, 100, "All"]}
              itemName="Clients"
              sortBy={sortField}
              sortOrder={sortOrder}
              onSortChange={(field, order) => {
                setSortField(field);
                setSortOrder(order);
                setCurrentPage(1);
              }}
              sortOptions={sortOptions}
            />
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CONNECTION INFORMATION (Screenshots 1 & 2) */}
      {/* ========================================================= */}
      {isNewConnectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Connection Information
              </h3>
              <button onClick={() => setIsNewConnectionModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Modal Sub-Tabs: Connection Details | Services */}
            <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-8 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setModalTab("details")}
                className={`py-2 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  modalTab === "details"
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Connection Details
                {modalTab === "details" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("services")}
                className={`py-2 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
                  modalTab === "services"
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Services
                {modalTab === "services" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full" />
                )}
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* ------------------------------------------------ */}
              {/* TAB 1: CONNECTION DETAILS (Screenshot 1) */}
              {/* ------------------------------------------------ */}
              {modalTab === "details" && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">First Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Type in First Name"
                      value={newConnForm.firstName}
                      onChange={(e) => setNewConnForm({ ...newConnForm, firstName: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                    <input
                      type="text"
                      placeholder="Type in Last Name"
                      value={newConnForm.lastName}
                      onChange={(e) => setNewConnForm({ ...newConnForm, lastName: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-start">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 pt-2">Company</label>
                    <div className="col-span-2 space-y-1 relative">
                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder="Type in Company or Search Companies House"
                          value={newConnForm.company}
                          onChange={(e) => {
                            setNewConnForm({ ...newConnForm, company: e.target.value });
                            if (showChDropdown) setShowChDropdown(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCompaniesHouseLookup();
                            }
                          }}
                          className="flex-1 border border-slate-300 dark:border-slate-700 rounded-l p-2 bg-white dark:bg-slate-800 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleCompaniesHouseLookup}
                          disabled={isLookingUpCH}
                          title="Search Companies House UK"
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-3 py-2 rounded-r flex items-center justify-center cursor-pointer transition"
                        >
                          <Search size={14} className={isLookingUpCH ? "animate-spin" : ""} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Hint: Client name should be maximum of 50 characters (Press Enter or click search to fetch)</p>

                      {/* Companies House Results Dropdown */}
                      {showChDropdown && chSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                            <span>Companies House Matches ({chSearchResults.length})</span>
                            <button type="button" onClick={() => setShowChDropdown(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={12} />
                            </button>
                          </div>
                          {chSearchResults.map((comp: any) => (
                            <button
                              key={comp.company_number || comp.title}
                              type="button"
                              onClick={() => handleSelectChCompany(comp)}
                              className="w-full text-left p-2.5 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 transition flex flex-col gap-0.5 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                  {comp.company_name || comp.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-mono font-bold">
                                  {comp.company_number}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="capitalize text-emerald-600 font-semibold">{comp.company_status || "Active"}</span>
                                <span>•</span>
                                <span className="uppercase">{comp.company_type || "LTD"}</span>
                                {comp.address_snippet && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px]">{comp.address_snippet}</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-start">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 pt-2">Company registration No</label>
                    <div className="col-span-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Type In Company registration No"
                        value={newConnForm.companyNumber}
                        onChange={(e) => setNewConnForm({ ...newConnForm, companyNumber: e.target.value })}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                      />
                      <p className="text-[10px] text-slate-400">Tip: Registration Number should only be 8 digits (eg. 12345678 or Ab123456)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Type of Business <span className="text-rose-500">*</span></label>
                    <select
                      value={newConnForm.clientType}
                      onChange={(e) => setNewConnForm({ ...newConnForm, clientType: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="Limited">Limited</option>
                      <option value="SoleTrader">Sole Trader</option>
                      <option value="Partnership">Partnership</option>
                      <option value="LLP">LLP</option>
                      <option value="Individual">Individual</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Email <span className="text-rose-500">*</span></label>
                    <input
                      type="email"
                      placeholder="Type In Email"
                      value={newConnForm.email}
                      onChange={(e) => setNewConnForm({ ...newConnForm, email: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                    <input
                      type="text"
                      placeholder="Type In Phone Number"
                      value={newConnForm.phone}
                      onChange={(e) => setNewConnForm({ ...newConnForm, phone: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Source <span className="text-rose-500">*</span></label>
                    <select
                      value={newConnForm.source}
                      onChange={(e) => setNewConnForm({ ...newConnForm, source: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Event">Event</option>
                      <option value="Partner">Partner</option>
                      <option value="Cold Outreach">Cold Outreach</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">No. of Employees</label>
                    <input
                      type="text"
                      placeholder="Type In No. of Employee"
                      value={newConnForm.employeeCount}
                      onChange={(e) => setNewConnForm({ ...newConnForm, employeeCount: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">TurnOver (£)</label>
                    <input
                      type="text"
                      placeholder="Type in TurnOver"
                      value={newConnForm.turnover}
                      onChange={(e) => setNewConnForm({ ...newConnForm, turnover: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* ------------------------------------------------ */}
              {/* TAB 2: SERVICES (Screenshot 2) */}
              {/* ------------------------------------------------ */}
              {modalTab === "services" && (
                <div className="space-y-4">
                  
                  {/* Services Checklist Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Service Title</th>
                          <th className="py-2 px-3">Frequency</th>
                          <th className="py-2 px-3">Cost (£)</th>
                          <th className="py-2 px-3">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customServicesList.map((svc: any) => {
                          const isChecked = selectedServices.includes(svc.id);
                          return (
                            <tr key={svc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleServiceSelect(svc.id)}
                                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{svc.title}</td>
                              <td className="py-2 px-3 text-slate-500">{svc.frequency}</td>
                              <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">{svc.cost}</td>
                              <td className="py-2 px-3 text-purple-600 font-medium">{svc.type}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Custom Service Form */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 block">Add Custom Engagement Service</span>
                    
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="font-semibold text-slate-600 dark:text-slate-400">Service Title *</label>
                      <input
                        type="text"
                        placeholder="Type in custom service title"
                        value={newServiceForm.title}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, title: e.target.value })}
                        className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="font-semibold text-slate-600 dark:text-slate-400">Frequency</label>
                      <select
                        value={newServiceForm.frequency}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, frequency: e.target.value })}
                        className="col-span-2 border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                        <option value="One-Off">One-Off</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-center">
                      <label className="font-semibold text-slate-600 dark:text-slate-400">Cost (£)</label>
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Type in cost"
                          value={newServiceForm.cost}
                          onChange={(e) => setNewServiceForm({ ...newServiceForm, cost: e.target.value })}
                          className="flex-1 border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomService}
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setIsNewConnectionModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={createConnectionMutation.isPending}
                className="px-6 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {createConnectionMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

    </AppLayout>
  );
}
