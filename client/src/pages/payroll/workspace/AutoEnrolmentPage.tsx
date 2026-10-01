import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Shield, Plus, Play, Download, Mail, Users,
  CheckCircle2, AlertTriangle, FileSpreadsheet, X,
  Building2, ArrowRight, FileText, Printer
} from "lucide-react";

export default function AutoEnrolmentPage() {
  return (
    <ClientPayrollLayout activeSection="Auto Enrolment">
      <AutoEnrolmentContent />
    </ClientPayrollLayout>
  );
}

function AutoEnrolmentContent() {
  const { clientId } = useClientPayroll();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"schemes" | "assessment" | "letters" | "papdis">("schemes");
  const [showSchemeModal, setShowSchemeModal] = useState(false);

  const [schemeForm, setSchemeForm] = useState({
    providerName: "NEST",
    schemeReference: "",
    employerId: "",
    stagingDate: new Date().getFullYear() + "-04-06",
    taxReliefType: "Relief at Source",
    employeeContributionPercent: "5.00",
    employerContributionPercent: "3.00",
    qualifyingEarningsCap: true,
  });

  // 1. Schemes
  const { data: schemes = [], isLoading: loadingSchemes } = useQuery<any[]>({
    queryKey: [`/api/payroll/pension-schemes/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/pension-schemes/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 2. Assessments
  const { data: assessments = [], isLoading: loadingAssess } = useQuery<any[]>({
    queryKey: [`/api/payroll/pension-assessments/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/pension-assessments/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 3. Letters
  const { data: letters = [], isLoading: loadingLetters } = useQuery<any[]>({
    queryKey: [`/api/payroll/pension-letters/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/pension-letters/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 4. Employees
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/employees`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [showLetterModal, setShowLetterModal] = useState(false);
  const [selectedLetterPreview, setSelectedLetterPreview] = useState<any>(null);
  const [letterForm, setLetterForm] = useState({
    employeeId: "",
    letterType: "Auto Enrolment Notice",
  });

  // Run Assessment Mutation
  const assessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/payroll/pensions/assess/${clientId}`, {});
      if (!res.ok) throw new Error("Failed to assess staff");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/pension-assessments/${clientId}`] });
    },
  });

  // Save Scheme Mutation
  const saveSchemeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/pension-schemes/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save scheme");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/pension-schemes/${clientId}`] });
      setShowSchemeModal(false);
    },
  });

  // Generate Letter Mutation
  const generateLetterMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/pensions/letters/generate/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to generate letter");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/pension-letters/${clientId}`] });
      setShowLetterModal(false);
      setLetterForm({ employeeId: "", letterType: "Auto Enrolment Notice" });
    },
  });

  const downloadPapdis = (schemeId: number) => {
    window.open(`/api/payroll/pensions/papdis/${schemeId}`, "_blank");
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workplace Pensions & Auto Enrolment</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pensions Regulator (TPR) statutory compliance: NEST, People's Pension, Smart Pension, automatic workforce assessments, and PAPDIS 1.1 file export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => assessMutation.mutate()}
            disabled={assessMutation.isPending}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Play size={13} /> {assessMutation.isPending ? "Assessing..." : "Run Auto Enrolment Assessment"}
          </button>
          <button
            onClick={() => setShowSchemeModal(true)}
            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} /> Add Pension Scheme
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white px-4 pt-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab("schemes")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "schemes"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building2 size={14} /> Pension Schemes ({schemes.length})
        </button>

        <button
          onClick={() => setActiveTab("assessment")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "assessment"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Users size={14} /> Statutory Workforce Assessment
        </button>

        <button
          onClick={() => setActiveTab("letters")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "letters"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Mail size={14} /> Statutory Letters & Notices ({letters.length})
        </button>

        <button
          onClick={() => setActiveTab("papdis")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "papdis"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileSpreadsheet size={14} /> PAPDIS 1.1 Data Export
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-xs">
        {/* SCHEMES TAB */}
        {activeTab === "schemes" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-gray-800">Qualifying Workplace Pension Schemes</h3>
            {loadingSchemes ? (
              <p className="text-xs text-gray-400 py-6 text-center">Loading pension schemes...</p>
            ) : schemes.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-gray-200 rounded-lg">
                <Shield size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-700">No Pension Schemes Configured</p>
                <p className="text-[11px] text-gray-400 mt-1 mb-3">
                  Connect your workplace pension provider (NEST, The People's Pension, Smart Pension, NOW: Pensions, etc.).
                </p>
                <button
                  onClick={() => setShowSchemeModal(true)}
                  className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} /> Add First Pension Scheme
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schemes.map((s) => (
                  <div key={s.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{s.schemeName || s.providerName || s.provider || "NEST Workplace Pension"}</h4>
                          <span className="text-[11px] text-gray-500 font-mono">Ref: {s.employerRef || s.schemeReference || "—"}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Qualifying Scheme
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block">EE Contribution</span>
                        <span className="font-mono font-bold text-gray-900">
                          {parseFloat(s.employeeContributionPercent || s.employeeRate || "5.00")}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">ER Contribution</span>
                        <span className="font-mono font-bold text-purple-700">
                          {parseFloat(s.employerContributionPercent || s.employerRate || "3.00")}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Tax Relief Method</span>
                        <span className="font-medium text-gray-700">{s.taxReliefType || s.earningsBasis || "Qualifying Earnings"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Staging Date</span>
                        <span className="font-medium text-gray-700">{s.stagingDate || "2022-04-06"}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => downloadPapdis(s.id)}
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={12} /> Download PAPDIS CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSESSMENT TAB */}
        {activeTab === "assessment" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-800">TPR Statutory Categorisation</h3>
                <p className="text-xs text-gray-500">Classifies staff as Eligible Jobholder, Non-Eligible Jobholder, or Entitled Worker</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-2.5">Staff Name</th>
                  <th className="px-4 py-2.5">Worker Category</th>
                  <th className="px-4 py-2.5">Assessment Date</th>
                  <th className="px-4 py-2.5">Qualifying Earnings</th>
                  <th className="px-4 py-2.5">Enrolment Status</th>
                  <th className="px-4 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingAssess ? (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-400">Loading assessments...</td></tr>
                ) : assessments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No assessment run yet. Click "Run Auto Enrolment Assessment" above to evaluate staff against TPR earnings triggers.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => {
                    const emp = employees.find((e) => e.id === a.employeeId);
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-semibold text-gray-800">
                          {emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : `Employee #${a.employeeId}`}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded font-semibold ${
                            a.workerCategory === "Eligible Jobholder"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {a.workerCategory}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">{a.assessmentDate}</td>
                        <td className="px-4 py-2.5 font-mono">£{Number(a.qualifyingEarnings || 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-700">{a.enrolmentStatus}</td>
                        <td className="px-4 py-2.5 text-gray-500">{a.actionRequired || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* LETTERS TAB */}
        {activeTab === "letters" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-800">Statutory Enrolment Letters & Notices</h3>
                <p className="text-xs text-gray-500">Legal notices required by The Pensions Regulator (TPR) to inform staff of their rights</p>
              </div>
              <button
                onClick={() => setShowLetterModal(true)}
                className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Plus size={13} /> Issue Statutory Notice
              </button>
            </div>

            {loadingLetters ? (
              <p className="text-xs text-gray-400 py-6 text-center">Loading letters...</p>
            ) : letters.length === 0 ? (
              <div className="py-8 text-center text-gray-400 border border-dashed rounded-xl">
                <Mail size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-700">No statutory pension letters issued yet</p>
                <p className="text-[11px] text-gray-400 mt-1 mb-3">When employees are assessed and auto-enrolled, legal notices must be provided within 6 weeks.</p>
                <button
                  onClick={() => setShowLetterModal(true)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-purple-100"
                >
                  <Plus size={12} /> Issue First Letter
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {letters.map((l) => {
                  const emp = employees.find(e => e.id === l.employeeId);
                  return (
                    <div key={l.id} className="p-3.5 border border-gray-200 rounded-xl flex items-center justify-between text-xs hover:bg-gray-50 bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{l.letterType}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {l.sentStatus || "Issued"}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-0.5">
                          Issued to: <strong className="text-gray-700">{emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : `Employee #${l.employeeId}`}</strong> • Date: {l.generatedDate || l.sentDate || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedLetterPreview({ ...l, employee: emp })}
                          className="px-2.5 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={12} /> View & Print Notice
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAPDIS TAB */}
        {activeTab === "papdis" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="font-bold text-sm text-gray-800">PAPDIS 1.1 Data Feed (Pensions Industry Standard)</h3>
            <p className="text-xs text-gray-600">
              The Payroll and Pension Data Interface Standard (PAPDIS) is the approved standard for communicating payroll pension contributions to NEST, The People's Pension, Smart Pension, and Aviva.
            </p>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <FileSpreadsheet size={16} /> Ready for Pension Portal Upload
              </div>
              <p className="text-xs text-purple-800">
                Select your qualifying pension scheme to export the verified PAPDIS CSV file containing employee NINO, pensionable pay, employee 5% deduction, and employer 3% contribution.
              </p>
              {schemes.length > 0 ? (
                <button
                  onClick={() => downloadPapdis(schemes[0].id)}
                  className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Download size={14} /> Download PAPDIS CSV ({schemes[0].providerName})
                </button>
              ) : (
                <p className="text-xs text-gray-500 italic">Please add a pension scheme first.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Scheme Modal */}
      {showSchemeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Workplace Pension Scheme</h3>
              <button onClick={() => setShowSchemeModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Pension Provider *</label>
                <select
                  value={schemeForm.providerName}
                  onChange={(e) => setSchemeForm({ ...schemeForm, providerName: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="NEST">NEST (National Employment Savings Trust)</option>
                  <option value="The People's Pension">The People's Pension</option>
                  <option value="Smart Pension">Smart Pension</option>
                  <option value="NOW: Pensions">NOW: Pensions</option>
                  <option value="Aviva">Aviva Workplace Pension</option>
                  <option value="Standard Life">Standard Life</option>
                  <option value="Royal London">Royal London</option>
                  <option value="Other">Other TPR Approved Master Trust</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Employer Scheme Ref</label>
                  <input
                    value={schemeForm.schemeReference}
                    onChange={(e) => setSchemeForm({ ...schemeForm, schemeReference: e.target.value })}
                    placeholder="e.g. EMP12345678"
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tax Relief Method</label>
                  <select
                    value={schemeForm.taxReliefType}
                    onChange={(e) => setSchemeForm({ ...schemeForm, taxReliefType: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="Relief at Source">Relief at Source (RAS)</option>
                    <option value="Net Pay Arrangement">Net Pay Arrangement (NPA)</option>
                    <option value="Salary Sacrifice">Salary Sacrifice</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Employee Contrib (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={schemeForm.employeeContributionPercent}
                    onChange={(e) => setSchemeForm({ ...schemeForm, employeeContributionPercent: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Employer Contrib (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={schemeForm.employerContributionPercent}
                    onChange={(e) => setSchemeForm({ ...schemeForm, employerContributionPercent: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowSchemeModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveSchemeMutation.mutate(schemeForm)}
                disabled={saveSchemeMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save Pension Scheme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Statutory Pension Notice Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Issue Statutory Pension Notice</h3>
                <p className="text-[11px] text-gray-500">The Pensions Regulator (TPR) statutory communications</p>
              </div>
              <button onClick={() => setShowLetterModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Select Employee *</label>
                <select
                  value={letterForm.employeeId}
                  onChange={(e) => setLetterForm({ ...letterForm, employeeId: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || `${emp.firstName} ${emp.lastName}`} (NINO: {emp.nationalInsuranceNumber || "—"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700">Notice Type *</label>
                <select
                  value={letterForm.letterType}
                  onChange={(e) => setLetterForm({ ...letterForm, letterType: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white font-medium"
                >
                  <option value="Auto Enrolment Notice">Auto Enrolment Notice (Eligible Jobholder)</option>
                  <option value="Postponement Notice">Postponement Notice (Up to 3 Months)</option>
                  <option value="Right to Opt In Notice">Right to Opt In Notice (Non-Eligible Jobholder)</option>
                  <option value="Right to Join Notice">Right to Join Notice (Entitled Worker)</option>
                  <option value="Opt Out Confirmation">Cessation / Opt Out Confirmation Notice</option>
                </select>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-[11px] text-purple-900">
                <p className="font-semibold mb-1">Pensions Regulator (TPR) Legal Rule:</p>
                <p className="text-purple-700">
                  Employers are legally mandated to write to every employee within 6 weeks of their assessment or auto-enrolment date to notify them of their pension rights and contribution rates.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowLetterModal(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={() => {
                  if (!letterForm.employeeId) return;
                  generateLetterMutation.mutate({
                    employeeId: parseInt(letterForm.employeeId),
                    letterType: letterForm.letterType,
                  });
                }}
                disabled={!letterForm.employeeId || generateLetterMutation.isPending}
                className="btn-SanSuite text-xs disabled:opacity-50"
              >
                {generateLetterMutation.isPending ? "Generating..." : "Generate & Issue Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Pension Letter Preview Modal (Printable) */}
      {selectedLetterPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden">
            {/* Modal Actions Bar (hidden when printing) */}
            <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-400" />
                <span className="font-bold text-xs uppercase tracking-wide">Statutory Letter Preview — {selectedLetterPreview.letterType}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={13} /> Print Notice
                </button>
                <button
                  onClick={() => setSelectedLetterPreview(null)}
                  className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Printable Formal Letter Body */}
            <div className="p-8 sm:p-12 space-y-6 text-gray-800 font-sans text-xs leading-relaxed bg-white">
              {/* Letter Header */}
              <div className="border-b border-gray-200 pb-5 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">
                    {schemes[0]?.providerName ? `${schemes[0].providerName} Workplace Pension` : "Workplace Pension Scheme"}
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Statutory Automatic Enrolment Workplace Pension Communication</p>
                  <p className="text-[11px] text-gray-500">Scheme Reference: <span className="font-mono">{schemes[0]?.schemeReference || "EMP-PENSION-001"}</span></p>
                </div>
                <div className="text-right text-[11px] text-gray-500">
                  <p className="font-semibold text-gray-800">Date of Notice:</p>
                  <p>{selectedLetterPreview.generatedDate || new Date().toLocaleDateString("en-GB")}</p>
                </div>
              </div>

              {/* Addressee */}
              <div className="space-y-1">
                <p className="font-bold text-sm text-gray-900">
                  {selectedLetterPreview.employee?.name || `${selectedLetterPreview.employee?.firstName || ''} ${selectedLetterPreview.employee?.lastName || ''}` || "Valued Employee"}
                </p>
                <p className="text-gray-600">National Insurance Number: <span className="font-mono font-medium">{selectedLetterPreview.employee?.nationalInsuranceNumber || "QQ123456A"}</span></p>
                <p className="text-gray-600">Tax Code: <span className="font-mono font-medium">{selectedLetterPreview.employee?.taxCode || "1257L"}</span></p>
              </div>

              {/* Subject */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-900 uppercase tracking-wide">
                  Subject: {selectedLetterPreview.letterType} — Pensions Act 2008 Notice
                </p>
              </div>

              {/* Letter Text by Type */}
              {selectedLetterPreview.letterType === "Postponement Notice" ? (
                <div className="space-y-3 text-gray-700">
                  <p>Dear {selectedLetterPreview.employee?.firstName || "Employee"},</p>
                  <p>
                    We are writing to advise you that we are postponing your auto enrolment assessment into a workplace pension under Section 4 of the Pensions Act 2008.
                  </p>
                  <p>
                    Your statutory postponement period will conclude on <strong>{new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString("en-GB")}</strong>. On or before that date, we will assess your age and earnings to determine your qualifying status.
                  </p>
                  <p>
                    <strong>Your Right to Opt In:</strong> Even though we have postponed your automatic enrolment, you have the right under UK law to join the pension scheme immediately if you want to. If you choose to join, we will contribute our employer share into your retirement pot.
                  </p>
                </div>
              ) : selectedLetterPreview.letterType === "Right to Opt In Notice" || selectedLetterPreview.letterType === "Right to Join Notice" ? (
                <div className="space-y-3 text-gray-700">
                  <p>Dear {selectedLetterPreview.employee?.firstName || "Employee"},</p>
                  <p>
                    Under UK law, employers must automatically enrol employees who meet specific criteria (aged 22 to State Pension age and earning over £10,000 per year / £833 monthly).
                  </p>
                  <p>
                    While you do not currently meet all the statutory requirements for automatic enrolment, you retain the legal right to opt into or join our qualifying workplace pension scheme: <strong>{schemes[0]?.providerName || "Approved Pension Provider"}</strong>.
                  </p>
                  <p>
                    If you choose to opt in, we will deduct employee contributions directly from your pay and, if your earnings exceed the lower earnings threshold, we will make qualifying employer contributions on your behalf.
                  </p>
                </div>
              ) : selectedLetterPreview.letterType === "Opt Out Confirmation" ? (
                <div className="space-y-3 text-gray-700">
                  <p>Dear {selectedLetterPreview.employee?.firstName || "Employee"},</p>
                  <p>
                    We confirm receipt of your official opt-out / cessation notice from our workplace pension scheme.
                  </p>
                  <p>
                    In accordance with statutory regulations, your pension contributions will cease immediately. Any deductions taken within the valid 1-month opt-out window will be fully refunded to you through the next available payroll run.
                  </p>
                  <p>
                    Please note that under UK law, we are required to re-assess and automatically re-enrol eligible staff every three years (Cyclical Re-enrolment).
                  </p>
                </div>
              ) : (
                /* Standard Auto Enrolment Notice */
                <div className="space-y-3 text-gray-700">
                  <p>Dear {selectedLetterPreview.employee?.firstName || "Employee"},</p>
                  <p>
                    To help people save more for their retirement, the UK government now requires employers to automatically enrol certain workers into a workplace pension scheme and pay into it.
                  </p>
                  <p>
                    We have enrolled you into our qualifying workplace pension scheme with <strong>{schemes[0]?.providerName || "NEST Workplace Pension"}</strong>.
                  </p>

                  <div className="my-4 border border-purple-200 bg-purple-50/50 rounded-xl p-4 space-y-2">
                    <p className="font-bold text-purple-950 uppercase tracking-wide text-[11px]">Summary of Pension Contributions</p>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-gray-500">Your Contribution:</span>
                        <p className="font-bold text-gray-900 font-mono">5.00% of Qualifying Earnings</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Employer Contribution:</span>
                        <p className="font-bold text-gray-900 font-mono">3.00% of Qualifying Earnings</p>
                      </div>
                      <div className="col-span-2 text-gray-600 border-t border-purple-200 pt-2">
                        Qualifying earnings band for 2024/25: Earnings between <strong>£520/month</strong> (£6,240/yr) and <strong>£4,189/month</strong> (£50,270/yr).
                      </div>
                    </div>
                  </div>

                  <p>
                    <strong>Tax Relief:</strong> Under HMRC rules, you receive tax relief on your pension contributions, meaning money that would have gone to the government as income tax is instead added to your pension savings.
                  </p>

                  <p>
                    <strong>Your Right to Opt Out:</strong> If you do not want to remain enrolled, you have the legal right to opt out within one month of receiving your welcome pack from the pension provider. If you opt out within this one-month window, any payments deducted will be refunded to you in full.
                  </p>
                </div>
              )}

              {/* Signoff */}
              <div className="pt-6 border-t border-gray-200 flex justify-between items-end">
                <div>
                  <p className="font-semibold text-gray-900">Signed on behalf of the Employer</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">SanSuite Payroll & Workplace Pensions Administration</p>
                </div>
                <div className="text-right text-[10px] text-gray-400">
                  <p>Statutory Reference: The Pensions Regulator (TPR)</p>
                  <p>Pensions Act 2008 • Section 3, 4 & 5 Compliance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
