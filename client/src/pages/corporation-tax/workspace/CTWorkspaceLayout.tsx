import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, Calculator, FileSpreadsheet, Layers, FileText,
  FileSignature, Shield, CheckSquare, Building2, History, ExternalLink,
  Plus, Calendar, AlertCircle, RefreshCw, X, CheckCircle2, ChevronRight,
  Printer, ArrowRight
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
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns`, payload);
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
              {/* Return Selector Dropdown */}
              {returns.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select
                    value={selectedReturnId || ""}
                    onChange={(e) => setSelectedReturnId(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs rounded border-0 bg-transparent text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden cursor-pointer"
                  >
                    {returns.map((r) => (
                      <option key={r.id} value={r.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {r.taxYear || "CT600"} ({new Date(r.accountingPeriodStart).toLocaleDateString("en-GB")} - {new Date(r.accountingPeriodEnd).toLocaleDateString("en-GB")}) [{r.status}]
                      </option>
                    ))}
                  </select>

                  {currentReturn && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        currentReturn.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : currentReturn.status === "Validated"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                          : currentReturn.status === "Submitted"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {currentReturn.status}
                    </span>
                  )}
                </div>
              ) : null}

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
        </div>
      </AppLayout>
    </CTWorkspaceContext.Provider>
  );
}
