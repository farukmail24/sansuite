import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileText, Save, RefreshCw, Plus, Trash2,
  Building2, Users, Layers, Shield, HelpCircle,
  Calculator, CheckCircle2
} from "lucide-react";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

interface AssetRow {
  category: string;
  costStart: number;
  costAdditions: number;
  costDisposals: number;
  depnStart: number;
  depnCharge: number;
  depnDisposals: number;
}

interface DirectorAdvanceRow {
  directorName: string;
  description: string;
  openingBalance: number;
  advances: number;
  repayments: number;
  interestRate: string;
}

const DEFAULT_ASSET_CATEGORIES = [
  "Plant and Machinery",
  "Fixtures and Fittings",
  "Motor Vehicles",
  "Computer Equipment",
  "Freehold Land and Buildings",
];

export default function StatutoryNotesPage() {
  return (
    <ClientWorkspaceLayout activeSection="Statutory Notes">
      <StatutoryNotesContent />
    </ClientWorkspaceLayout>
  );
}

function StatutoryNotesContent() {
  const { clientId, currentPeriod, selectedPeriodId } = useClientWorkspace();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"employees" | "assets" | "debtors" | "creditors" | "loans" | "capital">("assets");

  // 1. Employees
  const [averageEmployees, setAverageEmployees] = useState(1);

  // 2. Tangible Fixed Assets Movement Schedule
  const [assetRows, setAssetRows] = useState<AssetRow[]>(
    DEFAULT_ASSET_CATEGORIES.map((cat) => ({
      category: cat,
      costStart: 0,
      costAdditions: 0,
      costDisposals: 0,
      depnStart: 0,
      depnCharge: 0,
      depnDisposals: 0,
    }))
  );

  // 3. Debtors Breakdown
  const [debtors, setDebtors] = useState({
    tradeDebtors: 0,
    otherDebtors: 0,
    prepayments: 0,
  });

  // 4. Creditors Due Within 1 Year
  const [creditorsWithinYear, setCreditorsWithinYear] = useState({
    tradeCreditors: 0,
    bankOverdrafts: 0,
    corporationTax: 0,
    otherTaxesAndPaye: 0,
    accrualsAndDeferredIncome: 0,
    directorsCurrentAccount: 0,
  });

  // Creditors Due After 1 Year
  const [creditorsAfterYear, setCreditorsAfterYear] = useState({
    bankLoans: 0,
    hirePurchaseAgreements: 0,
    otherLongTermCreditors: 0,
  });

  // 5. Directors Advances (s413)
  const [directorAdvances, setDirectorAdvances] = useState<DirectorAdvanceRow[]>([]);

  // 6. Share Capital
  const [shareCapital, setShareCapital] = useState({
    shareClass: "Ordinary Shares of £1.00 each",
    numberOfShares: 100,
    nominalValue: 1.0,
    allottedPaidAmount: 100,
  });
  const [multiShares, setMultiShares] = useState<any[]>([]);

  // 7. Contingent & Post Balance Sheet
  const [contingentLiabilities, setContingentLiabilities] = useState("");
  const [postBalanceSheetEvents, setPostBalanceSheetEvents] = useState("");

  const { data: statutoryNotes, isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/notes/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/notes/${selectedPeriodId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  useEffect(() => {
    if (statutoryNotes) {
      if (statutoryNotes.averageEmployees !== undefined) {
        setAverageEmployees(statutoryNotes.averageEmployees ?? 1);
      }

      if (statutoryNotes.tangibleAssetsScheduleJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.tangibleAssetsScheduleJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssetRows(parsed);
          } else if (parsed.categories && Array.isArray(parsed.categories)) {
            setAssetRows(parsed.categories);
          } else if (parsed.cost !== undefined) {
            // Legacy single object format fallback
            const cost = parseFloat(parsed.cost) || 0;
            const depn = parseFloat(parsed.depreciation) || 0;
            setAssetRows([
              { category: "Plant and Machinery", costStart: cost, costAdditions: 0, costDisposals: 0, depnStart: depn, depnCharge: 0, depnDisposals: 0 },
              { category: "Fixtures and Fittings", costStart: 0, costAdditions: 0, costDisposals: 0, depnStart: 0, depnCharge: 0, depnDisposals: 0 },
              { category: "Motor Vehicles", costStart: 0, costAdditions: 0, costDisposals: 0, depnStart: 0, depnCharge: 0, depnDisposals: 0 },
              { category: "Computer Equipment", costStart: 0, costAdditions: 0, costDisposals: 0, depnStart: 0, depnCharge: 0, depnDisposals: 0 },
              { category: "Freehold Land and Buildings", costStart: 0, costAdditions: 0, costDisposals: 0, depnStart: 0, depnCharge: 0, depnDisposals: 0 },
            ]);
          }
        } catch { }
      }

      if (statutoryNotes.debtorsBreakdownJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.debtorsBreakdownJson);
          setDebtors({
            tradeDebtors: parseFloat(parsed.tradeDebtors || parsed.trade || 0),
            otherDebtors: parseFloat(parsed.otherDebtors || parsed.other || 0),
            prepayments: parseFloat(parsed.prepayments || 0),
          });
        } catch { }
      }

      if (statutoryNotes.creditorsDueWithinOneYearJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.creditorsDueWithinOneYearJson);
          setCreditorsWithinYear({
            tradeCreditors: parseFloat(parsed.tradeCreditors || parsed.trade || 0),
            bankOverdrafts: parseFloat(parsed.bankOverdrafts || parsed.bank || 0),
            corporationTax: parseFloat(parsed.corporationTax || parsed.tax || 0),
            otherTaxesAndPaye: parseFloat(parsed.otherTaxesAndPaye || parsed.paye || 0),
            accrualsAndDeferredIncome: parseFloat(parsed.accrualsAndDeferredIncome || parsed.accruals || 0),
            directorsCurrentAccount: parseFloat(parsed.directorsCurrentAccount || parsed.directorsLoan || 0),
          });
        } catch { }
      }

      if (statutoryNotes.creditorsDueAfterOneYearJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.creditorsDueAfterOneYearJson);
          setCreditorsAfterYear({
            bankLoans: parseFloat(parsed.bankLoans || 0),
            hirePurchaseAgreements: parseFloat(parsed.hirePurchaseAgreements || 0),
            otherLongTermCreditors: parseFloat(parsed.otherLongTermCreditors || 0),
          });
        } catch { }
      }

      if (statutoryNotes.directorsAdvancesJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.directorsAdvancesJson);
          if (Array.isArray(parsed)) {
            setDirectorAdvances(parsed);
          }
        } catch { }
      }

      if (statutoryNotes.shareCapitalDetailsJson) {
        try {
          const parsed = JSON.parse(statutoryNotes.shareCapitalDetailsJson);
          if (parsed.shares && Array.isArray(parsed.shares) && parsed.shares.length > 0) {
            setMultiShares(parsed.shares);
          }
          setShareCapital({
            shareClass: parsed.shareClass || parsed.shares?.[0]?.shareClass || "Ordinary Shares of £1.00 each",
            numberOfShares: parseInt(parsed.numberOfShares || parsed.shares?.[0]?.numberOfShares) || 100,
            nominalValue: parseFloat(parsed.nominalValue || parsed.shares?.[0]?.nominalValue) || 1.0,
            allottedPaidAmount: parseFloat(parsed.allottedPaidAmount || parsed.allotted || parsed.shares?.[0]?.totalPaidUp) || 100,
          });
        } catch { }
      }

      if (statutoryNotes.contingentLiabilitiesText) {
        setContingentLiabilities(statutoryNotes.contingentLiabilitiesText);
      }
      if (statutoryNotes.postBalanceSheetEventsText) {
        setPostBalanceSheetEvents(statutoryNotes.postBalanceSheetEventsText);
      }
    }
  }, [statutoryNotes]);

  const saveNotesMutation = useMutation({
    mutationFn: async (options?: { continueToNext?: boolean }) => {
      if (!selectedPeriodId) return;
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/notes/${selectedPeriodId}`, {
        averageEmployees,
        tangibleAssetsScheduleJson: JSON.stringify(assetRows),
        debtorsBreakdownJson: JSON.stringify(debtors),
        creditorsDueWithinOneYearJson: JSON.stringify(creditorsWithinYear),
        creditorsDueAfterOneYearJson: JSON.stringify(creditorsAfterYear),
        directorsAdvancesJson: JSON.stringify(directorAdvances),
        shareCapitalDetailsJson: JSON.stringify(shareCapital),
        contingentLiabilitiesText: contingentLiabilities,
        postBalanceSheetEventsText: postBalanceSheetEvents,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save notes.");
      }
      return { data: await res.json(), continueToNext: options?.continueToNext };
    },
    onSuccess: (result: any) => {
      toast({ title: "Statutory Notes Saved", description: "Disclosures updated for accounting period." });
      refetch();
      if (result?.continueToNext) {
        setLocation(`/accounts-production/${clientId}/statements`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to save notes.", variant: "destructive" });
    }
  });

  const handleAssetChange = (index: number, field: keyof AssetRow, value: number) => {
    setAssetRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: isNaN(value) ? 0 : value };
      return copy;
    });
  };

  const handleAddDirectorAdvance = () => {
    setDirectorAdvances((prev) => [
      ...prev,
      {
        directorName: "",
        description: "Director loan for company expenses",
        openingBalance: 0,
        advances: 0,
        repayments: 0,
        interestRate: "0.00%",
      }
    ]);
  };

  const handleRemoveDirectorAdvance = (idx: number) => {
    setDirectorAdvances((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDirectorAdvanceChange = (idx: number, field: keyof DirectorAdvanceRow, value: any) => {
    setDirectorAdvances((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Calculations for Tangible Assets Summary
  const totalCostStart = assetRows.reduce((acc, r) => acc + (r.costStart || 0), 0);
  const totalCostAdditions = assetRows.reduce((acc, r) => acc + (r.costAdditions || 0), 0);
  const totalCostDisposals = assetRows.reduce((acc, r) => acc + (r.costDisposals || 0), 0);
  const totalCostEnd = totalCostStart + totalCostAdditions - totalCostDisposals;

  const totalDepnStart = assetRows.reduce((acc, r) => acc + (r.depnStart || 0), 0);
  const totalDepnCharge = assetRows.reduce((acc, r) => acc + (r.depnCharge || 0), 0);
  const totalDepnDisposals = assetRows.reduce((acc, r) => acc + (r.depnDisposals || 0), 0);
  const totalDepnEnd = totalDepnStart + totalDepnCharge - totalDepnDisposals;

  const totalNbvEnd = totalCostEnd - totalDepnEnd;
  const totalNbvStart = totalCostStart - totalDepnStart;

  // Total Debtors & Creditors
  const totalDebtors = debtors.tradeDebtors + debtors.otherDebtors + debtors.prepayments;
  const totalCreditorsWithinYear = Object.values(creditorsWithinYear).reduce((a, b) => a + (b || 0), 0);
  const totalCreditorsAfterYear = Object.values(creditorsAfterYear).reduce((a, b) => a + (b || 0), 0);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <RefreshCw size={24} className="animate-spin text-indigo-600" />
        <span>Loading statutory disclosure schedules...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" />
            Statutory Disclosure Notes (UK Companies Act 2006 & FRS 102/105)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Mandatory disclosure schedules for {currentPeriod?.periodName || "Selected Period"}. Data populates statutory notes and iXBRL accounts.
          </p>
        </div>
        <button
          onClick={() => saveNotesMutation.mutate({ continueToNext: false })}
          disabled={saveNotesMutation.isPending || !selectedPeriodId}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Save size={14} /> {saveNotesMutation.isPending ? "Saving Schedules..." : "Save All Notes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "assets"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 size={13} /> Tangible Assets Schedule (£{totalNbvEnd.toLocaleString("en-GB", { minimumFractionDigits: 2 })})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "employees"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users size={13} /> Employees ({averageEmployees})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("debtors")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "debtors"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers size={13} /> Debtors (£{totalDebtors.toLocaleString("en-GB", { minimumFractionDigits: 2 })})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("creditors")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "creditors"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Shield size={13} /> Creditors (£{(totalCreditorsWithinYear + totalCreditorsAfterYear).toLocaleString("en-GB", { minimumFractionDigits: 2 })})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "loans"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calculator size={13} /> Director Loans (s413) ({directorAdvances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("capital")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "capital"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CheckCircle2 size={13} /> Share Capital (£{shareCapital.allottedPaidAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })})
        </button>
      </div>

      {/* Tab Content: 1. Tangible Assets Schedule */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Tangible Fixed Assets Movement Matrix (Companies Act 2006 Sch 1)
              </h3>
              <p className="text-[11px] text-slate-500">
                Record cost and depreciation movements across each asset category. Net Book Value is automatically computed.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-3">Asset Class</th>
                  <th className="py-2 px-2 text-right">Cost Start (£)</th>
                  <th className="py-2 px-2 text-right">Additions (£)</th>
                  <th className="py-2 px-2 text-right">Disposals (£)</th>
                  <th className="py-2 px-2 text-right bg-slate-200/50 dark:bg-slate-700/50">Cost End (£)</th>
                  <th className="py-2 px-2 text-right">Depn Start (£)</th>
                  <th className="py-2 px-2 text-right">Charge Yr (£)</th>
                  <th className="py-2 px-2 text-right">Depn Disp (£)</th>
                  <th className="py-2 px-2 text-right bg-slate-200/50 dark:bg-slate-700/50">Depn End (£)</th>
                  <th className="py-2 px-3 text-right bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">NBV End (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {assetRows.map((row, idx) => {
                  const costEnd = (row.costStart || 0) + (row.costAdditions || 0) - (row.costDisposals || 0);
                  const depnEnd = (row.depnStart || 0) + (row.depnCharge || 0) - (row.depnDisposals || 0);
                  const nbvEnd = costEnd - depnEnd;

                  return (
                    <tr key={row.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {row.category}
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.costStart || ""}
                          onChange={(e) => handleAssetChange(idx, "costStart", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.costAdditions || ""}
                          onChange={(e) => handleAssetChange(idx, "costAdditions", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.costDisposals || ""}
                          onChange={(e) => handleAssetChange(idx, "costDisposals", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-medium bg-slate-100/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200">
                        {costEnd.toFixed(2)}
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.depnStart || ""}
                          onChange={(e) => handleAssetChange(idx, "depnStart", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.depnCharge || ""}
                          onChange={(e) => handleAssetChange(idx, "depnCharge", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-1 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.depnDisposals || ""}
                          onChange={(e) => handleAssetChange(idx, "depnDisposals", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="w-20 px-1.5 py-1 text-right text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-medium bg-slate-100/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200">
                        {depnEnd.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                        £{nbvEnd.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                  <td className="py-2 px-3">Total Tangible Assets</td>
                  <td className="py-2 px-2 text-right">{totalCostStart.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{totalCostAdditions.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{totalCostDisposals.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right bg-slate-200/60 dark:bg-slate-700/60">{totalCostEnd.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{totalDepnStart.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{totalDepnCharge.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{totalDepnDisposals.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right bg-slate-200/60 dark:bg-slate-700/60">{totalDepnEnd.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold">
                    £{totalNbvEnd.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: 2. Employees */}
      {activeTab === "employees" && (
        <div className="max-w-xl space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              Note 1: Average Number of Employees (Companies Act 2006 s411)
            </h3>
            <p className="text-[11px] text-slate-500">
              The average monthly number of persons employed by the company (including directors) during the accounting period:
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Average Employee Count
              </label>
              <input
                type="number"
                min={0}
                value={averageEmployees}
                onChange={(e) => setAverageEmployees(parseInt(e.target.value) || 0)}
                className="w-48 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Under FRS 102 Section 1A / FRS 105, disclosure of the average number of employees during the financial year is a mandatory statutory filing note.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content: 3. Debtors */}
      {activeTab === "debtors" && (
        <div className="max-w-xl space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              Debtors Breakdown Note
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Trade Debtors (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={debtors.tradeDebtors || ""}
                  onChange={(e) => setDebtors({ ...debtors, tradeDebtors: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Other Debtors (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={debtors.otherDebtors || ""}
                  onChange={(e) => setDebtors({ ...debtors, otherDebtors: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Prepayments & Accrued Income (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={debtors.prepayments || ""}
                  onChange={(e) => setDebtors({ ...debtors, prepayments: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-xs">
                <span>Total Debtors:</span>
                <span className="text-indigo-600">£{totalDebtors.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: 4. Creditors */}
      {activeTab === "creditors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Within 1 Year */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Shield size={14} className="text-indigo-600" />
              Creditors: Falling Due Within One Year
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Trade Creditors (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.tradeCreditors || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, tradeCreditors: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Bank Overdrafts / Loans (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.bankOverdrafts || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, bankOverdrafts: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Corporation Tax Payable (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.corporationTax || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, corporationTax: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">PAYE, NIC & VAT (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.otherTaxesAndPaye || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, otherTaxesAndPaye: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Accruals & Deferred Income (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.accrualsAndDeferredIncome || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, accrualsAndDeferredIncome: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Directors Loan Account (Credit) (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsWithinYear.directorsCurrentAccount || ""}
                  onChange={(e) => setCreditorsWithinYear({ ...creditorsWithinYear, directorsCurrentAccount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-xs">
                <span>Total Due Within 1 Yr:</span>
                <span className="text-indigo-600">£{totalCreditorsWithinYear.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* After 1 Year */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Shield size={14} className="text-indigo-600" />
              Creditors: Falling Due After More Than One Year
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Bank Loans & Mortgages (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsAfterYear.bankLoans || ""}
                  onChange={(e) => setCreditorsAfterYear({ ...creditorsAfterYear, bankLoans: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Hire Purchase & Finance Leases (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsAfterYear.hirePurchaseAgreements || ""}
                  onChange={(e) => setCreditorsAfterYear({ ...creditorsAfterYear, hirePurchaseAgreements: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400">Other Long Term Creditors (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditorsAfterYear.otherLongTermCreditors || ""}
                  onChange={(e) => setCreditorsAfterYear({ ...creditorsAfterYear, otherLongTermCreditors: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-xs">
                <span>Total Due After 1 Yr:</span>
                <span className="text-indigo-600">£{totalCreditorsAfterYear.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: 5. Directors Advances (s413) */}
      {activeTab === "loans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Calculator size={14} className="text-indigo-600" />
                Directors' Advances, Credits and Guarantees (Section 413 Companies Act 2006)
              </h3>
              <p className="text-[11px] text-slate-500">
                Statutory disclosure of loans made to directors during the year, repayments, and closing balances.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDirectorAdvance}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={13} /> Add Director Loan Disclosure
            </button>
          </div>

          {directorAdvances.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <p className="text-xs text-slate-500">No director loans or advances recorded for this accounting period.</p>
              <button
                type="button"
                onClick={handleAddDirectorAdvance}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
              >
                <Plus size={12} /> Add Loan Disclosure
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {directorAdvances.map((adv, idx) => {
                const closing = (adv.openingBalance || 0) + (adv.advances || 0) - (adv.repayments || 0);
                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Director:</label>
                        <input
                          type="text"
                          value={adv.directorName}
                          onChange={(e) => handleDirectorAdvanceChange(idx, "directorName", e.target.value)}
                          placeholder="e.g. John Smith"
                          className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDirectorAdvance(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        title="Delete this disclosure"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Opening Balance (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adv.openingBalance || ""}
                          onChange={(e) => handleDirectorAdvanceChange(idx, "openingBalance", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Advances Made (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adv.advances || ""}
                          onChange={(e) => handleDirectorAdvanceChange(idx, "advances", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Repayments (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adv.repayments || ""}
                          onChange={(e) => handleDirectorAdvanceChange(idx, "repayments", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Interest Rate (%)</label>
                        <input
                          type="text"
                          value={adv.interestRate}
                          onChange={(e) => handleDirectorAdvanceChange(idx, "interestRate", e.target.value)}
                          placeholder="0.00%"
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded flex flex-col justify-center">
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">Closing Balance:</span>
                        <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">£{closing.toFixed(2)}</span>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={adv.description}
                        onChange={(e) => handleDirectorAdvanceChange(idx, "description", e.target.value)}
                        placeholder="Description of transaction (e.g. Unsecured, repayable on demand)"
                        className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: 6. Share Capital */}
      {activeTab === "capital" && (
        <div className="max-w-2xl space-y-4">
          {multiShares && multiShares.length > 0 && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Multi-Class Share Capital Ledger ({multiShares.length} {multiShares.length === 1 ? "Class" : "Classes"})
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Configured in Accounts Production Settings under Companies Act 2006.
                  </p>
                </div>
                <Link
                  href={`/accounts-production/${clientId}/settings`}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  Manage Multi-Class Shares
                </Link>
              </div>

              <div className="overflow-x-auto border border-indigo-100 dark:border-indigo-900/60 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-indigo-100 dark:border-indigo-900/60 font-semibold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-1.5 px-2.5 text-left">Class &amp; Type</th>
                      <th className="py-1.5 px-2 text-right">Nominal (£)</th>
                      <th className="py-1.5 px-2 text-right">Allotted</th>
                      <th className="py-1.5 px-2.5 text-right">Paid Up (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {multiShares.map((s: any, idx: number) => {
                      const all = Number(s.allottedShares || s.numberOfShares || 0);
                      const paid = Number(s.totalPaidUp) || (all * Number(s.nominalValue || 1));
                      return (
                        <tr key={idx}>
                          <td className="py-1.5 px-2.5 font-sans font-medium text-slate-900 dark:text-slate-100">
                            {s.shareClass} <span className="text-[10px] text-slate-500 uppercase">({s.shareType || "Equity"})</span>
                          </td>
                          <td className="py-1.5 px-2 text-right">£{Number(s.nominalValue || 1).toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-right">{all.toLocaleString()}</td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                            £{paid.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50 dark:bg-slate-800/80 font-sans border-t border-indigo-200 dark:border-indigo-800">
                      <td className="py-1.5 px-2.5" colSpan={3}>Total Called Up Capital:</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-indigo-900 dark:text-indigo-200">
                        £{multiShares.reduce((sum: number, s: any) => sum + (Number(s.totalPaidUp) || (Number(s.allottedShares || s.numberOfShares || 0) * Number(s.nominalValue || 1))), 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-indigo-600" />
              {multiShares.length > 1 ? "Primary Share Class Quick Override" : "Called Up Share Capital Note"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Share Class Description
                </label>
                <input
                  type="text"
                  value={shareCapital.shareClass}
                  onChange={(e) => setShareCapital({ ...shareCapital, shareClass: e.target.value })}
                  placeholder="e.g. Ordinary Shares of £1.00 each"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Number of Shares Allotted
                  </label>
                  <input
                    type="number"
                    value={shareCapital.numberOfShares}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 0;
                      setShareCapital({
                        ...shareCapital,
                        numberOfShares: num,
                        allottedPaidAmount: num * shareCapital.nominalValue,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Value (£ each)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shareCapital.nominalValue}
                    onChange={(e) => {
                      const nom = parseFloat(e.target.value) || 0;
                      setShareCapital({
                        ...shareCapital,
                        nominalValue: nom,
                        allottedPaidAmount: shareCapital.numberOfShares * nom,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Total Allotted, Called Up and Fully Paid (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={shareCapital.allottedPaidAmount}
                  onChange={(e) => setShareCapital({ ...shareCapital, allottedPaidAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="disclosures"
        statusNotice="Statutory Disclosures & Notes Configured"
        onNextAction={() => saveNotesMutation.mutate({ continueToNext: true })}
        nextActionLabel={saveNotesMutation.isPending ? "Saving..." : "Save Notes & Continue to Statements"}
        nextActionDisabled={saveNotesMutation.isPending}
      />
    </div>
  );
}

