import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, Calculator, FileSpreadsheet, Layers, FileText,
  FileSignature, Shield, CheckSquare, Building2, History, ExternalLink,
  Plus, Calendar, AlertCircle, RefreshCw, X, CheckCircle2, ChevronRight,
  Printer, ArrowRight, Trash2, Check, ChevronDown
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

interface CTWorkspaceContextType {
  clientId: string;
  client: any;
  isLoadingClient: boolean;
  returns: any[];
  isLoadingReturns: boolean;
  selectedReturnId: number | null;
  setSelectedReturnId: (id: number | null) => void;
  currentReturn: any | null;
  periods: any[];
  refetchReturns: () => Promise<any>;
  refetchClient: () => Promise<any>;
  openNewReturnModal: () => void;
  openDeleteModal: (ret?: any) => void;
  openManageReturnsModal: () => void;
  deleteReturn: (id: number) => Promise<any>;
  updateReturnStatus: (id: number, status: string) => Promise<any>;
}

const CTWorkspaceContext = createContext<CTWorkspaceContextType | null>(null);

export function useCTWorkspace() {
  const context = useContext(CTWorkspaceContext);
  if (!context) {
    throw new Error("useCTWorkspace must be used within a CTWorkspaceLayout");
  }
  return context;
}

interface CTWorkspaceLayoutProps {
  children: ReactNode;
  activeSection?: string;
}

