import React, { createContext, useContext, useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Calculator, Shield, FileSignature,
  FileSpreadsheet, HelpCircle, CheckCircle2, AlertCircle, RefreshCw,
  Plus, ChevronRight, UserCheck, CreditCard, Send, X, ExternalLink,
  Layers, ArrowLeft, Copy, DownloadCloud, Check
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import HMRCHelpTooltip, { HMRCFormCode } from "../../../components/common/HMRCHelpTooltip";
import SA100FormReportModal from "./SA100FormReportModal";

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
  handleDuplicateAmended: () => Promise<void>;
  isDuplicatingAmended: boolean;
  openSA100Modal: (tab?: "sa100" | "sa302") => void;
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
  const [openExternalModal, setOpenExternalModal] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState("2025/2026");
  const [isDuplicatingAmended, setIsDuplicatingAmended] = useState(false);

  // External submission modal form states
  const [externalDate, setExternalDate] = useState(new Date().toISOString().split("T")[0]);
  const [externalMethod, setExternalMethod] = useState("HMRC Online Services Portal");
  const [externalRef, setExternalRef] = useState("");
  const [externalNotes, setExternalNotes] = useState("");
  const [isSubmittingExternal, setIsSubmittingExternal] = useState(false);

  // New return form state
  const [newTaxYear, setNewTaxYear] = useState("2025/2026");

  // HMRC Pre-Population modal states
  const [openPrePopModal, setOpenPrePopModal] = useState(false);
  const [prepopData, setPrepopData] = useState<any>(null);
  const [isLoadingPrePop, setIsLoadingPrePop] = useState(false);
  const [isApplyingPrePop, setIsApplyingPrePop] = useState(false);
  const [includeEmployments, setIncludeEmployments] = useState(true);
  const [includeCis, setIncludeCis] = useState(true);

  // Capisign modal states
  const [openCapisignModal, setOpenCapisignModal] = useState(false);
  const [capisignSignerName, setCapisignSignerName] = useState("");
  const [capisignSignerEmail, setCapisignSignerEmail] = useState("");
  const [capisignNotes, setCapisignNotes] = useState("");
  const [isSendingCapisign, setIsSendingCapisign] = useState(false);
  const [capisignStatusData, setCapisignStatusData] = useState<any>(null);
  const [isCheckingCapisignStatus, setIsCheckingCapisignStatus] = useState(false);

  // SA100 Statutory Form & SA302 Computation Modal states
  const [showSA100Modal, setShowSA100Modal] = useState(false);
  const [sa100ModalInitialTab, setSa100ModalInitialTab] = useState<"sa100" | "sa302">("sa100");

  const openSA100Modal = (tab: "sa100" | "sa302" = "sa100") => {
    setSa100ModalInitialTab(tab);
    setShowSA100Modal(true);
  };

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

  const handleDuplicateAmended = async () => {
    if (!currentReturn || !clientId) return;
    const ok = window.confirm(`Create an amended draft return for ${currentReturn.taxYear}? This will clone all schedule data into a new Draft marked as an amended return.`);
    if (!ok) return;

    try {
      setIsDuplicatingAmended(true);
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/duplicate-amended`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to duplicate return" }));
        throw new Error(err.error || "Failed to duplicate return");
      }
      const data = await res.json();
      toast({
        title: "Amended Return Created",
        description: data.message || "Draft amended return initialized. You can now modify and refile to HMRC.",
        type: "success",
      });
      await refetchReturns();
      if (data.id || data.returnId) {
        setSelectedReturnId(data.id || data.returnId);
      }
    } catch (err: any) {
      toast({ title: "Amended Return Error", description: err.message, type: "error" });
    } finally {
      setIsDuplicatingAmended(false);
    }
  };

  const handleMarkExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReturn || !clientId) return;
    try {
      setIsSubmittingExternal(true);
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/mark-external`, {
        submissionDate: externalDate,
        filingMethod: externalMethod,
        hmrcReference: externalRef,
        notes: externalNotes,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to mark as submitted" }));
        throw new Error(err.error || "Failed to mark as submitted");
      }
      toast({
        title: "Return Marked as Submitted",
        description: `External filing on ${externalDate} via ${externalMethod} recorded successfully.`,
        type: "success",
      });
      setOpenExternalModal(false);
      await refetchReturns();
    } catch (err: any) {
      toast({ title: "Submission Error", description: err.message, type: "error" });
    } finally {
      setIsSubmittingExternal(false);
    }
  };

  useEffect(() => {
    if (client) {
      if (!capisignSignerName && client.clientName) setCapisignSignerName(client.clientName);
      if (!capisignSignerEmail && client.email) setCapisignSignerEmail(client.email);
    }
  }, [client]);

  const handleOpenPrePop = async () => {
    if (!currentReturn) return;
    setOpenPrePopModal(true);
    setIsLoadingPrePop(true);
    try {
      const res = await apiRequest("GET", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/hmrc-prepop-data`);
      if (res.ok) {
        const data = await res.json();
        setPrepopData(data.prepopData);
      }
    } catch (err: any) {
      toast({ title: "Failed to fetch pre-pop data", description: err.message, type: "error" });
    } finally {
      setIsLoadingPrePop(false);
    }
  };

  const handleApplyPrePop = async () => {
    if (!currentReturn || !prepopData) return;
    setIsApplyingPrePop(true);
    try {
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/apply-prepop`, {
        selectedEmployments: includeEmployments ? prepopData.employments : [],
        selectedCis: includeCis ? prepopData.cisDeductions : [],
        includeEmployments,
        includeCis,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to apply pre-populated data" }));
        throw new Error(err.error || "Failed to apply pre-populated data");
      }
      const data = await res.json();
      toast({
        title: "Pre-Populated Data Applied",
        description: data.message || "HMRC digital records successfully imported into return draft.",
        type: "success",
      });
      setOpenPrePopModal(false);
      await refetchReturns();
      queryClient.invalidateQueries({ queryKey: [`/api/self-assessment/${clientId}/returns`] });
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, type: "error" });
    } finally {
      setIsApplyingPrePop(false);
    }
  };

  const handleOpenCapisign = async () => {
    if (!currentReturn) return;
    setOpenCapisignModal(true);
    if (currentReturn.status === "SentToCapisign" || currentReturn.status === "Signed") {
      await handleCheckCapisignStatus();
    }
  };

  const handleSendToCapisign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReturn) return;
    setIsSendingCapisign(true);
    try {
      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/send-to-capisign`, {
        signerName: capisignSignerName,
        signerEmail: capisignSignerEmail,
        notes: capisignNotes,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to dispatch eSign invitation" }));
        throw new Error(err.error || "Failed to dispatch eSign invitation");
      }
      const data = await res.json();
      toast({
        title: "eSign Invitation Dispatched",
        description: data.message || `Signing invitation dispatched to ${capisignSignerEmail}.`,
        type: "success",
      });
      await refetchReturns();
      await handleCheckCapisignStatus();
    } catch (err: any) {
      toast({ title: "eSign Dispatch Failed", description: err.message, type: "error" });
    } finally {
      setIsSendingCapisign(false);
    }
  };

  const handleCheckCapisignStatus = async () => {
    if (!currentReturn) return;
    setIsCheckingCapisignStatus(true);
    try {
      const res = await apiRequest("GET", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/capisign-status`);
      if (res.ok) {
        const data = await res.json();
        setCapisignStatusData(data.capisignStatus);
        if (data.capisignStatus?.isSigned) {
          toast({
            title: "eSign Status: Signed & Approved",
            description: "Client has electronically signed the return. Status updated to Signed.",
            type: "success",
          });
          await refetchReturns();
        }
      }
    } catch (err: any) {
      // ignore
    } finally {
      setIsCheckingCapisignStatus(false);
    }
  };

  const steps: {
    num: number;
    name: string;
    sub: string;
    hmrcCode: HMRCFormCode;
    route: string;
    activeMatch: string[];
  }[] = [
    {
      num: 1,
      name: "1. Core & Bank",
      sub: "SA100 & Direct BACS",
      hmrcCode: "SA100",
      route: `/self-assessment/${clientId}/forms`,
      activeMatch: ["SA100 Core Income", "Forms & Schedules"],
    },
    {
      num: 2,
      name: "2. Schedules & WDV",
      sub: "SA102-109 & Reliefs",
      hmrcCode: "SA103F",
      route: `/self-assessment/${clientId}/schedules`,
      activeMatch: ["Supplementary Schedules", "Schedules (SA102-109)"],
    },
    {
      num: 3,
      name: "3. SA302 Tax Calc",
      sub: "Tax Liability & PoA",
      hmrcCode: "SA302",
      route: `/self-assessment/${clientId}/calculation`,
      activeMatch: ["Tax Calculation & SA302", "SA302 Tax Computation"],
    },
    {
      num: 4,
      name: "4. Tax Due Notice",
      sub: "Payment Advice Slip",
      hmrcCode: "CODING_OUT",
      route: `/self-assessment/${clientId}/tax-due`,
      activeMatch: ["Tax Due Notice"],
    },
    {
      num: 5,
      name: "5. Client Approval",
      sub: "eSign & Declaration",
      hmrcCode: "SA100",
      route: `/self-assessment/${clientId}/esign`,
      activeMatch: ["eSign", "Client eSign & Return Approval", "eSign Client Approval", "Client Approval"],
    },
    {
      num: 6,
      name: "6. HMRC Filing",
      sub: "Gateway & Receipt",
      hmrcCode: "SA100",
      route: `/self-assessment/${clientId}/submit`,
      activeMatch: ["HMRC Submit Gateway"],
    },
  ];

  const isExcludedFromStepper = [
    "Dashboard",
    "Client Dashboard",
    "Questionnaire",
    "Statutory Calculators",
    "Payments on Account",
    "SA100 (All forms)",
    "SA302 Computation",
  ].includes(activeSection);

  const currentStepIndex = steps.findIndex((s) => s.activeMatch.includes(activeSection));

  const sidebar = [
    { label: "Overview", isHeader: true },
    { label: "SA Directory", icon: <ArrowLeft size={14} />, route: "/self-assessment" },
    { label: "Client Dashboard", icon: <LayoutDashboard size={15} />, route: `/self-assessment/${clientId}/dashboard` },
    { label: "Questionnaire", icon: <HelpCircle size={15} />, route: `/self-assessment/${clientId}/questionnaire` },

    { label: "Return Filing Steps", isHeader: true },
    { label: "Core Return", icon: <FileText size={15} />, route: `/self-assessment/${clientId}/forms` },
    { label: "Schedules (SA102-109)", icon: <Layers size={15} />, route: `/self-assessment/${clientId}/schedules` },
    { label: "Tax Computation", icon: <FileSpreadsheet size={15} />, route: `/self-assessment/${clientId}/calculation` },
    { label: "Tax Due Notice", icon: <FileText size={15} />, route: `/self-assessment/${clientId}/tax-due` },
    { label: "Client Approval", icon: <FileSignature size={15} />, route: `/self-assessment/${clientId}/esign` },
    { label: "HMRC Filing", icon: <Shield size={15} />, route: `/self-assessment/${clientId}/submit` },

    { label: "Tool & Reports", isHeader: true },
    { label: "Statutory Calculators", icon: <Calculator size={15} />, route: `/self-assessment/${clientId}/calculators` },
    { label: "Payments on Account", icon: <CreditCard size={15} />, route: `/self-assessment/${clientId}/poa` },
    { label: "SA100 (All forms)", icon: <FileText size={15} />, route: `/self-assessment/${clientId}/sa100` },
    { label: "SA302 Computation", icon: <FileSpreadsheet size={15} />, route: `/self-assessment/${clientId}/sa302` },
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
        handleDuplicateAmended,
        isDuplicatingAmended,
        openSA100Modal,
      }}
    >
      <AppLayout sidebar={sidebar} module="Self Assessment">
        {/* Dedicated print suppression style tag guaranteeing that client header bar and stepper bar NEVER print */}
        <style>{`
          @media print {
            .sa100-top-client-bar,
            .sa100-stepper-bar,
            .sa100-no-print,
            .no-print {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              max-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
          }
        `}</style>
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col text-xs sa100-workspace-shell">
          {/* Top Client Header Bar */}
          <div className="sa100-top-client-bar bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-xs print:hidden sa100-no-print no-print">
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

                {(currentReturn?.status === "Submitted" || currentReturn?.status === "Accepted") && (
                  <button
                    type="button"
                    onClick={handleDuplicateAmended}
                    disabled={isDuplicatingAmended}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Copy size={13} className={isDuplicatingAmended ? "animate-spin" : ""} />
                    <span>Duplicate as Amended</span>
                  </button>
                )}

                {currentReturn && currentReturn.status !== "Submitted" && currentReturn.status !== "Accepted" && (
                  <button
                    type="button"
                    onClick={handleOpenPrePop}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                    title="Import verified PAYE and CIS records via HMRC digital pre-population"
                  >
                    <DownloadCloud size={13} />
                    <span>HMRC Pre-Pop</span>
                  </button>
                )}

                {currentReturn && (
                  <button
                    type="button"
                    onClick={handleOpenCapisign}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      currentReturn.status === "Signed" || currentReturn.status === "ApprovedByClient"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : currentReturn.status === "SentToCapisign"
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Send for client e-signature or check signature status"
                  >
                    <FileSignature size={13} />
                    <span>
                      {currentReturn.status === "Signed" || currentReturn.status === "ApprovedByClient"
                        ? "Signed & Approved"
                        : currentReturn.status === "SentToCapisign"
                        ? "Awaiting eSign"
                        : "Client eSign"}
                    </span>
                  </button>
                )}

                {currentReturn && currentReturn.status !== "Submitted" && currentReturn.status !== "Accepted" && (
                  <button
                    type="button"
                    onClick={() => setOpenExternalModal(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <ExternalLink size={13} />
                    <span>Mark Externally Filed</span>
                  </button>
                )}

                {/* SA100 Form Button - Prominent 1-Click Access to Official 10-Page HMRC Return Form */}
                {currentReturn && (
                  <button
                    type="button"
                    onClick={() => openSA100Modal("sa100")}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="View official 10-page HMRC SA100 return form & statutory calculation"
                  >
                    <FileText size={13} />
                    <span>SA100 Form</span>
                  </button>
                )}

                {/* Reports Dropdown - Parity with Capium & Corporation Tax */}
                {currentReturn && (
                  <div className="relative inline-block text-left">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "sa100-modal") {
                          openSA100Modal("sa100");
                        } else if (val === "sa302-modal") {
                          openSA100Modal("sa302");
                        } else if (val === "reports-page-sa100") {
                          window.location.href = `/self-assessment/${clientId}/sa100`;
                        } else if (val === "reports-page-sa302") {
                          window.location.href = `/self-assessment/${clientId}/sa302`;
                        }
                        e.target.value = "";
                      }}
                      className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>Reports ▾</option>
                      <option value="sa100-modal">View SA100 Form (Interactive 10 Pages)</option>
                      <option value="sa302-modal">View SA302 Computation Schedule</option>
                      <option value="reports-page-sa100">Full Reports Workspace: SA100</option>
                      <option value="reports-page-sa302">Full Reports Workspace: SA302</option>
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

          {/* Guided 6-Step Return Stepper Pipeline (Rendered strictly on Return Filing Steps 1 to 6) */}
          {currentReturn && currentStepIndex >= 0 && !isExcludedFromStepper && (
            <div className="sa100-stepper-bar bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 overflow-x-auto shadow-2xs print:hidden sa100-no-print no-print">
              <div className="flex items-center min-w-[760px] justify-between w-full">
                {steps.map((st, idx) => {
                  const isCurrent = st.activeMatch.includes(activeSection);
                  const isCompleted = currentStepIndex > idx || currentReturn.status === "Submitted" || currentReturn.status === "Accepted";
                  return (
                    <React.Fragment key={st.num}>
                      <Link
                        href={st.route}
                        className={`flex items-center gap-2.5 py-1 px-3 rounded-lg transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold ring-1 ring-purple-400 dark:ring-purple-700"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                            isCurrent
                              ? "bg-purple-600 text-white shadow-xs"
                              : isCompleted
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isCompleted && !isCurrent ? (
                            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            st.num
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-bold leading-tight flex items-center gap-1.5">
                            <span>{st.name}</span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <HMRCHelpTooltip code={st.hmrcCode} showBadge={false} inline={true} />
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal leading-tight">
                            {st.sub}
                          </span>
                        </div>
                      </Link>
                      {idx < steps.length - 1 && (
                        <div className="flex-1 min-w-[12px] mx-2 h-0.5 bg-slate-200 dark:bg-slate-800" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto w-full space-y-6">
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

        {/* Modal: Mark as Submitted Externally (Capium Art 34: 9000222186) */}
        {openExternalModal && currentReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ExternalLink size={16} className="text-emerald-600" />
                  Mark Return as Submitted Externally
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenExternalModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  External Submission Record
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Use this option if this SA100 return was submitted directly via the HMRC Online Portal, filed on paper, or submitted through previous accountant software.
                </p>
              </div>

              <form onSubmit={handleMarkExternal} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Taxpayer & Year
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${client?.clientName || "Taxpayer"} — ${currentReturn.taxYear}`}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Filing Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={externalDate}
                      onChange={(e) => setExternalDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Filing Method
                    </label>
                    <select
                      value={externalMethod}
                      onChange={(e) => setExternalMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="HMRC Online Services Portal">HMRC Online Portal</option>
                      <option value="Paper SA100 Submission">Paper Return (Post)</option>
                      <option value="Prior Accountant Software">Prior Firm / Software</option>
                      <option value="Other">Other External Method</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    HMRC Reference / Receipt No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={externalRef}
                    onChange={(e) => setExternalRef(e.target.value)}
                    placeholder="e.g. HMRC-CONFIRM-98271"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Filing Notes (Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    value={externalNotes}
                    onChange={(e) => setExternalNotes(e.target.value)}
                    placeholder="e.g. Client submitted via personal tax account before appointing SanSuite."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenExternalModal(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExternal}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingExternal ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        Confirm External Filing
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal: HMRC Digital Data Pre-Population */}
        {openPrePopModal && currentReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-5 border border-slate-200 dark:border-slate-800 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <DownloadCloud size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      HMRC Digital Data Pre-Population
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Import verified PAYE employment and CIS tax deductions directly into SA100 draft.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPrePopModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Identifiers bar */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
                <span>Taxpayer: <strong>{client?.clientName}</strong></span>
                <span>•</span>
                <span>NINO: <strong className="font-mono">{client?.niNumber || currentReturn.niNumber || "None"}</strong></span>
                <span>•</span>
                <span>UTR: <strong className="font-mono">{client?.utrNumber || currentReturn.utrNumber || "None"}</strong></span>
                <span>•</span>
                <span>Tax Year: <strong>{currentReturn.taxYear}</strong></span>
              </div>

              {isLoadingPrePop ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw size={24} className="animate-spin text-blue-600" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Scanning digital database for verified PAYE & CIS records matching {client?.niNumber || "NINO"}...
                  </p>
                </div>
              ) : prepopData ? (
                <div className="space-y-4">
                  {/* Employments section */}
                  {prepopData.employments && prepopData.employments.length > 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeEmployments}
                            onChange={(e) => setIncludeEmployments(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Verified PAYE Employments ({prepopData.employments.length})</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                          Total Gross: £{prepopData.summary?.totalEmploymentGross || "0.00"}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase">
                              <th className="py-1.5 px-2">Employer Name</th>
                              <th className="py-1.5 px-2">PAYE Ref</th>
                              <th className="py-1.5 px-2 text-right">Gross Pay (£)</th>
                              <th className="py-1.5 px-2 text-right">Tax Deducted (£)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {prepopData.employments.map((emp: any, idx: number) => (
                              <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800">
                                <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200">{emp.employerName}</td>
                                <td className="py-1.5 px-2 font-mono text-slate-500">{emp.payeReference || "—"}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-semibold">£{parseFloat(emp.grossPay || "0").toFixed(2)}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-600 font-semibold">£{parseFloat(emp.taxDeducted || "0").toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {/* CIS deductions section */}
                  {prepopData.cisDeductions && prepopData.cisDeductions.length > 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeCis}
                            onChange={(e) => setIncludeCis(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>CIS Subcontractor Tax Deductions ({prepopData.cisDeductions.length})</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                          Total CIS Tax: £{prepopData.summary?.totalCisDeducted || "0.00"}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase">
                              <th className="py-1.5 px-2">Contractor Name</th>
                              <th className="py-1.5 px-2">Tax Period</th>
                              <th className="py-1.5 px-2 text-right">Gross Paid (£)</th>
                              <th className="py-1.5 px-2 text-right">CIS Deducted (£)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {prepopData.cisDeductions.map((cis: any, idx: number) => (
                              <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800">
                                <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200">{cis.contractorName}</td>
                                <td className="py-1.5 px-2 font-mono text-slate-500">{cis.taxMonth || "—"}</td>
                                <td className="py-1.5 px-2 text-right font-mono font-semibold">£{parseFloat(cis.grossAmount || "0").toFixed(2)}</td>
                                <td className="py-1.5 px-2 text-right font-mono text-rose-600 font-semibold">£{parseFloat(cis.cisTaxDeducted || "0").toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {/* Clean Zero-State if no records */}
                  {(!prepopData.employments || prepopData.employments.length === 0) &&
                   (!prepopData.cisDeductions || prepopData.cisDeductions.length === 0) && (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                        <DownloadCloud size={20} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        No HMRC Digital Pre-Pop Records Available
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        No matching PAYE employment RTI filings or CIS monthly return deductions were located in the database for National Insurance number <span className="font-mono font-semibold">{client?.niNumber || "Not recorded"}</span>.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOpenPrePopModal(false)}
                      className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                    >
                      Close
                    </button>

                    {((prepopData.employments && prepopData.employments.length > 0) ||
                      (prepopData.cisDeductions && prepopData.cisDeductions.length > 0)) && (
                      <button
                        type="button"
                        onClick={handleApplyPrePop}
                        disabled={isApplyingPrePop || (!includeEmployments && !includeCis)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isApplyingPrePop ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Apply Selected Data to Return
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Modal: Capisign E-Signature Dispatch */}
        {openCapisignModal && currentReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <FileSignature size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Client Electronic Signature (eSign) Dispatch
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Legally binding digital approval and statutory declaration for {currentReturn.taxYear}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenCapisignModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status summary banner */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-purple-900 dark:text-purple-200 block text-xs">
                    Current Return Status: {currentReturn.status || "Draft"}
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400">
                    Balancing Tax Due: £{parseFloat(currentReturn.netTaxDue || "0").toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckCapisignStatus}
                  disabled={isCheckingCapisignStatus}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-purple-50 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isCheckingCapisignStatus ? "animate-spin" : ""} />
                  <span>Sync Status</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSendToCapisign} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Signatory Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={capisignSignerName}
                    onChange={(e) => setCapisignSignerName(e.target.value)}
                    placeholder="Full name of client"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Signatory Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={capisignSignerEmail}
                    onChange={(e) => setCapisignSignerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instructions / Message to Client (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={capisignNotes}
                    onChange={(e) => setCapisignNotes(e.target.value)}
                    placeholder="Please review your SA100 return and approve your balancing tax payment before the 31 January deadline."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                {/* Direct signing link preview */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Direct Client Signing URL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/portal/sign/sa100/${currentReturn.id}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Link Copied", description: "Direct signing link copied to clipboard.", type: "success" });
                      }}
                      className="text-[10px] text-purple-600 font-semibold hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                  <div className="text-[10px] font-mono truncate text-slate-700 dark:text-slate-300">
                    {`${window.location.origin}/portal/sign/sa100/${currentReturn.id}`}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenCapisignModal(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingCapisign || !capisignSignerEmail}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSendingCapisign ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        Dispatch via eSign
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interactive SA100 / SA302 Report Modal (Official HMRC Form Parity) */}
        {currentReturn && (
          <SA100FormReportModal
            open={showSA100Modal}
            onClose={() => setShowSA100Modal(false)}
            clientId={clientId}
            currentReturn={currentReturn}
            returns={returns}
            client={client}
            initialTab={sa100ModalInitialTab}
          />
        )}
      </AppLayout>
    </SAWorkspaceContext.Provider>
  );
}
