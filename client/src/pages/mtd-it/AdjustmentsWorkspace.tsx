import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Calculator, ShieldCheck, CheckCircle2, AlertCircle,
  Building2, Briefcase, HelpCircle, Save, Send, X, Download,
  FileText, Coins, Layers, BarChart2, Check, Radio
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdTask, MtdAdjustmentsRecord, MtdSourceRecord } from "./types";

interface Props {
  task: MtdTask;
  onBack: () => void;
}

export default function AdjustmentsWorkspace({ task, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active section in far left claims navigation
  const [activeNav, setActiveNav] = useState<
    "adjustments" | "summary_tb" | "other_income" | "other_expenses" | "losses" | "relief" | "disclosures" | "tax_calculator" | "capisign" | "final_declaration"
  >("adjustments");

  // Selected source ID
  const [selectedSourceId, setSelectedSourceId] = useState<number>(task.sourceId || 1);

  // Capital Allowances Calculator Modal state
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [calcAdditions, setCalcAdditions] = useState("0");
  const [calcAiaClaim, setCalcAiaClaim] = useState("0");
  const [calcMainPoolBf, setCalcMainPoolBf] = useState("0");

  // Period Date Strings
  const [periodFrom, setPeriodFrom] = useState("06-Apr-2025");
  const [periodTo, setPeriodTo] = useState("05-Apr-2026");

  // Non-financial state
  const [businessDetailsChanged, setBusinessDetailsChanged] = useState(false);

  // State for all adjustments & allowances
  const [formData, setFormData] = useState<MtdAdjustmentsRecord>({
    sourceId: selectedSourceId,
    taxYear: task.taxYear || "2025-26",
    includedNonTaxableProfits: "0.00",
    basisAdjustment: "0.00",
    outstandingBusinessIncome: "0.00",
    overlapReliefUsed: "0.00",
    balancingChargeBpra: "0.00",
    accountingAdjustment: "0.00",
    balancingChargeOther: "0.00",
    goodsServicesOwnUse: "0.00",
    privateUseAdjustment: "0.00",
    annualInvestmentAllowance: "0.00",
    enhancedCapitalAllowance: "0.00",
    bpra: "0.00",
    allowanceOnSales: "0.00",
    capitalAllowanceMainPool: "0.00",
    capitalAllowanceSingleAsset: "0.00",
    capitalAllowanceSpecialRate: "0.00",
    tradingAllowance: "0.00",
    propertyAllowance: "0.00",
    zeroEmissionVehicleAllowance: "0.00",
    replacingDomesticItemsAllowance: "0.00",
    class4NicExempt: false,
  });

  // Fetch all registered sources for client
  const { data: sources = [] } = useQuery<MtdSourceRecord[]>({
    queryKey: [`/api/mtd-it/sources/${task.clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mtd-it/sources/${task.clientId}`);
      return res.json();
    },
  });

  // Fetch adjustments for selected source
  const { data: existingData, isLoading } = useQuery<MtdAdjustmentsRecord>({
    queryKey: [`/api/mtd-it/adjustments`, selectedSourceId, task.taxYear || "2025-26"],
    queryFn: async () => {
      if (!selectedSourceId) return null;
      const res = await apiRequest("GET", `/api/mtd-it/adjustments/${selectedSourceId}/${task.taxYear || "2025-26"}`);
      return res.json();
    },
    enabled: !!selectedSourceId,
  });

  useEffect(() => {
    if (existingData) {
      setFormData((prev) => ({
        ...prev,
        ...existingData,
      }));
    }
  }, [existingData]);

  // Save / Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async (submitNow: boolean) => {
      const res = await apiRequest("POST", "/api/mtd-it/adjustments", {
        ...formData,
        sourceId: selectedSourceId,
        taxYear: task.taxYear || "2025-26",
        submitNow,
      });
      return res.json();
    },
    onSuccess: (data, submitNow) => {
      queryClient.invalidateQueries({ queryKey: [`/api/mtd-it/adjustments`, selectedSourceId, task.taxYear || "2025-26"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      toast({
        title: submitNow ? "Adjustments Submitted" : "Draft Saved",
        description: submitNow
          ? "Year-End Adjustments and Allowances successfully submitted to HMRC."
          : "Adjustments & Allowances saved successfully.",
      });
      if (submitNow) onBack();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save adjustments", variant: "destructive" });
    },
  });

  const handleFieldChange = (field: keyof MtdAdjustmentsRecord, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Capital Allowance Calculator calculation
  const handleCalculateCapitalAllowances = () => {
    const additions = parseFloat(calcAdditions) || 0;
    const aia = additions;
    setCalcAiaClaim(aia.toFixed(2));
    const poolBf = parseFloat(calcMainPoolBf) || 0;
    const wda = poolBf * 0.18;

    setFormData((prev) => ({
      ...prev,
      annualInvestmentAllowance: aia.toFixed(2),
      capitalAllowanceMainPool: wda.toFixed(2),
    }));

    toast({
      title: "Allowances Calculated",
      description: `AIA £${aia.toFixed(2)} and Main Pool Allowance £${wda.toFixed(2)} loaded into claims.`,
    });
    setShowCalcModal(false);
  };

  const currentSource = sources.find((s) => s.id === selectedSourceId) || sources[0];

  return (
    <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[780px]">
      {/* ------------------------------------------------------------- */}
      {/* 1. FAR-LEFT VERTICAL CLAIMS SIDEBAR (Matching img_2.png)       */}
      {/* ------------------------------------------------------------- */}
      <div className="w-44 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col py-4">
        <div className="space-y-1 px-2">
          {/* Adjustments and Allowances */}
          <button
            onClick={() => setActiveNav("adjustments")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "adjustments"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <span className="text-base font-black mb-1">£</span>
            <span className="text-[10px] leading-tight">Adjustments and Allowances</span>
          </button>

          {/* Adjustable Summary and Trial Balance */}
          <button
            onClick={() => setActiveNav("summary_tb")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "summary_tb"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <FileText size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Adjustable Summary & TB</span>
          </button>

          {/* Other Income */}
          <button
            onClick={() => setActiveNav("other_income")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "other_income"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <Coins size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Other Income</span>
          </button>

          {/* Other Expenses */}
          <button
            onClick={() => setActiveNav("other_expenses")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "other_expenses"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <FileText size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Other Expenses</span>
          </button>

          {/* Losses & Deductions */}
          <button
            onClick={() => setActiveNav("losses")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "losses"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <Layers size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Losses & Deductions</span>
          </button>

          {/* Relief */}
          <button
            onClick={() => setActiveNav("relief")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "relief"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <Briefcase size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Relief</span>
          </button>

          {/* Disclosures */}
          <button
            onClick={() => setActiveNav("disclosures")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "disclosures"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <BarChart2 size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Disclosures</span>
          </button>

          {/* Tax Calculator View */}
          <button
            onClick={() => setActiveNav("tax_calculator")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "tax_calculator"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <Calculator size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Tax Calculator View</span>
          </button>

          {/* Capisign */}
          <button
            onClick={() => setActiveNav("capisign")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "capisign"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <Send size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Capisign</span>
          </button>

          {/* Final Declaration */}
          <button
            onClick={() => setActiveNav("final_declaration")}
            className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
              activeNav === "final_declaration"
                ? "bg-[#6c5ce7] text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100 font-medium"
            }`}
          >
            <ShieldCheck size={18} className="mb-1" />
            <span className="text-[10px] leading-tight">Final Declaration</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SOURCES SELECTION COLUMN (Matching img_2.png)               */}
      {/* ------------------------------------------------------------- */}
      <div className="w-56 flex-shrink-0 bg-gray-50/50 border-r border-gray-200 p-4 flex flex-col">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Sources</h4>
        <div className="space-y-2 text-xs">
          {sources.length > 0 ? (
            sources.map((s) => (
              <label
                key={s.id}
                onClick={() => setSelectedSourceId(s.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all ${
                  selectedSourceId === s.id
                    ? "bg-white border-[#6c5ce7] shadow-sm text-gray-900"
                    : "border-transparent hover:bg-gray-100 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="mtdSourceRadio"
                  checked={selectedSourceId === s.id}
                  onChange={() => setSelectedSourceId(s.id)}
                  className="mt-0.5 text-[#6c5ce7] focus:ring-[#6c5ce7]"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-xs truncate">{s.tradingName || s.sourceType}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">
                    Business ID: {s.businessId || `XBIS${s.id}009`}
                  </div>
                </div>
              </label>
            ))
          ) : (
            <div className="text-[11px] text-gray-500 italic p-2">
              Default Source (Sole Trader)
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN FORM AREA (Matching img_2.png)                        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#6c5ce7]">
              {task.clientName} - Workflow 1 (CL{task.clientId})
            </h2>
            <p className="text-xs text-gray-500">
              Selected Source: <strong>{currentSource?.tradingName || task.tradingName}</strong> | Status:{" "}
              <span className={`font-semibold ${formData.status === "Submitted" ? "text-green-600" : "text-gray-600"}`}>
                {formData.status || "Draft"}
              </span>
            </p>
          </div>

          <button
            onClick={onBack}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Period & Action Buttons Bar (Matching img_2.png) */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">Period</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">From</span>
              <input
                type="text"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="p-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 w-28 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">To</span>
              <input
                type="text"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="p-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 w-28 text-center"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toast({ title: "PDF Generated", description: "Adjustments and Allowances schedule exported to PDF." })}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
            >
              Export as PDF
            </button>
            <button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm transition-colors"
            >
              {saveMutation.isPending ? "Saving..." : "Create / Amend"}
            </button>
            <button
              onClick={() => toast({ title: "Clear", description: "Adjustments reset to defaults." })}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Adjustments Form Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-240px)]">
          {/* Section 1: Adjustment (Matching img_2.png 3-column grid) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Adjustment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Col 1 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Included Non Taxable Profits</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.includedNonTaxableProfits}
                    onChange={(e) => handleFieldChange("includedNonTaxableProfits", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Col 2 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Basis Adjustment</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basisAdjustment}
                    onChange={(e) => handleFieldChange("basisAdjustment", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Col 3 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Outstanding Business Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.outstandingBusinessIncome}
                    onChange={(e) => handleFieldChange("outstandingBusinessIncome", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Overlap Relief Used</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.overlapReliefUsed}
                    onChange={(e) => handleFieldChange("overlapReliefUsed", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Balancing Charge BPRA</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balancingChargeBpra}
                    onChange={(e) => handleFieldChange("balancingChargeBpra", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Accounting Adjustment</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accountingAdjustment}
                    onChange={(e) => handleFieldChange("accountingAdjustment", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Balancing Charge - Other</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balancingChargeOther}
                    onChange={(e) => handleFieldChange("balancingChargeOther", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Goods & Services - Own Use</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.goodsServicesOwnUse}
                    onChange={(e) => handleFieldChange("goodsServicesOwnUse", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Allowances (Matching img_2.png) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-800">Allowances</h3>
              <button
                onClick={() => setShowCalcModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Calculator size={14} /> Capital Allowances Calculator
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Row 1 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Annual Investment Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annualInvestmentAllowance}
                    onChange={(e) => handleFieldChange("annualInvestmentAllowance", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Enhanced Capital Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.enhancedCapitalAllowance}
                    onChange={(e) => handleFieldChange("enhancedCapitalAllowance", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Business Premises Renovation Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bpra}
                    onChange={(e) => handleFieldChange("bpra", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Allowance on Sales</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.allowanceOnSales}
                    onChange={(e) => handleFieldChange("allowanceOnSales", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Capital Allowance Main Pool</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capitalAllowanceMainPool}
                    onChange={(e) => handleFieldChange("capitalAllowanceMainPool", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Capital Allowance Single Asset Pool</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capitalAllowanceSingleAsset}
                    onChange={(e) => handleFieldChange("capitalAllowanceSingleAsset", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">Capital Allowance Special Rate Pool</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capitalAllowanceSpecialRate}
                    onChange={(e) => handleFieldChange("capitalAllowanceSpecialRate", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Trading Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tradingAllowance}
                    onChange={(e) => handleFieldChange("tradingAllowance", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Zero-Emission Goods Vehicle Allowance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-semibold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.zeroEmissionVehicleAllowance}
                    onChange={(e) => handleFieldChange("zeroEmissionVehicleAllowance", e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Non Financials (Matching img_2.png) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Non Financials</h3>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={businessDetailsChanged}
                  onChange={(e) => setBusinessDetailsChanged(e.target.checked)}
                  className="rounded border-gray-300 text-[#6c5ce7] focus:ring-[#6c5ce7]"
                />
                <span>Business details changed recently</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={formData.class4NicExempt}
                  onChange={(e) => handleFieldChange("class4NicExempt", e.target.checked)}
                  className="rounded border-gray-300 text-[#6c5ce7] focus:ring-[#6c5ce7]"
                />
                <span>Is Class 4 NIC exempt?</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Allowances Calculator Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-[#6c5ce7]">
                <Calculator size={20} />
                <h3 className="text-base font-bold text-gray-800">Capital Allowances Calculator</h3>
              </div>
              <button onClick={() => setShowCalcModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Qualifying Plant & Machinery Additions (£)</label>
                <input
                  type="number"
                  value={calcAdditions}
                  onChange={(e) => setCalcAdditions(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <span className="text-[10px] text-gray-400">Claimable under 100% Annual Investment Allowance (up to £1m)</span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Main Pool Written Down Value B/Fwd (£)</label>
                <input
                  type="number"
                  value={calcMainPoolBf}
                  onChange={(e) => setCalcMainPoolBf(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <span className="text-[10px] text-gray-400">Subject to standard 18% Writing Down Allowance (WDA)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowCalcModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCalculateCapitalAllowances}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} /> Calculate & Populate Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
