import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import AppLayout, { NavItem } from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, CheckSquare, Settings, FileText,
  Building2, History, X, ExternalLink, Edit2, Plus,
  CheckCircle2, Shield, FileSpreadsheet, RefreshCw,
  FileSignature, Calculator, Layers, AlertCircle, Printer, Users,
  Calendar, Trash2, ListTree, Send, ArrowRight
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import AccountsProductionPipeline from "./AccountsProductionPipeline";
import {
  getAccountsProductionSidebar,
  AP_UTILITY_SECTIONS,
  isAccountsProductionUtilityRoute
} from "./accountsProductionNav";

export interface ClientWorkspaceContextType {
  clientId: string;
  client: any;
  isLoadingClient: boolean;
  periods: any[];
  isLoadingPeriods: boolean;
  selectedPeriodId: number | null;
  setSelectedPeriodId: (id: number | null) => void;
  currentPeriod: any;
  refetchPeriods: () => void;
  refetchClient: () => void;
  openNewPeriodModal: () => void;
  openEditPeriodModal: (period: any) => void;
}

const ClientWorkspaceContext = createContext<ClientWorkspaceContextType | null>(null);

export function useClientWorkspace() {
  const context = useContext(ClientWorkspaceContext);
  if (!context) {
    throw new Error("useClientWorkspace must be used within a ClientWorkspaceLayout");
  }
  return context;
}

interface ClientWorkspaceLayoutProps {
  children: ReactNode;
  activeSection?: string;
  showPipeline?: boolean;
}

