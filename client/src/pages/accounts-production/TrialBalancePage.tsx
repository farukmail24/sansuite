import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useRoute, Link, Redirect, useLocation } from "wouter";
import AppLayout, { NavItem } from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Settings, Upload, Plus, Trash2, Save,
  ChevronDown, CheckSquare, Building2, History, Edit2, RefreshCw,
  FileSpreadsheet, Shield, FileSignature, CheckCircle2, AlertCircle,
  X, ArrowLeftRight, Download, Calculator, ArrowLeft, ArrowRight,
  ListTree, Layers, Printer, Send, Users
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { CAPIUM_STANDARD_COA } from "@shared/capiumStandardCoa";
import AccountAutocompleteCell, { NominalCodeAutocompleteCell } from "../../components/accounting/AccountAutocompleteCell";
import { getAccountsProductionSidebar } from "./workspace/accountsProductionNav";

type TBRow = { id?: number; nominalCode: string; accountName: string; category?: string; debit: string; credit: string };
type TrialBalance = { id: number; refNo: string; description: string; modeOfImport: string; status: string; lines: TBRow[]; periodId?: number };
type Period = { id: number; startDate: string; endDate: string; periodName?: string; isLocked: boolean };
type MappingLine = {
  id: string;
  sourceCode: string;
  sourceName: string;
  debit: string;
  credit: string;
  targetNominalCode: string;
  targetAccountName: string;
};

