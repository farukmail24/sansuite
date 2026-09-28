import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  Shield, Building2, FilePlus, Search, Download, ExternalLink,
  Plus, Calendar, AlertTriangle, CheckCircle2,
  Users, FileText, Trash2, RefreshCw, Clock, Settings,
  Send, Check, X, Filter, Landmark, AlertCircle,
  Archive, ArchiveRestore, ArrowUpRight, RotateCcw,
  SlidersHorizontal, CheckSquare
} from "lucide-react";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";

const sidebar = [
  { label: "Action Station", icon: <Shield size={15} />, route: "/company-secretarial" },
  { label: "Companies", icon: <Building2 size={15} />, route: "/company-secretarial?tab=companies" },
  { label: "People", icon: <Users size={15} />, route: "/company-secretarial?tab=people" },
  { label: "Formations", icon: <FilePlus size={15} />, route: "/company-secretarial?tab=formations" },
  { label: "Submissions", icon: <Send size={15} />, route: "/company-secretarial?tab=submissions" },
];

export default function CompanySecretarialHome() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "dashboard";
  const { toast } = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");

  // Capium Article 9000202625: Sub-tab states for Companies and People
  const [companySubTab, setCompanySubTab] = useState<"live" | "archived" | "all">("live");
  const [peopleSubTab, setPeopleSubTab] = useState<"live" | "archived" | "all">("live");
  const [peopleRoleFilter, setPeopleRoleFilter] = useState<"all" | "Officer" | "Shareholder" | "PSC">("all");

  // Action Station Filters
  const [deadlineUrgencyFilter, setDeadlineUrgencyFilter] = useState<"all" | "overdue" | "due30" | "upcoming">("all");
  const [deadlineTaskFilter, setDeadlineTaskFilter] = useState<"all" | "cs01" | "accounts">("all");

  // Modals state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [addMode, setAddMode] = useState<"ch_download" | "type_own">("ch_download");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // CH Download state
  const [chCompanyNumber, setChCompanyNumber] = useState("");
  const [chFilingCode, setChFilingCode] = useState("");
  const [chPreviewData, setChPreviewData] = useState<any>(null);
  const [isSearchingCh, setIsSearchingCh] = useState(false);

  // Type Own Data state
  const [manualForm, setManualForm] = useState({
    companyName: "",
    companyType: "Limited",
    companyRegNo: "",
    registeredAddress: "",
    country: "United Kingdom",
    sicCode: "62020",
    registeredEmail: "",
    tradingStatus: "Trading",
  });

  // 1. Query Companies from dedicated CoSec registry (Rule #5 & Capium 9000200190)
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["/api/company-secretarial/companies", companySubTab, search],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/company-secretarial/companies?tab=${companySubTab}&search=${encodeURIComponent(search.trim())}`);
      if (!res.ok) return { companies: [], counts: { total: 0, live: 0, archived: 0 } };
      return res.json();
    },
  });

  const companiesList: any[] = companiesData?.companies || [];
  const companyCounts = companiesData?.counts || { total: 0, live: 0, archived: 0 };

  // 2. Query Deadlines for Action Station
  const { data: deadlinesData, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ["/api/company-secretarial/deadlines"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/deadlines");
      if (!res.ok) return { deadlines: [], counts: { totalCompanies: 0, csDueSoon: 0, accountsDueSoon: 0, overdueTotal: 0 } };
      return res.json();
    },
  });

  // 3. Query Filings / Submissions
  const { data: filings = [], isLoading: isLoadingFilings } = useQuery({
    queryKey: ["/api/company-secretarial/filings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/filings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 4. Query Settings
  const { data: settingsData } = useQuery({
    queryKey: ["/api/company-secretarial/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/settings");
      if (!res.ok) return { settings: null };
      return res.json();
    },
  });

  // 5. Query People Directory
  const { data: people = [], isLoading: isLoadingPeople } = useQuery<any[]>({
    queryKey: ["/api/company-secretarial/people"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/people");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutations
  const rollDeadline = useMutation({
    mutationFn: async ({ clientId, taskType }: { clientId: number; taskType: string }) => {
      const res = await apiRequest("POST", "/api/company-secretarial/deadlines/roll", { clientId, taskType });
      if (!res.ok) throw new Error("Failed to roll deadline");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Deadline Rolled Forward", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  // Dedicated CoSec Archive Mutation (Capium Article 9000202625)
  const archiveCompany = useMutation({
    mutationFn: async ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      const res = await apiRequest("POST", `/api/company-secretarial/archive/${id}`, { isArchived });
      if (!res.ok) throw new Error("Failed to update archive status");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      toast({
        title: vars.isArchived ? "Company Archived" : "Company Restored",
        description: vars.isArchived
          ? "The company has been moved to Archived Companies."
          : "The company has been restored to Live Companies.",
        type: "success",
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  // Dedicated CoSec Cascade Delete (Capium Article 9000202625)
  const deleteCompany = useMutation({
    mutationFn: async (id: number) => {
      const isConfirmed = await confirm({
        title: "Delete Company Permanently",
        description: "Are you sure you want to delete this company and all its secretarial registers (officers, shareholders, PSCs, filings)? This cannot be undone.",
        confirmText: "Delete Permanently",
        variant: "danger",
      });
      if (!isConfirmed) throw new Error("Cancelled");

      const res = await apiRequest("DELETE", `/api/company-secretarial/company/${id}`);
      if (!res.ok) throw new Error("Failed to delete company");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      toast({ title: "Company Deleted", description: "Company and all associated registers removed cleanly." });
    },
    onError: (e: any) => {
      if (e.message !== "Cancelled") {
        toast({ title: "Error", description: e.message, type: "error" });
      }
    },
  });

  const syncCompanyData = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/company-secretarial/sync-ch/${clientId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to sync from Companies House");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sync Successful", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/people"] });
    },
    onError: (e: any) => toast({ title: "Sync Failed", description: e.message, type: "error" }),
  });

  // Handle Companies House Lookup for Download Modal
  const handleLookupCh = async () => {
    if (!chCompanyNumber.trim()) {
      toast({ title: "Company Number Required", description: "Please enter an 8-digit UK company number.", type: "error" });
      return;
    }
    setIsSearchingCh(true);
    setChPreviewData(null);
    try {
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(chCompanyNumber.trim())}/all`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Company not found on Companies House.");
      }
      const data = await res.json();
      setChPreviewData(data);
    } catch (e: any) {
      toast({ title: "Lookup Failed", description: e.message, type: "error" });
    } finally {
      setIsSearchingCh(false);
    }
  };

  // Import from Companies House directly via CoSec endpoint (Rule #5)
  const importFromCh = useMutation({
    mutationFn: async () => {
      if (!chPreviewData?.profile) throw new Error("No company data previewed.");
      const profile = chPreviewData.profile;
      const roa = profile.registered_office_address || {};
      const regAddress = [roa.address_line_1, roa.address_line_2, roa.locality, roa.postal_code, roa.country].filter(Boolean).join(", ");

      const clientRes = await apiRequest("POST", "/api/company-secretarial/companies", {
        companyName: profile.company_name,
        companyType: profile.type || "Limited",
        companyRegNo: profile.company_number,
        registeredAddress: regAddress,
        registeredEmail: profile.email || "",
        country: roa.country || "United Kingdom",
        sicCode: (profile.sic_codes && profile.sic_codes[0]) || "62020",
        authCode: chFilingCode || "",
        tradingStatus: profile.company_status === "active" ? "Trading" : "Dormant",
      });
      if (!clientRes.ok) {
        const err = await clientRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create company in secretarial registry");
      }
      const clientData = await clientRes.json();
      const newClientId = clientData.id || clientData.clientId;

      // Sync full bundle (officers, PSCs, accounts/CS dates)
      await apiRequest("POST", `/api/company-secretarial/sync-ch/${newClientId}`);

      return newClientId;
    },
    onSuccess: (newClientId) => {
      toast({ title: "Company Downloaded", description: "Company imported from Companies House with all officers and dates.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/people"] });
      setShowAddCompanyModal(false);
      setChCompanyNumber("");
      setChFilingCode("");
      setChPreviewData(null);
      navigate(`/company-secretarial/${newClientId}`);
    },
    onError: (e: any) => toast({ title: "Download Failed", description: e.message, type: "error" }),
  });

  // Save manual company directly via CoSec endpoint (Rule #5)
  const saveManualCompany = useMutation({
    mutationFn: async () => {
      if (!manualForm.companyName.trim()) throw new Error("Company Name is required");
      if (!manualForm.registeredAddress.trim()) throw new Error("Registered Office Address is required");

      const res = await apiRequest("POST", "/api/company-secretarial/companies", manualForm);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create company");
      }
      const data = await res.json();
      return data.id || data.clientId;
    },
    onSuccess: (newClientId) => {
      toast({ title: "Company Created", description: "New corporate client added successfully.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      setShowAddCompanyModal(false);
      setManualForm({
        companyName: "",
        companyType: "Limited",
        companyRegNo: "",
        registeredAddress: "",
        country: "United Kingdom",
        sicCode: "62020",
        registeredEmail: "",
        tradingStatus: "Trading",
      });
      navigate(`/company-secretarial/${newClientId}`);
    },
    onError: (e: any) => toast({ title: "Creation Failed", description: e.message, type: "error" }),
  });

  const deadlines: any[] = deadlinesData?.deadlines || [];
  const deadlineCounts = deadlinesData?.counts || {
    totalCompanies: companyCounts.total,
    csDueSoon: 0,
    accountsDueSoon: 0,
    overdueTotal: 0,
  };

  // Filtered Deadlines with Multi-Dimensional Filters
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((item: any) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.companyName?.toLowerCase().includes(q);
        const matchReg = item.companyRegNo?.toLowerCase().includes(q);
        if (!matchName && !matchReg) return false;
      }
      if (deadlineTaskFilter !== "all" && item.taskType !== deadlineTaskFilter) return false;
      if (deadlineUrgencyFilter === "overdue" && item.daysLeft >= 0) return false;
      if (deadlineUrgencyFilter === "due30" && (item.daysLeft < 0 || item.daysLeft > 30)) return false;
      if (deadlineUrgencyFilter === "upcoming" && item.daysLeft <= 30) return false;
      return true;
    });
  }, [deadlines, search, deadlineTaskFilter, deadlineUrgencyFilter]);

  // Filtered People with Capium Live/Archived Sub-tabs & Classification
  const filteredPeople = useMemo(() => {
    return people.filter((p: any) => {
      if (peopleSubTab === "live" && p.isArchived) return false;
      if (peopleSubTab === "archived" && !p.isArchived) return false;
      if (peopleRoleFilter !== "all" && p.type !== peopleRoleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCo = p.companyName?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        if (!matchName && !matchCo && !matchEmail) return false;
      }
      return true;
    });
  }, [people, peopleSubTab, peopleRoleFilter, search]);

  const handleExportCompanies = () => {
    if (companiesList.length === 0) {
      toast({ title: "Export Failed", description: "No company data available to export.", type: "error" });
      return;
    }
    const headers = ["Company Name", "Registration No", "Company Type", "Trading Status", "Address", "CS01 Due", "Accounts Due", "Archived"];
    const csvContent = [
      headers.join(","),
      ...companiesList.map((c: any) =>
        `"${c.clientName || ""}","${c.registrationNumber || ""}","${c.clientType || "Limited"}","${c.tradingStatus || "Trading"}","${(c.address || "").replace(/"/g, '""')}","${c.nextConfirmationDue || ""}","${c.nextAccountsDue || ""}","${c.isArchived ? "Yes" : "No"}"`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sansuite_companies_${companySubTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAnyDeadlineFilterActive = deadlineUrgencyFilter !== "all" || deadlineTaskFilter !== "all" || search.trim() !== "";

  return (
    <AppLayout sidebar={sidebar} module="Company Secretarial">
      <div className="bg-slate-50 min-h-screen pb-16">
        <div className="p-6 w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                {currentTab === "dashboard" && <Shield className="text-indigo-600" size={26} />}
                {currentTab === "companies" && <Building2 className="text-indigo-600" size={26} />}
                {currentTab === "people" && <Users className="text-indigo-600" size={26} />}
                {currentTab === "formations" && <FilePlus className="text-indigo-600" size={26} />}
                {currentTab === "submissions" && <Send className="text-indigo-600" size={26} />}

                {currentTab === "dashboard" && "Action Station & Statutory Compliance"}
                {currentTab === "companies" && "Corporate Clients Directory"}
                {currentTab === "people" && "People & Officers Directory"}
                {currentTab === "formations" && "Company Formations (IN01)"}
                {currentTab === "submissions" && "E-Filing Submissions Trail"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                UK Companies House Secretarial Suite with live CS01 filings, statutory registers, and formation gateway.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings size={14} /> My Office
              </button>
              <button
                onClick={() => {
                  setAddMode("ch_download");
                  setShowAddCompanyModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} /> Download from CH
              </button>
              <button
                onClick={() => {
                  setAddMode("type_own");
                  setShowAddCompanyModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Company
              </button>
              <button
                onClick={() => navigate("/company-secretarial/formations/new")}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FilePlus size={14} /> Start New Formation
              </button>
            </div>
          </div>

          {/* TAB 1: ACTION STATION (HOME / DEADLINES) */}
          {currentTab === "dashboard" && (
            <div className="space-y-6">
              {/* Interactive Metric Cards - Clickable to instantly filter below */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => navigate("/company-secretarial?tab=companies")}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span className="group-hover:text-indigo-600 transition-colors">Managed Companies</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100"><Building2 size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{deadlineCounts.totalCompanies}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Active Entities &bull; Click to view list
                  </div>
                </div>

                <div
                  onClick={() => {
                    setDeadlineTaskFilter("cs01");
                    setDeadlineUrgencyFilter("due30");
                  }}
                  className={`bg-white rounded-xl border p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer ${deadlineTaskFilter === "cs01" && deadlineUrgencyFilter === "due30"
                    ? "border-amber-500 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-amber-300"
                    }`}
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>CS01 Due (30 Days)</span>
                    <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{deadlineCounts.csDueSoon}</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <Clock size={12} /> Click to filter CS01 due
                  </div>
                </div>

                <div
                  onClick={() => {
                    setDeadlineTaskFilter("accounts");
                    setDeadlineUrgencyFilter("due30");
                  }}
                  className={`bg-white rounded-xl border p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer ${deadlineTaskFilter === "accounts" && deadlineUrgencyFilter === "due30"
                    ? "border-purple-500 ring-2 ring-purple-200"
                    : "border-slate-200 hover:border-purple-300"
                    }`}
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>Accounts Due</span>
                    <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Calendar size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{deadlineCounts.accountsDueSoon}</div>
                  <div className="text-[11px] text-purple-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Click to filter Accounts due
                  </div>
                </div>

                <div
                  onClick={() => {
                    setDeadlineUrgencyFilter("overdue");
                    setDeadlineTaskFilter("all");
                  }}
                  className={`bg-white rounded-xl border p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer ${deadlineUrgencyFilter === "overdue"
                    ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 hover:border-rose-300"
                    }`}
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>Overdue Deadlines</span>
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertCircle size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-rose-600">{deadlineCounts.overdueTotal}</div>
                  <div className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    Requires immediate filing &bull; Click to isolate
                  </div>
                </div>
              </div>

              {/* Action Station Deadlines Table with Advanced Filter Bar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={18} className="text-indigo-600" /> Statutory Compliance Deadlines
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory Confirmation Statements (CS01) and Annual Accounts filing schedule.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Live Search */}
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search company or CRN..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    {isAnyDeadlineFilterActive && (
                      <button
                        onClick={() => {
                          setDeadlineUrgencyFilter("all");
                          setDeadlineTaskFilter("all");
                          setSearch("");
                        }}
                        className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1 transition-colors cursor-pointer font-medium"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Urgency & Task Type Filter Pills */}
                <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Urgency:</span>
                    <button
                      onClick={() => setDeadlineUrgencyFilter("all")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${deadlineUrgencyFilter === "all" ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      All ({deadlines.length})
                    </button>
                    <button
                      onClick={() => setDeadlineUrgencyFilter("overdue")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${deadlineUrgencyFilter === "overdue" ? "bg-rose-600 text-white font-semibold" : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"}`}
                    >
                      <AlertCircle size={12} /> Overdue ({deadlineCounts.overdueTotal})
                    </button>
                    <button
                      onClick={() => setDeadlineUrgencyFilter("due30")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${deadlineUrgencyFilter === "due30" ? "bg-amber-600 text-white font-semibold" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}`}
                    >
                      <Clock size={12} /> Due in 30 Days ({deadlines.filter((d: any) => d.daysLeft >= 0 && d.daysLeft <= 30).length})
                    </button>
                    <button
                      onClick={() => setDeadlineUrgencyFilter("upcoming")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${deadlineUrgencyFilter === "upcoming" ? "bg-emerald-600 text-white font-semibold" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"}`}
                    >
                      Upcoming (30+ Days)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Task:</span>
                    <button
                      onClick={() => setDeadlineTaskFilter("all")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${deadlineTaskFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDeadlineTaskFilter("cs01")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${deadlineTaskFilter === "cs01" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      CS01
                    </button>
                    <button
                      onClick={() => setDeadlineTaskFilter("accounts")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${deadlineTaskFilter === "accounts" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      Accounts
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-6">Company</th>
                        <th className="py-3.5 px-6">Statutory Obligation</th>
                        <th className="py-3.5 px-6">Urgency / Countdown</th>
                        <th className="py-3.5 px-6">Due Date</th>
                        <th className="py-3.5 px-6 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {isLoadingDeadlines ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                            Calculating live compliance schedule...
                          </td>
                        </tr>
                      ) : filteredDeadlines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center">
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={24} />
                              </div>
                              <h3 className="text-base font-bold text-slate-800">
                                {isAnyDeadlineFilterActive ? "No Matching Deadlines" : "All Entities Up to Date"}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {isAnyDeadlineFilterActive
                                  ? "No statutory deadlines match your selected filter criteria. Click reset to see all obligations."
                                  : "All managed corporate clients have their Confirmation Statements and Annual Accounts up to date."}
                              </p>
                              <div className="pt-2 flex justify-center gap-2">
                                {isAnyDeadlineFilterActive ? (
                                  <button
                                    onClick={() => {
                                      setDeadlineUrgencyFilter("all");
                                      setDeadlineTaskFilter("all");
                                      setSearch("");
                                    }}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                  >
                                    Clear Active Filters
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAddMode("ch_download");
                                      setShowAddCompanyModal(true);
                                    }}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                  >
                                    + Download Company from Companies House
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDeadlines.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-6">
                              <div
                                className="font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                                onClick={() => navigate(`/company-secretarial/${item.clientId}`)}
                              >
                                {item.companyName}
                                <ArrowUpRight size={13} className="text-slate-400" />
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>CRN: <strong className="text-slate-600 font-mono">{item.companyRegNo || "Pending"}</strong></span>
                                {item.registeredEmail && <span>&bull; {item.registeredEmail}</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${item.taskType === "cs01"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}>
                                {item.task}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${item.daysLeft < 0
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : item.daysLeft <= 30
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                {item.daysLeft < 0 ? (
                                  <>
                                    <AlertCircle size={12} />
                                    {Math.abs(item.daysLeft)} days overdue
                                  </>
                                ) : item.daysLeft <= 30 ? (
                                  <>
                                    <Clock size={12} />
                                    {item.daysLeft} days left
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} />
                                    {item.daysLeft} days left
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 font-semibold text-slate-700 text-xs">
                              {new Date(item.deadlineDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => rollDeadline.mutate({ clientId: item.clientId, taskType: item.taskType })}
                                  disabled={rollDeadline.isPending}
                                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                                  title="Rollover deadline forward by 1 year"
                                >
                                  Roll +1 yr
                                </button>
                                <button
                                  onClick={() => navigate(`/company-secretarial/${item.clientId}`)}
                                  className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  Workspace &rarr;
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
            </div>
          )}

          {/* TAB 2: COMPANIES DIRECTORY (Capium Articles 9000200190 & 9000202625) */}
          {currentTab === "companies" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Capium Sub-tabs: Live Companies, Archived Companies, All Companies */}
              <div className="px-5 pt-4 pb-0 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompanySubTab("live")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${companySubTab === "live"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Building2 size={14} /> Live Companies ({companyCounts.live})
                  </button>
                  <button
                    onClick={() => setCompanySubTab("archived")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${companySubTab === "archived"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Archive size={14} /> Archived Companies ({companyCounts.archived})
                  </button>
                  <button
                    onClick={() => setCompanySubTab("all")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${companySubTab === "all"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    All Companies ({companyCounts.total})
                  </button>
                </div>

                <div className="pb-3 flex items-center gap-2">
                  <button
                    onClick={handleExportCompanies}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Search & Action bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 bg-white">
                <div className="relative w-full sm:max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search company by name, registration number, or SIC..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-slate-50/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Displaying: <strong className="text-slate-800">{companiesList.length}</strong> records</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Company &amp; CRN</th>
                      <th className="py-3.5 px-6">Type &amp; Status</th>
                      <th className="py-3.5 px-6">CS01 Due</th>
                      <th className="py-3.5 px-6">Accounts Due</th>
                      <th className="py-3.5 px-6">Registers</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingCompanies ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                          Loading company secretarial registry...
                        </td>
                      </tr>
                    ) : companiesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                              {companySubTab === "archived" ? <Archive size={24} /> : <Building2 size={24} />}
                            </div>
                            <h3 className="text-base font-bold text-slate-800">
                              {companySubTab === "archived" ? "No Archived Companies" : "No Corporate Clients Found"}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {companySubTab === "archived"
                                ? "When a company ceases trading or is archived, it will be listed here with all historical registers preserved."
                                : "You have not added any corporate entities to your practice yet. Import from Companies House or add manually."}
                            </p>
                            {companySubTab !== "archived" && (
                              <div className="pt-2 flex justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setAddMode("ch_download");
                                    setShowAddCompanyModal(true);
                                  }}
                                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                                >
                                  Download from Companies House
                                </button>
                                <button
                                  onClick={() => {
                                    setAddMode("type_own");
                                    setShowAddCompanyModal(true);
                                  }}
                                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                >
                                  + Add Manually
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      companiesList.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-2xs mt-0.5">
                                {c.clientName.charAt(0)}
                              </div>
                              <div>
                                <span
                                  onClick={() => navigate(`/company-secretarial/${c.id}`)}
                                  className="font-bold text-slate-800 hover:text-indigo-600 cursor-pointer block text-sm"
                                >
                                  {c.clientName}
                                </span>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                  {c.registrationNumber ? (
                                    <a
                                      href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.registrationNumber.trim())}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      CRN: {c.registrationNumber} <ExternalLink size={11} />
                                    </a>
                                  ) : (
                                    <span>CRN: Pending</span>
                                  )}
                                  {c.sicCode && <span>&bull; SIC {c.sicCode}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-700 block">
                                {c.clientType || "Limited"}
                              </span>
                              {/* 100% Authentic Status Badge - Eliminating hardcoded Active */}
                              {c.isArchived ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-300">
                                  <Archive size={11} /> Archived
                                </span>
                              ) : c.tradingStatus === "Dormant" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                  Dormant
                                </span>
                              ) : c.tradingStatus === "Ceased" || c.tradingStatus === "Dissolved" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                                  {c.tradingStatus}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={11} /> Trading
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            {c.nextConfirmationDue ? (
                              <div>
                                <span className="text-xs font-semibold text-slate-700 block">
                                  {new Date(c.nextConfirmationDue).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${c.daysLeftCs < 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : c.daysLeftCs <= 30
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}>
                                  {c.daysLeftCs < 0 ? `${Math.abs(c.daysLeftCs)}d overdue` : `${c.daysLeftCs}d left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not scheduled</span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            {c.nextAccountsDue ? (
                              <div>
                                <span className="text-xs font-semibold text-slate-700 block">
                                  {new Date(c.nextAccountsDue).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${c.daysLeftAcc < 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : c.daysLeftAcc <= 30
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-600"
                                  }`}>
                                  {c.daysLeftAcc < 0 ? `${Math.abs(c.daysLeftAcc)}d overdue` : `${c.daysLeftAcc}d left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not scheduled</span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md" title="Active Officers">
                                {c.officersCount || 0} Off
                              </span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md" title="Shareholders">
                                {c.shareholdersCount || 0} Sh
                              </span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md" title="Persons with Significant Control">
                                {c.pscsCount || 0} PSC
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {c.registrationNumber && (
                                <button
                                  onClick={() => syncCompanyData.mutate(c.id)}
                                  disabled={syncCompanyData.isPending}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Sync live Companies House registers & dates"
                                >
                                  <RefreshCw size={14} className={syncCompanyData.isPending ? "animate-spin" : ""} />
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/company-secretarial/${c.id}`)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Workspace
                              </button>

                              {/* Capium Article 9000202625: Instant Archive / Unarchive */}
                              <button
                                onClick={() => archiveCompany.mutate({ id: c.id, isArchived: !c.isArchived })}
                                disabled={archiveCompany.isPending}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${c.isArchived
                                  ? "text-indigo-600 hover:bg-indigo-50"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  }`}
                                title={c.isArchived ? "Unarchive / Restore to live companies" : "Archive company"}
                              >
                                {c.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                              </button>

                              {/* Capium Article 9000202625: Delete Company Permanently */}
                              <button
                                onClick={() => deleteCompany.mutate(c.id)}
                                disabled={deleteCompany.isPending}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete company & cascade secretarial registers"
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
            </div>
          )}

          {/* TAB 3: PEOPLE / PERSON DIRECTORY (Capium Articles 9000203190 & 9000202625) */}
          {currentTab === "people" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Capium Sub-tabs: People for Live Companies, People for Archived Companies, All People */}
              <div className="px-5 pt-4 pb-0 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPeopleSubTab("live")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${peopleSubTab === "live"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Users size={14} /> People for Live Companies ({people.filter((p: any) => !p.isArchived).length})
                  </button>
                  <button
                    onClick={() => setPeopleSubTab("archived")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${peopleSubTab === "archived"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Archive size={14} /> People for Archived Companies ({people.filter((p: any) => p.isArchived).length})
                  </button>
                  <button
                    onClick={() => setPeopleSubTab("all")}
                    className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${peopleSubTab === "all"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    All People ({people.length})
                  </button>
                </div>
              </div>

              {/* Role Classification & Search Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 bg-white">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Classification:</span>
                  <button
                    onClick={() => setPeopleRoleFilter("all")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${peopleRoleFilter === "all" ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => setPeopleRoleFilter("Officer")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${peopleRoleFilter === "Officer" ? "bg-blue-600 text-white font-semibold" : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"}`}
                  >
                    Officers / Directors
                  </button>
                  <button
                    onClick={() => setPeopleRoleFilter("Shareholder")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${peopleRoleFilter === "Shareholder" ? "bg-purple-600 text-white font-semibold" : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"}`}
                  >
                    Shareholders / Members
                  </button>
                  <button
                    onClick={() => setPeopleRoleFilter("PSC")}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${peopleRoleFilter === "PSC" ? "bg-amber-600 text-white font-semibold" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}`}
                  >
                    PSCs
                  </button>
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search person or company..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-slate-50/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Person / Entity Name</th>
                      <th className="py-3.5 px-6">Associated Company</th>
                      <th className="py-3.5 px-6">Classification</th>
                      <th className="py-3.5 px-6">Role / Nature of Control</th>
                      <th className="py-3.5 px-6">Email / Contact</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingPeople ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading people directory...</td></tr>
                    ) : filteredPeople.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                              <Users size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">No People Records Found</h3>
                            <p className="text-xs text-slate-500">
                              Officers, shareholders, and PSCs from your managed corporate entities will appear here automatically.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPeople.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200">
                                {p.name ? p.name.charAt(0) : "P"}
                              </div>
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              onClick={() => navigate(`/company-secretarial/${p.clientId}`)}
                              className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {p.companyName}
                            </span>
                            {p.companyRegNo && (
                              <span className="block text-[11px] font-mono text-slate-400">{p.companyRegNo}</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${p.type === "Officer"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : p.type === "Shareholder"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600">
                            {p.role || "Director"}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                            {p.email || <span className="text-slate-400 italic">Not set</span>}
                          </td>
                          <td className="py-4 px-6">
                            {p.isArchived ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                Archived Co
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                {p.isActive !== false ? "Active" : "Resigned"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => navigate(`/company-secretarial/${p.clientId}`)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              View Company &rarr;
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FORMATIONS (Capium Articles 9000175603, 9000238267, 9000238435) */}
          {currentTab === "formations" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FilePlus className="text-indigo-600" size={20} /> Select a Formation Product
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose an incorporation package for direct Companies House electronic filing.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/company-secretarial/formations/new")}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Plus size={15} /> Launch Formation Wizard
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="p-4 border-2 border-indigo-500/30 bg-indigo-50/20 rounded-xl flex items-start gap-3">
                    <CheckSquare size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Own Officers &amp; Shareholders</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Form a company with your client&apos;s own named directors, shareholders, and PSCs (Private Ltd by shares, guarantee, or LLP).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50/50 rounded-xl flex items-start gap-3 opacity-80">
                    <Building2 size={18} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Nominee Officers &amp; Registered Office</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Form with professional nominee services and managed UK registered office facility.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Pricing Table matching Article 9000238267 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Landmark className="text-slate-600" size={16} /> Statutory Formation Fees &amp; Turnaround Times
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Private Limited (Ltd)</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">&pound;133.00</div>
                    <div className="text-[11px] text-slate-500 mt-1">Standard 24-48h turnaround</div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class Shares / Other Types</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">&pound;143.00</div>
                    <div className="text-[11px] text-slate-500 mt-1">Multiple share classes / LLP</div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Same Day Limited</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1">&pound;229.00</div>
                    <div className="text-[11px] text-indigo-600 mt-1">Submitted before 3 PM</div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Same Day Class Shares</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1">&pound;239.00</div>
                    <div className="text-[11px] text-indigo-600 mt-1">Express expedited review</div>
                  </div>
                </div>
              </div>

              {/* Statutory Legal Rules & ECCTA Overview matching Article 9000238435 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="text-amber-600" size={16} /> UK Companies Act 2006 &amp; ECCTA 2024 Name Restrictions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">1. Mandatory Legal Ending</div>
                    <p>Names must end with &apos;Limited&apos;, &apos;Ltd&apos;, &apos;LLP&apos;, &apos;PLC&apos; or Welsh equivalent (&apos;Cyfyngedig&apos; / &apos;Cyf&apos;).</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">2. Prohibited Sensitive Words</div>
                    <p>Words like &apos;Royal&apos;, &apos;King&apos;, &apos;Queen&apos;, &apos;Bank&apos;, &apos;Police&apos;, &apos;NHS&apos;, or &apos;Government&apos; require approval.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">3. &apos;Same As&apos; Prohibition</div>
                    <p>Names identical or confusingly similar to an existing entity on the Companies House register will be rejected.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">4. ECCTA 2024 Registered Email</div>
                    <p>Every UK company must provide a verified appropriate email address for statutory government correspondence.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUBMISSIONS (E-FILING AUDIT LOG) */}
          {currentTab === "submissions" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Send size={18} className="text-indigo-600" /> Companies House E-Filing Submissions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live submission trail of CS01 Confirmation Statements and IN01 Formations.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Company</th>
                      <th className="py-3.5 px-6">Form Type</th>
                      <th className="py-3.5 px-6">Transaction ID</th>
                      <th className="py-3.5 px-6">Submission No.</th>
                      <th className="py-3.5 px-6">Submitted Date</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingFilings ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading submissions...</td></tr>
                    ) : filings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                          No Companies House submissions logged yet.
                        </td>
                      </tr>
                    ) : (
                      filings.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-800">
                            {f.companyName}
                          </td>
                          <td className="py-3.5 px-6 font-bold text-indigo-700 text-xs">
                            {f.formType}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                            {f.transactionId || "—"}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                            {f.submissionNumber || "—"}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {new Date(f.submissionDate).toLocaleString("en-GB")}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              {f.status || "Accepted"}
                            </span>
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

        {/* 2-MODE ADD COMPANY MODAL (Rule #5 Isolated) */}
        {showAddCompanyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 size={20} className="text-indigo-400" />
                  <h3 className="font-bold text-base">Add a Company to SanSuite</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddCompanyModal(false);
                    setChPreviewData(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex gap-2">
                <button
                  onClick={() => setAddMode("ch_download")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${addMode === "ch_download"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                >
                  <Download size={15} /> Download from Companies House
                </button>
                <button
                  onClick={() => setAddMode("type_own")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${addMode === "type_own"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                >
                  <Plus size={15} /> Type Your Own Data
                </button>
              </div>

              {/* MODE 1: DOWNLOAD FROM COMPANIES HOUSE */}
              {addMode === "ch_download" && (
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <p className="text-xs text-slate-500">
                    Enter the company registration number (CRN) to fetch and preview the authentic profile from Companies House before importing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 08438321"
                        value={chCompanyNumber}
                        onChange={(e) => setChCompanyNumber(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filing Code (6-digit)</label>
                      <input
                        type="password"
                        placeholder="Auth code"
                        maxLength={6}
                        value={chFilingCode}
                        onChange={(e) => setChFilingCode(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end items-center pt-1">
                    <button
                      onClick={handleLookupCh}
                      disabled={isSearchingCh}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSearchingCh ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                      Lookup Company
                    </button>
                  </div>

                  {/* PREVIEW CARD */}
                  {chPreviewData && chPreviewData.profile && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 mt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Companies House Verified
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{chPreviewData.profile.company_name}</h4>
                          <p className="text-xs text-slate-500">
                            CRN: <span className="font-mono font-semibold text-slate-700">{chPreviewData.profile.company_number}</span> &bull; {chPreviewData.profile.type || "Limited"}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          {chPreviewData.profile.company_status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 border-t border-slate-200/60 pt-2 space-y-1">
                        <div><strong>Registered Office:</strong> {Object.values(chPreviewData.profile.registered_office_address || {}).filter(Boolean).join(", ")}</div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-slate-500">
                          <div><strong>Officers:</strong> {chPreviewData.officers?.length || 0} active</div>
                          <div><strong>PSCs:</strong> {chPreviewData.psc?.length || 0} registered</div>
                          <div><strong>Next CS Due:</strong> {chPreviewData.profile.confirmation_statement?.next_due || "N/A"}</div>
                          <div><strong>Next Accounts Due:</strong> {chPreviewData.profile.accounts?.next_accounts?.due_on || "N/A"}</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => setChPreviewData(null)}
                          className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => importFromCh.mutate()}
                          disabled={importFromCh.isPending}
                          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {importFromCh.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                          Confirm &amp; Download Company
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: TYPE YOUR OWN DATA */}
              {addMode === "type_own" && (
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Global Solutions Ltd"
                        value={manualForm.companyName}
                        onChange={(e) => setManualForm({ ...manualForm, companyName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Type *</label>
                      <select
                        value={manualForm.companyType}
                        onChange={(e) => setManualForm({ ...manualForm, companyType: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="Limited">Private Limited Company (Ltd)</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                        <option value="PLC">Public Limited Company (PLC)</option>
                        <option value="Limited by Guarantee">Limited by Guarantee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Number (CRN)</label>
                      <input
                        type="text"
                        placeholder="Optional if new formation"
                        value={manualForm.companyRegNo}
                        onChange={(e) => setManualForm({ ...manualForm, companyRegNo: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registered Office Address *</label>
                      <textarea
                        rows={2}
                        placeholder="Full registered office street, town, and postal code"
                        value={manualForm.registeredAddress}
                        onChange={(e) => setManualForm({ ...manualForm, registeredAddress: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Country *</label>
                      <input
                        type="text"
                        value={manualForm.country}
                        onChange={(e) => setManualForm({ ...manualForm, country: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SIC Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. 62020"
                        value={manualForm.sicCode}
                        onChange={(e) => setManualForm({ ...manualForm, sicCode: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Registered Email Address (ECCTA 2024 Requirement)
                      </label>
                      <input
                        type="email"
                        placeholder="official@company.co.uk"
                        value={manualForm.registeredEmail}
                        onChange={(e) => setManualForm({ ...manualForm, registeredEmail: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddCompanyModal(false)}
                      className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveManualCompany.mutate()}
                      disabled={saveManualCompany.isPending}
                      className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {saveManualCompany.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                      Save Company
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY OFFICE / SETTINGS MODAL */}
        {showSettingsModal && (
          <SettingsModal
            initialSettings={settingsData?.settings}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Subcomponent: My Office / Secretarial Settings Modal (Capium 9000200190)
function SettingsModal({ initialSettings, onClose }: { initialSettings: any; onClose: () => void }) {
  const { toast } = useToast();
  const [presenterId, setPresenterId] = useState(initialSettings?.presenterId || "");
  const [presenterAuthCode, setPresenterAuthCode] = useState(initialSettings?.presenterAuthCode || "");
  const [defaultRegisteredOffice, setDefaultRegisteredOffice] = useState(initialSettings?.defaultRegisteredOffice || "");
  const [defaultCountry, setDefaultCountry] = useState(initialSettings?.defaultCountry || "United Kingdom");
  const [isLiveMode, setIsLiveMode] = useState(initialSettings?.isLiveMode || false);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/company-secretarial/settings", {
        presenterId,
        presenterAuthCode,
        defaultRegisteredOffice,
        defaultCountry,
        isLiveMode,
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Companies House presenter credentials updated.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/settings"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-indigo-400" />
            <h3 className="font-bold text-sm">My Office &amp; E-Filing Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presenter ID</label>
            <input
              type="text"
              placeholder="e.g. 00012345678"
              value={presenterId}
              onChange={(e) => setPresenterId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presenter Authentication Code</label>
            <input
              type="password"
              placeholder="Presenter Auth Code"
              value={presenterAuthCode}
              onChange={(e) => setPresenterAuthCode(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Default Registered Office Address</label>
            <textarea
              rows={3}
              placeholder="Firm's office address if providing registered office services..."
              value={defaultRegisteredOffice}
              onChange={(e) => setDefaultRegisteredOffice(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Live Companies House Gateway</span>
              <span className="text-[11px] text-slate-500">Toggle live filing vs simulation environment</span>
            </div>
            <input
              type="checkbox"
              checked={isLiveMode}
              onChange={(e) => setIsLiveMode(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
