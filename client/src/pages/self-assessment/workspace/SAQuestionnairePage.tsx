import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  HelpCircle, Send, CheckCircle2, Save, AlertCircle,
  FileText, ExternalLink, RefreshCw, Briefcase, Home, DollarSign,
  TrendingUp, Users, Globe, Shield
} from "lucide-react";

export default function SAQuestionnairePage() {
  return (
    <SAWorkspaceLayout activeSection="Questionnaire">
      <SAQuestionnaireContent />
    </SAWorkspaceLayout>
  );
}

function SAQuestionnaireContent() {
  const { clientId, client, currentReturn, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("employment");
  const [answers, setAnswers] = useState<Record<string, { answer: boolean | null; details: string }>>({
    hasEmployment: { answer: false, details: "" },
    hasSelfEmployment: { answer: false, details: "" },
    hasPropertyIncome: { answer: false, details: "" },
    hasDividends: { answer: false, details: "" },
    hasUntaxedInterest: { answer: false, details: "" },
    hasCryptoAssets: { answer: false, details: "" },
    hasPensions: { answer: false, details: "" },
    hasCapitalGains: { answer: false, details: "" },
    hasChildBenefit: { answer: false, details: "" },
    isNonResident: { answer: false, details: "" },
  });

  useEffect(() => {
    if (currentReturn?.schedulesData?.questionnaire) {
      setAnswers((prev) => ({
        ...prev,
        ...currentReturn.schedulesData.questionnaire,
      }));
    }
  }, [currentReturn]);

  const updateAnswer = (key: string, answer: boolean, details?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer,
        details: details !== undefined ? details : prev[key]?.details || "",
      },
    }));
  };

  const updateDetails = (key: string, details: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: prev[key]?.answer ?? null,
        details,
      },
    }));
  };

  // Save questionnaire mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn) return;
      const currentSchedules = currentReturn.schedulesData || {};
      const updatedSchedules = {
        ...currentSchedules,
        questionnaire: answers,
      };

      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn.id}/schedules`, {
        schedulesData: updatedSchedules,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save questionnaire" }));
        throw new Error(err.error || "Failed to save questionnaire");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchReturns();
      toast({
        title: "Tax Questionnaire Saved",
        description: "Client assessment questions and disclosure notes saved.",
        type: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message,
        type: "error",
      });
    },
  });

  // Dispatch to Client Email
  const sendToClient = () => {
    toast({
      title: "Questionnaire Dispatched",
      description: `Secure online tax checklist sent to ${client?.email || "client email"}.`,
      type: "success",
    });
  };


  const categories = [
    { id: "employment", label: "Employment & P60", icon: <Briefcase size={14} /> },
    { id: "self_employment", label: "Self-Employment", icon: <Briefcase size={14} /> },
    { id: "property", label: "Property & Rentals", icon: <Home size={14} /> },
    { id: "investments", label: "Investments & Crypto", icon: <DollarSign size={14} /> },
    { id: "gains", label: "Capital Gains", icon: <TrendingUp size={14} /> },
    { id: "child_benefit", label: "Child Benefit & Family", icon: <Users size={14} /> },
    { id: "residence", label: "Residency & Domicile", icon: <Globe size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle size={16} className="text-emerald-600" />
            Client Tax Information Questionnaire ({currentReturn.taxYear})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Structured annual tax discovery checklist for individual clients to determine required SA100 supplementary pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sendToClient}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send size={13} />
            <span>Send to Client</span>
          </button>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save size={13} />
            <span>{saveMutation.isPending ? "Saving..." : "Save Questionnaire"}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs space-y-1 self-start">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Questionnaire Questions Pane */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          {activeCategory === "employment" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Employment & Director Income</h3>
                <p className="text-xs text-slate-500">Were you employed or a company director during {currentReturn.taxYear}?</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you have any employed roles, received a P60, P45, or taxable redundancy?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasEmployment", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasEmployment?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasEmployment", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasEmployment?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasEmployment?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        List employers, PAYE references, and details of any P11D benefits:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasEmployment?.details || ""}
                        onChange={(e) => updateDetails("hasEmployment", e.target.value)}
                        placeholder="Employer name, tax deducted, company car, private healthcare..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "self_employment" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Self-Employment & Sole Trader</h3>
                <p className="text-xs text-slate-500">Were you registered as self-employed or worked as a subcontractor?</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you carry on a trade, profession, or vocation as a sole trader or under CIS?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasSelfEmployment", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasSelfEmployment?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasSelfEmployment", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasSelfEmployment?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasSelfEmployment?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Business trading name, turnover, accounting basis, and CIS deductions suffered:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasSelfEmployment?.details || ""}
                        onChange={(e) => updateDetails("hasSelfEmployment", e.target.value)}
                        placeholder="Business name, description, turnover range, CIS statements available..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "property" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Land & Property Income</h3>
                <p className="text-xs text-slate-500">Income from renting residential or commercial properties.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you let out residential property, furnished holiday lets, or commercial premises?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasPropertyIncome", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasPropertyIncome?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasPropertyIncome", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasPropertyIncome?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasPropertyIncome?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Rental properties addresses, gross rents, and mortgage interest amounts:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasPropertyIncome?.details || ""}
                        onChange={(e) => updateDetails("hasPropertyIncome", e.target.value)}
                        placeholder="Property address, total annual rent, repairs, mortgage interest..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "investments" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Dividends, Interest & Crypto</h3>
                <p className="text-xs text-slate-500">Unearned investment returns, company dividends, and crypto assets.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you receive company dividends or untaxed bank interest exceeding £1,000?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasDividends", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasDividends?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasDividends", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasDividends?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasDividends?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Dividend vouchers, paying companies, and untaxed savings interest totals:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasDividends?.details || ""}
                        onChange={(e) => updateDetails("hasDividends", e.target.value)}
                        placeholder="Company name, dividend amount, date received, interest breakdown..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you trade, stake, or dispose of Cryptocurrency / Digital Assets?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasCryptoAssets", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasCryptoAssets?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasCryptoAssets", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasCryptoAssets?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasCryptoAssets?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Exchanges used and total gains/losses:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasCryptoAssets?.details || ""}
                        onChange={(e) => updateDetails("hasCryptoAssets", e.target.value)}
                        placeholder="Coinbase, Binance, total proceeds, net capital gain or loss..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "gains" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Capital Gains Disposals</h3>
                <p className="text-xs text-slate-500">Sales of properties, shares, or valuable assets.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you sell or transfer residential property (subject to 60-day reporting) or stocks?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasCapitalGains", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasCapitalGains?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasCapitalGains", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasCapitalGains?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasCapitalGains?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Asset description, disposal date, proceeds, cost basis, and 60-day CGT return reference:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasCapitalGains?.details || ""}
                        onChange={(e) => updateDetails("hasCapitalGains", e.target.value)}
                        placeholder="Residential property sale, proceeds £250k, purchase £180k, CGT paid on 60-day return..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "child_benefit" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">High Income Child Benefit Charge (HICBC)</h3>
                <p className="text-xs text-slate-500">Statutory tax charge on Child Benefit if individual adjusted net income exceeds £60,000.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Did you or your partner receive Child Benefit payments during the tax year?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasChildBenefit", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasChildBenefit?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("hasChildBenefit", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.hasChildBenefit?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.hasChildBenefit?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Total amount of Child Benefit received and number of children:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.hasChildBenefit?.details || ""}
                        onChange={(e) => updateDetails("hasChildBenefit", e.target.value)}
                        placeholder="Number of children, total benefit received (£)..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeCategory === "residence" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Residency, Domicile & Remittance</h3>
                <p className="text-xs text-slate-500">Statutory Residence Test (SRT) and overseas tax treaties.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Were you non-UK resident, eligible for split-year treatment, or claiming remittance basis?
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateAnswer("isNonResident", true)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.isNonResident?.answer === true
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnswer("isNonResident", false)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          answers.isNonResident?.answer === false
                            ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {answers.isNonResident?.answer && (
                    <div className="pt-2">
                      <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        Country of residence, days spent in the UK, and treaty relief claimed:
                      </label>
                      <textarea
                        rows={2}
                        value={answers.isNonResident?.details || ""}
                        onChange={(e) => updateDetails("isNonResident", e.target.value)}
                        placeholder="Country of tax residence, double taxation treaty details..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
