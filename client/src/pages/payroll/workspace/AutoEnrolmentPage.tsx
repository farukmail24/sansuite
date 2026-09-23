import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Shield, Plus, Play, Download, Mail, Users,
  CheckCircle2, AlertTriangle, FileSpreadsheet, X,
  Building2, ArrowRight
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

  // Run Assessment Mutation
  const assessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/payroll/pensions/assess/${clientId}`, {});
      if (!res.ok) throw new Error("Failed to assess staff");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/pension-assessments/${clientId}`] });
      alert(`Assessment Complete! Assessed ${data.assessedCount} staff members. ${data.eligibleCount} Eligible Jobholders identified.`);
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

  const downloadPapdis = (schemeId: number) => {
    window.open(`/api/payroll/pensions/papdis/${schemeId}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
                          <h4 className="font-bold text-sm text-gray-900">{s.providerName}</h4>
                          <span className="text-[11px] text-gray-500 font-mono">Ref: {s.schemeReference || "—"}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Qualifying Scheme
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block">EE Contribution</span>
                        <span className="font-mono font-bold text-gray-900">{Number(s.employeeContributionPercent)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">ER Contribution</span>
                        <span className="font-mono font-bold text-purple-700">{Number(s.employerContributionPercent)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Tax Relief Method</span>
                        <span className="font-medium text-gray-700">{s.taxReliefType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Staging Date</span>
                        <span className="font-medium text-gray-700">{s.stagingDate || "Enrolled"}</span>
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
            <h3 className="font-bold text-sm text-gray-800">Statutory Enrolment Letters & Notices</h3>
            {loadingLetters ? (
              <p className="text-xs text-gray-400 py-6 text-center">Loading letters...</p>
            ) : letters.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Mail size={24} className="mx-auto text-gray-300 mb-1" />
                No statutory pension letters issued. When employees are assessed and auto-enrolled, statutory notices are generated here.
              </div>
            ) : (
              <div className="space-y-2">
                {letters.map((l) => (
                  <div key={l.id} className="p-3 border border-gray-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{l.letterType} Notice</p>
                      <p className="text-gray-500 text-[11px]">Issued on: {l.issueDate || "—"}</p>
                    </div>
                    <button className="text-purple-700 hover:underline flex items-center gap-1 cursor-pointer font-medium">
                      <Download size={12} /> Download PDF
                    </button>
                  </div>
                ))}
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
    </div>
  );
}