export default function TrialBalancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/accounts-production/:clientId/tb");
  const clientId = params?.clientId;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showComparativeView, setShowComparativeView] = useState(false);
  const [editingTb, setEditingTb] = useState<TrialBalance | null>(null);

  // Third-Party TB Mapping State (Xero, QBO, FreeAgent, Sage)
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingSourceSystem, setMappingSourceSystem] = useState<string>("Xero");
  const [mappingLines, setMappingLines] = useState<MappingLine[]>([]);
  const [mappingPeriodId, setMappingPeriodId] = useState<string>("");
  const [mappingDescription, setMappingDescription] = useState<string>("");
  const [rememberMapping, setRememberMapping] = useState<boolean>(true);
  const [mappingSearchQuery, setMappingSearchQuery] = useState<string>("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTbRef, setNewTbRef] = useState("TB-" + new Date().getFullYear());
  const [newTbDesc, setNewTbDesc] = useState("Annual Trial Balance");
  const [newTbMode, setNewTbMode] = useState("Bookkeeping");
  const [newTbPeriod, setNewTbPeriod] = useState("");

  // Journal Adjustment State
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split("T")[0]);
  const [journalNarrative, setJournalNarrative] = useState("");
  const [journalLines, setJournalLines] = useState<Array<{ nominalCode: string; accountName: string; debit: string; credit: string }>>([
    { nominalCode: "", accountName: "", debit: "", credit: "" },
    { nominalCode: "", accountName: "", debit: "", credit: "" },
  ]);

  // Centralized Accounts Production Sidebar
  const sidebar: NavItem[] = getAccountsProductionSidebar(clientId || "");

  // 1. Fetch Client Details
  const { data: client, isLoading: isLoadingClient } = useQuery<any>({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return null;
      const clients = await res.json();
      const parsedId = parseInt(clientId || "0");
      return clients.find((c: any) => c.id === parsedId) || null;
    },
    enabled: !!clientId,
  });

  // 2. Fetch Periods
  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: [`/api/accounts-production/${clientId}/periods`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/periods`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // 3. Fetch Stored Trial Balances
  const { data: trialBalances = [], isLoading: isLoadingTb } = useQuery<TrialBalance[]>({
    queryKey: [`/api/accounts-production/${clientId}/tb`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/tb`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // 4. Fetch Comparative TB
  const { data: comparativeTb, isLoading: isLoadingComparative } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/comparative-tb`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/comparative-tb`);
      return res.ok ? res.json() : null;
    },
    enabled: !!clientId && showComparativeView,
  });

  // 5. Fetch Saved TB Mappings for client
  const { data: savedMappings = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/tb-mappings`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/tb-mappings`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // 6. Fetch Client Chart of Accounts for Autocomplete
  const { data: coaAccounts = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/coa`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/coa`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // Mutations
  const importMappedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/tb/import-mapped`, {
        periodId: mappingPeriodId || periods[0]?.id,
        description: mappingDescription || `${mappingSourceSystem} Mapped Trial Balance`,
        sourceSystem: mappingSourceSystem,
        rememberMapping,
        lines: mappingLines.map((l) => ({
          sourceCode: l.sourceCode,
          sourceName: l.sourceName,
          debit: l.debit,
          credit: l.credit,
          targetNominalCode: l.targetNominalCode || l.sourceCode,
          targetAccountName: l.targetAccountName || l.sourceName,
        })),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/live-tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/statements`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb-mappings`] });
      setShowMappingModal(false);
      toast({
        title: "Trial Balance Imported",
        description: `Successfully imported ${data.totalRows} lines from ${mappingSourceSystem}. Status: ${data.isBalanced ? "Balanced" : "Unbalanced"}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  const saveTbMutation = useMutation({
    mutationFn: async ({ tbData, returnToPipeline }: { tbData: TrialBalance; returnToPipeline?: boolean }) => {
      const activePeriodId = tbData.periodId || (periods && periods.length > 0 ? periods[0].id : undefined);
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/tb`, {
        tb: {
          id: tbData.id,
          refNo: tbData.refNo,
          description: tbData.description,
          modeOfImport: tbData.modeOfImport,
          status: tbData.status,
          periodId: activePeriodId,
          totalDebit: tbData.lines.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0).toFixed(2),
          totalCredit: tbData.lines.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0).toFixed(2),
          isBalanced: Math.abs(
            tbData.lines.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0) -
            tbData.lines.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0)
          ) < 0.01,
        },
        lines: tbData.lines
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save trial balance.");
      }
      return { data: await res.json(), returnToPipeline };
    },
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/live-tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/statements`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/prefiling-validation`] });
      setEditingTb(null);
      toast({ title: "Trial Balance Saved", description: "Ledger lines and balances persisted to database." });
      if (result?.returnToPipeline) {
        setLocation(`/accounts-production/${clientId}/trial-balance`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  });

  const deleteTbMutation = useMutation({
    mutationFn: async (tbId: number) => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/tb/${tbId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete trial balance.");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/live-tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/statements`] });
      toast({ title: "Trial Balance Deleted", description: "The trial balance record and ledger lines have been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  });

  const postJournalMutation = useMutation({
    mutationFn: async () => {
      const journalDebits = journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
      const journalCredits = journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

      if (Math.abs(journalDebits - journalCredits) >= 0.01) {
        throw new Error(`Journal is not balanced! Total Debits: £${journalDebits.toFixed(2)}, Total Credits: £${journalCredits.toFixed(2)}`);
      }

      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/tb/journal`, {
        periodId: periods[0]?.id,
        date: journalDate,
        narrative: journalNarrative,
        lines: journalLines.filter(l => l.nominalCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/tb`] });
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/live-tb`] });
      setShowJournalModal(false);
      setJournalNarrative("");
      setJournalLines([
        { nominalCode: "", accountName: "", debit: "", credit: "" },
        { nominalCode: "", accountName: "", debit: "", credit: "" },
      ]);
      toast({ title: "Journal Adjustment Posted", description: "Trial balance updated with balancing entries." });
    },
    onError: (err: any) => {
      toast({ title: "Posting Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleCreate = async () => {
    let lines: TBRow[] = [
      { nominalCode: "1000", accountName: "Cash at Bank", debit: "0.00", credit: "" },
      { nominalCode: "2000", accountName: "Trade Creditors", debit: "", credit: "0.00" }
    ];

    if (newTbMode === "Bookkeeping") {
      try {
        const url = `/api/accounts-production/${clientId}/live-tb${newTbPeriod ? `?periodId=${newTbPeriod}` : ''}`;
        const res = await apiRequest("GET", url);
        if (res.ok) {
          const data = await res.json();
          if (data.lines && data.lines.length > 0) {
            lines = data.lines;
          }
        }
      } catch (err) {
        console.error("Failed to fetch live TB", err);
      }
    }

    const newTb: TrialBalance = {
      id: 0,
      refNo: newTbRef,
      description: newTbDesc,
      modeOfImport: newTbMode,
      status: "Draft",
      periodId: newTbPeriod ? parseInt(newTbPeriod) : periods[0]?.id,
      lines
    };
    setEditingTb(newTb);
    setShowCreateModal(false);
  };

  // Flexible Multi-Source CSV & Accounting Software TB Parser
  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "CSV file must contain a header row and data rows.", variant: "destructive" });
        return;
      }

      // Parse header row to find column indices
      const headerCols = lines[0].split(",").map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ""));
      let codeIdx = headerCols.findIndex((c) => c.includes("code") || c.includes("nominal") || c.includes("account number"));
      let nameIdx = headerCols.findIndex((c) => c.includes("name") || c.includes("description") || c.includes("account name") || c.includes("title"));
      let debitIdx = headerCols.findIndex((c) => c.includes("debit") || c.includes("dr"));
      let creditIdx = headerCols.findIndex((c) => c.includes("credit") || c.includes("cr"));
      let netIdx = headerCols.findIndex((c) => c.includes("net") || c.includes("balance") || c.includes("ytd"));

      // Fallbacks if header wasn't matched
      if (codeIdx === -1) codeIdx = 0;
      if (nameIdx === -1) nameIdx = headerCols.length > 1 ? 1 : 0;
      if (debitIdx === -1) debitIdx = 2;
      if (creditIdx === -1) creditIdx = 3;

      const parsedRows: MappingLine[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        const cols: string[] = [];
        let inQuote = false;
        let current = "";
        for (let ch of rawLine) {
          if (ch === '"') {
            inQuote = !inQuote;
          } else if (ch === "," && !inQuote) {
            cols.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        cols.push(current.trim());

        const sourceCode = (cols[codeIdx] || "").replace(/^["']|["']$/g, "").trim();
        const sourceName = (cols[nameIdx] || "").replace(/^["']|["']$/g, "").trim();
        let debit = "";
        let credit = "";

        if (netIdx !== -1 && netIdx < cols.length && (debitIdx === -1 || debitIdx >= cols.length)) {
          const net = parseFloat(cols[netIdx].replace(/[^0-9.-]/g, "")) || 0;
          if (net > 0) debit = net.toFixed(2);
          else if (net < 0) credit = Math.abs(net).toFixed(2);
        } else {
          const dVal = parseFloat((cols[debitIdx] || "").replace(/[^0-9.-]/g, "")) || 0;
          const cVal = parseFloat((cols[creditIdx] || "").replace(/[^0-9.-]/g, "")) || 0;
          if (dVal > 0) debit = dVal.toFixed(2);
          if (cVal > 0) credit = cVal.toFixed(2);
        }

        if (!sourceCode && !sourceName && !debit && !credit) continue;

        // Auto-mapping resolution:
        // 1. Check saved client mappings
        const saved = savedMappings.find((m: any) => m.sourceCode === sourceCode);
        let targetNominalCode = "";
        let targetAccountName = "";

        if (saved) {
          targetNominalCode = saved.targetNominalCode;
          targetAccountName = saved.targetAccountName;
        } else {
          // 2. Check standard COA by code
          const stdByCode = CAPIUM_STANDARD_COA.find((c) => c.nominal_code === sourceCode);
          if (stdByCode) {
            targetNominalCode = stdByCode.nominal_code;
            targetAccountName = stdByCode.name;
          } else {
            // 3. Check standard COA by name
            const stdByName = CAPIUM_STANDARD_COA.find(
              (c) => c.name.toLowerCase() === sourceName.toLowerCase() ||
                     sourceName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (stdByName) {
              targetNominalCode = stdByName.nominal_code;
              targetAccountName = stdByName.name;
            }
          }
        }

        parsedRows.push({
          id: `line-${i}-${Date.now()}`,
          sourceCode: sourceCode || `SRC-${i}`,
          sourceName: sourceName || `Account ${sourceCode}`,
          debit,
          credit,
          targetNominalCode,
          targetAccountName,
        });
      }

      if (parsedRows.length > 0) {
        setMappingLines(parsedRows);
        setMappingDescription(`${mappingSourceSystem} Import (${file.name.replace(/\.[^/.]+$/, "")})`);
        setMappingPeriodId(periods[0]?.id ? String(periods[0].id) : "");
        setShowMappingModal(true);
        toast({
          title: "Trial Balance Loaded",
          description: `Loaded ${parsedRows.length} nominal rows. Please review code mappings.`,
        });
      } else {
        toast({ title: "Import Failed", description: "Could not extract nominal rows from CSV.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = "";
  };

  const totalDebit = editingTb?.lines.reduce((s, r) => s + parseFloat(r.debit || "0"), 0) || 0;
  const totalCredit = editingTb?.lines.reduce((s, r) => s + parseFloat(r.credit || "0"), 0) || 0;
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const updateRow = (i: number, field: keyof TBRow, val: string) => {
    if (!editingTb) return;
    const newLines = [...editingTb.lines];
    newLines[i] = { ...newLines[i], [field]: val };
    setEditingTb({ ...editingTb, lines: newLines });
  };

  const addRow = () => {
    if (!editingTb) return;
    setEditingTb({ ...editingTb, lines: [...editingTb.lines, { nominalCode: "", accountName: "", debit: "", credit: "" }] });
  };

  const removeRow = (i: number) => {
    if (!editingTb) return;
    setEditingTb({ ...editingTb, lines: editingTb.lines.filter((_, idx) => idx !== i) });
  };

  // Journal adjustment handlers
  const updateJournalLine = (index: number, field: string, val: string) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: val };
    setJournalLines(updated);
  };

  const addJournalLine = () => {
    setJournalLines([...journalLines, { nominalCode: "", accountName: "", debit: "", credit: "" }]);
  };

  const removeJournalLine = (index: number) => {
    if (journalLines.length <= 2) return;
    setJournalLines(journalLines.filter((_, i) => i !== index));
  };

  const totalJournalDebit = journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalJournalCredit = journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalJournalDebit - totalJournalCredit) < 0.01 && totalJournalDebit > 0;

  // Mapping Modal Helpers
  const updateMappingLine = (index: number, targetNominalCode: string) => {
    const match = CAPIUM_STANDARD_COA.find((c) => c.nominal_code === targetNominalCode);
    const updated = [...mappingLines];
    updated[index] = {
      ...updated[index],
      targetNominalCode,
      targetAccountName: match ? match.name : updated[index].sourceName,
    };
    setMappingLines(updated);
  };

  const totalMappingDebit = mappingLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalMappingCredit = mappingLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isMappingBalanced = Math.abs(totalMappingDebit - totalMappingCredit) < 0.05;
  const unmappedCount = mappingLines.filter((l) => !l.targetNominalCode).length;

  const filteredMappingLines = mappingLines.filter((line) => {
    if (showUnmappedOnly && line.targetNominalCode) return false;
    if (!mappingSearchQuery.trim()) return true;
    const q = mappingSearchQuery.toLowerCase();
    return (
      line.sourceCode.toLowerCase().includes(q) ||
      line.sourceName.toLowerCase().includes(q) ||
      line.targetNominalCode.toLowerCase().includes(q) ||
      line.targetAccountName.toLowerCase().includes(q)
    );
  });

  if (isLoadingClient) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Loading trial balance hub...</span>
      </div>
    );
  }

  if (!client) return <Redirect to="/accounts-production" />;

  return (
    <AppLayout sidebar={sidebar} module="Accounts Production">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
              <Link href="/accounts-production" className="hover:text-indigo-600">Accounts Production</Link>
              <span>/</span>
              <Link href={`/accounts-production/${clientId}`} className="hover:text-indigo-600">{client.clientName}</Link>
              <span>/</span>
              <Link href={`/accounts-production/${clientId}/trial-balance`} className="hover:text-indigo-600 font-medium flex items-center gap-0.5">
                <ArrowLeft size={11} /> Step 3: Trial Balance & Mapping
              </Link>
              <span>/</span>
              <span className="text-indigo-600 font-semibold">Full TB Hub</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-indigo-600" />
              Trial Balance & Nominal Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/accounts-production/${clientId}/trial-balance`}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Return to the 7-step statutory pipeline"
            >
              <ArrowLeft size={13} /> Back to Trial Balance
            </Link>

            <button
              onClick={() => setShowComparativeView(!showComparativeView)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showComparativeView
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                  : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <ArrowLeftRight size={13} />
              {showComparativeView ? "Standard View" : "Comparative TB (Variance)"}
            </button>

            <button
              onClick={() => setShowJournalModal(true)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              <Plus size={13} /> Record Journal Adjustment
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCsvFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
              title="Import Trial Balance from Xero, QuickBooks, FreeAgent, Sage, or CSV with automated mapping memory"
            >
              <ArrowLeftRight size={13} className="text-indigo-600" />
              <span>Import & Map TB (Xero / QBO / CSV)</span>
            </button>

            {!editingTb && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={13} /> Create Trial Balance
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Guidance Banner */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-850 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
            <span>
              You are working in the <strong>Full TB Hub</strong>. Edits saved here synchronize automatically with <strong>Step 3 (Trial Balance & Mapping)</strong> in the Statutory Accounts Pipeline.
            </span>
          </div>
          <Link
            href={`/accounts-production/${clientId}/trial-balance`}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto shrink-0"
          >
            <ArrowLeft size={13} /> Back to Step 3: Trial Balance & Mapping
          </Link>
        </div>

        {/* Comparative Trial Balance View */}
        {showComparativeView && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-indigo-600" />
                  Comparative Trial Balance (Current vs Prior Period)
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Automated variance analysis for statutory disclosures and financial reporting.
                </p>
              </div>
            </div>

            {isLoadingComparative ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-indigo-600" /> Loading comparative ledger data...
              </div>
            ) : !comparativeTb?.lines || comparativeTb.lines.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No prior period comparative data available for this client.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Nominal Code</th>
                      <th className="py-2.5 px-4">Account Name</th>
                      <th className="py-2.5 px-4 text-right">Current Period (£)</th>
                      <th className="py-2.5 px-4 text-right">Prior Period (£)</th>
                      <th className="py-2.5 px-4 text-right">Variance (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {comparativeTb.lines.map((line: any) => (
                      <tr key={line.nominalCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{line.nominalCode}</td>
                        <td className="py-2.5 px-4 font-medium">{line.accountName}</td>
                        <td className="py-2.5 px-4 text-right font-mono">£{parseFloat(line.currentAmount || "0").toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">£{parseFloat(line.priorAmount || "0").toFixed(2)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold ${
                          parseFloat(line.variance || "0") >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {parseFloat(line.variance || "0") >= 0 ? "+" : ""}
                          £{parseFloat(line.variance || "0").toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Editing or Active TB */}
        {editingTb ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Editing Trial Balance: {editingTb.refNo} ({editingTb.description})
                </h2>
                <p className="text-slate-500 text-[11px]">
                  Mode: {editingTb.modeOfImport} • Standard: UK GAAP FRS 102/105
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/accounts-production/${clientId}/chart-of-accounts`}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                  title="View and manage Master Chart of Accounts"
                >
                  <ListTree size={13} className="text-indigo-600" />
                  <span>Chart of Accounts</span>
                </Link>
                <button
                  onClick={() => setEditingTb(null)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveTbMutation.mutate({ tbData: editingTb, returnToPipeline: false })}
                  disabled={!balanced || saveTbMutation.isPending}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} /> {saveTbMutation.isPending ? "Saving..." : "Save Trial Balance"}
                </button>
                <button
                  onClick={() => saveTbMutation.mutate({ tbData: editingTb, returnToPipeline: true })}
                  disabled={!balanced || saveTbMutation.isPending}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  title="Save trial balance and return to Step 3 in the Statutory Pipeline"
                >
                  <CheckCircle2 size={13} /> {saveTbMutation.isPending ? "Saving..." : "Save & Return to Pipeline"}
                </button>
              </div>
            </div>

            {/* Balancing Status Card */}
            <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              balanced
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}>
              <div className="flex items-center gap-1.5 font-semibold">
                {balanced ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{balanced ? "Trial Balance is in balance (Debits = Credits)" : "Trial Balance is out of balance! Please balance debits and credits before saving."}</span>
              </div>
              <div className="flex items-center gap-4 font-mono font-bold">
                <span>Total Debit: £{totalDebit.toFixed(2)}</span>
                <span>Total Credit: £{totalCredit.toFixed(2)}</span>
                <span>Difference: £{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
              </div>
            </div>

            {/* Editable Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-32">Nominal Code</th>
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3 text-right w-36">Debit (£)</th>
                    <th className="py-2.5 px-3 text-right w-36">Credit (£)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {editingTb.lines.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2">
                        <NominalCodeAutocompleteCell
                          codeValue={row.nominalCode}
                          nameValue={row.accountName}
                          onCodeChange={(code) => updateRow(i, "nominalCode", code)}
                          onSelect={(acc) => {
                            if (!editingTb) return;
                            const newLines = [...editingTb.lines];
                            newLines[i] = {
                              ...newLines[i],
                              nominalCode: acc.code,
                              accountName: acc.name,
                              category: acc.category || newLines[i].category,
                            };
                            setEditingTb({ ...editingTb, lines: newLines });
                          }}
                          accounts={coaAccounts}
                          placeholder="e.g. 1000"
                        />
                      </td>
                      <td className="p-2">
                        <AccountAutocompleteCell
                          nameValue={row.accountName}
                          codeValue={row.nominalCode}
                          onNameChange={(name) => updateRow(i, "accountName", name)}
                          onSelect={(acc) => {
                            if (!editingTb) return;
                            const newLines = [...editingTb.lines];
                            newLines[i] = {
                              ...newLines[i],
                              nominalCode: acc.code,
                              accountName: acc.name,
                              category: acc.category || newLines[i].category,
                            };
                            setEditingTb({ ...editingTb, lines: newLines });
                          }}
                          accounts={coaAccounts}
                          placeholder="Type or select account name..."
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.debit}
                          onChange={(e) => updateRow(i, "debit", e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.credit}
                          onChange={(e) => updateRow(i, "credit", e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right font-mono"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={2} className="py-2.5 px-3 text-right text-slate-900 dark:text-slate-100">
                      Total Ledger Balances
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                      £{totalDebit.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                      £{totalCredit.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={addRow}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Add Nominal Row
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Stored Trial Balances Table */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Recorded Trial Balances</h2>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 text-xs">{trialBalances.length} record{trialBalances.length !== 1 ? "s" : ""}</span>
                <Link
                  href={`/accounts-production/${clientId}/chart-of-accounts`}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                  title="View and manage Master Chart of Accounts"
                >
                  <ListTree size={13} className="text-indigo-600" />
                  <span>Chart of Accounts</span>
                </Link>
              </div>
            </div>

            
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Ref. No.</th>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Mode of Import</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trialBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                      <FileSpreadsheet size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                      <p>No trial balances recorded yet for this client.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                      >
                        Click here to create or import a trial balance
                      </button>
                    </td>
                  </tr>
                ) : (
                  trialBalances.map((tb) => {
                    const period = periods.find(p => p.id === tb.periodId);
                    return (
                      <tr key={tb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{tb.refNo}</td>
                        <td className="py-3 px-4">
                          {period ? `${new Date(period.startDate).toLocaleDateString("en-GB")} to ${new Date(period.endDate).toLocaleDateString("en-GB")}` : "General"}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{tb.description}</td>
                        <td className="py-3 px-4 text-slate-500">{tb.modeOfImport}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {tb.status || "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingTb(tb)}
                              className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 rounded font-medium cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <Link
                              href={`/accounts-production/${clientId}/trial-balance`}
                              className="px-2.5 py-1 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 rounded font-medium cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Pipeline</span>
                              <ArrowRight size={12} />
                            </Link>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete trial balance "${tb.refNo}" (${tb.description})? All its recorded ledger lines will be permanently removed.`)) {
                                  deleteTbMutation.mutate(tb.id);
                                }
                              }}
                              disabled={deleteTbMutation.isPending}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded font-medium cursor-pointer inline-flex items-center gap-1 transition-colors"
                              title="Delete trial balance"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal: Create Trial Balance */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Trial Balance</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Ref. No. *</label>
                    <input
                      value={newTbRef}
                      onChange={(e) => setNewTbRef(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Accounting Period</label>
                    <select
                      value={newTbPeriod}
                      onChange={(e) => setNewTbPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="">Select Accounting Period</option>
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.periodName || `${p.startDate} - ${p.endDate}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                  <input
                    value={newTbDesc}
                    onChange={(e) => setNewTbDesc(e.target.value)}
                    placeholder="e.g. Year End Trial Balance"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">Mode of Import</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Bookkeeping", "CSV", "Manual", "QuickBooks"].map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${
                          newTbMode === mode
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={newTbMode === mode}
                          onChange={() => setNewTbMode(mode)}
                          className="text-indigo-600"
                        />
                        <span>{mode} Sync</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Initialize Trial Balance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Record Journal Adjustment */}
        {showJournalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calculator size={16} className="text-indigo-600" />
                  Post Journal Adjustment
                </h3>
                <button onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Journal Date *</label>
                  <input
                    type="date"
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Narrative / Explanation *</label>
                  <input
                    type="text"
                    value={journalNarrative}
                    onChange={(e) => setJournalNarrative(e.target.value)}
                    placeholder="e.g. Accruals and Prepayments adjustment"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Journal Lines */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-3 w-28">Nominal Code</th>
                      <th className="py-2 px-3">Account Name</th>
                      <th className="py-2 px-3 text-right w-28">Debit (£)</th>
                      <th className="py-2 px-3 text-right w-28">Credit (£)</th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {journalLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <NominalCodeAutocompleteCell
                            codeValue={line.nominalCode}
                            nameValue={line.accountName}
                            onCodeChange={(code) => updateJournalLine(idx, "nominalCode", code)}
                            onSelect={(acc) => {
                              const newLines = [...journalLines];
                              newLines[idx] = {
                                ...newLines[idx],
                                nominalCode: acc.code,
                                accountName: acc.name,
                              };
                              setJournalLines(newLines);
                            }}
                            accounts={coaAccounts}
                            placeholder="Code"
                          />
                        </td>
                        <td className="p-1.5">
                          <AccountAutocompleteCell
                            nameValue={line.accountName}
                            codeValue={line.nominalCode}
                            onNameChange={(name) => updateJournalLine(idx, "accountName", name)}
                            onSelect={(acc) => {
                              const newLines = [...journalLines];
                              newLines[idx] = {
                                ...newLines[idx],
                                nominalCode: acc.code,
                                accountName: acc.name,
                              };
                              setJournalLines(newLines);
                            }}
                            accounts={coaAccounts}
                            placeholder="Type or select account name..."
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={line.debit}
                            onChange={(e) => updateJournalLine(idx, "debit", e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={line.credit}
                            onChange={(e) => updateJournalLine(idx, "credit", e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          {journalLines.length > 2 && (
                            <button
                              onClick={() => removeJournalLine(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                      <td colSpan={2} className="py-2 px-3 text-right">Totals:</td>
                      <td className="py-2 px-3 text-right font-mono">£{totalJournalDebit.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono">£{totalJournalCredit.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addJournalLine}
                  className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Line
                </button>

                <span className={`text-xs font-semibold ${isJournalBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                  {isJournalBalanced ? "Balanced (Dr = Cr)" : `Difference: £${Math.abs(totalJournalDebit - totalJournalCredit).toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowJournalModal(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => postJournalMutation.mutate()}
                  disabled={!isJournalBalanced || !journalNarrative.trim() || postJournalMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {postJournalMutation.isPending ? "Posting..." : "Post Adjustment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Third-Party Trial Balance Mapping & Reconciliation Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl border border-indigo-200 dark:border-indigo-900">
                    <ArrowLeftRight size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      Trial Balance Code Mapping & Reconciliation
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Map external software nominal codes into SanSuite standard UK Chart of Accounts with persistent memory.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Source System Pill Selector */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px]">
                    {["Xero", "QuickBooks", "FreeAgent", "Sage", "Custom CSV"].map((sys) => (
                      <button
                        key={sys}
                        type="button"
                        onClick={() => setMappingSourceSystem(sys)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          mappingSourceSystem === sys
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        {sys}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowMappingModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Controls Bar: Period, Search, Unmapped Filter & Balance Totals */}
              <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Accounting Period:</span>
                    <select
                      value={mappingPeriodId}
                      onChange={(e) => setMappingPeriodId(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs"
                    >
                      {periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.periodName || `${p.startDate} to ${p.endDate}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Description:</span>
                    <input
                      type="text"
                      value={mappingDescription}
                      onChange={(e) => setMappingDescription(e.target.value)}
                      placeholder="e.g. Xero FY24 Import"
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs w-48"
                    />
                  </div>

                  <input
                    type="text"
                    value={mappingSearchQuery}
                    onChange={(e) => setMappingSearchQuery(e.target.value)}
                    placeholder="Search source/target codes..."
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs w-44"
                  />

                  <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showUnmappedOnly}
                      onChange={(e) => setShowUnmappedOnly(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Show unmapped only ({unmappedCount})</span>
                  </label>
                </div>

                {/* Dr/Cr Balance Indicator */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Dr:</span>
                    <span className="font-mono font-semibold">£{totalMappingDebit.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Cr:</span>
                    <span className="font-mono font-semibold">£{totalMappingCredit.toFixed(2)}</span>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                    {isMappingBalanced ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 size={13} /> Balanced
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
                        <AlertCircle size={13} /> Diff: £{Math.abs(totalMappingDebit - totalMappingCredit).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mapping Table */}
              <div className="flex-1 overflow-y-auto max-h-[50vh] p-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">Source Code</th>
                      <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">Source Account Name</th>
                      <th className="py-2.5 px-3 text-right border-b border-slate-200 dark:border-slate-800">Debit (£)</th>
                      <th className="py-2.5 px-3 text-right border-b border-slate-200 dark:border-slate-800">Credit (£)</th>
                      <th className="py-2.5 px-3 text-center border-b border-slate-200 dark:border-slate-800 w-8"></th>
                      <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800 min-w-[320px]">
                        Target SanSuite / UK Standard Nominal Account
                      </th>
                      <th className="py-2.5 px-3 text-center border-b border-slate-200 dark:border-slate-800 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMappingLines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No nominal lines match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMappingLines.map((line, idx) => {
                        const originalIndex = mappingLines.findIndex((l) => l.id === line.id);
                        return (
                          <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {line.sourceCode}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={line.sourceName}>
                              {line.sourceName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {line.debit ? `£${parseFloat(line.debit).toFixed(2)}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {line.credit ? `£${parseFloat(line.credit).toFixed(2)}` : "-"}
                            </td>
                            <td className="py-2 px-1 text-center text-slate-400">
                              <ArrowLeftRight size={12} className="mx-auto" />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={line.targetNominalCode}
                                onChange={(e) => updateMappingLine(originalIndex, e.target.value)}
                                className={`w-full py-1.5 px-2 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono transition-colors ${
                                  line.targetNominalCode
                                    ? "border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
                                    : "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50/20"
                                }`}
                              >
                                <option value="">-- Select Standard Account Code --</option>
                                {CAPIUM_STANDARD_COA.map((coa) => (
                                  <option key={coa.nominal_code} value={coa.nominal_code}>
                                    {coa.nominal_code} - {coa.name} ({coa.category})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {line.targetNominalCode ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={10} /> Mapped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <AlertCircle size={10} /> Unmapped
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer: Persistent Memory Checkbox & Action Buttons */}
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMapping}
                    onChange={(e) => setRememberMapping(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <Shield size={14} className="text-indigo-600" />
                  <span className="font-medium">Remember these mappings for future imports for this client</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMappingModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => importMappedMutation.mutate()}
                    disabled={importMappedMutation.isPending || mappingLines.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload size={14} />
                    {importMappedMutation.isPending ? "Importing & Mapping..." : "Import & Save Trial Balance"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
