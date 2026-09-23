import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  FileSpreadsheet, FileText, CheckCircle2, ShieldCheck,
  Download, Printer, RefreshCw, Plus, Save, Trash2,
  HelpCircle, ExternalLink, AlertCircle, Building2,
  Layers, BookOpen, Edit3, X, Check
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export default function CharityAccountsProductionPage() {
  return (
    <CharityWorkspaceLayout activeTab="accounts-production">
      <CharityAccountsProductionContent />
    </CharityWorkspaceLayout>
  );
}

function CharityAccountsProductionContent() {
  const { charityId, charity, currentPeriod } = useCharityWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"tb" | "sofa" | "balance-sheet" | "additional-disclosures" | "tar" | "ier" | "preview">("tb");

  // Trial Balance State
  const [tbLines, setTbLines] = useState<any[]>([]);

  // TAR State
  const [tarForm, setTarForm] = useState({
    objectivesActivities: "",
    achievementsPerformance: "",
    financialReview: "",
    structureGovernance: "",
    referenceAdmin: "",
    exemptionsApplied: "",
    status: "Draft",
  });

  // IER State
  const [ierForm, setIerForm] = useState({
    examinerName: "",
    examinerQualification: "FCA",
    accountingBody: "ICAEW",
    examinerAddress: "",
    reportDate: new Date().toISOString().split("T")[0],
    basisOfReport: "",
    examinerStatement: "",
    concernsOrMatters: "",
    isGrossIncomeOver250k: false,
  });

  // 1. Fetch Trial Balance
  const { data: tbData, isLoading: isLoadingTB } = useQuery({
    queryKey: [`/api/charity/${charityId}/trial-balance`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return { lines: [], totals: {} };
      const res = await apiRequest("GET", `/api/charity/${charityId}/trial-balance?periodId=${currentPeriod.id}`);
      if (!res.ok) return { lines: [], totals: {} };
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id,
  });

  useEffect(() => {
    if (tbData?.lines) {
      setTbLines(tbData.lines);
    }
  }, [tbData]);

  // 2. Fetch SoFA Data
  const { data: sofaData, isLoading: isLoadingSofa } = useQuery({
    queryKey: [`/api/charity/${charityId}/sofa-report`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/charity/${charityId}/sofa-report?periodId=${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id && (activeTab === "sofa" || activeTab === "preview"),
  });

  // 3. Fetch Balance Sheet Data
  const { data: bsData, isLoading: isLoadingBS, refetch: refetchBS } = useQuery({
    queryKey: [`/api/charity/${charityId}/balance-sheet`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/charity/${charityId}/balance-sheet?periodId=${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id && (activeTab === "balance-sheet" || activeTab === "preview"),
  });

  // 4. Fetch Additional Disclosures Data
  const { data: disclosuresData = [], refetch: refetchDisclosures } = useQuery({
    queryKey: [`/api/charity/${charityId}/additional-disclosures`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return [];
      const res = await apiRequest("GET", `/api/charity/${charityId}/additional-disclosures?periodId=${currentPeriod.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id && (activeTab === "additional-disclosures" || activeTab === "preview"),
  });

  // Additional Disclosures Form & Modal State
  const [disclosureSubTab, setDisclosureSubTab] = useState<"Note" | "AccountingPolicy">("Note");
  const [isDisclosureModalOpen, setIsDisclosureModalOpen] = useState(false);
  const [editingDisclosureId, setEditingDisclosureId] = useState<number | null>(null);
  const [disclosureForm, setDisclosureForm] = useState({
    title: "",
    content: "",
    sequence: 1,
    isActive: true,
  });

  const saveDisclosureMutation = useMutation({
    mutationFn: async () => {
      if (!disclosureForm.title.trim() || !disclosureForm.content.trim()) {
        throw new Error("Title and content are required");
      }
      if (editingDisclosureId) {
        const res = await apiRequest("PUT", `/api/charity/${charityId}/additional-disclosures/${editingDisclosureId}`, {
          ...disclosureForm,
        });
        if (!res.ok) throw new Error("Failed to update disclosure");
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/charity/${charityId}/additional-disclosures`, {
          periodId: currentPeriod?.id,
          disclosureType: disclosureSubTab,
          ...disclosureForm,
        });
        if (!res.ok) throw new Error("Failed to save disclosure");
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: editingDisclosureId ? "Disclosure Updated" : "Disclosure Added",
        description: `Additional ${disclosureSubTab === "Note" ? "Note" : "Accounting Policy"} saved successfully.`,
      });
      setIsDisclosureModalOpen(false);
      setEditingDisclosureId(null);
      setDisclosureForm({ title: "", content: "", sequence: 1, isActive: true });
      refetchDisclosures();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteDisclosureMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/charity/${charityId}/additional-disclosures/${id}`);
      if (!res.ok) throw new Error("Failed to delete disclosure");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Disclosure removed." });
      refetchDisclosures();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // 3. Fetch TAR
  const { data: tarData } = useQuery({
    queryKey: [`/api/charity/${charityId}/trustees-report`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/charity/${charityId}/trustees-report?periodId=${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id && (activeTab === "tar" || activeTab === "preview"),
  });

  useEffect(() => {
    if (tarData) {
      setTarForm({
        objectivesActivities: tarData.objectivesActivities || "",
        achievementsPerformance: tarData.achievementsPerformance || "",
        financialReview: tarData.financialReview || "",
        structureGovernance: tarData.structureGovernance || "",
        referenceAdmin: tarData.referenceAdmin || "",
        exemptionsApplied: tarData.exemptionsApplied || "",
        status: tarData.status || "Draft",
      });
    }
  }, [tarData]);

  // 4. Fetch IER
  const { data: ierData } = useQuery({
    queryKey: [`/api/charity/${charityId}/ier-report`, currentPeriod?.id],
    queryFn: async () => {
      if (!currentPeriod?.id) return null;
      const res = await apiRequest("GET", `/api/charity/${charityId}/ier-report?periodId=${currentPeriod.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!charityId && !!currentPeriod?.id && (activeTab === "ier" || activeTab === "preview"),
  });

  useEffect(() => {
    if (ierData) {
      setIerForm({
        examinerName: ierData.examinerName || "",
        examinerQualification: ierData.examinerQualification || "FCA",
        accountingBody: ierData.accountingBody || "ICAEW",
        examinerAddress: ierData.examinerAddress || "",
        reportDate: ierData.reportDate || new Date().toISOString().split("T")[0],
        basisOfReport: ierData.basisOfReport || "",
        examinerStatement: ierData.examinerStatement || "",
        concernsOrMatters: ierData.concernsOrMatters || "",
        isGrossIncomeOver250k: ierData.isGrossIncomeOver250k ?? false,
      });
    } else {
      // Default statutory template per Charity Commission CC31
      setIerForm(prev => ({
        ...prev,
        basisOfReport: `I report to the Charity Trustees on my examination of the accounts of ${charity?.name || "the charity"} for the year ended ${currentPeriod?.endDate || ""}, which comprise the Statement of Financial Activities, the Balance Sheet and the related notes. As the charity's trustees you are responsible for the preparation of the accounts in accordance with the requirements of the Charities Act 2011 ('the Act').`,
        examinerStatement: `I confirm that no material matters have come to my attention in connection with the examination which gives me cause to believe that in any material respect: (1) accounting records were not kept in accordance with section 130 of the Charities Act; or (2) the accounts did not accord with the accounting records; or (3) the accounts did not comply with the applicable requirements concerning the form and content of accounts set out in the Charities (Accounts and Reports) Regulations 2008.`,
      }));
    }
  }, [ierData, charity, currentPeriod]);

  // Mutations
  const saveTBMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/trial-balance`, {
        periodId: currentPeriod?.id,
        lines: tbLines,
      });
      if (!res.ok) throw new Error("Failed to save trial balance");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trial Balance Saved", description: "All nominal accounts updated successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/trial-balance`] });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/sofa-report`] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveTarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/trustees-report`, {
        periodId: currentPeriod?.id,
        ...tarForm,
      });
      if (!res.ok) throw new Error("Failed to save Trustees' Report");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trustees' Report Saved", description: "Report draft updated." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/trustees-report`] });
    },
  });

  const saveIerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/ier-report`, {
        periodId: currentPeriod?.id,
        ...ierForm,
      });
      if (!res.ok) throw new Error("Failed to save Examiner's Report");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Examiner's Report Saved", description: "Statutory report saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/ier-report`] });
    },
  });

  const addTBLine = () => {
    setTbLines([
      ...tbLines,
      {
        nominalCode: "",
        accountName: "",
        sorpCategory: "Donations and legacies",
        unrestrictedDebit: "0.00",
        unrestrictedCredit: "0.00",
        restrictedDebit: "0.00",
        restrictedCredit: "0.00",
        endowmentDebit: "0.00",
        endowmentCredit: "0.00",
      }
    ]);
  };

  const removeTBLine = (index: number) => {
    setTbLines(tbLines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Charity Accounts Production</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepare statutory accounts under {charity?.accountingMethod === "Cash" ? "Cash Basis (Receipts & Payments)" : "Accruals (SORP FRS 102)"} for the Charity Commission.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "tb" && (
            <>
              <button
                onClick={addTBLine}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
              >
                <Plus size={14} /> Add Line
              </button>
              <button
                onClick={() => saveTBMutation.mutate()}
                disabled={saveTBMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm disabled:opacity-50"
              >
                <Save size={14} /> {saveTBMutation.isPending ? "Saving..." : "Save Trial Balance"}
              </button>
            </>
          )}
          {activeTab === "tar" && (
            <button
              onClick={() => saveTarMutation.mutate()}
              disabled={saveTarMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm"
            >
              <Save size={14} /> Save Report
            </button>
          )}
          {activeTab === "ier" && (
            <button
              onClick={() => saveIerMutation.mutate()}
              disabled={saveIerMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm"
            >
              <Save size={14} /> Save Examination
            </button>
          )}
          {activeTab === "preview" && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {/* Accounts Production Sub-Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: "tb", label: "Trial Balance", icon: <FileSpreadsheet size={14} /> },
          { id: "sofa", label: charity?.accountingMethod === "Cash" ? "Receipts & Payments" : "Statement of Financial Activities (SoFA)", icon: <FileText size={14} /> },
          { id: "balance-sheet", label: charity?.isFundWiseBalanceSheet ? "Fund-Wise Balance Sheet" : "Balance Sheet", icon: <Layers size={14} /> },
          { id: "additional-disclosures", label: "Additional Disclosures", icon: <BookOpen size={14} /> },
          { id: "tar", label: "Trustees' Annual Report (TAR)", icon: <Building2 size={14} /> },
          { id: "ier", label: "Independent Examiner (IER)", icon: <ShieldCheck size={14} /> },
          { id: "preview", label: "Statutory Accounts Pack Preview", icon: <Printer size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-orange-600 text-orange-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. TRIAL BALANCE TAB */}
      {activeTab === "tb" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Charity Multi-Fund Trial Balance</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Period: {currentPeriod?.startDate} to {currentPeriod?.endDate}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{tbLines.length} Nominal Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3 py-2.5 w-20">Code</th>
                  <th className="px-3 py-2.5">Account Name</th>
                  <th className="px-3 py-2.5">SORP Classification</th>
                  <th className="px-3 py-2.5 text-right bg-orange-50/40">Unrestricted Dr</th>
                  <th className="px-3 py-2.5 text-right bg-orange-50/40">Unrestricted Cr</th>
                  <th className="px-3 py-2.5 text-right bg-purple-50/40">Restricted Dr</th>
                  <th className="px-3 py-2.5 text-right bg-purple-50/40">Restricted Cr</th>
                  <th className="px-3 py-2.5 text-right bg-amber-50/40">Endowment Dr</th>
                  <th className="px-3 py-2.5 text-right bg-amber-50/40">Endowment Cr</th>
                  <th className="px-2 py-2.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingTB ? (
                  <tr><td colSpan={10} className="py-8 text-center text-slate-400">Loading trial balance...</td></tr>
                ) : tbLines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
                      No lines in trial balance yet. Click "+ Add Line" to add nominal accounts.
                    </td>
                  </tr>
                ) : (
                  tbLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={line.nominalCode}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].nominalCode = e.target.value;
                            setTbLines(updated);
                          }}
                          placeholder="4000"
                          className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={line.accountName}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].accountName = e.target.value;
                            setTbLines(updated);
                          }}
                          placeholder="e.g. Donations & Legacies"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={line.sorpCategory || "Donations and legacies"}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].sorpCategory = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-orange-500"
                        >
                          <option value="Donations and legacies">Donations and legacies</option>
                          <option value="Charitable activities">Charitable activities</option>
                          <option value="Other trading activities">Other trading activities</option>
                          <option value="Investments">Investments</option>
                          <option value="Raising funds">Raising funds</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 bg-orange-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.unrestrictedDebit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].unrestrictedDebit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-orange-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.unrestrictedCredit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].unrestrictedCredit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-purple-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.restrictedDebit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].restrictedDebit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-purple-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.restrictedCredit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].restrictedCredit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-purple-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-amber-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.endowmentDebit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].endowmentDebit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 bg-amber-50/20">
                        <input
                          type="number"
                          step="0.01"
                          value={line.endowmentCredit}
                          onChange={(e) => {
                            const updated = [...tbLines];
                            updated[idx].endowmentCredit = e.target.value;
                            setTbLines(updated);
                          }}
                          className="w-full text-right px-2 py-1 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeTBLine(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Delete line"
                        >
                          <Trash2 size={13} />
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

      {/* 2. STATEMENT OF FINANCIAL ACTIVITIES (SoFA) TAB */}
      {activeTab === "sofa" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="text-center pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">{charity?.name}</h3>
            <p className="text-sm font-semibold text-slate-700">Statement of Financial Activities (SoFA)</p>
            <p className="text-xs text-slate-500 mt-0.5">
              For the year ended {currentPeriod?.endDate} (Incorporating Income & Expenditure Account)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                  <th className="px-4 py-3">Incoming Resources & Resources Expended</th>
                  <th className="px-4 py-3 text-right">Unrestricted (£)</th>
                  <th className="px-4 py-3 text-right">Restricted (£)</th>
                  <th className="px-4 py-3 text-right">Endowment (£)</th>
                  <th className="px-4 py-3 text-right">Total Current Year (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-100/60 font-bold text-slate-800">
                  <td colSpan={5} className="px-4 py-2 uppercase tracking-wider text-[11px]">
                    Income and endowments from:
                  </td>
                </tr>
                {sofaData?.incomeCategories?.map((cat: any, i: number) => {
                  const catUnr = cat.lines.reduce((s: number, l: any) => s + l.unrestricted, 0);
                  const catRes = cat.lines.reduce((s: number, l: any) => s + l.restricted, 0);
                  const catEnd = cat.lines.reduce((s: number, l: any) => s + l.endowment, 0);
                  const catTot = catUnr + catRes + catEnd;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{catUnr.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{catRes.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{catEnd.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{catTot.toFixed(2)}</td>
                    </tr>
                  );
                })}

                <tr className="bg-slate-100/60 font-bold text-slate-800">
                  <td colSpan={5} className="px-4 py-2 uppercase tracking-wider text-[11px]">
                    Expenditure on:
                  </td>
                </tr>
                {sofaData?.expenseCategories?.map((cat: any, i: number) => {
                  const catUnr = cat.lines.reduce((s: number, l: any) => s + l.unrestricted, 0);
                  const catRes = cat.lines.reduce((s: number, l: any) => s + l.restricted, 0);
                  const catEnd = cat.lines.reduce((s: number, l: any) => s + l.endowment, 0);
                  const catTot = catUnr + catRes + catEnd;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-600">{catUnr.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-600">{catRes.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-600">{catEnd.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-700">{catTot.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2b. BALANCE SHEET TAB */}
      {activeTab === "balance-sheet" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {bsData?.isFundWise ? "Fund-Wise Balance Sheet" : "Statement of Financial Position (Balance Sheet)"}
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  bsData?.isFundWise
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  {bsData?.isFundWise ? "Fund-Wise Breakdown (July 2025)" : "Standard Format"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                As at {currentPeriod?.endDate} &bull; Prepared under Charities SORP FRS 102
              </p>
            </div>
            <button
              onClick={() => refetchBS()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw size={13} /> Refresh Statement
            </button>
          </div>

          {isLoadingBS ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading Balance Sheet...</div>
          ) : !bsData?.fixedAssets?.length && !bsData?.currentAssets?.length && !bsData?.currentLiabilities?.length ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <Layers size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Balance Sheet Figures Recorded</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Populate nominal codes for Assets and Liabilities in your Trial Balance to view the balance sheet.
              </p>
              <button
                onClick={() => setActiveTab("tb")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <FileSpreadsheet size={14} /> Open Trial Balance
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Section / Nominal Description</th>
                    {bsData?.isFundWise ? (
                      <>
                        <th className="px-4 py-3 text-right text-orange-700 bg-orange-50/50">Unrestricted (£)</th>
                        <th className="px-4 py-3 text-right text-purple-700 bg-purple-50/50">Restricted (£)</th>
                        <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/50">Endowment (£)</th>
                        <th className="px-4 py-3 text-right text-slate-900 bg-slate-100 font-bold">Total Funds (£)</th>
                      </>
                    ) : (
                      <th className="px-4 py-3 text-right text-slate-900 bg-slate-100 font-bold">Total Funds (£)</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Fixed Assets */}
                  <tr className="bg-slate-50/60 font-bold text-slate-800">
                    <td colSpan={bsData?.isFundWise ? 5 : 2} className="px-4 py-2 uppercase tracking-wider text-[11px]">
                      Fixed Assets
                    </td>
                  </tr>
                  {bsData?.fixedAssets?.map((l: any, i: number) => (
                    <tr key={`fa-${i}`} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-700 font-medium pl-8">{l.nominalCode} - {l.accountName}</td>
                      {bsData?.isFundWise ? (
                        <>
                          <td className="px-4 py-2 text-right font-mono">{l.unrestricted.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.restricted.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.endowment.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold">{l.total.toFixed(2)}</td>
                        </>
                      ) : (
                        <td className="px-4 py-2 text-right font-mono font-semibold">{l.total.toFixed(2)}</td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-slate-100/40 font-bold text-slate-900">
                    <td className="px-4 py-2.5 pl-6">Total Fixed Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.fixedAssets?.unrestricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.fixedAssets?.restricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.fixedAssets?.endowment.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-900">{bsData?.totals?.fixedAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900">{bsData?.totals?.fixedAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>

                  {/* Current Assets */}
                  <tr className="bg-slate-50/60 font-bold text-slate-800">
                    <td colSpan={bsData?.isFundWise ? 5 : 2} className="px-4 py-2 uppercase tracking-wider text-[11px]">
                      Current Assets
                    </td>
                  </tr>
                  {bsData?.currentAssets?.map((l: any, i: number) => (
                    <tr key={`ca-${i}`} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-700 font-medium pl-8">{l.nominalCode} - {l.accountName}</td>
                      {bsData?.isFundWise ? (
                        <>
                          <td className="px-4 py-2 text-right font-mono">{l.unrestricted.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.restricted.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono">{l.endowment.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold">{l.total.toFixed(2)}</td>
                        </>
                      ) : (
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{l.total.toFixed(2)}</td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-slate-100/40 font-bold text-slate-900">
                    <td className="px-4 py-2.5 pl-6">Total Current Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.currentAssets?.unrestricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.currentAssets?.restricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.currentAssets?.endowment.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-900">{bsData?.totals?.currentAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900">{bsData?.totals?.currentAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>

                  {/* Current Liabilities */}
                  <tr className="bg-slate-50/60 font-bold text-slate-800">
                    <td colSpan={bsData?.isFundWise ? 5 : 2} className="px-4 py-2 uppercase tracking-wider text-[11px]">
                      Creditors: amounts falling due within one year
                    </td>
                  </tr>
                  {bsData?.currentLiabilities?.map((l: any, i: number) => (
                    <tr key={`cl-${i}`} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-700 font-medium pl-8">{l.nominalCode} - {l.accountName}</td>
                      {bsData?.isFundWise ? (
                        <>
                          <td className="px-4 py-2 text-right font-mono text-rose-600">({l.unrestricted.toFixed(2)})</td>
                          <td className="px-4 py-2 text-right font-mono text-rose-600">({l.restricted.toFixed(2)})</td>
                          <td className="px-4 py-2 text-right font-mono text-rose-600">({l.endowment.toFixed(2)})</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-rose-600">({l.total.toFixed(2)})</td>
                        </>
                      ) : (
                        <td className="px-4 py-2 text-right font-mono font-semibold text-rose-600">({l.total.toFixed(2)})</td>
                      )}
                    </tr>
                  ))}

                  {/* Net Current Assets */}
                  <tr className="bg-orange-50/30 font-bold text-slate-900 border-t border-b border-slate-200">
                    <td className="px-4 py-2.5">Net Current Assets / (Liabilities)</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.netCurrentAssets?.unrestricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.netCurrentAssets?.restricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.netCurrentAssets?.endowment.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-orange-950">{bsData?.totals?.netCurrentAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-orange-950">{bsData?.totals?.netCurrentAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>

                  {/* Total Assets Less Current Liabilities */}
                  <tr className="font-bold text-slate-900">
                    <td className="px-4 py-2.5">Total Assets Less Current Liabilities</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.totalAssetsLessCurrentLiab?.unrestricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.totalAssetsLessCurrentLiab?.restricted.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.totalAssetsLessCurrentLiab?.endowment.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.totalAssetsLessCurrentLiab?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-right font-mono">{bsData?.totals?.totalAssetsLessCurrentLiab?.total.toFixed(2)}</td>
                    )}
                  </tr>

                  {/* Net Assets */}
                  <tr className="bg-orange-100 font-extrabold text-orange-950 border-t-2 border-b-2 border-orange-300">
                    <td className="px-4 py-3 text-sm uppercase">Total Net Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm">{bsData?.totals?.netAssets?.unrestricted.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{bsData?.totals?.netAssets?.restricted.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{bsData?.totals?.netAssets?.endowment.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">{bsData?.totals?.netAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right font-mono text-sm">{bsData?.totals?.netAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2c. ADDITIONAL DISCLOSURES TAB */}
      {activeTab === "additional-disclosures" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Additional Disclosures</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-full">
                  July 2025 Update
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage custom statutory notes and additional accounting policies published in the accounts.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDisclosureId(null);
                setDisclosureForm({ title: "", content: "", sequence: disclosuresData.length + 1, isActive: true });
                setIsDisclosureModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} /> {disclosureSubTab === "Note" ? "Add Notes" : "Add Accounting Policies"}
            </button>
          </div>

          {/* Sub-tabs: Notes vs Policies */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setDisclosureSubTab("Note")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                disclosureSubTab === "Note"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Additional Notes ({disclosuresData.filter((d: any) => d.disclosureType === "Note").length})
            </button>
            <button
              onClick={() => setDisclosureSubTab("AccountingPolicy")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                disclosureSubTab === "AccountingPolicy"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Additional Accounting Policies ({disclosuresData.filter((d: any) => d.disclosureType === "AccountingPolicy").length})
            </button>
          </div>

          {/* List of disclosures */}
          {disclosuresData.filter((d: any) => d.disclosureType === disclosureSubTab).length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <BookOpen size={28} className="text-slate-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">
                No Additional {disclosureSubTab === "Note" ? "Notes" : "Accounting Policies"} Recorded
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                Add specialized disclosures required under charity circumstances or statutory accounting rules.
              </p>
              <button
                onClick={() => {
                  setEditingDisclosureId(null);
                  setDisclosureForm({ title: "", content: "", sequence: 1, isActive: true });
                  setIsDisclosureModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={13} /> Add {disclosureSubTab === "Note" ? "Note" : "Accounting Policy"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {disclosuresData
                .filter((d: any) => d.disclosureType === disclosureSubTab)
                .map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{item.title}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {item.isActive ? "Active in Accounts" : "Inactive"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Seq: {item.sequence}</span>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDisclosureId(item.id);
                          setDisclosureForm({
                            title: item.title,
                            content: item.content,
                            sequence: item.sequence || 1,
                            isActive: item.isActive,
                          });
                          setIsDisclosureModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Note"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteDisclosureMutation.mutate(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Modal for adding/editing note/policy */}
          {isDisclosureModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingDisclosureId ? "Edit" : "Add"} {disclosureSubTab === "Note" ? "Additional Note" : "Accounting Policy"}
                  </h3>
                  <button
                    onClick={() => setIsDisclosureModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      placeholder={disclosureSubTab === "Note" ? "e.g. Note 14: Contingent Liabilities" : "e.g. Recognition of Donated Services"}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                      value={disclosureForm.title}
                      onChange={(e) => setDisclosureForm({ ...disclosureForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Disclosure Content *</label>
                    <textarea
                      rows={5}
                      placeholder="Enter detailed statutory narrative text..."
                      className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 leading-relaxed"
                      value={disclosureForm.content}
                      onChange={(e) => setDisclosureForm({ ...disclosureForm, content: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sequence Order</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                        value={disclosureForm.sequence}
                        onChange={(e) => setDisclosureForm({ ...disclosureForm, sequence: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={disclosureForm.isActive}
                          onChange={(e) => setDisclosureForm({ ...disclosureForm, isActive: e.target.checked })}
                          className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span>Active in Accounts</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setIsDisclosureModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveDisclosureMutation.mutate()}
                    disabled={saveDisclosureMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {saveDisclosureMutation.isPending ? "Saving..." : "Save Disclosure"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TRUSTEES' ANNUAL REPORT (TAR) TAB */}
      {activeTab === "tar" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Trustees' Annual Report (TAR)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft the statutory narrative reporting required under the Charities Act 2011 and FRS 102 SORP.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                1. Objectives and Activities
              </label>
              <textarea
                rows={4}
                placeholder="Describe the summary of the objects of the charity set out in its governing document and the main activities undertaken for public benefit..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                value={tarForm.objectivesActivities}
                onChange={(e) => setTarForm({ ...tarForm, objectivesActivities: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                2. Achievements and Performance
              </label>
              <textarea
                rows={4}
                placeholder="Provide a summary of the main achievements of the charity during the year and qualitative indicators..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                value={tarForm.achievementsPerformance}
                onChange={(e) => setTarForm({ ...tarForm, achievementsPerformance: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                3. Financial Review & Policy on Reserves
              </label>
              <textarea
                rows={3}
                placeholder="Review of the charity's financial position at year end, policy on reserves, and principal funding sources..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                value={tarForm.financialReview}
                onChange={(e) => setTarForm({ ...tarForm, financialReview: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                4. Structure, Governance and Management
              </label>
              <textarea
                rows={3}
                placeholder="Type of governing document (e.g. CIO Foundation Constitution), how trustees are appointed or trained..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
                value={tarForm.structureGovernance}
                onChange={(e) => setTarForm({ ...tarForm, structureGovernance: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. INDEPENDENT EXAMINER'S REPORT (IER) TAB */}
      {activeTab === "ier" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Independent Examiner's Report (IER)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard statutory format under Charity Commission Directions CC31 & CC32.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Examiner Name *</label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={ierForm.examinerName}
                onChange={(e) => setIerForm({ ...ierForm, examinerName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification *</label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={ierForm.examinerQualification}
                onChange={(e) => setIerForm({ ...ierForm, examinerQualification: e.target.value })}
              >
                <option value="FCA">FCA (Fellow Chartered Accountant)</option>
                <option value="ACA">ACA (Chartered Accountant)</option>
                <option value="FCCA">FCCA (Fellow Chartered Certified Accountant)</option>
                <option value="ACCA">ACCA (Chartered Certified Accountant)</option>
                <option value="CPFA">CPFA (Chartered Public Finance Accountant)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Body *</label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={ierForm.accountingBody}
                onChange={(e) => setIerForm({ ...ierForm, accountingBody: e.target.value })}
              >
                <option value="ICAEW">ICAEW</option>
                <option value="ACCA">ACCA</option>
                <option value="CIPFA">CIPFA</option>
                <option value="CIMA">CIMA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Basis of Independent Examiner's Report</label>
            <textarea
              rows={4}
              className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed font-mono"
              value={ierForm.basisOfReport}
              onChange={(e) => setIerForm({ ...ierForm, basisOfReport: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Independent Examiner's Statement</label>
            <textarea
              rows={4}
              className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed font-mono"
              value={ierForm.examinerStatement}
              onChange={(e) => setIerForm({ ...ierForm, examinerStatement: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 5. PREVIEW PACK TAB */}
      {activeTab === "preview" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-4xl mx-auto space-y-8 print:p-0 print:border-none">
          <div className="text-center border-b-2 border-slate-900 pb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{charity?.name}</h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">Trustees' Annual Report and Accounts</p>
            <p className="text-xs text-slate-500 mt-0.5">Year ended {currentPeriod?.endDate}</p>
            <div className="flex justify-center gap-4 text-xs font-mono text-slate-600 mt-2">
              <span>Charity Registration No: <strong>{charity?.charityRegNumber || "—"}</strong></span>
              {charity?.companyRegNumber && (
                <span>Company Registration No: <strong>{charity?.companyRegNumber}</strong></span>
              )}
            </div>
          </div>

          {/* TAR Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Report of the Trustees
            </h2>
            {tarForm.objectivesActivities && (
              <div>
                <h4 className="text-xs font-bold text-slate-800">Objectives and Activities</h4>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{tarForm.objectivesActivities}</p>
              </div>
            )}
            {tarForm.achievementsPerformance && (
              <div>
                <h4 className="text-xs font-bold text-slate-800">Achievements and Performance</h4>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{tarForm.achievementsPerformance}</p>
              </div>
            )}
          </div>

          {/* Examiner Report Section */}
          {ierForm.examinerName && (
            <div className="space-y-3 border-t border-slate-200 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Independent Examiner's Report to the Trustees
              </h2>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{ierForm.basisOfReport}</p>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{ierForm.examinerStatement}</p>
              <div className="pt-2 text-xs text-slate-700 font-semibold">
                <div>Examiner: {ierForm.examinerName}, {ierForm.examinerQualification} ({ierForm.accountingBody})</div>
                <div className="text-slate-500 font-normal">Date: {ierForm.reportDate}</div>
              </div>
            </div>
          )}

          {/* Statement of Financial Activities (SoFA) Section */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Statement of Financial Activities (incorporating an income and expenditure account)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-2">Income & Expenditure</th>
                    <th className="py-2 text-right">Unrestricted (£)</th>
                    <th className="py-2 text-right">Restricted (£)</th>
                    <th className="py-2 text-right">Endowment (£)</th>
                    <th className="py-2 text-right font-bold">Total (£)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sofaData?.incomeCategories?.map((cat: any, i: number) => {
                    const u = cat.lines.reduce((s: number, l: any) => s + l.unrestricted, 0);
                    const r = cat.lines.reduce((s: number, l: any) => s + l.restricted, 0);
                    const e = cat.lines.reduce((s: number, l: any) => s + l.endowment, 0);
                    return (
                      <tr key={`prev-inc-${i}`}>
                        <td className="py-1.5 font-medium text-slate-800">{cat.name}</td>
                        <td className="py-1.5 text-right font-mono">{u.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{r.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{e.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono font-semibold">{(u + r + e).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {sofaData?.expenseCategories?.map((cat: any, i: number) => {
                    const u = cat.lines.reduce((s: number, l: any) => s + l.unrestricted, 0);
                    const r = cat.lines.reduce((s: number, l: any) => s + l.restricted, 0);
                    const e = cat.lines.reduce((s: number, l: any) => s + l.endowment, 0);
                    return (
                      <tr key={`prev-exp-${i}`}>
                        <td className="py-1.5 font-medium text-slate-800">{cat.name}</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({u.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({r.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({e.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono font-semibold text-rose-700">({(u + r + e).toFixed(2)})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Sheet Section */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                {bsData?.isFundWise ? "Fund-Wise Balance Sheet" : "Balance Sheet"}
              </h2>
              <span className="text-xs text-slate-500 font-mono">As at {currentPeriod?.endDate}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-2">Description</th>
                    {bsData?.isFundWise ? (
                      <>
                        <th className="py-2 text-right">Unrestricted (£)</th>
                        <th className="py-2 text-right">Restricted (£)</th>
                        <th className="py-2 text-right">Endowment (£)</th>
                        <th className="py-2 text-right font-bold">Total (£)</th>
                      </>
                    ) : (
                      <th className="py-2 text-right font-bold">Total Funds (£)</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="font-semibold">
                    <td className="py-1.5">Fixed Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.fixedAssets?.unrestricted.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.fixedAssets?.restricted.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.fixedAssets?.endowment.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.fixedAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="py-1.5 text-right font-mono">{bsData?.totals?.fixedAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-1.5">Current Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.currentAssets?.unrestricted.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.currentAssets?.restricted.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.currentAssets?.endowment.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-mono">{bsData?.totals?.currentAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="py-1.5 text-right font-mono">{bsData?.totals?.currentAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>
                  <tr>
                    <td className="py-1.5">Creditors: amounts falling due within one year</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="py-1.5 text-right font-mono text-rose-600">({bsData?.totals?.currentLiabilities?.unrestricted.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({bsData?.totals?.currentLiabilities?.restricted.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({bsData?.totals?.currentLiabilities?.endowment.toFixed(2)})</td>
                        <td className="py-1.5 text-right font-mono text-rose-600">({bsData?.totals?.currentLiabilities?.total.toFixed(2)})</td>
                      </>
                    ) : (
                      <td className="py-1.5 text-right font-mono text-rose-600">({bsData?.totals?.currentLiabilities?.total.toFixed(2)})</td>
                    )}
                  </tr>
                  <tr className="font-bold border-t border-slate-300">
                    <td className="py-2">Net Current Assets / (Liabilities)</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="py-2 text-right font-mono">{bsData?.totals?.netCurrentAssets?.unrestricted.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono">{bsData?.totals?.netCurrentAssets?.restricted.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono">{bsData?.totals?.netCurrentAssets?.endowment.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono">{bsData?.totals?.netCurrentAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="py-2 text-right font-mono">{bsData?.totals?.netCurrentAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>
                  <tr className="font-extrabold text-slate-900 border-t-2 border-b-2 border-slate-400">
                    <td className="py-2.5 uppercase">Total Net Assets</td>
                    {bsData?.isFundWise ? (
                      <>
                        <td className="py-2.5 text-right font-mono">{bsData?.totals?.netAssets?.unrestricted.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono">{bsData?.totals?.netAssets?.restricted.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono">{bsData?.totals?.netAssets?.endowment.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono">{bsData?.totals?.netAssets?.total.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="py-2.5 text-right font-mono">{bsData?.totals?.netAssets?.total.toFixed(2)}</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Disclosures & Notes Section */}
          {disclosuresData.filter((d: any) => d.isActive).length > 0 && (
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Notes to the Financial Statements
              </h2>
              <div className="space-y-4">
                {disclosuresData
                  .filter((d: any) => d.isActive)
                  .map((note: any, i: number) => (
                    <div key={`note-prev-${i}`} className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-900">{note.title}</h3>
                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed pl-2 border-l-2 border-slate-200">
                        {note.content}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