export default function ClientWorkspaceLayout({ children, activeSection, showPipeline }: ClientWorkspaceLayoutProps) {
  // Support either direct route or nested route matching
  const [, paramsDirect] = useRoute("/accounts-production/:clientId");
  const [, paramsSub] = useRoute("/accounts-production/:clientId/:subpage*");
  const clientId = paramsDirect?.clientId || paramsSub?.clientId || "";

  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [ctBridgeResult, setCtBridgeResult] = useState<any | null>(null);
  const [periodForm, setPeriodForm] = useState({
    id: 0,
    periodName: "",
    startDate: new Date().getFullYear() + "-04-01",
    endDate: (new Date().getFullYear() + 1) + "-03-31",
    dueDate: (new Date().getFullYear() + 1) + "-12-31",
    accountingStandard: "FRS102_1A",
    status: "Draft",
  });

  // 1. Fetch Client Details
  const { data: client, isLoading: isLoadingClient, refetch: refetchClient } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/client-info`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/accounts-production/${clientId}/client-info`);
        if (res.ok) {
          const c = await res.json();
          if (c && c.id) return c;
        }
      } catch (e) { }
      try {
        const res2 = await apiRequest("GET", `/api/practice/clients/${clientId}`);
        if (res2.ok) {
          const c = await res2.json();
          if (c && c.id) return c;
        }
      } catch (e) { }
      try {
        const res3 = await apiRequest("GET", "/api/practice/clients");
        if (res3.ok) {
          const allClients = await res3.json();
          const parsedId = parseInt(clientId || "0");
          return allClients.find((c: any) => c.id === parsedId) || null;
        }
      } catch (e) { }
      return null;
    },
    enabled: !!clientId,
  });

  // 2. Fetch Accounting Periods
  const { data: periods = [], isLoading: isLoadingPeriods, refetch: refetchPeriods } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/periods`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/periods`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (periods.length > 0) {
      if (!selectedPeriodId || !periods.find(p => p.id === selectedPeriodId)) {
        setSelectedPeriodId(periods[0].id);
      }
    } else {
      setSelectedPeriodId(null);
    }
  }, [periods, selectedPeriodId]);

  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0] || null;

  // Period Mutations
  const createPeriodMutation = useMutation({
    mutationFn: async (payload: typeof periodForm) => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/periods`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create accounting period.");
      }
      return res.json();
    },
    onSuccess: async (data: any) => {
      await refetchPeriods();
      setShowPeriodModal(false);
      if (data?.id) setSelectedPeriodId(data.id);
      toast({ title: "Accounting Period Created", description: "Period initialized with statutory parameters." });
    },
    onError: (err: any) => {
      toast({ title: "Creation Failed", description: err.message || "Failed to create accounting period.", variant: "destructive" });
    },
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async (payload: typeof periodForm) => {
      const res = await apiRequest("PUT", `/api/accounts-production/${clientId}/periods/${payload.id}`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update period.");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refetchPeriods();
      setShowPeriodModal(false);
      toast({ title: "Accounting Period Updated", description: "Changes saved to statutory records." });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message || "Failed to update period.", variant: "destructive" });
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/periods/${periodId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete period.");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refetchPeriods();
      setShowPeriodModal(false);
      toast({ title: "Accounting Period Deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message || "Failed to delete period.", variant: "destructive" });
    },
  });

  const [isSyncingChDates, setIsSyncingChDates] = useState(false);

  const handleSyncDatesFromCompaniesHouse = async () => {
    const crn = client?.registrationNumber?.trim().toUpperCase();
    if (!crn) {
      toast({
        title: "No Company Number",
        description: "Client does not have a Companies House CRN set.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingChDates(true);
    try {
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/all`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch Companies House records.");
      }
      const data = await res.json();
      const accounts = data?.profile?.accounts;
      const nextAccounts = accounts?.next_accounts;
      const lastAccounts = accounts?.last_accounts;

      let startDate = "";
      let endDate = "";
      let dueDate = "";

      if (nextAccounts?.period_start_on) {
        startDate = nextAccounts.period_start_on;
      } else if (lastAccounts?.made_up_to) {
        const lastDate = new Date(lastAccounts.made_up_to);
        lastDate.setDate(lastDate.getDate() + 1);
        startDate = lastDate.toISOString().split("T")[0];
      }

      if (nextAccounts?.period_end_on) {
        endDate = nextAccounts.period_end_on;
      }

      if (nextAccounts?.due_on) {
        dueDate = nextAccounts.due_on;
      }

      if (endDate) {
        const formattedEnd = new Date(endDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        setPeriodForm((prev) => ({
          ...prev,
          periodName: `Year Ended ${formattedEnd}`,
          startDate: startDate || prev.startDate,
          endDate: endDate,
          dueDate: dueDate || prev.dueDate,
        }));
        toast({
          title: "Dates Populated from Companies House",
          description: `Set period to ${startDate || "start"} - ${endDate} (Statutory due date: ${dueDate || "N/A"}).`,
        });
      } else {
        toast({
          title: "No Live Accounts Data",
          description: "Could not find statutory next accounts dates from Companies House.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Companies House Sync Error",
        description: err.message || "Failed to retrieve dates from Companies House.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingChDates(false);
    }
  };

  const transferToCt600Mutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriodId) throw new Error("No accounting period selected.");
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/bridge-to-ct600`, {
        periodId: selectedPeriodId,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to transfer to CT600");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setCtBridgeResult(data);
      toast({
        title: "Transferred to CT600",
        description: data.message || "Period profit and dates transferred to Corporation Tax module.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Transfer Failed",
        description: err.message || "Could not bridge to Corporation Tax.",
        variant: "destructive",
      });
    },
  });

  const openNewPeriodModal = () => {
    setIsEditingPeriod(false);
    setPeriodForm({
      id: 0,
      periodName: `Period ${periods.length + 1}`,
      startDate: new Date().getFullYear() + "-04-01",
      endDate: (new Date().getFullYear() + 1) + "-03-31",
      dueDate: (new Date().getFullYear() + 1) + "-12-31",
      accountingStandard: "FRS102_1A",
      status: "Draft",
    });
    setShowPeriodModal(true);
  };

  const openEditPeriodModal = (period: any) => {
    setIsEditingPeriod(true);
    setPeriodForm({
      id: period.id,
      periodName: period.periodName || `Period ${period.id}`,
      startDate: period.startDate?.split("T")[0] || period.startDate,
      endDate: period.endDate?.split("T")[0] || period.endDate,
      dueDate: period.dueDate?.split("T")[0] || period.dueDate || "",
      accountingStandard: period.accountingStandard || "FRS102_1A",
      status: period.status || "Draft",
    });
    setShowPeriodModal(true);
  };

  // Centralized Accounts Production Sidebar Navigation
  const sidebar: NavItem[] = getAccountsProductionSidebar(clientId);
  const navItems = sidebar.filter((item) => !item.isHeader && !!item.route);

  const shouldDisplayPipeline =
    showPipeline !== undefined
      ? showPipeline
      : !AP_UTILITY_SECTIONS.includes(activeSection || "") && !isAccountsProductionUtilityRoute(location);

  if (isLoadingClient) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Loading client production workspace...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <AppLayout sidebar={sidebar} module="Accounts Production">
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Client Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Unable to locate the client workspace for ID "{clientId}". The client may have been removed or you do not have permission.
            </p>
          </div>
          <Link
            href="/accounts-production"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors shadow-xs"
          >
            Back to Accounts Production Directory
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Derive active label for display
  const currentNav = navItems.find((n) => n.route && location.startsWith(n.route)) || navItems[0];

  const contextValue: ClientWorkspaceContextType = {
    clientId,
    client,
    isLoadingClient,
    periods,
    isLoadingPeriods,
    selectedPeriodId,
    setSelectedPeriodId,
    currentPeriod,
    refetchPeriods,
    refetchClient,
    openNewPeriodModal,
    openEditPeriodModal,
  };

  return (
    <ClientWorkspaceContext.Provider value={contextValue}>
      <AppLayout sidebar={sidebar} module="Accounts Production">
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs print:bg-white print:min-h-0 print:p-0 print:m-0">
          {/* Top Header Breadcrumb & Period Selector */}
          <div className="no-print bg-white dark:bg-slate-900 px-5 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-xs gap-3">
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1.5 flex-wrap">
              <Link href="/accounts-production" className="flex items-center gap-1 hover:text-indigo-600 font-medium">
                <LayoutDashboard size={13} /> Accounts Production
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{client.clientName}</span>
              <span>/</span>
              <span className="text-indigo-600 font-medium">{activeSection || currentNav.label}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period Selector Dropdown */}
              {periods.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select
                    value={selectedPeriodId || ""}
                    onChange={(e) => setSelectedPeriodId(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs rounded border-0 bg-transparent text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {p.periodName || `Period: ${new Date(p.startDate).toLocaleDateString("en-GB")} - ${new Date(p.endDate).toLocaleDateString("en-GB")}`} ({p.status})
                      </option>
                    ))}
                  </select>

                  {currentPeriod && (
                    <button
                      onClick={() => openEditPeriodModal(currentPeriod)}
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded cursor-pointer transition-colors"
                      title="Edit selected period"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}

                  <button
                    onClick={openNewPeriodModal}
                    className="px-2 py-1 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-600 shadow-xs cursor-pointer transition-colors"
                    title="Add new accounting period"
                  >
                    <Plus size={11} /> New Period
                  </button>
                </div>
              ) : (
                <button
                  onClick={openNewPeriodModal}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus size={13} /> Add Accounting Period
                </button>
              )}

              {client.registrationNumber && (
                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors"
                  title="View on Companies House (Opens in new tab)"
                >
                  <ExternalLink size={11} /> Companies House
                </a>
              )}

              {currentPeriod && (
                <button
                  type="button"
                  onClick={() => transferToCt600Mutation.mutate()}
                  disabled={transferToCt600Mutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="1-Click: Transfer trial balance profit & statutory dates to CT600 Corporation Tax module"
                >
                  <Calculator size={11} /> {transferToCt600Mutation.isPending ? "Transferring..." : "Transfer to CT600"}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Step-by-Step Statutory Pipeline (Shown only on statutory preparation workflow pages) */}
          {shouldDisplayPipeline && (
            <AccountsProductionPipeline
              clientId={clientId}
              selectedPeriodId={selectedPeriodId}
              currentPeriod={currentPeriod}
              activeSection={activeSection}
            />
          )}

          {/* Main Content Area */}
          <div className="p-6 w-full mx-auto space-y-6 print:p-0 print:m-0 print:space-y-0">
            {/* If No Accounting Period Exists and section is period-dependent, show clean zero state */}
            {periods.length === 0 && !["CH API'S Integration", "Update CH Directors", "Logs", "Audit Logs", "Tasks", "Chart of Accounts", "Settings"].includes(activeSection || "") ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4 shadow-xs max-w-2xl mx-auto my-8">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Accounting Period Configured</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    To prepare statutory accounts, balance sheets, disclosure notes, and submit iXBRL filings for {client.clientName}, please create an accounting period.
                  </p>
                </div>
                <button
                  onClick={openNewPeriodModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Create First Accounting Period
                </button>
              </div>
            ) : (
              children
            )}
          </div>

          {/* Modal: Period Manager (Create / Edit) */}
          {showPeriodModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isEditingPeriod ? "Edit Accounting Period" : "Add Accounting Period"}
                  </h3>
                  <button onClick={() => setShowPeriodModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {client?.registrationNumber && (
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-indigo-900 dark:text-indigo-200 text-[11px] flex items-center gap-1.5">
                          <Building2 size={13} className="text-indigo-600" />
                          Companies House Statutory Dates
                        </p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                          Auto-fetch statutory ARD &amp; deadlines for CRN: {client.registrationNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncDatesFromCompaniesHouse}
                        disabled={isSyncingChDates}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <RefreshCw size={11} className={isSyncingChDates ? "animate-spin" : ""} />
                        {isSyncingChDates ? "Fetching..." : "Auto-Fill from CH"}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Period Description *</label>
                    <input
                      type="text"
                      value={periodForm.periodName}
                      onChange={(e) => setPeriodForm({ ...periodForm, periodName: e.target.value })}
                      placeholder="e.g. Year Ended 31 March 2026"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={periodForm.startDate}
                        onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                      <input
                        type="date"
                        value={periodForm.endDate}
                        onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Accounts Due Date</label>
                      <input
                        type="date"
                        value={periodForm.dueDate}
                        onChange={(e) => setPeriodForm({ ...periodForm, dueDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Accounting Standard</label>
                      <select
                        value={periodForm.accountingStandard}
                        onChange={(e) => setPeriodForm({ ...periodForm, accountingStandard: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="FRS102_1A">FRS 102 Section 1A (Small)</option>
                        <option value="FRS105">FRS 105 (Micro-entities)</option>
                        <option value="Dormant">Dormant (AA02 / DCA)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={periodForm.status}
                      onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Draft">Draft (In Preparation)</option>
                      <option value="Review">In Review</option>
                      <option value="Sent for eSign">Sent for eSign</option>
                      <option value="Signed">Signed by Director</option>
                      <option value="Filed">Filed to Companies House</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  {isEditingPeriod ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this accounting period?")) {
                          deletePeriodMutation.mutate(periodForm.id);
                        }
                      }}
                      className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete Period
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPeriodModal(false)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingPeriod) {
                          updatePeriodMutation.mutate(periodForm);
                        } else {
                          createPeriodMutation.mutate(periodForm);
                        }
                      }}
                      disabled={createPeriodMutation.isPending || updatePeriodMutation.isPending}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {createPeriodMutation.isPending || updatePeriodMutation.isPending ? "Saving..." : "Save Period"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Corporation Tax Bridge Transfer Confirmation */}
          {ctBridgeResult && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Calculator size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Transferred to Corporation Tax (CT600)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Statutory figures bridged to HMRC CT600 tax return.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setCtBridgeResult(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Client Company:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{client.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Accounting Period:</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {currentPeriod ? `${new Date(currentPeriod.startDate).toLocaleDateString("en-GB")} - ${new Date(currentPeriod.endDate).toLocaleDateString("en-GB")}` : "Current Period"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Turnover / Revenue (Box 145):</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      £{parseFloat(ctBridgeResult.turnover || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Net Accounting Profit / (Loss):</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      £{parseFloat(ctBridgeResult.netAccountingProfit || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Estimated Corporation Tax:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      £{parseFloat(ctBridgeResult.taxPayable || "0").toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your accounting figures and statutory period dates have been successfully mapped into the CT600 Corporation Tax return. You can now open the CT600 module to adjust capital allowances, review marginal relief calculations, and submit the tax return to HMRC.
                </p>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setCtBridgeResult(null)}
                    className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-medium"
                  >
                    Stay in Accounts Production
                  </button>
                  <Link
                    href={`/corporation-tax/${clientId}/dashboard`}
                    onClick={() => setCtBridgeResult(null)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <span>Open CT600 Workspace</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ClientWorkspaceContext.Provider>
  );
}
