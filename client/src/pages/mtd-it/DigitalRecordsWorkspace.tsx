import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Building2, Globe, Calendar, ArrowLeft, Plus,
  Upload, Download, RefreshCw, Trash2, CheckCircle2, AlertCircle, FileText,
  DollarSign, Send, ShieldCheck, HelpCircle, Layers, Search,
  Lock, Unlock, ChevronDown, ChevronUp, X, Check, Users, ShieldAlert,
  FileSpreadsheet, Sparkles
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdTask, MtdDigitalRecord, MtdQuarterSummary, MtdSourceRecord } from "./types";

interface Props {
  task: MtdTask;
  onBack: () => void;
}

export default function DigitalRecordsWorkspace({ task, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Left Sidebar active tab
  const [activeTab, setActiveTab] = useState<"business" | "obligations" | "records" | "category_summary" | "pnl">("records");

  // Date range & period lock
  const [startDate, setStartDate] = useState(task.startDate || "2025-04-06");
  const [endDate, setEndDate] = useState(task.endDate || "2025-07-05");
  const [isPeriodLocked, setIsPeriodLocked] = useState(false);

  // Template dropdown menu
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Loading states
  const [isSubmittingHMRC, setIsSubmittingHMRC] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isOverridingApproval, setIsOverridingApproval] = useState(false);

  // Approval Form
  const [approvalSubject, setApprovalSubject] = useState(
    `MTD IT Quarterly Summary Review - ${task.clientName} - Quarter ${task.quarterNumber || 1}`
  );
  const [approvalEmail, setApprovalEmail] = useState(`client.${task.clientId}@domain.co.uk`);
  const [approvalBody, setApprovalBody] = useState(
    `Dear ${task.clientName},\n\nPlease find attached your Making Tax Digital for Income Tax (MTD IT) quarterly figures for Quarter ${task.quarterNumber || 1} (${task.taxYear || "2025-26"}).\n\nPlease review and approve these cumulative figures so we can proceed with submitting to HMRC.\n\nKind regards,\nYour Accounting Team`
  );
  const [overrideReason, setOverrideReason] = useState("Verbal / Written Client Consent Outside Software");

  // Category Summary view toggle & accordions
  const [summarySubTab, setSummarySubTab] = useState<"quarterly" | "cumulative">("cumulative");
  const [isConsolidatedOpen, setIsConsolidatedOpen] = useState(true);
  const [isIncomeExpensesOpen, setIsIncomeExpensesOpen] = useState(true);
  const [isDisallowableOpen, setIsDisallowableOpen] = useState(false);

  // Digital records table filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCreatedVia, setFilterCreatedVia] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDisallowableOnly, setFilterDisallowableOnly] = useState(false);

  // New record form state
  const [recordForm, setRecordForm] = useState({
    recordDate: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    amount: "",
    category: "Turnover",
    recordType: "Income" as "Income" | "Expense",
    description: "",
    isDisallowable: false,
  });

  // Bridging CSV import text
  const [csvText, setCsvText] = useState("");

  // Fetch Source details
  const { data: sources = [] } = useQuery<MtdSourceRecord[]>({
    queryKey: [`/api/mtd-it/sources/${task.clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mtd-it/sources/${task.clientId}`);
      return res.json();
    },
  });
  const source = sources.find((s) => s.id === task.sourceId);

  // Fetch Digital Records
  const { data: records = [], isLoading: isLoadingRecords } = useQuery<MtdDigitalRecord[]>({
    queryKey: [`/api/mtd-it/digital-records`, task.sourceId],
    queryFn: async () => {
      if (!task.sourceId) return [];
      const res = await apiRequest("GET", `/api/mtd-it/digital-records?sourceId=${task.sourceId}`);
      return res.json();
    },
    enabled: !!task.sourceId,
  });

  // Fetch Category Summary & YTD P&L
  const { data: summary, isLoading: isLoadingSummary } = useQuery<MtdQuarterSummary>({
    queryKey: [`/api/mtd-it/summary`, task.sourceId, task.quarterNumber],
    queryFn: async () => {
      if (!task.sourceId || !task.quarterNumber) return null;
      const res = await apiRequest("GET", `/api/mtd-it/summary/${task.sourceId}/${task.quarterNumber}`);
      return res.json();
    },
    enabled: !!task.sourceId && !!task.quarterNumber,
  });

  // Filtered Digital Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (r.description || "").toLowerCase().includes(q);
        const invMatch = (r.invoiceNumber || "").toLowerCase().includes(q);
        const catMatch = (r.category || "").toLowerCase().includes(q);
        if (!descMatch && !invMatch && !catMatch) return false;
      }
      if (filterCreatedVia !== "all" && r.createdVia !== filterCreatedVia) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterType !== "all" && r.recordType !== filterType) return false;
      if (filterDisallowableOnly && !r.isDisallowable) return false;
      return true;
    });
  }, [records, searchQuery, filterCreatedVia, filterCategory, filterType, filterDisallowableOnly]);

  // Create Record Mutation
  const addRecordMutation = useMutation({
    mutationFn: async (data: typeof recordForm) => {
      const res = await apiRequest("POST", "/api/mtd-it/digital-records", {
        sourceId: task.sourceId,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/digital-records`, task.sourceId] });
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/summary`, task.sourceId, task.quarterNumber] });
      setShowAddModal(false);
      setRecordForm({
        recordDate: new Date().toISOString().split("T")[0],
        invoiceNumber: "",
        amount: "",
        category: "Turnover",
        recordType: "Income",
        description: "",
        isDisallowable: false,
      });
      toast({ title: "Record Created", description: "Digital record saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create record", variant: "destructive" });
    },
  });

  // Delete Record Mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/mtd-it/digital-records/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/digital-records`, task.sourceId] });
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/summary`, task.sourceId, task.quarterNumber] });
      toast({ title: "Deleted", description: "Digital record deleted successfully." });
    },
  });

  // Sync Bookkeeping Mutation
  const syncBookkeepingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mtd-it/digital-records/sync-bookkeeping", {
        sourceId: task.sourceId,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/digital-records`, task.sourceId] });
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/summary`, task.sourceId, task.quarterNumber] });
      toast({
        title: "Bookkeeping Synchronized",
        description: `Imported ${data.importedCount || 0} transactions with statutory COA code classification.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Sync Error", description: err.message, variant: "destructive" });
    },
  });

  // CSV Bridging Import Mutation
  const importCsvMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await apiRequest("POST", "/api/mtd-it/digital-records/bulk-import", {
        sourceId: task.sourceId,
        records: rows,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/digital-records`, task.sourceId] });
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/summary`, task.sourceId, task.quarterNumber] });
      setShowImportModal(false);
      setCsvText("");
      toast({ title: "Bridging Import Complete", description: `Successfully imported ${data.count} records.` });
    },
  });

  // Parse CSV text
  const handleParseAndUploadCsv = () => {
    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "Please provide a valid CSV with a header and data rows.", variant: "destructive" });
        return;
      }
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 4) {
          const isExpense = parts[3]?.toLowerCase() === "expense";
          rows.push({
            invoiceNumber: parts[0] || "",
            recordDate: parts[2] || new Date().toISOString().split("T")[0],
            recordType: isExpense ? "Expense" : "Income",
            category: parts[4] || (isExpense ? "Cost of Goods Bought" : "Turnover"),
            amount: parseFloat(parts[5]) || 0,
            isDisallowable: parts[6]?.toLowerCase() === "yes" || parts[6]?.toLowerCase() === "true",
            description: parts[7] || parts[1] || "Bridging Import",
          });
        }
      }
      if (rows.length === 0) {
        toast({ title: "No Rows Parsed", description: "Could not parse transactions from CSV.", variant: "destructive" });
        return;
      }
      importCsvMutation.mutate(rows);
    } catch (e: any) {
      toast({ title: "CSV Parsing Error", description: e.message, variant: "destructive" });
    }
  };

  // Trigger Sample CSV Download
  const handleDownloadSample = (type: string) => {
    setShowTemplateDropdown(false);
    window.open(`/api/mtd-it/sample-template/${type}`, "_blank");
    toast({
      title: "Sample Template Downloaded",
      description: `Downloaded MTD IT bridging CSV template for ${type}.`,
    });
  };

  // Submit to HMRC
  const handleSubmitToHMRC = async () => {
    try {
      setIsSubmittingHMRC(true);
      const res = await apiRequest("POST", "/api/mtd-it/submit-quarter", {
        sourceId: task.sourceId,
        quarterNumber: task.quarterNumber,
        taxYear: task.taxYear || "2025-26",
        grossIncome: summary?.threeLine?.turnover || "0.00",
        allowableExpenses: summary?.threeLine?.allowableExpenses || "0.00",
        disallowableExpenses: summary?.detailed?.disallowableExpenses || "0.00",
        netProfit: summary?.threeLine?.netProfit || "0.00",
        submissionMethod: source?.reportingMethod || "three_line",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit quarter to HMRC");

      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      toast({
        title: "HMRC Submission Successful",
        description: data.message || `Quarterly update submitted. Submission ID: ${data.hmrcSubmissionId}`,
      });
      onBack();
    } catch (err: any) {
      toast({ title: "HMRC Submission Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingHMRC(false);
    }
  };

  // Request Capisign Client Approval (Article 9000278130)
  const handleSendApprovalEmail = async () => {
    try {
      setIsRequestingApproval(true);
      const res = await apiRequest("POST", "/api/mtd-it/request-approval", {
        sourceId: task.sourceId,
        quarterNumber: task.quarterNumber,
        taxYear: task.taxYear || "2025-26",
        recipient: approvalEmail,
        subject: approvalSubject,
        body: approvalBody,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send approval");

      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      setShowApprovalModal(false);
      toast({
        title: "Approval Request Sent",
        description: "Cumulative summary sent to client portal and Capisign for electronic approval.",
      });
    } catch (err: any) {
      toast({ title: "Approval Error", description: err.message, variant: "destructive" });
    } finally {
      setIsRequestingApproval(false);
    }
  };

  // Override Client Approval (Article 9000278130)
  const handleConfirmOverride = async () => {
    try {
      setIsOverridingApproval(true);
      const res = await apiRequest("POST", "/api/mtd-it/override-approval", {
        sourceId: task.sourceId,
        quarterNumber: task.quarterNumber,
        taxYear: task.taxYear || "2025-26",
        reason: overrideReason,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to override approval");

      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      setShowOverrideModal(false);
      toast({
        title: "Approval Overridden",
        description: data.message || "Approval status marked as Approved. Unlocked for HMRC submission.",
      });
    } catch (err: any) {
      toast({ title: "Override Error", description: err.message, variant: "destructive" });
    } finally {
      setIsOverridingApproval(false);
    }
  };

  return (
    <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[750px]">
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT VERTICAL NAVIGATION SIDEBAR (Matching img_3.png)       */}
      {/* ------------------------------------------------------------- */}
      <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col py-4">
        <div className="space-y-1 px-2">
          {/* Business Details */}
          <button
            onClick={() => setActiveTab("business")}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
              activeTab === "business"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            }`}
          >
            <Briefcase size={22} className="mb-1.5" />
            <span className="text-[11px] leading-tight">Business Details</span>
          </button>

          {/* Retrive Obligations */}
          <button
            onClick={() => setActiveTab("obligations")}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
              activeTab === "obligations"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            }`}
          >
            <FileText size={22} className="mb-1.5" />
            <span className="text-[11px] leading-tight">Retrive Obligations</span>
          </button>

          {/* Digital Records */}
          <button
            onClick={() => setActiveTab("records")}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
              activeTab === "records"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            }`}
          >
            <Layers size={22} className="mb-1.5" />
            <span className="text-[11px] leading-tight">Digital Records</span>
          </button>

          {/* Summary Of Each Category */}
          <button
            onClick={() => setActiveTab("category_summary")}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
              activeTab === "category_summary"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            }`}
          >
            <Users size={22} className="mb-1.5" />
            <span className="text-[11px] leading-tight">Summary Of Each Category</span>
          </button>

          {/* Profit & Loss Summary (YTD) */}
          <button
            onClick={() => setActiveTab("pnl")}
            className={`w-full flex flex-col items-center justify-center p-3 rounded-xl text-center transition-all ${
              activeTab === "pnl"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            }`}
          >
            <DollarSign size={22} className="mb-1.5" />
            <span className="text-[11px] leading-tight">Profit & Loss Summary (YTD)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN WORKSPACE CONTENT AREA                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {/* Top Header Bar: Client Title & Close (X) button */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#6c5ce7]">
              {task.clientName} - {task.tradingName || "Company X"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#6c5ce7] border border-purple-100 capitalize">
              {task.sourceType?.replace("-", " ")}
            </span>
            <span className="text-xs text-gray-500">
              Task: <strong>Quarter {task.quarterNumber || 1} Update</strong> | Tax Year: <strong>{task.taxYear || "2025-26"}</strong>
            </span>
          </div>

          <button
            onClick={onBack}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close and return to Submissions Dashboard"
          >
            <X size={20} />
          </button>
        </div>

        {/* Period Filter Bar (Common to all tabs per img_3.png) */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-100 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-bold text-gray-700 text-sm">Period</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isPeriodLocked}
              className="p-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isPeriodLocked}
              className="p-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 disabled:bg-gray-100"
            />
          </div>
          <label className="flex items-center gap-1.5 text-gray-700 cursor-pointer font-medium select-none ml-2">
            <input
              type="checkbox"
              checked={isPeriodLocked}
              onChange={(e) => setIsPeriodLocked(e.target.checked)}
              className="rounded border-gray-300 text-[#6c5ce7] focus:ring-[#6c5ce7]"
            />
            <span>Lock the period</span>
          </label>
        </div>

        {/* TAB 1: BUSINESS DETAILS */}
        {activeTab === "business" && (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Business & Income Source Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Trading Name / Identifier</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">{source?.tradingName || task.tradingName}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Income Source Type</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block capitalize">
                    {source?.sourceType?.replace("-", " ") || task.sourceType}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Accounting Basis</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">{source?.accountingType || "Cash basis"}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Quarter Calendar Basis</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">
                    {source?.calendarType === "calendar" ? "Calendar Basis (1 Apr - 31 Mar)" : "Standard HMRC (6 Apr - 5 Apr)"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Reporting Format</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">
                    {source?.reportingMethod === "three_line" ? "Three-Line Accounting" : "Detailed Breakdown"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Workflow Selection</span>
                  <span className="text-sm font-bold text-[#6c5ce7] mt-1 block">
                    {source?.workflowType === "workflow_1_bridging"
                      ? "Workflow 1: Spreadsheet Bridging"
                      : source?.workflowType === "workflow_2_365"
                      ? "Workflow 2: Capium 365 Direct Portal"
                      : source?.workflowType === "workflow_3_365_bookkeeping"
                      ? "Workflow 3: Capium 365 with Bookkeeping"
                      : "Workflow 4: Bookkeeping Only"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Ownership Share Percentage</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">{source?.sharedOwnershipPct || "100.00"}%</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Business Address</span>
                  <span className="text-sm font-medium text-gray-800 mt-1 block">
                    {source?.addressLine1 ? `${source.addressLine1}, ${source.postalCode || ""}` : "Primary Registered Business Address"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">HMRC Business ID</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 block">{source?.businessId || "Assigned via ASA"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RETRIEVE OBLIGATIONS */}
        {activeTab === "obligations" && (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Statutory Obligations from HMRC</h3>
                  <p className="text-xs text-gray-500">Live quarterly schedules retrieved directly via Agent Services Account (ASA).</p>
                </div>
                <button
                  onClick={() => toast({ title: "Obligations Checked", description: "HMRC obligations are up-to-date for this tax year." })}
                  className="px-3 py-1.5 text-xs font-medium text-[#6c5ce7] bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} /> Refresh Obligations from HMRC
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase">
                    <tr>
                      <th className="px-4 py-3">Quarter</th>
                      <th className="px-4 py-3">Period Start</th>
                      <th className="px-4 py-3">Period End</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Obligation Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className={task.quarterNumber === 1 ? "bg-purple-50/50 font-medium" : ""}>
                      <td className="px-4 py-3 text-gray-800 font-semibold">Quarter 1</td>
                      <td className="px-4 py-3 text-gray-600">06/04/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/07/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/08/2025</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700">Open</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Quarterly Update</td>
                    </tr>
                    <tr className={task.quarterNumber === 2 ? "bg-purple-50/50 font-medium" : ""}>
                      <td className="px-4 py-3 text-gray-800 font-semibold">Quarter 2</td>
                      <td className="px-4 py-3 text-gray-600">06/07/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/10/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/11/2025</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">Open</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Quarterly Update</td>
                    </tr>
                    <tr className={task.quarterNumber === 3 ? "bg-purple-50/50 font-medium" : ""}>
                      <td className="px-4 py-3 text-gray-800 font-semibold">Quarter 3</td>
                      <td className="px-4 py-3 text-gray-600">06/10/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/01/2026</td>
                      <td className="px-4 py-3 text-gray-600">05/02/2026</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">Open</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Quarterly Update</td>
                    </tr>
                    <tr className={task.quarterNumber === 4 ? "bg-purple-50/50 font-medium" : ""}>
                      <td className="px-4 py-3 text-gray-800 font-semibold">Quarter 4</td>
                      <td className="px-4 py-3 text-gray-600">06/01/2026</td>
                      <td className="px-4 py-3 text-gray-600">05/04/2026</td>
                      <td className="px-4 py-3 text-gray-600">05/05/2026</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">Open</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Quarterly Update</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-800 font-semibold">Final Declaration</td>
                      <td className="px-4 py-3 text-gray-600">06/04/2025</td>
                      <td className="px-4 py-3 text-gray-600">05/04/2026</td>
                      <td className="px-4 py-3 text-gray-600">31/01/2027</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">Annual Return</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Consolidated SA100 Replacement</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL RECORDS (Matching img_3.png & img_4.png) */}
        {activeTab === "records" && (
          <div className="p-6 space-y-4">
            {/* Top Action Buttons and Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left Action Buttons matching Capium purple buttons */}
                <div className="flex items-center gap-2 relative">
                  {/* Template Dropdown Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet size={14} /> Template <ChevronDown size={13} />
                    </button>

                    {showTemplateDropdown && (
                      <div className="absolute left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 text-xs">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Download Sample File
                        </div>
                        <button
                          onClick={() => handleDownloadSample("sole-trader")}
                          className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                        >
                          <Download size={13} className="text-[#6c5ce7]" /> Sole Trader Template (CSV)
                        </button>
                        <button
                          onClick={() => handleDownloadSample("uk-property")}
                          className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                        >
                          <Download size={13} className="text-[#6c5ce7]" /> UK Property Template (CSV)
                        </button>
                        <button
                          onClick={() => handleDownloadSample("foreign-property")}
                          className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                        >
                          <Download size={13} className="text-[#6c5ce7]" /> Foreign Property Template (CSV)
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            setShowTemplateDropdown(false);
                            setShowImportModal(true);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-[#6c5ce7] font-semibold flex items-center gap-2"
                        >
                          <Upload size={13} /> Upload Completed Template
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Import from Bookkeeping Button */}
                  <button
                    onClick={() => syncBookkeepingMutation.mutate()}
                    disabled={syncBookkeepingMutation.isPending}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncBookkeepingMutation.isPending ? "animate-spin" : ""} />
                    {syncBookkeepingMutation.isPending ? "Importing..." : "Import from Bookkeeping"}
                  </button>

                  {/* Add Manually Button */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Add Manually
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:border-[#6c5ce7] outline-none"
                  />
                </div>
              </div>

              {/* Filters row: Created Via, Categories, Transaction Types, Is Disallowable */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                {/* Created Via Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Created Via:</span>
                  <select
                    value={filterCreatedVia}
                    onChange={(e) => setFilterCreatedVia(e.target.value)}
                    className="p-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700"
                  >
                    <option value="all">All Sources</option>
                    <option value="Manual">Manual</option>
                    <option value="Spreadsheet">Spreadsheet</option>
                    <option value="Bookkeeping">Bookkeeping</option>
                    <option value="Capium 365">Capium 365</option>
                  </select>
                </div>

                {/* Categories Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Categories:</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 max-w-[180px]"
                  >
                    <option value="all">All Categories</option>
                    <option value="Turnover">Turnover</option>
                    <option value="Cost of Goods Bought">Cost of Goods Bought</option>
                    <option value="CIS Payment to Sub-contractors">CIS Payment to Sub-contractors</option>
                    <option value="Staff Cost">Staff Cost</option>
                    <option value="Travelling Cost">Travelling Cost</option>
                    <option value="Premises Running Cost">Premises Running Cost</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Admin Cost">Admin Cost</option>
                    <option value="Advertising Cost">Advertising Cost</option>
                    <option value="Business Entertainment Cost">Business Entertainment Cost</option>
                    <option value="Professional Fees">Professional Fees</option>
                    <option value="Interest">Interest</option>
                    <option value="Financial">Financial</option>
                    <option value="Bad Debt">Bad Debt</option>
                    <option value="Depreciation">Depreciation</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {/* Transaction Types Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Transaction Types:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="p-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700"
                  >
                    <option value="all">All Types</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                {/* Is Disallowable Checkbox */}
                <label className="flex items-center gap-1.5 text-gray-700 cursor-pointer font-medium select-none ml-auto">
                  <input
                    type="checkbox"
                    checked={filterDisallowableOnly}
                    onChange={(e) => setFilterDisallowableOnly(e.target.checked)}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Disallowable Only</span>
                </label>
              </div>
            </div>

            {/* Records Table or Clean Empty State (Matching img_3.png) */}
            {isLoadingRecords ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-xs text-gray-500">
                Loading digital records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 text-center space-y-3">
                <div className="w-16 h-20 mx-auto bg-gray-100 border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center p-2 relative shadow-sm">
                  <div className="w-8 h-2 bg-[#6c5ce7] rounded-full absolute -top-1"></div>
                  <FileSpreadsheet size={28} className="text-gray-400 mt-2" />
                </div>
                <h4 className="text-base font-bold text-gray-800">No Digital Records Found !</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Start by importing your transactions or connecting your bookkeeping software.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add First Record
                  </button>
                  <button
                    onClick={() => syncBookkeepingMutation.mutate()}
                    className="px-4 py-2 text-xs font-semibold text-[#6c5ce7] bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Import Bookkeeping
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Invoice # / Ref</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Disallowable</th>
                      <th className="px-4 py-3">Created Via</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-gray-800 font-medium">{rec.recordDate}</td>
                        <td className="px-4 py-2.5 text-gray-600">{rec.invoiceNumber || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rec.recordType === "Income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {rec.recordType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-800 font-medium">{rec.category}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{rec.description || "—"}</td>
                        <td className="px-4 py-2.5">
                          {rec.isDisallowable ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 font-medium">{rec.createdVia}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          £{parseFloat(rec.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => deleteRecordMutation.mutate(rec.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUMMARY OF EACH CATEGORY (Matching img_8.png & img_9.png) */}
        {activeTab === "category_summary" && (
          <div className="p-6 space-y-6">
            {/* Sub-tabs: Quarterly Summary vs Cumulative Summary */}
            <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 pt-3 rounded-t-xl">
              <button
                onClick={() => setSummarySubTab("quarterly")}
                className={`pb-3 text-xs font-semibold transition-colors relative ${
                  summarySubTab === "quarterly"
                    ? "text-[#6c5ce7] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#6c5ce7]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Quarterly Summary
              </button>
              <button
                onClick={() => setSummarySubTab("cumulative")}
                className={`pb-3 text-xs font-semibold transition-colors relative ${
                  summarySubTab === "cumulative"
                    ? "text-[#6c5ce7] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#6c5ce7]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Cumulative Summary
              </button>
            </div>

            {/* Shared Ownership notice if applicable (Article 9000277853) */}
            {summary?.isSharedOwnership && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Property Shared Ownership:</strong> {summary.sharedOwnershipPct}% split active. Figures below represent the client's reportable proportion of £{summary.grossFull?.turnover} gross turnover and £{summary.grossFull?.allowableExpenses} gross expenses.
                  </span>
                </div>
                <span className="font-bold bg-amber-100 px-2.5 py-0.5 rounded text-amber-800">
                  Split: {summary.sharedOwnershipPct}%
                </span>
              </div>
            )}

            {/* Accordion 1: Consolidated Value (Three-Line Summary) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setIsConsolidatedOpen(!isConsolidatedOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-purple-50/40 hover:bg-purple-50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-[#6c5ce7]" />
                  <span className="text-sm font-bold text-[#6c5ce7]">Consolidated Value</span>
                </div>
                {isConsolidatedOpen ? <ChevronUp size={18} className="text-[#6c5ce7]" /> : <ChevronDown size={18} className="text-[#6c5ce7]" />}
              </button>

              {isConsolidatedOpen && (
                <div className="p-6 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Income</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Turnover</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value={summary?.threeLine?.turnover || "0.00"}
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Others</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value="0.00"
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tax Taken Off Trading Income</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value="0.00"
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Total Expenses</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Consolidated Expenses</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value={summary?.threeLine?.allowableExpenses || "0.00"}
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Income & Expenses (Itemized Categories per img_9.png) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setIsIncomeExpensesOpen(!isIncomeExpensesOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-purple-50/40 hover:bg-purple-50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-[#6c5ce7]" />
                  <span className="text-sm font-bold text-[#6c5ce7]">Income & Expenses</span>
                </div>
                {isIncomeExpensesOpen ? <ChevronUp size={18} className="text-[#6c5ce7]" /> : <ChevronDown size={18} className="text-[#6c5ce7]" />}
              </button>

              {isIncomeExpensesOpen && (
                <div className="p-6 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Income</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Turnover</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value={summary?.threeLine?.turnover || "0.00"}
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Others</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value="0.00"
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tax Taken Off Trading Income</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                          <input
                            type="text"
                            readOnly
                            value="0.00"
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Total Expenses (Allowable)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {[
                        { key: "Cost of Goods Bought", label: "Cost of Goods Bought" },
                        { key: "Maintenance", label: "Maintenance" },
                        { key: "Financial", label: "Financial" },
                        { key: "CIS Payment to Sub-contractors", label: "CIS Payment to Sub-contractors" },
                        { key: "Admin Cost", label: "Admin Cost" },
                        { key: "Bad Debt", label: "Bad Debt" },
                        { key: "Staff Cost", label: "Staff Cost" },
                        { key: "Advertising Cost", label: "Advertising Cost" },
                        { key: "Professional Fees", label: "Professional Fees" },
                        { key: "Travelling Cost", label: "Travelling Cost" },
                        { key: "Business Entertainment Cost", label: "Business Entertainment Cost" },
                        { key: "Depreciation", label: "Depreciation" },
                        { key: "Premises Running Cost", label: "Premises Running Cost" },
                        { key: "Interest", label: "Interest" },
                        { key: "Others", label: "Others" },
                      ].map((item) => {
                        const val = summary?.detailed?.categoryBreakdown?.[item.key]?.allowable || 0;
                        return (
                          <div key={item.key}>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">{item.label}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                              <input
                                type="text"
                                readOnly
                                value={val.toFixed(2)}
                                className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Disallowable Expenses (Matching img_9.png) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setIsDisallowableOpen(!isDisallowableOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-purple-50/40 hover:bg-purple-50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-[#6c5ce7]" />
                  <span className="text-sm font-bold text-[#6c5ce7]">Disallowable Expenses</span>
                </div>
                {isDisallowableOpen ? <ChevronUp size={18} className="text-[#6c5ce7]" /> : <ChevronDown size={18} className="text-[#6c5ce7]" />}
              </button>

              {isDisallowableOpen && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {[
                      { key: "Cost of Goods Bought", label: "Disallowable Cost of Goods" },
                      { key: "Maintenance", label: "Disallowable Maintenance" },
                      { key: "Financial", label: "Disallowable Financial" },
                      { key: "CIS Payment to Sub-contractors", label: "Disallowable CIS Payments" },
                      { key: "Admin Cost", label: "Disallowable Admin Costs" },
                      { key: "Bad Debt", label: "Disallowable Bad Debts" },
                      { key: "Staff Cost", label: "Disallowable Staff Costs" },
                      { key: "Advertising Cost", label: "Disallowable Advertising" },
                      { key: "Professional Fees", label: "Disallowable Professional Fees" },
                      { key: "Travelling Cost", label: "Disallowable Travel Costs" },
                      { key: "Business Entertainment Cost", label: "Disallowable Entertainment" },
                      { key: "Depreciation", label: "Disallowable Depreciation" },
                      { key: "Premises Running Cost", label: "Disallowable Premises Costs" },
                      { key: "Interest", label: "Disallowable Interest" },
                      { key: "Others", label: "Disallowable Other Expenses" },
                    ].map((item) => {
                      const val = summary?.detailed?.categoryBreakdown?.[item.key]?.disallowable || 0;
                      return (
                        <div key={item.key}>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">{item.label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-rose-400 font-semibold">£</span>
                            <input
                              type="text"
                              readOnly
                              value={val.toFixed(2)}
                              className="w-full pl-7 pr-3 py-2 bg-rose-50/50 border border-rose-200 rounded-lg text-xs font-bold text-rose-900"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Matching img_8.png bottom bar) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("records")}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setActiveTab("pnl")}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Submit for Approval (Capisign Popup - Article 9000278130) */}
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} /> Submit for Approval
                </button>

                {/* Override Client Approval (Article 9000278130) */}
                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-[#6c5ce7] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck size={13} /> Override Client Approval
                </button>

                {/* Submit to HMRC Button */}
                <button
                  onClick={handleSubmitToHMRC}
                  disabled={isSubmittingHMRC || records.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldCheck size={14} /> Submit to HMRC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFIT & LOSS SUMMARY (YTD) */}
        {activeTab === "pnl" && (
          <div className="p-6 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Cumulative Year-to-Date Profit & Loss</h3>
                  <p className="text-xs text-gray-500">Progressive quarterly totals feeding the annual Final Declaration.</p>
                </div>
                <button
                  onClick={handleSubmitToHMRC}
                  disabled={isSubmittingHMRC || records.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck size={14} /> Submit Quarter {task.quarterNumber || 1} to HMRC
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3 text-right">Quarter 1</th>
                      <th className="px-4 py-3 text-right">Quarter 2</th>
                      <th className="px-4 py-3 text-right">Quarter 3</th>
                      <th className="px-4 py-3 text-right">Quarter 4</th>
                      <th className="px-4 py-3 text-right font-bold bg-gray-100">Cumulative YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-emerald-800">Turnover (Gross Income)</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q1?.turnover || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q2?.turnover || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q3?.turnover || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q4?.turnover || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-800 bg-gray-50">
                        £{summary?.ytdSummary?.cumulative?.turnover || "0.00"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-rose-800">Allowable Expenses</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q1?.expenses || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q2?.expenses || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q3?.expenses || "0.00"}</td>
                      <td className="px-4 py-3 text-right">£{summary?.ytdSummary?.q4?.expenses || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-800 bg-gray-50">
                        £{summary?.ytdSummary?.cumulative?.expenses || "0.00"}
                      </td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 font-bold text-gray-900">Net Profit / (Loss)</td>
                      <td className="px-4 py-3 text-right font-semibold">£{summary?.ytdSummary?.q1?.net || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-semibold">£{summary?.ytdSummary?.q2?.net || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-semibold">£{summary?.ytdSummary?.q3?.net || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-semibold">£{summary?.ytdSummary?.q4?.net || "0.00"}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#6c5ce7] bg-gray-100">
                        £{summary?.ytdSummary?.cumulative?.netProfit || "0.00"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MODALS                                                     */}
      {/* ------------------------------------------------------------- */}

      {/* Modal: Add Digital Record */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-800">Add Digital Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Record Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={recordForm.recordDate}
                    onChange={(e) => setRecordForm({ ...recordForm, recordDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Invoice # / Ref</label>
                  <input
                    type="text"
                    placeholder="INV-001"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={recordForm.invoiceNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={recordForm.recordType}
                    onChange={(e) =>
                      setRecordForm({
                        ...recordForm,
                        recordType: e.target.value as "Income" | "Expense",
                        category: e.target.value === "Income" ? "Turnover" : "Cost of Goods Bought",
                      })
                    }
                  >
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Category</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={recordForm.category}
                  onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}
                >
                  {recordForm.recordType === "Income" ? (
                    <>
                      <option value="Turnover">Turnover</option>
                      <option value="Others">Others</option>
                    </>
                  ) : (
                    <>
                      <option value="Cost of Goods Bought">Cost of Goods Bought</option>
                      <option value="CIS Payment to Sub-contractors">CIS Payment to Sub-contractors</option>
                      <option value="Staff Cost">Staff Cost</option>
                      <option value="Travelling Cost">Travelling Cost</option>
                      <option value="Premises Running Cost">Premises Running Cost</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Admin Cost">Admin Cost</option>
                      <option value="Advertising Cost">Advertising Cost</option>
                      <option value="Business Entertainment Cost">Business Entertainment Cost</option>
                      <option value="Professional Fees">Professional Fees</option>
                      <option value="Interest">Interest</option>
                      <option value="Financial">Financial</option>
                      <option value="Bad Debt">Bad Debt</option>
                      <option value="Depreciation">Depreciation</option>
                      <option value="Others">Others</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Consulting services or office rent"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                />
              </div>

              {recordForm.recordType === "Expense" && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordForm.isDisallowable}
                      onChange={(e) => setRecordForm({ ...recordForm, isDisallowable: e.target.checked })}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-gray-700 font-medium">Disallowable expense (non-deductible for tax)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => addRecordMutation.mutate(recordForm)}
                disabled={addRecordMutation.isPending || !recordForm.amount}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm disabled:opacity-50"
              >
                {addRecordMutation.isPending ? "Saving..." : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bridging CSV Upload (Article 9000271063) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#6c5ce7]" />
                <h3 className="text-base font-bold text-gray-800">Import Bridging Spreadsheet (CSV)</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                Paste your CSV content below matching the standard Capium Bridging Template. Columns:
              </p>
              <code className="block bg-gray-100 p-2.5 rounded-lg text-[11px] text-gray-700 font-mono">
                Invoice number,Party Name,Invoice date,Transaction Type,Category,Amount,IsDisAllowable,Description
              </code>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`INV-101,Client Acme,2025-05-01,Income,Turnover,1500.00,No,Consulting services\nEXP-201,City Stationers,2025-05-10,Expense,Admin Cost,120.00,No,Office paper and print supplies`}
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-[11px]"
              />
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
              <button
                onClick={() => handleDownloadSample(task.sourceType || "sole-trader")}
                className="text-xs text-[#6c5ce7] font-semibold flex items-center gap-1 hover:underline"
              >
                <Download size={13} /> Download Blank Template
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseAndUploadCsv}
                  disabled={importCsvMutation.isPending || !csvText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload size={13} /> {importCsvMutation.isPending ? "Importing..." : "Parse & Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Capisign Approval Email Popup (Article 9000278130) */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-[#6c5ce7]" />
                <h3 className="text-base font-bold text-gray-800">Submit for Client Approval (Capisign)</h3>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={approvalEmail}
                  onChange={(e) => setApprovalEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={approvalSubject}
                  onChange={(e) => setApprovalSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Message</label>
                <textarea
                  rows={5}
                  value={approvalBody}
                  onChange={(e) => setApprovalBody(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center gap-2 text-xs text-[#6c5ce7]">
                <FileText size={16} className="flex-shrink-0" />
                <span>
                  <strong>Attachment:</strong> Cumulative_Quarter_{task.quarterNumber || 1}_Summary.pdf (automatically generated and attached)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSendApprovalEmail}
                disabled={isRequestingApproval}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={13} /> {isRequestingApproval ? "Sending..." : "Send to Client via Capisign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Override Client Approval (Article 9000278130) */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert size={20} />
                <h3 className="text-base font-bold text-gray-800">Override Client Approval</h3>
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                Per Capium Article 9000278130, if your client provided approval verbally or in writing outside the software, you can record an override to unlock submission to HMRC immediately.
              </p>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Override</label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="Verbal Client Consent">Verbal Client Consent</option>
                  <option value="Written Email Authorization Received">Written Email Authorization Received</option>
                  <option value="Approved via Signed Paper Schedule">Approved via Signed Paper Schedule</option>
                  <option value="Client Authorized In Person">Client Authorized In Person</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={isOverridingApproval}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} /> Confirm Override & Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
