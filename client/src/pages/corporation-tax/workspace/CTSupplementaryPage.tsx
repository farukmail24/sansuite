import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileText, Save, CheckCircle2, AlertCircle, Plus,
  Trash2, HelpCircle, Shield, ArrowRight
} from "lucide-react";

export default function CTSupplementaryPage() {
  return (
    <CTWorkspaceLayout activeSection="Supplementary Pages">
      <CTSupplementaryContent />
    </CTWorkspaceLayout>
  );
}

function CTSupplementaryContent() {
  const { clientId, currentReturn } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedForm, setSelectedForm] = useState<"CT600A" | "CT600L" | "CT600E">("CT600A");

  // CT600A States (Loans to Participators)
  const [ct600aIncluded, setCt600aIncluded] = useState(false);
  const [participatorName, setParticipatorName] = useState("");
  const [loanAmount, setLoanAmount] = useState("0.00");
  const [repaymentAmount, setRepaymentAmount] = useState("0.00");

  // CT600L States (R&D Tax Relief)
  const [ct600lIncluded, setCt600lIncluded] = useState(false);
  const [qualifyingExpenditure, setQualifyingExpenditure] = useState("0.00");
  const [schemeType, setSchemeType] = useState("SME Scheme");
  const [enhancedDeduction, setEnhancedDeduction] = useState("0.00");

  // CT600E States (Charities)
  const [ct600eIncluded, setCt600eIncluded] = useState(false);
  const [charityRegNumber, setCharityRegNumber] = useState("");
  const [charityExemptionClaimed, setCharityExemptionClaimed] = useState(true);

  // Fetch Existing Supplementary Forms
  const { data: returnDetail } = useQuery<any>({
    queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}`],
    queryFn: async () => {
      if (!currentReturn?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentReturn?.id,
  });

  useEffect(() => {
    if (returnDetail?.supplementaryForms) {
      const forms = returnDetail.supplementaryForms;
      const formA = forms.find((f: any) => f.formType === "CT600A");
      if (formA) {
        setCt600aIncluded(formA.isIncludedInSubmission);
        try {
          const parsed = JSON.parse(formA.formDataJson || "{}");
          setParticipatorName(parsed.participatorName || "");
          setLoanAmount(parsed.loanAmount || "0.00");
          setRepaymentAmount(parsed.repaymentAmount || "0.00");
        } catch {}
      }

      const formL = forms.find((f: any) => f.formType === "CT600L");
      if (formL) {
        setCt600lIncluded(formL.isIncludedInSubmission);
        try {
          const parsed = JSON.parse(formL.formDataJson || "{}");
          setQualifyingExpenditure(parsed.qualifyingExpenditure || "0.00");
          setSchemeType(parsed.schemeType || "SME Scheme");
          setEnhancedDeduction(parsed.enhancedDeduction || "0.00");
        } catch {}
      }

      const formE = forms.find((f: any) => f.formType === "CT600E");
      if (formE) {
        setCt600eIncluded(formE.isIncludedInSubmission);
        try {
          const parsed = JSON.parse(formE.formDataJson || "{}");
          setCharityRegNumber(parsed.charityRegNumber || "");
          setCharityExemptionClaimed(parsed.charityExemptionClaimed ?? true);
        } catch {}
      }
    }
  }, [returnDetail]);

  // Save Supplementary Mutation
  const saveFormMutation = useMutation({
    mutationFn: async (payload: { formType: string; formData: any; isIncluded: boolean }) => {
      if (!currentReturn?.id) return;
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/supplementary`, payload);
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}`] });
      toast({
        title: "Supplementary Form Saved",
        description: `Form ${vars.formType} successfully updated in statutory filing package.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save supplementary form.",
        variant: "destructive",
      });
    },
  });

  if (!currentReturn) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" />
            HMRC Supplementary Filing Pages
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Attach official statutory supplementary schedules (CT600A, CT600L, CT600E) to this Corporation Tax return.
          </p>
        </div>
      </div>

      {/* Form Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: CT600A */}
        <div
          onClick={() => setSelectedForm("CT600A")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedForm === "CT600A"
              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-indigo-600">CT600A</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                ct600aIncluded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {ct600aIncluded ? "Included" : "Not Included"}
            </span>
          </div>
          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Loans to Participators</h4>
          <p className="text-[11px] text-slate-500 mt-1">Section 455 tax on close company director/shareholder loans.</p>
        </div>

        {/* Card 2: CT600L */}
        <div
          onClick={() => setSelectedForm("CT600L")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedForm === "CT600L"
              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-indigo-600">CT600L</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                ct600lIncluded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {ct600lIncluded ? "Included" : "Not Included"}
            </span>
          </div>
          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Research & Development (R&D)</h4>
          <p className="text-[11px] text-slate-500 mt-1">RDEC and SME R&D tax relief claims and tax credit payments.</p>
        </div>

        {/* Card 3: CT600E */}
        <div
          onClick={() => setSelectedForm("CT600E")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedForm === "CT600E"
              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs text-indigo-600">CT600E</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                ct600eIncluded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {ct600eIncluded ? "Included" : "Not Included"}
            </span>
          </div>
          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Charities & Sports Clubs</h4>
          <p className="text-[11px] text-slate-500 mt-1">Claims for statutory exemption from Corporation Tax.</p>
        </div>
      </div>

      {/* Selected Form Editor */}

      {/* 1. CT600A Editor */}
      {selectedForm === "CT600A" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Supplementary Form CT600A: Loans to Participators
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Section 455 Corporation Tax Act 2010. Applies if loans have been made to directors/participators.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ct600aIncluded}
                  onChange={(e) => setCt600aIncluded(e.target.checked)}
                  className="rounded border-slate-300 mr-1.5"
                />
                Include CT600A with Submission
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Participator / Director Name</label>
              <input
                type="text"
                value={participatorName}
                onChange={(e) => setParticipatorName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Loan Advanced (£)</label>
              <input
                type="number"
                step="0.01"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Repaid within 9 months (£)</label>
              <input
                type="number"
                step="0.01"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() =>
                saveFormMutation.mutate({
                  formType: "CT600A",
                  formData: { participatorName, loanAmount, repaymentAmount },
                  isIncluded: ct600aIncluded,
                })
              }
              disabled={saveFormMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save size={13} />
              <span>Save CT600A</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. CT600L Editor */}
      {selectedForm === "CT600L" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Supplementary Form CT600L: Research and Development
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                R&D expenditure relief claims, enhanced deductions and payable tax credits.
              </p>
            </div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ct600lIncluded}
                onChange={(e) => setCt600lIncluded(e.target.checked)}
                className="rounded border-slate-300 mr-1.5"
              />
              Include CT600L with Submission
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">R&D Scheme</label>
              <select
                value={schemeType}
                onChange={(e) => setSchemeType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="SME Scheme">SME R&D Scheme (86% extra deduction)</option>
                <option value="RDEC">Research and Development Expenditure Credit (20%)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Qualifying R&D Costs (£)</label>
              <input
                type="number"
                step="0.01"
                value={qualifyingExpenditure}
                onChange={(e) => setQualifyingExpenditure(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Enhanced Deduction (£)</label>
              <input
                type="number"
                step="0.01"
                value={enhancedDeduction}
                onChange={(e) => setEnhancedDeduction(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() =>
                saveFormMutation.mutate({
                  formType: "CT600L",
                  formData: { schemeType, qualifyingExpenditure, enhancedDeduction },
                  isIncluded: ct600lIncluded,
                })
              }
              disabled={saveFormMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save size={13} />
              <span>Save CT600L</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CT600E Editor */}
      {selectedForm === "CT600E" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Supplementary Form CT600E: Charities and CASC
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Claims for statutory exemption under Part 11 Corporation Tax Act 2010.
              </p>
            </div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ct600eIncluded}
                onChange={(e) => setCt600eIncluded(e.target.checked)}
                className="rounded border-slate-300 mr-1.5"
              />
              Include CT600E with Submission
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Charity Registration Number</label>
              <input
                type="text"
                value={charityRegNumber}
                onChange={(e) => setCharityRegNumber(e.target.value)}
                placeholder="e.g. 1234567"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={charityExemptionClaimed}
                onChange={(e) => setCharityExemptionClaimed(e.target.checked)}
                id="exemptionToggle"
                className="rounded border-slate-300"
              />
              <label htmlFor="exemptionToggle" className="text-slate-700 dark:text-slate-300">
                Claim full exemption on charitable trading & investment income
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() =>
                saveFormMutation.mutate({
                  formType: "CT600E",
                  formData: { charityRegNumber, charityExemptionClaimed },
                  isIncluded: ct600eIncluded,
                })
              }
              disabled={saveFormMutation.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save size={13} />
              <span>Save CT600E</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
