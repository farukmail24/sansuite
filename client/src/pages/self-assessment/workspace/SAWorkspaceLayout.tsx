import React, { createContext, useContext, useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Calculator, Shield, FileSignature,
  FileSpreadsheet, HelpCircle, CheckCircle2, AlertCircle, RefreshCw,
  Plus, ChevronRight, UserCheck, CreditCard, Send, X, ExternalLink,
  Layers, ArrowLeft
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export interface SAWorkspaceContextType {
  clientId: number;
  client: any;
  returns: any[];
  selectedReturnId: number | null;
  currentReturn: any | null;
  setSelectedReturnId: (id: number) => void;
  refetchReturns: () => Promise<any>;
  openNewReturnModal: boolean;
  setOpenNewReturnModal: (open: boolean) => void;
  selectedTaxYear: string;
  setSelectedTaxYear: (year: string) => void;
}

const SAWorkspaceContext = createContext<SAWorkspaceContextType | null>(null);

export function useSAWorkspace() {
  const context = useContext(SAWorkspaceContext);
  if (!context) {
    throw new Error("useSAWorkspace must be used within an SAWorkspaceLayout");
  }
  return context;
}

interface SAWorkspaceLayoutProps {
  children: React.ReactNode;
  activeSection: string;
}

export default function SAWorkspaceLayout({ children, activeSection }: SAWorkspaceLayoutProps) {
  const [match, params] = useRoute("/self-assessment/:clientId/:subpage*");
  const clientId = params?.clientId ? parseInt(params.clientId) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [openNewReturnModal, setOpenNewReturnModal] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState("2025/2026");

  // New return form state
  const [newTaxYear, setNewTaxYear] = useState("2025/2026");

  // 1. Fetch Client Details
  const { data: client, isLoading: clientLoading } = useQuery<any>({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practice/clients/${clientId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  // 2. Fetch SA100 Returns for this Client
  const { data: returns = [], isLoading: returnsLoading, refetch: refetchReturns } = useQuery<any[]>({
    queryKey: [`/api/self-assessment/${clientId}/returns`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/self-assessment/${clientId}/returns`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Auto-select latest return
  useEffect(() => {
    if (returns.length > 0 && !selectedReturnId) {
      setSelectedReturnId(returns[0].id);
      if (returns[0].taxYear) {
        setSelectedTaxYear(returns[0].taxYear);
      }
    }
  }, [returns, selectedReturnId]);

  const currentReturn = returns.find((r) => r.id === selectedReturnId) || returns[0] || null;

  // 3. Create Return Mutation
  const createReturnMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create return" }));
        throw new Error(err.error || "Failed to create return");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SA100 Return Created",
        description: `Tax year ${newTaxYear} return initialized.`,
        type: "success",
      });
      setOpenNewReturnModal(false);
      refetchReturns();
      if (data.id || data.returnId) {
        setSelectedReturnId(data.id || data.returnId);
        setSelectedTaxYear(newTaxYear);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Creation Failed",
        description: err.message,
        type: "error",
      });
    },
  });

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    createReturnMutation.mutate({
      taxYear: newTaxYear,
      utrNumber: client?.utrNumber || "",
      niNumber: client?.niNumber || "",
      status: "Draft",
    });
  };

  const navItems = [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: `/self-assessment/${clientId}/dashboard` },
    { label: "SA100 Core Income", icon: <FileText size={15} />, route: `/self-assessment/${clientId}/forms` },
    { label: "Supplementary Schedules", icon: <Layers size={15} />, route: `/self-assessment/${clientId}/schedules` },
    { label: "Statutory Calculators", icon: <Calculator size={15} />, route: `/self-assessment/${clientId}/calculators` },
    { label: "Tax Calculation & SA302", icon: <FileSpreadsheet size={15} />, route: `/self-assessment/${clientId}/calculation` },
    { label: "Payments on Account", icon: <CreditCard size={15} />, route: `/self-assessment/${clientId}/poa` },
    { label: "Tax Due Notice", icon: <FileText size={15} />, route: `/self-assessment/${clientId}/tax-due` },
    { label: "Questionnaire", icon: <HelpCircle size={15} />, route: `/self-assessment/${clientId}/questionnaire` },
    { label: "eSign", icon: <FileSignature size={15} />, route: `/self-assessment/${clientId}/esign` },
    { label: "HMRC Submit Gateway", icon: <Shield size={15} />, route: `/self-assessment/${clientId}/submit` },
  ];

  const sidebar = [
    { label: "SA Directory", icon: <ArrowLeft size={14} />, route: "/self-assessment" },
    ...navItems.map((item) => ({
      label: item.label,
      icon: item.icon,
      route: item.route,
    })),
  ];

  return (
    <SAWorkspaceContext.Provider
      value={{
        clientId,
        client,
        returns,
        selectedReturnId,
        currentReturn,
        setSelectedReturnId,
        refetchReturns,
        openNewReturnModal,
        setOpenNewReturnModal,
        selectedTaxYear,
        setSelectedTaxYear,
      }}
    >
      <AppLayout sidebar={sidebar} module="Self Assessment">
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col text-xs">
          {/* Top Client Header Bar */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                  <Link href="/self-assessment" className="hover:text-purple-600 transition-colors flex items-center gap-1">
                    <UserCheck size={12} />
                    <span>Self Assessment</span>
                  </Link>
                  <ChevronRight size={12} />
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">{client?.clientName || "Loading..."}</span>
                  <ChevronRight size={12} />
                  <span className="text-purple-600 font-semibold">{activeSection}</span>
                </div>

                {/* Client Name & Identifiers */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {client?.clientName || "Taxpayer Workspace"}
                  </h1>

                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    {client?.clientType || "Individual"}
                  </span>

                  {/* UTR badge */}
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    UTR: {client?.utrNumber || currentReturn?.utrNumber || "Not Set"}
                  </span>

                  {/* NINO badge */}
                  {client?.niNumber && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      NINO: {client.niNumber}
                    </span>
                  )}

                  {/* Return Status Badge */}
                  {currentReturn && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      currentReturn.status === "Submitted" || currentReturn.status === "Accepted"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                        : currentReturn.status === "Validated"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                    }`}>
                      <CheckCircle2 size={11} />
                      {currentReturn.status || "Draft"}
                    </span>
                  )}
                </div>
              </div>

              {/* Tax Year Selector & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Return Switcher Dropdown */}
                {returns.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 font-medium">Tax Year:</span>
                    <select
                      value={currentReturn?.id || ""}
                      onChange={(e) => {
                        const rId = parseInt(e.target.value);
                        setSelectedReturnId(rId);
                        const found = returns.find((r) => r.id === rId);
                        if (found?.taxYear) setSelectedTaxYear(found.taxYear);
                      }}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {returns.map((ret) => (
                        <option key={ret.id} value={ret.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                          {ret.taxYear} ({ret.status || "Draft"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setOpenNewReturnModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  New SA100
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
            {!currentReturn ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <UserCheck size={32} />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    No SA100 Return Initialized
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No Self Assessment return currently exists for {client?.clientName || "this client"}.
                    Initialize a return to begin recording income, allowances, schedules, and filing with HMRC.
                  </p>
                  <button
                    onClick={() => setOpenNewReturnModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Initialize SA100 Return
                  </button>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>

        {/* Modal: Create New SA100 Return */}
        {openNewReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck size={16} className="text-purple-600" />
                  Create New SA100 Return
                </h3>
                <button
                  onClick={() => setOpenNewReturnModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateReturn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taxpayer
                  </label>
                  <input
                    type="text"
                    disabled
                    value={client?.clientName || ""}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTaxYear}
                    onChange={(e) => setNewTaxYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="2025/2026">2025/2026 (Current Tax Year)</option>
                    <option value="2024/2025">2024/2025 (Filing Due 31 Jan 2026)</option>
                    <option value="2023/2024">2023/2024</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UTR (10 Digits)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={client?.utrNumber || "Not on file"}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      National Insurance
                    </label>
                    <input
                      type="text"
                      disabled
                      value={client?.niNumber || "Not on file"}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/60 text-[11px] text-purple-700 dark:text-purple-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Shield size={13} />
                    Statutory Filing Deadlines
                  </p>
                  <p className="text-[10px] text-purple-600/90 dark:text-purple-400">
                    Online filing & balance payment: <strong>31 January</strong> following the tax year end. Second Payment on Account: <strong>31 July</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenNewReturnModal(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createReturnMutation.isPending}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {createReturnMutation.isPending ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        Initialize Return
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    </SAWorkspaceContext.Provider>
  );
}
