import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Layers, Plus, Trash2, Save, Calculator, RefreshCw,
  Building2, Briefcase, Home, TrendingUp, Globe, CheckCircle2, AlertCircle,
  Users, Link2, ExternalLink, FileText, Info, HelpCircle, Shield
} from "lucide-react";

type ScheduleTab = "employment" | "selfEmployment" | "partnership" | "property" | "capitalGains" | "foreign";

export default function SASchedulesPage() {
  return (
    <SAWorkspaceLayout activeSection="Supplementary Schedules">
      <SASchedulesContent />
    </SAWorkspaceLayout>
  );
}

function SASchedulesContent() {
  const { clientId, client, currentReturn, selectedTaxYear, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ScheduleTab>("employment");

  // Schedule Records
  const [employments, setEmployments] = useState<any[]>([]);
  const [selfEmployments, setSelfEmployments] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [capitalGainsAssets, setCapitalGainsAssets] = useState<any[]>([]);
  const [foreignItems, setForeignItems] = useState<any[]>([]);
  const [cgtBox54Notes, setCgtBox54Notes] = useState("");
  const [cgtHasAttachment, setCgtHasAttachment] = useState(false);
  const [selectedPartnershipToLink, setSelectedPartnershipToLink] = useState("");

  // Fetch Available SA800 Partnerships for 1-Click Link
  const { data: availablePartnerships = [] } = useQuery<any[]>({
    queryKey: [`/api/self-assessment/partnerships/available/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/self-assessment/partnerships/available/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Load existing schedules from currentReturn
  useEffect(() => {
    if (currentReturn?.schedulesData) {
      try {
        const parsed = typeof currentReturn.schedulesData === "string"
          ? JSON.parse(currentReturn.schedulesData)
          : currentReturn.schedulesData;
        if (parsed.employments) setEmployments(parsed.employments);
        if (parsed.selfEmployments) setSelfEmployments(parsed.selfEmployments);
        if (parsed.partnerships) setPartnerships(parsed.partnerships);
        if (parsed.properties) setProperties(parsed.properties);
        if (parsed.capitalGainsAssets) setCapitalGainsAssets(parsed.capitalGainsAssets);
        if (parsed.foreignItems) setForeignItems(parsed.foreignItems);
        if (parsed.cgtBox54Notes) setCgtBox54Notes(parsed.cgtBox54Notes);
        if (parsed.cgtHasAttachment !== undefined) setCgtHasAttachment(parsed.cgtHasAttachment);
      } catch {}
    } else {
      // Default initial states if return exists with figures
      if (currentReturn?.employmentIncome && parseFloat(currentReturn.employmentIncome) > 0 && employments.length === 0) {
        setEmployments([{
          id: 1,
          employerName: "Primary Employer",
          payeReference: "120/AB12345",
          grossPay: currentReturn.employmentIncome,
          taxDeducted: currentReturn.employmentTaxDeducted || "0.00",
          benefitsInKind: "0.00",
          flatRateExpenses: "0.00",
        }]);
      }
      if (currentReturn?.selfEmploymentProfit && parseFloat(currentReturn.selfEmploymentProfit) > 0 && selfEmployments.length === 0) {
        setSelfEmployments([{
          id: 1,
          businessName: client?.clientName + " (Trading)",
          turnover: currentReturn.selfEmploymentProfit,
          allowableExpenses: "0.00",
          capitalAllowancesClaimed: currentReturn.capitalAllowancesClaimed || "0.00",
          netProfit: currentReturn.selfEmploymentProfit,
        }]);
      }
      if (currentReturn?.propertyIncome && parseFloat(currentReturn.propertyIncome) > 0 && properties.length === 0) {
        setProperties([{
          id: 1,
          propertyAddress: "Rental Property 1",
          rentalIncome: currentReturn.propertyIncome,
          allowableExpenses: "0.00",
          residentialFinanceCosts: currentReturn.financeCostsRelief ? (parseFloat(currentReturn.financeCostsRelief) * 5).toFixed(2) : "0.00",
          netProfit: currentReturn.propertyIncome,
        }]);
      }
    }
  }, [currentReturn]);

  // Aggregated totals
  const totalEmploymentIncome = employments.reduce((sum, e) => sum + parseFloat(e.grossPay || "0"), 0);
  const totalEmploymentTax = employments.reduce((sum, e) => sum + parseFloat(e.taxDeducted || "0"), 0);
  const totalSelfEmploymentProfit = selfEmployments.reduce((sum, s) => sum + parseFloat(s.netProfit || "0"), 0);
  const totalPartnershipProfit = partnerships.reduce((sum, p) => sum + parseFloat(p.profitShare || "0"), 0);
  const totalPropertyIncome = properties.reduce((sum, p) => sum + parseFloat(p.netProfit || "0"), 0);
  const totalFinanceCosts = properties.reduce((sum, p) => sum + parseFloat(p.residentialFinanceCosts || "0"), 0);
  const totalCapitalGainsNet = capitalGainsAssets.reduce((sum, c) => sum + parseFloat(c.netGain || "0"), 0);
  const totalForeignIncome = foreignItems.reduce((sum, f) => sum + parseFloat(f.grossIncome || "0"), 0);

  // 1-Click Link SA800 Partner Share Handler
  const handleLinkSA800 = (selectedId: string) => {
    if (!selectedId) return;
    const found = availablePartnerships.find((p) => String(p.partnershipClientId) === selectedId);
    if (!found) return;

    const latestRet = found.returns && found.returns.length > 0 ? found.returns[0] : null;
    const tradingProfit = latestRet ? parseFloat(latestRet.netProfit || latestRet.tradingProfit || "0") : 0;
    // Assume 50% default share if not set, or full share
    const defaultSharePercent = 50;
    const allocatedShare = ((tradingProfit * defaultSharePercent) / 100).toFixed(2);

    const newPartnerRecord = {
      id: Date.now(),
      partnershipName: found.partnershipName,
      partnershipUtr: found.utrNumber || client?.utrNumber || "",
      partnershipDescription: `Allocated Share from ${found.partnershipName} (${latestRet?.taxYear || selectedTaxYear})`,
      sharePercentage: String(defaultSharePercent),
      totalPartnershipProfit: tradingProfit.toFixed(2),
      profitShare: allocatedShare,
      propertyShare: "0.00",
      interestShare: "0.00",
      sourceSa800Id: latestRet?.id || null,
    };

    setPartnerships([...partnerships, newPartnerRecord]);
    toast({
      title: "SA800 Partnership Linked",
      description: `Imported allocated share of £${allocatedShare} (${defaultSharePercent}%) from ${found.partnershipName}.`,
      type: "success",
    });
  };

  const saveSchedulesMutation = useMutation({
    mutationFn: async () => {
      const schedulesData = {
        employments,
        selfEmployments,
        partnerships,
        properties,
        capitalGainsAssets,
        foreignItems,
        cgtBox54Notes,
        cgtHasAttachment,
        partnershipProfit: totalPartnershipProfit.toFixed(2),
      };

      // 1. Save schedules payload and update main return numbers
      const payload = {
        id: currentReturn?.id,
        taxYear: selectedTaxYear,
        utrNumber: currentReturn?.utrNumber || client?.utrNumber || "",
        niNumber: currentReturn?.niNumber || client?.niNumber || "",
        employmentIncome: totalEmploymentIncome.toFixed(2),
        employmentTaxDeducted: totalEmploymentTax.toFixed(2),
        selfEmploymentProfit: totalSelfEmploymentProfit.toFixed(2),
        partnershipProfit: totalPartnershipProfit.toFixed(2),
        propertyIncome: totalPropertyIncome.toFixed(2),
        capitalGainsNet: totalCapitalGainsNet.toFixed(2),
        foreignIncome: totalForeignIncome.toFixed(2),
        financeCostsRelief: totalFinanceCosts.toFixed(2),
        // Preserve other income
        savingsInterest: currentReturn?.savingsInterest || "0.00",
        dividendIncome: currentReturn?.dividendIncome || "0.00",
        pensionIncome: currentReturn?.pensionIncome || "0.00",
        otherIncome: currentReturn?.otherIncome || "0.00",
        pensionContributions: currentReturn?.pensionContributions || "0.00",
        giftAidDonations: currentReturn?.giftAidDonations || "0.00",
        tradingLossesRelieved: currentReturn?.tradingLossesRelieved || "0.00",
        taxPaidAtSource: totalEmploymentTax.toFixed(2),
        schedulesData,
      };

      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save schedules" }));
        throw new Error(err.error || "Failed to save schedules");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedules Saved & Recalculated",
        description: "All supplementary figures incorporated into SA302 calculation.",
        type: "success",
      });
      refetchReturns();
      queryClient.invalidateQueries({ queryKey: [`/api/self-assessment/${clientId}/returns`] });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, type: "error" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header and Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers size={16} className="text-purple-600" />
            Supplementary Schedules (SA102, SA103, SA104, SA105, SA108, SA106)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Record detailed employments, sole trader profits, partnership shares, rental properties, and capital gains.
          </p>
        </div>

        <button
          onClick={() => saveSchedulesMutation.mutate()}
          disabled={saveSchedulesMutation.isPending}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {saveSchedulesMutation.isPending ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={13} />
              Save Schedules & Recalculate
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("employment")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "employment"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Briefcase size={13} />
          SA102 Employment ({employments.length})
        </button>

        <button
          onClick={() => setActiveTab("selfEmployment")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "selfEmployment"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 size={13} />
          SA103 Sole Trader ({selfEmployments.length})
        </button>

        <button
          onClick={() => setActiveTab("partnership")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "partnership"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users size={13} />
          SA104 Partnership ({partnerships.length})
        </button>

        <button
          onClick={() => setActiveTab("property")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "property"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Home size={13} />
          SA105 UK Property ({properties.length})
        </button>

        <button
          onClick={() => setActiveTab("capitalGains")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "capitalGains"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <TrendingUp size={13} />
          SA108 Capital Gains ({capitalGainsAssets.length})
        </button>

        <button
          onClick={() => setActiveTab("foreign")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "foreign"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Globe size={13} />
          SA106 Foreign ({foreignItems.length})
        </button>
      </div>

      {/* TAB 1: SA102 EMPLOYMENT */}
      {activeTab === "employment" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                SA102 Employment Records (P60 / P45 / P11D)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Gross Pay: £{totalEmploymentIncome.toFixed(2)} | Tax Deducted: £{totalEmploymentTax.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setEmployments([
                  ...employments,
                  {
                    id: Date.now(),
                    employerName: "",
                    payeReference: "",
                    grossPay: "0.00",
                    taxDeducted: "0.00",
                    benefitsInKind: "0.00",
                    flatRateExpenses: "0.00",
                  },
                ]);
              }}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Add Employer
            </button>
          </div>

          {employments.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              No employments recorded for this return. Click "+ Add Employer" to enter P60 / P45 figures.
            </div>
          ) : (
            <div className="space-y-4">
              {employments.map((emp, index) => (
                <div key={emp.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Employer #{index + 1}
                    </span>
                    <button
                      onClick={() => setEmployments(employments.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Employer Name</label>
                      <input
                        type="text"
                        value={emp.employerName}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].employerName = e.target.value;
                          setEmployments(updated);
                        }}
                        placeholder="Company Ltd"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">PAYE Reference</label>
                      <input
                        type="text"
                        value={emp.payeReference}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].payeReference = e.target.value;
                          setEmployments(updated);
                        }}
                        placeholder="120/AB12345"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Gross Pay (P60 Box 1)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emp.grossPay}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].grossPay = e.target.value;
                          setEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Tax Deducted (PAYE)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emp.taxDeducted}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].taxDeducted = e.target.value;
                          setEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">P11D Benefits in Kind</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emp.benefitsInKind}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].benefitsInKind = e.target.value;
                          setEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Flat Rate Expenses (Box 18)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emp.flatRateExpenses}
                        onChange={(e) => {
                          const updated = [...employments];
                          updated[index].flatRateExpenses = e.target.value;
                          setEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SA103 SOLE TRADER */}
      {activeTab === "selfEmployment" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                SA103 Self-Employment / Sole Trader Businesses
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Net Trading Profit: £{totalSelfEmploymentProfit.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setSelfEmployments([
                  ...selfEmployments,
                  {
                    id: Date.now(),
                    businessName: "",
                    turnover: "0.00",
                    allowableExpenses: "0.00",
                    capitalAllowancesClaimed: "0.00",
                    overlapReliefUsed: "0.00",
                    netProfit: "0.00",
                  },
                ]);
              }}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Add Sole Trader Business
            </button>
          </div>

          {selfEmployments.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              No sole trader businesses added. Click "+ Add Sole Trader Business" to record trading accounts.
            </div>
          ) : (
            <div className="space-y-4">
              {selfEmployments.map((biz, index) => (
                <div key={biz.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Business #{index + 1}
                    </span>
                    <button
                      onClick={() => setSelfEmployments(selfEmployments.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Business Name / Description</label>
                      <input
                        type="text"
                        value={biz.businessName}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].businessName = e.target.value;
                          setSelfEmployments(updated);
                        }}
                        placeholder="John Doe Consulting"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Turnover (Gross Sales)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={biz.turnover}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].turnover = e.target.value;
                          const t = parseFloat(e.target.value || "0");
                          const exp = parseFloat(updated[index].allowableExpenses || "0");
                          const ca = parseFloat(updated[index].capitalAllowancesClaimed || "0");
                          updated[index].netProfit = Math.max(0, t - exp - ca).toFixed(2);
                          setSelfEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Allowable Expenses</label>
                      <input
                        type="number"
                        step="0.01"
                        value={biz.allowableExpenses}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].allowableExpenses = e.target.value;
                          const t = parseFloat(updated[index].turnover || "0");
                          const exp = parseFloat(e.target.value || "0");
                          const ca = parseFloat(updated[index].capitalAllowancesClaimed || "0");
                          updated[index].netProfit = Math.max(0, t - exp - ca).toFixed(2);
                          setSelfEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Capital Allowances Claimed</label>
                      <input
                        type="number"
                        step="0.01"
                        value={biz.capitalAllowancesClaimed}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].capitalAllowancesClaimed = e.target.value;
                          const t = parseFloat(updated[index].turnover || "0");
                          const exp = parseFloat(updated[index].allowableExpenses || "0");
                          const ca = parseFloat(e.target.value || "0");
                          updated[index].netProfit = Math.max(0, t - exp - ca).toFixed(2);
                          setSelfEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Overlap Relief Deducted</label>
                      <input
                        type="number"
                        step="0.01"
                        value={biz.overlapReliefUsed || "0.00"}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].overlapReliefUsed = e.target.value;
                          setSelfEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Net Taxable Profit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={biz.netProfit}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].netProfit = e.target.value;
                          setSelfEmployments(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600"
                      />
                    </div>
                  </div>

                  {/* Statutory Relief Toggles: Class 4 NIC Exemption (Art 50) & Foster Care (Art 49) */}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!biz.class4Excepted}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].class4Excepted = e.target.checked;
                          setSelfEmployments(updated);
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Box 37 / Box 101: Excepted from Class 4 NICs (Age 66+ / State Pension Age reached)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!biz.isFosterCarer}
                        onChange={(e) => {
                          const updated = [...selfEmployments];
                          updated[index].isFosterCarer = e.target.checked;
                          setSelfEmployments(updated);
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        Foster Care Relief (Simplified Qualifying Receipts Scheme - Capium Art 49)
                      </span>
                    </label>
                  </div>

                  {biz.isFosterCarer && (
                    <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-800 dark:text-purple-300 uppercase">
                          Box 9: Total Qualifying Care Receipts (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={biz.qualifyingReceipts || "0.00"}
                          onChange={(e) => {
                            const updated = [...selfEmployments];
                            updated[index].qualifyingReceipts = e.target.value;
                            const qr = parseFloat(e.target.value || "0");
                            const qa = parseFloat(updated[index].qualifyingAmount || "0");
                            updated[index].netProfit = qa >= qr ? "0.00" : (qr - qa).toFixed(2);
                            setSelfEmployments(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-800 dark:text-purple-300 uppercase">
                          Box 20: Qualifying Amount / Exemption Threshold (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={biz.qualifyingAmount || "0.00"}
                          onChange={(e) => {
                            const updated = [...selfEmployments];
                            updated[index].qualifyingAmount = e.target.value;
                            const qa = parseFloat(e.target.value || "0");
                            const qr = parseFloat(updated[index].qualifyingReceipts || "0");
                            updated[index].netProfit = qa >= qr ? "0.00" : (qr - qa).toFixed(2);
                            setSelfEmployments(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded text-xs font-mono"
                        />
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                          If Qualifying Amount $\ge$ Receipts, taxable profit is automatically £0 (Capium Art 49).
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SA104 PARTNERSHIP (Capium Art 21, 26: 9000165532, 9000205340) */}
      {activeTab === "partnership" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-purple-600" />
                SA104 Partnership Shares & Link to SA800 Returns
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Partnership Profit Share: £{totalPartnershipProfit.toFixed(2)} | Directly linked into SA302 calculation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availablePartnerships.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedPartnershipToLink}
                    onChange={(e) => setSelectedPartnershipToLink(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="">-- Select SA800 Partnership --</option>
                    {availablePartnerships.map((p) => (
                      <option key={p.partnershipClientId} value={p.partnershipClientId}>
                        {p.partnershipName} (UTR: {p.utrNumber || "N/A"})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedPartnershipToLink}
                    onClick={() => handleLinkSA800(selectedPartnershipToLink)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Link2 size={13} />
                    <span>Link SA800 & Import Share</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setPartnerships([
                    ...partnerships,
                    {
                      id: Date.now(),
                      partnershipName: "",
                      partnershipUtr: "",
                      partnershipDescription: "Partnership Share",
                      sharePercentage: "50",
                      totalPartnershipProfit: "0.00",
                      profitShare: "0.00",
                      propertyShare: "0.00",
                      interestShare: "0.00",
                    },
                  ]);
                }}
                className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} /> Add Partnership Share
              </button>
            </div>
          </div>

          {partnerships.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 space-y-2">
              <Users size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
              <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">No Partnership Shares (SA104) Recorded</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                If this taxpayer is a partner in a partnership, select a linked SA800 return above or click "+ Add Partnership Share" to manually allocate profit shares.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {partnerships.map((part, index) => (
                <div key={part.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Users size={13} className="text-purple-600" />
                      Partnership #{index + 1}: {part.partnershipName || "Unspecified"}
                    </span>
                    <button
                      onClick={() => setPartnerships(partnerships.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Partnership Name</label>
                      <input
                        type="text"
                        value={part.partnershipName}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].partnershipName = e.target.value;
                          setPartnerships(updated);
                        }}
                        placeholder="Smith & Jones LLP"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Partnership UTR</label>
                      <input
                        type="text"
                        value={part.partnershipUtr}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].partnershipUtr = e.target.value;
                          setPartnerships(updated);
                        }}
                        placeholder="10-digit UTR"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Partner's Share %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={part.sharePercentage}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].sharePercentage = e.target.value;
                          const pct = parseFloat(e.target.value || "0");
                          const tot = parseFloat(updated[index].totalPartnershipProfit || "0");
                          if (tot > 0) {
                            updated[index].profitShare = ((tot * pct) / 100).toFixed(2);
                          }
                          setPartnerships(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Total Firm Profit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={part.totalPartnershipProfit}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].totalPartnershipProfit = e.target.value;
                          const tot = parseFloat(e.target.value || "0");
                          const pct = parseFloat(updated[index].sharePercentage || "0");
                          if (pct > 0) {
                            updated[index].profitShare = ((tot * pct) / 100).toFixed(2);
                          }
                          setPartnerships(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Allocated Profit Share (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={part.profitShare}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].profitShare = e.target.value;
                          setPartnerships(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Property Income Share (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={part.propertyShare || "0.00"}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].propertyShare = e.target.value;
                          setPartnerships(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Untaxed Interest Share (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={part.interestShare || "0.00"}
                        onChange={(e) => {
                          const updated = [...partnerships];
                          updated[index].interestShare = e.target.value;
                          setPartnerships(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Status</label>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={11} />
                        Included in SA104
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SA105 UK PROPERTY */}
      {activeTab === "property" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                SA105 UK Property Income (Residential & Commercial)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Net Rental Profit: £{totalPropertyIncome.toFixed(2)} | Total Residential Finance Costs: £{totalFinanceCosts.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setProperties([
                  ...properties,
                  {
                    id: Date.now(),
                    propertyAddress: "",
                    rentalIncome: "0.00",
                    allowableExpenses: "0.00",
                    residentialFinanceCosts: "0.00",
                    rentARoomReliefClaimed: false,
                    netProfit: "0.00",
                  },
                ]);
              }}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Add Property
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              No UK property rentals recorded. Click "+ Add Property" to record rental income.
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((prop, index) => (
                <div key={prop.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Property #{index + 1}
                    </span>
                    <button
                      onClick={() => setProperties(properties.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Property Address / Description</label>
                      <input
                        type="text"
                        value={prop.propertyAddress}
                        onChange={(e) => {
                          const updated = [...properties];
                          updated[index].propertyAddress = e.target.value;
                          setProperties(updated);
                        }}
                        placeholder="12 High Street, London"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Gross Rental Income</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prop.rentalIncome}
                        onChange={(e) => {
                          const updated = [...properties];
                          updated[index].rentalIncome = e.target.value;
                          const r = parseFloat(e.target.value || "0");
                          const exp = parseFloat(updated[index].allowableExpenses || "0");
                          updated[index].netProfit = Math.max(0, r - exp).toFixed(2);
                          setProperties(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Allowable Property Expenses</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prop.allowableExpenses}
                        onChange={(e) => {
                          const updated = [...properties];
                          updated[index].allowableExpenses = e.target.value;
                          const r = parseFloat(updated[index].rentalIncome || "0");
                          const exp = parseFloat(e.target.value || "0");
                          updated[index].netProfit = Math.max(0, r - exp).toFixed(2);
                          setProperties(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Residential Mortgage / Finance Costs</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prop.residentialFinanceCosts}
                        onChange={(e) => {
                          const updated = [...properties];
                          updated[index].residentialFinanceCosts = e.target.value;
                          setProperties(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-400">Qualifies for 20% basic rate tax credit</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Net Taxable Rental Profit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prop.netProfit}
                        onChange={(e) => {
                          const updated = [...properties];
                          updated[index].netProfit = e.target.value;
                          setProperties(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SA108 CAPITAL GAINS (Autumn Budget 2024 & Box 54 Whitespace - Capium Art 44, 48) */}
      {activeTab === "capitalGains" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-600" />
                SA108 Capital Gains Summary (Post-Autumn 2024 Budget)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Annual Exempt Amount: £3,000 | Total Net Capital Gains: £{totalCapitalGainsNet.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setCapitalGainsAssets([
                  ...capitalGainsAssets,
                  {
                    id: Date.now(),
                    assetDescription: "",
                    assetType: "Other Assets & Shares",
                    disposalPeriod: "on_after_30_oct_2024",
                    disposalProceeds: "0.00",
                    allowableCosts: "0.00",
                    reliefClaimed: "0.00",
                    netGain: "0.00",
                  },
                ]);
              }}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Add Disposal Asset
            </button>
          </div>

          {/* Autumn Budget 2024 Notice & Box CGT51 Banner */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
              <Info size={14} className="text-amber-600" />
              <span>Autumn Budget (30 October 2024) Capital Gains Tax Rates</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              For disposals of assets other than residential property on or after <strong>30 October 2024</strong>, rates increased from 10% to <strong>18%</strong> (basic) and 20% to <strong>24%</strong> (higher).
              Per HMRC statutory instructions, software calculates gains at legacy rates and posts the rate differential into <strong>Box CGT51</strong> on the return.
            </p>
          </div>

          {capitalGainsAssets.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              No asset disposals recorded. Click "+ Add Disposal Asset" to record shares or property sales.
            </div>
          ) : (
            <div className="space-y-4">
              {capitalGainsAssets.map((asset, index) => (
                <div key={asset.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Asset #{index + 1}: {asset.assetDescription || "Unspecified"}
                    </span>
                    <button
                      onClick={() => setCapitalGainsAssets(capitalGainsAssets.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Asset Description</label>
                      <input
                        type="text"
                        value={asset.assetDescription}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].assetDescription = e.target.value;
                          setCapitalGainsAssets(updated);
                        }}
                        placeholder="Shares in Tech Ltd / Commercial Property"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Asset Type</label>
                      <select
                        value={asset.assetType}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].assetType = e.target.value;
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      >
                        <option value="Other Assets & Shares">Other Assets & Shares (Budget 2024 Split)</option>
                        <option value="Residential Property">Residential Property (18% / 24%)</option>
                        <option value="Business Asset Disposal Relief">BADR / Entrepreneurs' Relief (10%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Disposal Date Relative to Budget</label>
                      <select
                        value={asset.disposalPeriod || "on_after_30_oct_2024"}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].disposalPeriod = e.target.value;
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold"
                      >
                        <option value="before_30_oct_2024">Before 30 Oct 2024 (10% / 20%)</option>
                        <option value="on_after_30_oct_2024">On or After 30 Oct 2024 (18% / 24%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Disposal Proceeds</label>
                      <input
                        type="number"
                        step="0.01"
                        value={asset.disposalProceeds}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].disposalProceeds = e.target.value;
                          const p = parseFloat(e.target.value || "0");
                          const c = parseFloat(updated[index].allowableCosts || "0");
                          const r = parseFloat(updated[index].reliefClaimed || "0");
                          updated[index].netGain = Math.max(0, p - c - r).toFixed(2);
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Acquisition & Allowable Costs</label>
                      <input
                        type="number"
                        step="0.01"
                        value={asset.allowableCosts}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].allowableCosts = e.target.value;
                          const p = parseFloat(updated[index].disposalProceeds || "0");
                          const c = parseFloat(e.target.value || "0");
                          const r = parseFloat(updated[index].reliefClaimed || "0");
                          updated[index].netGain = Math.max(0, p - c - r).toFixed(2);
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Reliefs Claimed (PRR / BADR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={asset.reliefClaimed}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].reliefClaimed = e.target.value;
                          const p = parseFloat(updated[index].disposalProceeds || "0");
                          const c = parseFloat(updated[index].allowableCosts || "0");
                          const r = parseFloat(e.target.value || "0");
                          updated[index].netGain = Math.max(0, p - c - r).toFixed(2);
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Net Chargeable Gain</label>
                      <input
                        type="number"
                        step="0.01"
                        value={asset.netGain}
                        onChange={(e) => {
                          const updated = [...capitalGainsAssets];
                          updated[index].netGain = e.target.value;
                          setCapitalGainsAssets(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Box 54 Whitespace Notes & Attachment Check (Capium Art 48: 9000271813) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={14} className="text-purple-600" />
                Box 54: White-space Computation Notes & Attachment Declaration
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={cgtHasAttachment}
                  onChange={(e) => setCgtHasAttachment(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>PDF Capital Gains Computation Attached</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                If computation PDF is not attached, provide full explanatory notes in Box 54 below (Mandatory for HMRC Gateway filing):
              </label>
              <textarea
                rows={3}
                value={cgtBox54Notes}
                onChange={(e) => setCgtBox54Notes(e.target.value)}
                placeholder="Disposal of unlisted shares / property; details of acquisition cost, market valuation basis, and relief claim calculations..."
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SA106 FOREIGN */}
      {activeTab === "foreign" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                SA106 Foreign Income & Tax Suffered
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Overseas Income: £{totalForeignIncome.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setForeignItems([
                  ...foreignItems,
                  {
                    id: Date.now(),
                    country: "",
                    grossIncome: "0.00",
                    foreignTaxPaid: "0.00",
                    specialWithholdingTax: "0.00",
                  },
                ]);
              }}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Add Foreign Income
            </button>
          </div>

          {foreignItems.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
              No overseas income recorded. Click "+ Add Foreign Income" to report foreign dividends or earnings.
            </div>
          ) : (
            <div className="space-y-4">
              {foreignItems.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Foreign Item #{index + 1}
                    </span>
                    <button
                      onClick={() => setForeignItems(foreignItems.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Country / Jurisdiction</label>
                      <input
                        type="text"
                        value={item.country}
                        onChange={(e) => {
                          const updated = [...foreignItems];
                          updated[index].country = e.target.value;
                          setForeignItems(updated);
                        }}
                        placeholder="United States"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Gross Foreign Income (GBP)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.grossIncome}
                        onChange={(e) => {
                          const updated = [...foreignItems];
                          updated[index].grossIncome = e.target.value;
                          setForeignItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Foreign Tax Paid (FTCR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.foreignTaxPaid}
                        onChange={(e) => {
                          const updated = [...foreignItems];
                          updated[index].foreignTaxPaid = e.target.value;
                          setForeignItems(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
