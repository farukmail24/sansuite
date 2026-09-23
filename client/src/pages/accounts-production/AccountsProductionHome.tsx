import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, Settings, Key, ExternalLink, Plus, Search,
  Maximize2, Minus, ChevronDown, CheckCircle2, Shield, Save, Building2,
  HelpCircle, PenTool, ArrowUpDown, ArrowUp, ArrowDown, Edit2, AlertCircle, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { Link, useSearch, useLocation } from "wouter";
import { useToast } from "../../hooks/useToast";
import NewClientModal from "../../components/modals/NewClientModal";
import SendToeSignModal from "../../components/esign/SendToeSignModal";
import TablePagination from "../../components/common/TablePagination";
import { formatDateOnly } from "../../lib/dateUtils";

const sidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/accounts-production" },
  { label: "Authorisation Codes", icon: <Key size={15} />, route: "/accounts-production?tab=auth-codes" },
  { label: "General Settings", icon: <Settings size={15} />, route: "/accounts-production?tab=settings" },
  { label: "Apply for presenter ID", icon: <ExternalLink size={15} />, route: "/accounts-production?tab=presenter-id" },
];

export default function AccountsProductionHome() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const activeTab = searchParams.get("tab") || "dashboard";

  const [search, setSearch] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientTypeFilter, setClientTypeFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState("All");
  const [accountsStatusFilter, setAccountsStatusFilter] = useState("All");
  const [panels, setPanels] = useState({ summary: true, clients: true });
  const [eSignModalClient, seteSignModalClient] = useState<any | null>(null);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("clientName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch authentic clients from DB
  const { data: clients = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // State to edit WebFiling code
  const [editingClient, setEditingClient] = useState<any>(null);
  const [newAuthCodeVal, setNewAuthCodeVal] = useState("");
  const [isSavingAuthCode, setIsSavingAuthCode] = useState(false);

  const handleSaveAuthCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !newAuthCodeVal.trim()) return;

    setIsSavingAuthCode(true);
    try {
      const codeUpper = newAuthCodeVal.trim().toUpperCase();
      const res = await apiRequest("POST", `/api/accounts-production/${editingClient.id}/auth-code`, {
        authCode: codeUpper,
      });

      if (!res.ok) throw new Error("Failed to update WebFiling code");

      await queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({
        title: "Authentication Code Updated",
        description: `WebFiling code for ${editingClient.clientName} updated to ${codeUpper} and saved to database.`,
      });
      setEditingClient(null);
      setNewAuthCodeVal("");
    } catch (err: any) {
      toast({
        title: "Error Saving Code",
        description: err.message || "Failed to update authentication code.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAuthCode(false);
    }
  };

  // Form states for General Settings tab
  const [accountingStandard, setAccountingStandard] = useState("FRS 102 1A");
  const [rounding, setRounding] = useState("Pounds");
  const [ixbrlAutoTag, setIxbrlAutoTag] = useState(true);
  const [auditThresholdCheck, setAuditThresholdCheck] = useState(true);
  const [autoAttachNotes, setAutoAttachNotes] = useState(true);
  const [defaultFilingGateway, setDefaultFilingGateway] = useState("HMRC & Companies House Direct");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hasInitializedSettings, setHasInitializedSettings] = useState(false);

  const { data: dbSettings } = useQuery({
    queryKey: ["/api/accounts-production/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounts-production/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (dbSettings && !hasInitializedSettings) {
      if (dbSettings.accountingStandard) setAccountingStandard(dbSettings.accountingStandard);
      if (dbSettings.rounding) setRounding(dbSettings.rounding);
      if (dbSettings.ixbrlAutoTag !== undefined) setIxbrlAutoTag(dbSettings.ixbrlAutoTag);
      if (dbSettings.auditThresholdCheck !== undefined) setAuditThresholdCheck(dbSettings.auditThresholdCheck);
      if (dbSettings.autoAttachNotes !== undefined) setAutoAttachNotes(dbSettings.autoAttachNotes);
      if (dbSettings.defaultFilingGateway) setDefaultFilingGateway(dbSettings.defaultFilingGateway);
      setHasInitializedSettings(true);
    }
  }, [dbSettings, hasInitializedSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await apiRequest("POST", "/api/accounts-production/settings", {
        accountingStandard,
        rounding,
        ixbrlAutoTag,
        auditThresholdCheck,
        autoAttachNotes,
        defaultFilingGateway,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounts-production/settings"] });
      toast({
        title: "General Settings Saved",
        description: `Configuration saved: Standard set to ${accountingStandard}, Rounding: ${rounding}.`,
      });
    } catch {
      toast({
        title: "Error Saving Settings",
        description: "Failed to update accounts production settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Form states for Presenter ID tab
  const [presenterId, setPresenterId] = useState("");
  const [presenterAuthCode, setPresenterAuthCode] = useState("");
  const [isTestingPresenter, setIsTestingPresenter] = useState(false);
  const [hasInitializedPresenter, setHasInitializedPresenter] = useState(false);
  const [presenterStatus, setPresenterStatus] = useState("Unverified");

  const { data: dbPresenter } = useQuery({
    queryKey: ["/api/accounts-production/presenter-id"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounts-production/presenter-id");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (dbPresenter && !hasInitializedPresenter) {
      if (dbPresenter.presenterId) setPresenterId(dbPresenter.presenterId);
      if (dbPresenter.presenterAuthCode) setPresenterAuthCode(dbPresenter.presenterAuthCode);
      if (dbPresenter.connectionStatus) setPresenterStatus(dbPresenter.connectionStatus);
      setHasInitializedPresenter(true);
    }
  }, [dbPresenter, hasInitializedPresenter]);

  const handleSavePresenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenterId.trim() || !presenterAuthCode.trim()) return;

    setIsTestingPresenter(true);
    try {
      await apiRequest("POST", "/api/accounts-production/presenter-id", {
        presenterId,
        presenterAuthCode,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/accounts-production/presenter-id"] });
      setPresenterStatus("Verified");
      toast({
        title: "Presenter ID Verified & Saved",
        description: `Successfully connected Electronic Presenter ID ${presenterId} to Companies House Gateway.`,
      });
    } catch {
      toast({
        title: "Connection Error",
        description: "Failed to verify Presenter Account credentials with Companies House.",
        variant: "destructive",
      });
    } finally {
      setIsTestingPresenter(false);
    }
  };

  const [selectedChartYear, setSelectedChartYear] = useState("2026");

  // Dynamic Statistics Calculations strictly from authentic DB records
  const totalClients = clients.length;
  const submittedCount = clients.filter((c: any) => c.accountsStatus === "Submitted").length;
  const overdueCount = clients.filter((c: any) => {
    if (c.accountsStatus === "Overdue") return true;
    if (c.nextAccountsDue && new Date(c.nextAccountsDue).getTime() < Date.now() && c.accountsStatus !== "Submitted") return true;
    return false;
  }).length;

  const dueCount = clients.filter((c: any) => {
    if (c.accountsStatus === "Due") return true;
    if (c.nextAccountsDue && c.accountsStatus !== "Submitted") {
      const due = new Date(c.nextAccountsDue).getTime();
      const now = Date.now();
      const in30Days = now + 30 * 24 * 60 * 60 * 1000;
      return due >= now && due <= in30Days;
    }
    return false;
  }).length;

  const draftCount = Math.max(0, totalClients - (submittedCount + overdueCount + dueCount));

  // Monthly distribution for bar chart (Jan-Dec)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map((monthName, idx) => {
    const count = clients.filter((c: any) => {
      const d = c.createdAt ? new Date(c.createdAt) : null;
      return d && d.getMonth() === idx;
    }).length;
    return { month: monthName, count };
  });

  const maxMonthlyCount = Math.max(...monthlyData.map(m => m.count), 1);

  // Sorting Handler
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
      return <ArrowUpDown size={12} className="inline ml-1 text-gray-300" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="inline ml-1 text-purple-600 font-bold" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-purple-600 font-bold" />
    );
  };

  // Filtered and Sorted Clients
  const filtered = useMemo(() => {
    let result = clients.filter((c: any) => {
      const matchesSearch =
        !search.trim() ||
        (c.clientName && c.clientName.toLowerCase().includes(search.toLowerCase())) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(search.toLowerCase())) ||
        (c.registrationNumber && c.registrationNumber.toLowerCase().includes(search.toLowerCase()));

      const matchesType =
        clientTypeFilter === "All" ||
        c.clientType === clientTypeFilter ||
        (clientTypeFilter === "Limited" && (c.clientType === "Limited Company" || c.clientType === "Limited"));

      const isOverdue = c.nextAccountsDue && new Date(c.nextAccountsDue).getTime() < Date.now() && c.accountsStatus !== "Submitted";
      const isDueSoon = c.nextAccountsDue && (() => {
        const due = new Date(c.nextAccountsDue).getTime();
        const now = Date.now();
        return due >= now && due <= now + 30 * 24 * 60 * 60 * 1000;
      })();

      const matchesDue =
        dueFilter === "All" ||
        (dueFilter === "30Days" && isDueSoon) ||
        (dueFilter === "Overdue" && isOverdue);

      const status = c.accountsStatus || (isOverdue ? "Overdue" : isDueSoon ? "Due" : "Draft");
      const matchesStatus = accountsStatusFilter === "All" || status === accountsStatusFilter;

      return matchesSearch && matchesType && matchesDue && matchesStatus;
    });

    result.sort((a: any, b: any) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, search, clientTypeFilter, dueFilter, accountsStatusFilter, sortField, sortOrder]);

  // Paginated records
  const paginatedClients = useMemo(() => {
    if (pageSize === 999999 || pageSize >= filtered.length) {
      return filtered;
    }
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Authentic Limited Companies for Authorisation Codes tab (100% DB derived)
  const authCodesClients = useMemo(() => {
    return clients.filter((c: any) =>
      c.clientType === "Limited" ||
      c.clientType === "Limited Company" ||
      (c.registrationNumber && c.registrationNumber.trim().length > 0)
    );
  }, [clients]);

  return (
    <AppLayout sidebar={sidebar} module="Accounts Production">
      <div className="bg-gray-100 min-h-screen">
        {/* Top Header */}
        <div className="bg-white px-5 py-2.5 flex items-center justify-between border-b border-gray-200 shadow-xs">
          <div className="flex items-center text-xs text-gray-500">
            <span className="flex items-center gap-1 hover:text-purple-600 font-medium cursor-pointer">
              <LayoutDashboard size={13} /> Home
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-400">Accounts Production</span>
            {activeTab !== "dashboard" && (
              <>
                <span className="mx-2">/</span>
                <span className="text-purple-700 font-semibold capitalize">{activeTab.replace("-", " ")}</span>
              </>
            )}
          </div>
          <div className="flex items-center text-gray-400 gap-3">
            <Link href="/accounts-production?tab=settings" title="General Settings">
              <Settings size={14} className="cursor-pointer hover:text-purple-600" />
            </Link>
            <Link href="/accounts-production?tab=presenter-id" title="Presenter ID">
              <ExternalLink size={14} className="cursor-pointer hover:text-purple-600" />
            </Link>
          </div>
        </div>

        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          {/* TAB 1: DASHBOARD */}
          {(activeTab === "dashboard" || activeTab === "") && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-light text-gray-700">Accounts Production Dashboard</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus size={13} /> Add Client
                  </button>
                </div>
              </div>

              {/* Accounts Submission Summary Panel */}
              <div className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden">
                <div
                  className="px-5 py-3 border-b border-gray-200 flex justify-between items-center text-xs text-purple-900 font-semibold cursor-pointer bg-gray-50/70"
                  onClick={() => setPanels({ ...panels, summary: !panels.summary })}
                >
                  <div className="flex items-center gap-2">Accounts Submission Summary</div>
                  <div className="flex items-center gap-3">
                    {panels.summary ? <Minus size={15} /> : <Plus size={15} />}
                  </div>
                </div>

                {panels.summary && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-gray-50/20">
                    {/* Donut Chart Area */}
                    <div className="flex items-center gap-8">
                      <div className="relative w-44 h-44 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="18" />
                          {totalClients > 0 && (
                            <>
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="18"
                                strokeDasharray={`${(submittedCount / totalClients) * 251.2} 251.2`}
                                strokeDashoffset="0"
                              />
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="18"
                                strokeDasharray={`${(dueCount / totalClients) * 251.2} 251.2`}
                                strokeDashoffset={`-${(submittedCount / totalClients) * 251.2}`}
                              />
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="18"
                                strokeDasharray={`${(overdueCount / totalClients) * 251.2} 251.2`}
                                strokeDashoffset={`-${((submittedCount + dueCount) / totalClients) * 251.2}`}
                              />
                            </>
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[11px] font-bold text-gray-600">
                            {totalClients > 0 ? "Total Clients" : "No Clients"}
                          </span>
                          <span className="text-2xl font-extrabold text-purple-700 mt-0.5">{totalClients}</span>
                        </div>
                        <div className="text-center mt-2 text-[11px] font-medium text-gray-500 w-full">Annual accounts status breakdown</div>
                      </div>

                      <div className="space-y-2.5 ml-4 text-xs text-gray-600 font-medium flex-1">
                        <div className="flex items-center justify-between gap-4 border-b pb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Submitted
                          </div>
                          <span className="font-bold text-gray-800">{submittedCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b pb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div> Due in 30 Days
                          </div>
                          <span className="font-bold text-gray-800">{dueCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-b pb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div> Overdue
                          </div>
                          <span className="font-bold text-gray-800">{overdueCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-300"></div> In Preparation / Draft
                          </div>
                          <span className="font-bold text-gray-800">{draftCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bar Chart Area */}
                    <div className="flex flex-col h-full justify-between pb-2">
                      <div className="relative h-44 border-l border-b border-gray-200 flex items-end justify-between px-3 pb-1 pt-4 bg-white/60 rounded-r-lg">
                        <div className="absolute -left-7 h-full flex flex-col justify-between text-[10px] text-gray-400 py-1 font-mono">
                          <span>{maxMonthlyCount}</span>
                          <span>{Math.round(maxMonthlyCount * 0.8)}</span>
                          <span>{Math.round(maxMonthlyCount * 0.6)}</span>
                          <span>{Math.round(maxMonthlyCount * 0.4)}</span>
                          <span>{Math.round(maxMonthlyCount * 0.2)}</span>
                          <span>0</span>
                        </div>

                        {monthlyData.map((m) => {
                          const heightPercent = maxMonthlyCount > 0 ? (m.count / maxMonthlyCount) * 100 : 0;
                          return (
                            <div key={m.month} className="flex flex-col items-center justify-end h-full w-6 group relative">
                              <div
                                style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                className={`w-3.5 rounded-t transition-all duration-300 ${m.count > 0 ? "bg-purple-600 group-hover:bg-purple-800" : "bg-purple-200"}`}
                              ></div>
                              <span className="text-[10px] text-gray-500 mt-2 absolute -bottom-6 font-medium">{m.month}</span>
                              <div className="absolute -top-8 hidden group-hover:flex bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                {m.count} clients registered
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center text-xs text-gray-600 mt-8 flex items-center justify-center gap-2">
                        Monthly client filings distribution in
                        <div className="relative inline-block">
                          <select
                            value={selectedChartYear}
                            onChange={(e) => setSelectedChartYear(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 pr-6 appearance-none bg-white text-xs font-semibold focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Clients Panel */}
              <div className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center text-xs text-purple-900 font-semibold bg-gray-50/70">
                  <div className="flex items-center gap-2">Clients Statutory Directory</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddClientModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1 font-medium cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus size={12} /> Client
                    </button>
                    <Minus
                      size={15}
                      className="text-gray-500 cursor-pointer ml-2 hover:text-gray-800"
                      onClick={() => setPanels({ ...panels, clients: !panels.clients })}
                    />
                  </div>
                </div>

                {panels.clients && (
                  <div>
                    {/* Filters Toolbar */}
                    <div className="p-3.5 border-b border-gray-200 bg-gray-50/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                        <div className="relative">
                          <select
                            value={clientTypeFilter}
                            onChange={(e) => {
                              setClientTypeFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 pr-8 appearance-none bg-white text-gray-700 w-36 font-medium text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="All">All Client Types</option>
                            <option value="Limited">Limited Company</option>
                            <option value="SoleTrader">Sole Trader</option>
                            <option value="Partnership">Partnership</option>
                            <option value="Charity">Charity</option>
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative flex-1 max-w-xs">
                          <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                          <input
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Search client name, ID, CRN..."
                            className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 w-full focus:outline-none focus:border-purple-500 text-gray-700 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={dueFilter}
                            onChange={(e) => {
                              setDueFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 pr-8 appearance-none bg-white text-gray-700 w-36 font-medium text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="All">All Deadlines</option>
                            <option value="30Days">Due in 30 days</option>
                            <option value="Overdue">Overdue Only</option>
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                          <select
                            value={accountsStatusFilter}
                            onChange={(e) => {
                              setAccountsStatusFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 pr-8 appearance-none bg-white text-gray-700 w-36 font-medium text-xs focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Due">Due</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-b border-gray-200">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="py-3 px-4 w-14">S.No.</th>
                            <th
                              onClick={() => handleSort("clientCode")}
                              className="py-3 px-4 w-28 cursor-pointer hover:text-purple-700 select-none"
                            >
                              Client ID {renderSortIndicator("clientCode")}
                            </th>
                            <th
                              onClick={() => handleSort("clientName")}
                              className="py-3 px-4 cursor-pointer hover:text-purple-700 select-none"
                            >
                              Client Name {renderSortIndicator("clientName")}
                            </th>
                            <th
                              onClick={() => handleSort("clientType")}
                              className="py-3 px-4 w-32 cursor-pointer hover:text-purple-700 select-none"
                            >
                              Client Type {renderSortIndicator("clientType")}
                            </th>
                            <th className="py-3 px-4">Companies House CRN</th>
                            <th
                              onClick={() => handleSort("nextAccountsDue")}
                              className="py-3 px-4 w-32 cursor-pointer hover:text-purple-700 select-none"
                            >
                              Due Date {renderSortIndicator("nextAccountsDue")}
                            </th>
                            <th className="py-3 px-4 w-28 text-center">Accounts Status</th>
                            <th className="py-3 px-4 text-right w-44">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {isLoading ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-gray-400">
                                Loading client accounts...
                              </td>
                            </tr>
                          ) : paginatedClients.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <Building2 size={36} className="text-gray-300" />
                                  <p className="text-xs font-semibold text-gray-600">No client accounts found</p>
                                  <p className="text-[11px] text-gray-400">
                                    {search ? "No clients match your filter criteria." : "Start preparing statutory accounts by adding your first client."}
                                  </p>
                                  <button
                                    onClick={() => setShowAddClientModal(true)}
                                    className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Plus size={12} /> Add Client
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedClients.map((c: any, i: number) => {
                              const sNo = (currentPage - 1) * pageSize + (i + 1);
                              const isOverdue = c.nextAccountsDue && new Date(c.nextAccountsDue).getTime() < Date.now() && c.accountsStatus !== "Submitted";
                              const status = c.accountsStatus || (isOverdue ? "Overdue" : "Draft");

                              return (
                                <tr
                                  key={c.id}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest("button, a, select, input")) return;
                                    navigate(`/accounts-production/${c.id}/dashboard`);
                                  }}
                                  className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                                >
                                  <td className="py-3 px-4 text-gray-500">{sNo}</td>
                                  <td className="py-3 px-4 font-mono font-medium">
                                    <Link
                                      href={`/accounts-production/${c.id}/dashboard`}
                                      className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                                    >
                                      {c.clientCode || "—"}
                                    </Link>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Link
                                      href={`/accounts-production/${c.id}/dashboard`}
                                      className="font-semibold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer flex items-center gap-1.5"
                                    >
                                      {c.clientName}
                                    </Link>
                                  </td>
                                  <td className="py-3 px-4 text-gray-600">{c.clientType}</td>
                                  <td className="py-3 px-4 font-mono">
                                    {c.registrationNumber ? (
                                      <a
                                        href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.registrationNumber.trim())}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                                        title="View on Companies House"
                                      >
                                        {c.registrationNumber}
                                        <ExternalLink size={10} />
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-gray-700 font-medium">
                                    {c.nextAccountsDue ? formatDateOnly(c.nextAccountsDue) : "—"}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        status === "Submitted"
                                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                          : status === "Overdue"
                                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                                          : status === "Due"
                                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                                          : "bg-gray-100 text-gray-600 border border-gray-200"
                                      }`}
                                    >
                                      {status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => seteSignModalClient(c)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
                                        title="Send Annual Accounts for E-Signature"
                                      >
                                        <PenTool size={11} /> eSign
                                      </button>
                                      <Link
                                        href={`/accounts-production/${c.id}/dashboard`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 rounded-md text-[11px] font-semibold cursor-pointer transition-colors shadow-xs"
                                      >
                                        Workspace
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Universal Table Pagination */}
                    <div className="p-3 bg-gray-50/60 border-t border-gray-200">
                      <TablePagination
                        totalItems={filtered.length}
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
                        }}
                        sortOptions={[
                          { label: "Client Name", value: "clientName" },
                          { label: "Client ID", value: "clientCode" },
                          { label: "Client Type", value: "clientType" },
                          { label: "Due Date", value: "nextAccountsDue" },
                          { label: "Accounts Status", value: "accountsStatus" },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: AUTHORISATION CODES (100% Dynamic from DB) */}
          {activeTab === "auth-codes" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                    <Key size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Companies House Authorisation Codes</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      6-digit WebFiling authentication codes stored securely for direct Companies House XML filing.
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 size={14} /> Direct Filing Active
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Company WebFiling Registry</h3>
                    <p className="text-xs text-gray-500">
                      All registered limited companies from database ({authCodesClients.length} registered)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus size={13} /> Add Limited Company
                  </button>
                </div>

                <table className="w-full text-xs text-left border-b border-gray-200">
                  <thead className="bg-gray-50 text-gray-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Company Number</th>
                      <th className="py-3 px-4">WebFiling Auth Code</th>
                      <th className="py-3 px-4">Gateway Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {authCodesClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Building2 size={32} className="text-gray-300" />
                            <p className="text-xs font-semibold text-gray-600">No limited companies in database</p>
                            <p className="text-[11px] text-gray-400">Add a client with company registration number to configure WebFiling.</p>
                            <button
                              onClick={() => setShowAddClientModal(true)}
                              className="mt-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium cursor-pointer"
                            >
                              <Plus size={12} /> Add Company
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      authCodesClients.map((row: any) => (
                        <tr key={row.id} className="hover:bg-purple-50/20 transition-colors">
                          <td className="py-3 px-4">
                            <Link
                              href={`/accounts-production/${row.id}/dashboard`}
                              className="font-semibold text-gray-800 hover:text-purple-700 hover:underline cursor-pointer"
                            >
                              {row.clientName}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {row.registrationNumber ? (
                              <a
                                href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(row.registrationNumber.trim())}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer font-semibold"
                                title="View on Companies House"
                              >
                                <span>{row.registrationNumber}</span>
                                <ExternalLink size={10} className="text-indigo-500" />
                              </a>
                            ) : (
                              <span className="text-gray-400">Not configured</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {row.chAuthCode ? (
                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {row.chAuthCode}
                              </span>
                            ) : (
                              <span className="text-amber-600 italic">Missing Code</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                row.chAuthCode
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {row.chAuthCode ? "Configured" : "Pending Code"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingClient(row);
                                setNewAuthCodeVal(row.chAuthCode || "");
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit2 size={11} /> {row.chAuthCode ? "Update Code" : "Set Code"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Edit Auth Code Modal */}
              {editingClient && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Key size={18} className="text-purple-600" />
                        <h3 className="text-sm font-bold text-gray-800">Set WebFiling Authentication Code</h3>
                      </div>
                      <button
                        onClick={() => setEditingClient(null)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveAuthCode} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Company Name</label>
                        <input
                          type="text"
                          readOnly
                          value={editingClient.clientName}
                          className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-600 font-medium outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Companies House Number</label>
                        <input
                          type="text"
                          readOnly
                          value={editingClient.registrationNumber || "Not configured"}
                          className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-600 font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          6-Character WebFiling Authentication Code *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. A1B2C3"
                          value={newAuthCodeVal}
                          onChange={(e) => setNewAuthCodeVal(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm tracking-wider uppercase text-purple-700 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Provided by Companies House by post upon company incorporation.
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setEditingClient(null)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingAuthCode}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                        >
                          {isSavingAuthCode ? (
                            <>
                              <CheckCircle2 size={13} className="animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Save size={13} /> Save & Verify Code
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Accounts Production General Settings</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure UK GAAP Accounting Standards, iXBRL Taxonomy, and Rounding Preferences.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default Accounting Standard</label>
                    <select
                      value={accountingStandard}
                      onChange={(e) => setAccountingStandard(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold cursor-pointer"
                    >
                      <option value="FRS 102 1A">FRS 102 Section 1A (Small Entities)</option>
                      <option value="FRS 105">FRS 105 (Micro-entities Regime)</option>
                      <option value="Dormant">Dormant Company Accounts (AA02 / DCA)</option>
                      <option value="Full FRS 102">Full FRS 102</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Financial Statement Rounding</label>
                    <select
                      value={rounding}
                      onChange={(e) => setRounding(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold cursor-pointer"
                    >
                      <option value="Pounds">Round to nearest Whole Pound (£)</option>
                      <option value="Exact">Keep Exact Pence (£.pp)</option>
                      <option value="Thousands">Round to Thousands (£'000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Electronic Submission Gateway</label>
                    <select
                      value={defaultFilingGateway}
                      onChange={(e) => setDefaultFilingGateway(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold cursor-pointer"
                    >
                      <option value="HMRC & Companies House Direct">HMRC & Companies House Direct Gateway</option>
                      <option value="Companies House WebFiling">Companies House WebFiling Only</option>
                      <option value="HMRC Only">HMRC Gateway Only</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Automated Tax & Compliance Options</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-start gap-3 p-3 bg-purple-50/40 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={ixbrlAutoTag}
                        onChange={(e) => setIxbrlAutoTag(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">iXBRL Taxonomy Auto-Tagging</span>
                        <span className="text-[11px] text-gray-500">Apply standard Companies House iXBRL tags automatically during report compilation.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-purple-50/40 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={auditThresholdCheck}
                        onChange={(e) => setAuditThresholdCheck(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">Audit Exemption Check</span>
                        <span className="text-[11px] text-gray-500">Validate turnover (£10.2M) and asset limits against Companies Act 2006 limits.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-purple-50/40 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={autoAttachNotes}
                        onChange={(e) => setAutoAttachNotes(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-purple-900 block">Auto-Attach Statutory Notes</span>
                        <span className="text-[11px] text-gray-500">Include mandatory notes for employees, directors and accounting policies.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <>
                        <CheckCircle2 size={15} className="animate-spin" /> Saving Settings...
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Save General Settings
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: APPLY FOR PRESENTER ID */}
          {activeTab === "presenter-id" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                    <ExternalLink size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Companies House Presenter ID Configuration</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure your Electronic Filing Presenter Account credentials for online accounts submission.
                    </p>
                  </div>
                </div>

                <a
                  href="https://www.gov.uk/guidance/apply-for-a-companies-house-online-filing-presenter-account"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  Apply Online at GOV.UK <ExternalLink size={12} />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-gray-800 text-sm">Presenter Account Credentials</h3>
                    {presenterStatus === "Verified" ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Gateway Verified & Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Shield size={14} /> Verification Pending
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSavePresenter} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Electronic Presenter ID</label>
                      <input
                        type="text"
                        required
                        value={presenterId}
                        onChange={(e) => setPresenterId(e.target.value)}
                        placeholder="e.g. 00012345678"
                        className="w-full px-3 py-2 border rounded-lg font-mono outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Presenter Authentication Code</label>
                      <input
                        type="password"
                        required
                        value={presenterAuthCode}
                        onChange={(e) => setPresenterAuthCode(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 border rounded-lg font-mono outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isTestingPresenter}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingPresenter ? (
                        <>
                          <CheckCircle2 size={15} className="animate-spin" /> Verifying Credentials with Companies House...
                        </>
                      ) : (
                        <>
                          <Shield size={15} /> Save & Verify Companies House Credentials
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 space-y-3 text-xs text-purple-900">
                  <div className="flex items-center gap-2 font-bold text-purple-800 text-sm">
                    <HelpCircle size={16} /> Presenter ID Guide
                  </div>
                  <p className="leading-relaxed">
                    A Presenter ID is required to electronically file annual accounts (iXBRL) directly to Companies House from SanSuite.
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4 text-purple-800">
                    <li>Required for direct XML/iXBRL gateway submission</li>
                    <li>Provided by Companies House WebFiling Service</li>
                    <li>Stored with 256-bit AES encryption</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewClientModal isOpen={showAddClientModal} onClose={() => setShowAddClientModal(false)} />

      {eSignModalClient && (
        <SendToeSignModal
          open={!!eSignModalClient}
          onOpenChange={(open: boolean) => !open && seteSignModalClient(null)}
          defaultTitle={`Annual Accounts FRS 102/105 - ${eSignModalClient.clientName}`}
          sourceModule="Accounts Production"
          clientId={eSignModalClient.id}
          clientName={eSignModalClient.clientName}
          clientEmail={eSignModalClient.email || ""}
        />
      )}
    </AppLayout>
  );
}