export default function CTWorkspaceLayout({ children, activeSection }: CTWorkspaceLayoutProps) {
  const [, paramsDirect] = useRoute("/corporation-tax/:clientId");
  const [, paramsSub] = useRoute("/corporation-tax/:clientId/:subpage*");
  const clientId = paramsDirect?.clientId || paramsSub?.clientId || "";

  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<any | null>(null);
  const [showManageReturnsModal, setShowManageReturnsModal] = useState(false);

  const [returnForm, setReturnForm] = useState({
    periodId: 0,
    startDate: new Date().getFullYear() - 1 + "-04-01",
    endDate: new Date().getFullYear() + "-03-31",
    taxYear: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
    utrNumber: "",
  });

  // 1. Fetch Client Details
  const { data: client, isLoading: isLoadingClient, refetch: refetchClient } = useQuery<any>({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/practice/clients/${clientId}`);
        if (res.ok) {
          const c = await res.json();
          if (c && c.id) return c;
        }
      } catch (e) {}
      try {
        const res2 = await apiRequest("GET", "/api/practice/clients");
        if (res2.ok) {
          const all = await res2.json();
          const parsed = parseInt(clientId || "0");
          return all.find((c: any) => c.id === parsed) || null;
        }
      } catch (e) {}
      return null;
    },
    enabled: !!clientId,
  });

  // 2. Fetch CT600 Returns for this client
  const { data: returns = [], isLoading: isLoadingReturns, refetch: refetchReturns } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${clientId}/returns`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // 3. Fetch Client Accounting Periods (from Accounts Production)
  const { data: periods = [] } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${clientId}/periods`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/periods`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (returns.length > 0) {
      if (!selectedReturnId || !returns.find((r) => r.id === selectedReturnId)) {
        setSelectedReturnId(returns[0].id);
      }
    } else {
      setSelectedReturnId(null);
    }
  }, [returns, selectedReturnId]);

  const currentReturn = returns.find((r) => r.id === selectedReturnId) || returns[0] || null;

  // Mutation: Create CT600 Return
  const createReturnMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/corporation-tax/${clientId}/returns`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create return.");
      }
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await refetchReturns();
      setShowReturnModal(false);
      if (data?.returnId) {
        setSelectedReturnId(data.returnId);
      }
      toast({
        title: "CT600 Return Initialized",
        description: "Statutory CT600 return created with HMRC payment & filing deadlines.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create CT600 return.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Delete CT600 Return
  const deleteReturnMutation = useMutation({
    mutationFn: async (returnId: number) => {
      const res = await apiRequest("DELETE", `/api/corporation-tax/${clientId}/returns/${returnId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete return.");
      }
      return res.json();
    },
    onSuccess: async (_data, returnId) => {
      await refetchReturns();
      setShowDeleteModal(false);
      setReturnToDelete(null);
      const remaining = returns.filter((r) => r.id !== returnId);
      if (remaining.length > 0) {
        setSelectedReturnId(remaining[0].id);
      } else {
        setSelectedReturnId(null);
      }
      toast({
        title: "CT600 Return Deleted",
        description: "The draft CT600 return and related schedules have been permanently removed.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete CT600 return.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Update Return Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/corporation-tax/${clientId}/returns/${returnId}/status`, { status });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update return status.");
      }
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      await refetchReturns();
      toast({
        title: "Status Updated",
        description: `CT600 return status set to ${variables.status}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Status Update Failed",
        description: err.message || "Could not change return status.",
        variant: "destructive",
      });
    },
  });

  const openNewReturnModal = () => {
    const latestPeriod = periods[0];
    setReturnForm({
      periodId: latestPeriod?.id || 0,
      startDate: latestPeriod?.startDate ? latestPeriod.startDate.split("T")[0] : new Date().getFullYear() - 1 + "-04-01",
      endDate: latestPeriod?.endDate ? latestPeriod.endDate.split("T")[0] : new Date().getFullYear() + "-03-31",
      taxYear: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
      utrNumber: client?.utrNumber || "",
    });
    setShowReturnModal(true);
  };

  const openDeleteModal = (ret?: any) => {
    setReturnToDelete(ret || currentReturn);
    setShowDeleteModal(true);
  };

  const openManageReturnsModal = () => {
    setShowManageReturnsModal(true);
  };

  const deleteReturn = async (id: number) => {
    return await deleteReturnMutation.mutateAsync(id);
  };

  const updateReturnStatus = async (id: number, status: string) => {
    return await updateStatusMutation.mutateAsync({ returnId: id, status });
  };

  // Dedicated Workspace Sub-Routes in Chronological Workflow Sequence
  const navItems = [
    { label: "Overview & Deadlines", icon: <LayoutDashboard size={14} />, route: `/corporation-tax/${clientId}/dashboard` },
    { label: "CT600 Computation", icon: <Calculator size={14} />, route: `/corporation-tax/${clientId}/computation` },
    { label: "Calculators Hub", icon: <Layers size={14} />, route: `/corporation-tax/${clientId}/calculators` },
    { label: "Supplementary Pages", icon: <FileText size={14} />, route: `/corporation-tax/${clientId}/supplementary` },
    { label: "Attachments & Accounts", icon: <FileSpreadsheet size={14} />, route: `/corporation-tax/${clientId}/attachments` },
    { label: "Tax Due Notice", icon: <Printer size={14} />, route: `/corporation-tax/${clientId}/tax-due` },
    { label: "eSign Approval", icon: <FileSignature size={14} />, route: `/corporation-tax/${clientId}/esign` },
    { label: "HMRC Submit Gateway", icon: <Shield size={14} />, route: `/corporation-tax/${clientId}/submit` },
  ];

  const sidebar = navItems.map((item) => ({
    label: item.label,
    icon: item.icon,
    route: item.route,
  }));

  if (isLoadingClient) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Loading corporate tax workspace...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <AppLayout sidebar={sidebar} module="Corporation Tax">
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Client Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Unable to locate the corporate entity for ID "{clientId}".
            </p>
          </div>
          <Link
            href="/corporation-tax"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors shadow-xs"
          >
            Back to Corporation Tax Directory
          </Link>
        </div>
      </AppLayout>
    );
  }

  const currentNav = navItems.find((n) => location.startsWith(n.route)) || navItems[0];

  const contextValue: CTWorkspaceContextType = {
    clientId,
    client,
    isLoadingClient,
    returns,
    isLoadingReturns,
    selectedReturnId,
    setSelectedReturnId,
    currentReturn,
    periods,
    refetchReturns,
    refetchClient,
    openNewReturnModal,
    openDeleteModal,
    openManageReturnsModal,
    deleteReturn,
    updateReturnStatus,
  };

  return (
    <CTWorkspaceContext.Provider value={contextValue}>
      <AppLayout sidebar={sidebar} module="Corporation Tax">
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs">
          {/* Top Header Breadcrumb & Return Selector */}
          <div className="bg-white dark:bg-slate-900 px-5 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-xs gap-3">
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1.5 flex-wrap">
              <Link href="/corporation-tax" className="flex items-center gap-1 hover:text-indigo-600 font-medium">
                <Building2 size={13} /> Corporation Tax
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{client.clientName}</span>
              <span>/</span>
              <span className="text-indigo-600 font-medium">{activeSection || currentNav.label}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Return Selector & Period Controls */}
              {returns.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select
                    value={selectedReturnId || ""}
                    onChange={(e) => setSelectedReturnId(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs rounded border-0 bg-transparent text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden cursor-pointer"
                    title="Switch CT600 Return"
                  >
                    {returns.map((r) => (
                      <option key={r.id} value={r.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        #{r.id} • {r.taxYear || "CT600"} ({new Date(r.accountingPeriodStart).toLocaleDateString("en-GB")} - {new Date(r.accountingPeriodEnd).toLocaleDateString("en-GB")}) [{r.status}]
                      </option>
                    ))}
                  </select>

                  {/* Status Dropdown */}
                  {currentReturn && (
                    <select
                      value={currentReturn.status || "Draft"}
                      onChange={(e) => updateReturnStatus(currentReturn.id, e.target.value)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border-0 cursor-pointer ${
                        currentReturn.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : currentReturn.status === "Validated"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                          : currentReturn.status === "Submitted"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                      title="Update Return Workflow Status"
                    >
                      <option value="Draft">Draft</option>
                      <option value="In Review">In Review</option>
                      <option value="Validated">Validated</option>
                      <option value="ReadyToSubmit">Ready to Submit</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  )}

                  {/* Delete Return Button (For removing duplicates/drafts) */}
                  {currentReturn && currentReturn.status !== "Accepted" && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal(currentReturn)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      title="Delete this Return (e.g. remove duplicate draft)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ) : null}

              {/* Manage All Returns Button */}
              {returns.length > 0 && (
                <button
                  type="button"
                  onClick={openManageReturnsModal}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Manage all returns, view duplicates, and switch periods"
                >
                  <Layers size={11} className="text-indigo-600" />
                  <span>Manage Returns ({returns.length})</span>
                </button>
              )}

              {/* Link to Accounts Production */}
              <Link
                href={`/accounts-production/${clientId}`}
                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors"
                title="Jump to Accounts Production module"
              >
                <FileSpreadsheet size={11} />
                <span>Accounts Production</span>
              </Link>

              <button
                onClick={openNewReturnModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={13} /> New CT600 Return
              </button>

              {client.registrationNumber && (
                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors"
                  title="View on Companies House"
                >
                  <ExternalLink size={11} /> Companies House
                </a>
              )}
            </div>
          </div>

          {/* Interactive Statutory Workflow Pipeline Bar */}
          {currentReturn && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-2 overflow-x-auto shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-max">
                <Link
                  href={`/accounts-production/${clientId}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors"
                  title="Source Accounts Production accounts & Trial Balance"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>1. Accounts Production</span>
                </Link>
                <ChevronRight size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />

                {navItems.map((step, idx) => {
                  const isActive = location.startsWith(step.route);
                  return (
                    <div key={step.route} className="flex items-center gap-1.5">
                      <Link
                        href={step.route}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {step.icon}
                        <span>{idx + 2}. {step.label}</span>
                      </Link>
                      {idx < navItems.length - 1 && (
                        <ChevronRight size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="p-6 w-full mx-auto space-y-6">
            {/* ZERO STATE: If No CT600 Return Exists */}
            {returns.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4 shadow-xs max-w-2xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No CT600 Return Configured</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    To compute Corporation Tax, apply Capital Allowances, calculate Marginal Relief, and submit Form CT600 to HMRC for {client.clientName}, please initialize a return.
                  </p>
                </div>
                <button
                  onClick={openNewReturnModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Create First CT600 Return
                </button>
              </div>
            )}

            {children}
          </div>

          {/* Modal: New CT600 Return */}
          {showReturnModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calculator size={16} className="text-indigo-600" />
                    New Corporation Tax Return (CT600)
                  </h3>
                  <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Select Associated Accounts Period */}
                  {periods.length > 0 && (
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Link Accounts Production Period
                      </label>
                      <select
                        value={returnForm.periodId}
                        onChange={(e) => {
                          const pId = parseInt(e.target.value);
                          const p = periods.find((item) => item.id === pId);
                          if (p) {
                            setReturnForm({
                              ...returnForm,
                              periodId: p.id,
                              startDate: p.startDate.split("T")[0],
                              endDate: p.endDate.split("T")[0],
                              taxYear: `${p.startDate.substring(0, 4)}/${p.endDate.substring(0, 4)}`,
                            });
                          } else {
                            setReturnForm({ ...returnForm, periodId: 0 });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value={0}>Custom Period (Not Linked)</option>
                        {periods.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.periodName || `Period ${p.id}`} ({new Date(p.startDate).toLocaleDateString("en-GB")} - {new Date(p.endDate).toLocaleDateString("en-GB")})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Company 10-Digit UTR *</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={returnForm.utrNumber}
                      onChange={(e) => setReturnForm({ ...returnForm, utrNumber: e.target.value.replace(/\D/g, "") })}
                      placeholder="e.g. 1234567890"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Mandatory for HMRC electronic submission.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Accounting Period Start *</label>
                      <input
                        type="date"
                        value={returnForm.startDate}
                        onChange={(e) => setReturnForm({ ...returnForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Accounting Period End *</label>
                      <input
                        type="date"
                        value={returnForm.endDate}
                        onChange={(e) => setReturnForm({ ...returnForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Year</label>
                    <input
                      type="text"
                      value={returnForm.taxYear}
                      onChange={(e) => setReturnForm({ ...returnForm, taxYear: e.target.value })}
                      placeholder="e.g. 2025/2026"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800">
                    <p className="font-semibold">Statutory Deadlines (HMRC Rule):</p>
                    <p className="mt-0.5">Payment Due: End date + 9 months 1 day.</p>
                    <p>Filing Due: End date + 12 months.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createReturnMutation.isPending || !returnForm.startDate || !returnForm.endDate}
                    onClick={() =>
                      createReturnMutation.mutate({
                        periodId: returnForm.periodId || null,
                        utrNumber: returnForm.utrNumber,
                        accountingPeriodStart: returnForm.startDate,
                        accountingPeriodEnd: returnForm.endDate,
                        taxYear: returnForm.taxYear,
                      })
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {createReturnMutation.isPending ? "Creating..." : "Initialize Return"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Delete Confirmation (Remove Duplicate / Draft Return) */}
          {showDeleteModal && returnToDelete && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in-50">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <Trash2 size={16} />
                    <span>Delete Draft CT600 Return</span>
                  </h3>
                  <button
                    onClick={() => { setShowDeleteModal(false); setReturnToDelete(null); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-slate-700 dark:text-slate-300 space-y-2">
                  <div className="font-semibold text-rose-900 dark:text-rose-200 text-xs">
                    Confirm deletion of CT600 Return #{returnToDelete.id}?
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Accounting Period: <span className="font-semibold text-slate-900 dark:text-slate-100">{new Date(returnToDelete.accountingPeriodStart).toLocaleDateString("en-GB")} – {new Date(returnToDelete.accountingPeriodEnd).toLocaleDateString("en-GB")}</span> ({returnToDelete.taxYear || "CT600"})
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    This will permanently delete this duplicate/unwanted return, along with any linked draft capital allowances schedules, loss schedules, and calculations.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteModal(false); setReturnToDelete(null); }}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReturnMutation.mutate(returnToDelete.id)}
                    disabled={deleteReturnMutation.isPending}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    {deleteReturnMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    <span>Yes, Delete Return</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Manage All Returns & Duplicate Periods */}
          {showManageReturnsModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in-50">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Manage Client CT600 Returns & Periods
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Switch active return, update filing workflow status, or remove duplicate draft periods.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManageReturnsModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">ID / Period</th>
                        <th className="py-2.5 px-3 font-semibold">Tax Year</th>
                        <th className="py-2.5 px-3 font-semibold">Turnover / Tax</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {returns.map((r) => {
                        const isSelected = r.id === selectedReturnId;
                        return (
                          <tr
                            key={r.id}
                            className={isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">#{r.id}</span>
                                <span>{new Date(r.accountingPeriodStart).toLocaleDateString("en-GB")} – {new Date(r.accountingPeriodEnd).toLocaleDateString("en-GB")}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                              {r.taxYear || "CT600"}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                Turnover: £{parseFloat(r.turnover || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                              </div>
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                Net Tax: £{parseFloat(r.netTaxDue || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={r.status || "Draft"}
                                onChange={(e) => updateStatusMutation.mutate({ returnId: r.id, status: e.target.value })}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                              >
                                <option value="Draft">Draft</option>
                                <option value="In Review">In Review</option>
                                <option value="Validated">Validated</option>
                                <option value="ReadyToSubmit">Ready to Submit</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Accepted">Accepted</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isSelected ? (
                                  <button
                                    onClick={() => {
                                      setSelectedReturnId(r.id);
                                      setShowManageReturnsModal(false);
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    Select Active
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Active
                                  </span>
                                )}
                                {r.status !== "Accepted" && (
                                  <button
                                    onClick={() => {
                                      setReturnToDelete(r);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                    title="Delete this Return (e.g. duplicate draft)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowManageReturnsModal(false);
                      openNewReturnModal();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> New CT600 Return
                  </button>
                  <button
                    onClick={() => setShowManageReturnsModal(false)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </CTWorkspaceContext.Provider>
  );
}
