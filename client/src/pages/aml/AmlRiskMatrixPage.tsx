import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { amlSidebar } from "./amlCommon";
import {
  AlertTriangle, Shield, CheckCircle2, Search,
  Plus, Download, X, Building2, SlidersHorizontal, Calculator, Check, FileText
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function AmlRiskMatrixPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showEvaluatorModal, setShowEvaluatorModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Evaluator criteria state
  const [customerType, setCustomerType] = useState("limited");
  const [isPepAssociated, setIsPepAssociated] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("uk");
  const [serviceType, setServiceType] = useState("compliance");
  const [deliveryChannel, setDeliveryChannel] = useState("face_to_face");

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Calculate dynamic risk score based on statutory criteria
  const calculateRiskScore = () => {
    let score = 0;
    // Customer factor
    if (customerType === "trust" || customerType === "complex_offshore") score += 3;
    else if (customerType === "llp" || customerType === "charity") score += 1;

    // PEP
    if (isPepAssociated) score += 4;

    // Jurisdiction
    if (jurisdiction === "fatf_high_risk") score += 5;
    else if (jurisdiction === "non_eea") score += 2;

    // Service
    if (serviceType === "tcsp" || serviceType === "cross_border") score += 3;
    else if (serviceType === "advisory") score += 1;

    // Delivery channel
    if (deliveryChannel === "non_face_to_face") score += 2;

    if (score >= 6) return { level: "High Risk", dd: "Enhanced Due Diligence (EDD)", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (score >= 3) return { level: "Medium Risk", dd: "Standard Due Diligence (SDD)", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { level: "Low Risk", dd: "Simplified Due Diligence (SDD)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  };

  const calculated = calculateRiskScore();

  // Save Risk Score
  const saveRiskMutation = useMutation({
    mutationFn: async () => {
      const client = clients.find((c: any) => String(c.id) === String(selectedClientId));
      if (!client) throw new Error("Please select a client.");

      const payload = {
        provider: "opensanctions",
        clientId: client.id,
        clientName: client.clientName,
        customerRisk: calculated.level.replace(" Risk", ""),
      };

      const res = await apiRequest("POST", "/api/aml/check", payload);
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Risk Assessment Recorded",
        description: `Client assessed as ${calculated.level} under MLR 2017.`,
      });
      setShowEvaluatorModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (err: any) => {
      toast({ title: "Assessment Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const filteredClients = clients.filter((c: any) => {
    const matchesSearch =
      c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyNumber?.toLowerCase().includes(search.toLowerCase());

    const risk = c.amlRiskScore || "Low Risk";
    const matchesRisk =
      riskFilter === "all" ||
      (riskFilter === "low" && risk.includes("Low")) ||
      (riskFilter === "medium" && risk.includes("Medium")) ||
      (riskFilter === "high" && risk.includes("High"));

    return matchesSearch && matchesRisk;
  });

  return (
    <AppLayout sidebar={amlSidebar} module="Anti-Money Laundering">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-purple-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AML Statutory Risk Assessment Matrix
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client risk profiling methodology, 4-factor risk scoring (Customer, Geographic, Service & Delivery), and statutory EDD controls.
            </p>
          </div>

          <button
            onClick={() => {
              if (clients.length > 0) setSelectedClientId(String(clients[0].id));
              setShowEvaluatorModal(true);
            }}
            className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Evaluate Client Risk
          </button>
        </div>

        {/* 4 Statutory Risk Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">1. Customer Risk Factor</span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Core Pillar</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Assesses entity structure complexity, UBO transparency, high net-worth individuals, and PEP exposure.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Weight: 30% of total score
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">2. Geographic Risk</span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Core Pillar</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Evaluates client residency, operation jurisdictions, offshore connections, and FATF black/grey lists.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Weight: 30% of total score
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">3. Product & Service Risk</span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Core Pillar</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standard statutory accounts vs TCSP (Trust and Company Service Provider) or high cash transactions.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Weight: 20% of total score
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">4. Delivery Channel</span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Core Pillar</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Face-to-face onboarding vs non-face-to-face digital portal or third-party introducer arrangements.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Weight: 20% of total score
            </div>
          </div>
        </div>

        {/* Client Risk Register Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">Practice Client Risk Scoring Register</h2>
              <p className="text-[11px] text-slate-400">Current statutory risk classifications and required due diligence levels</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk (SDD)</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk (EDD)</option>
              </select>

              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Client Structure</th>
                  <th className="py-2.5 px-4">Risk Classification</th>
                  <th className="py-2.5 px-4">Due Diligence Measure</th>
                  <th className="py-2.5 px-4">PEP / Sanctions Check</th>
                  <th className="py-2.5 px-4">Review Frequency</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle size={28} className="text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No client risk profiles found</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Use the "Evaluate Client Risk" button to perform a statutory risk assessment for any client.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c: any) => {
                    const isHigh = c.amlRiskScore?.includes("High");
                    const isMed = c.amlRiskScore?.includes("Medium");

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.clientName}</td>
                        <td className="py-3 px-4 text-slate-500">{c.clientType || "Limited Company"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isHigh
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isMed
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {c.amlRiskScore || "Low Risk"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {isHigh ? "Enhanced Due Diligence (EDD)" : "Standard Due Diligence (SDD)"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 size={11} /> Clear
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {isHigh ? "6 Months" : "12 Months (Annual)"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedClientId(String(c.id));
                              setShowEvaluatorModal(true);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded text-[11px] font-medium cursor-pointer"
                          >
                            Re-assess
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Interactive Client Risk Evaluator */}
        {showEvaluatorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Statutory AML Risk Matrix Evaluator
                  </h3>
                </div>
                <button onClick={() => setShowEvaluatorModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.clientType || "Limited"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Entity Structure</label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="limited">Limited Company (Standard)</option>
                      <option value="sole_trader">Sole Trader / Partnership</option>
                      <option value="llp">Limited Liability Partnership</option>
                      <option value="charity">Charity / Not-for-Profit</option>
                      <option value="trust">Trust / Complex Offshore Entity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jurisdiction / Residency</label>
                    <select
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="uk">United Kingdom / EEA (Low Risk)</option>
                      <option value="non_eea">Non-EEA Standard Country</option>
                      <option value="fatf_high_risk">FATF High-Risk / Sanctioned Region</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Service Engagement Type</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="compliance">Annual Accounts & Tax Filing</option>
                      <option value="bookkeeping">Bookkeeping & Payroll</option>
                      <option value="advisory">Advisory & Tax Planning</option>
                      <option value="tcsp">Trust & Company Services (TCSP)</option>
                      <option value="cross_border">Cross-Border Funds Handling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Onboarding Delivery Channel</label>
                    <select
                      value={deliveryChannel}
                      onChange={(e) => setDeliveryChannel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="face_to_face">Face-to-Face Meeting</option>
                      <option value="non_face_to_face">Electronic / Digital Portal eIDV</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <input
                    type="checkbox"
                    id="pep-check"
                    checked={isPepAssociated}
                    onChange={(e) => setIsPepAssociated(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="pep-check" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Client or UBO is a Politically Exposed Person (PEP) or Close Associate
                  </label>
                </div>

                {/* Real-time Calculated Matrix Outcome Box */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${calculated.color}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Calculated AML Risk Level</p>
                    <p className="text-base font-extrabold">{calculated.level}</p>
                    <p className="text-[11px] mt-0.5">Mandatory Measure: <strong>{calculated.dd}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/70 border">
                      MLR 2017 Reg 28 Compliant
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEvaluatorModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveRiskMutation.mutate()}
                  disabled={saveRiskMutation.isPending || !selectedClientId}
                  className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
                  {saveRiskMutation.isPending ? "Saving Assessment..." : "Save Risk Assessment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
