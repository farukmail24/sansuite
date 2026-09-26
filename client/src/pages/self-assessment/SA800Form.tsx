import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, Save, FileText, ChevronRight, User, Users,
  CheckCircle2, AlertCircle, HelpCircle, Settings, Plus, Trash2,
  Shield, Building2, RefreshCw
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

interface PartnerAllocation {
  id: string;
  name: string;
  utr: string;
  sharePercent: number;
}

export default function SA800Form() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);

  const [form, setForm] = useState({
    taxYear: "2024-25",
    tradingProfit: "0.00",
    propertyIncome: "0.00",
    untaxedInterest: "0.00",
    partnershipNetProfit: "0.00",
  });

  // Nominated Partner & Statement State (Capium Art 21, 26, 46)
  const [nominatedPartner, setNominatedPartner] = useState("");
  const [nominatedPartnerDeclaration, setNominatedPartnerDeclaration] = useState(false);
  const [partners, setPartners] = useState<PartnerAllocation[]>([]);

  // 1. Fetch Practice Clients
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const partnershipClients = clients.filter((c: any) => c.clientType === "Partnership");

  // 2. Fetch SA800 Returns for Selected Partnership
  const { data: returns = [], isLoading: loadingReturns } = useQuery({
    queryKey: [`/api/self-assessment/sa800/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/self-assessment/sa800/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Auto-sync form when return is selected
  useEffect(() => {
    if (returns.length > 0) {
      const target = selectedReturnId ? returns.find((r: any) => r.id === selectedReturnId) : returns[0];
      if (target) {
        setSelectedReturnId(target.id);
        setForm({
          taxYear: target.taxYear || "2024-25",
          tradingProfit: target.tradingProfit || target.grossReceipts || "0.00",
          propertyIncome: target.propertyIncome || "0.00",
          untaxedInterest: target.untaxedInterest || "0.00",
          partnershipNetProfit: target.partnershipNetProfit || target.netProfit || "0.00",
        });
        setNominatedPartner(target.nominatedPartner || "");
        if (target.partnershipStatement) {
          try {
            const parsed = typeof target.partnershipStatement === "string" ? JSON.parse(target.partnershipStatement) : target.partnershipStatement;
            if (Array.isArray(parsed.partners)) {
              setPartners(parsed.partners);
            }
            if (parsed.nominatedPartnerDeclaration) {
              setNominatedPartnerDeclaration(true);
            }
          } catch {}
        }
      }
    } else {
      setSelectedReturnId(null);
    }
  }, [returns, selectedReturnId]);

  const totalNetProfit = (
    parseFloat(form.tradingProfit || "0") +
    parseFloat(form.propertyIncome || "0") +
    parseFloat(form.untaxedInterest || "0")
  );

  // Add Partner
  const handleAddPartner = () => {
    const newPartner: PartnerAllocation = {
      id: "partner_" + Date.now(),
      name: "",
      utr: "",
      sharePercent: partners.length === 0 ? 100 : 0,
    };
    setPartners([...partners, newPartner]);
  };

  // Remove Partner
  const handleRemovePartner = (index: number) => {
    const updated = partners.filter((_, i) => i !== index);
    setPartners(updated);
  };

  // Equalize Share %
  const handleEqualizeShares = () => {
    if (partners.length === 0) return;
    const equalShare = parseFloat((100 / partners.length).toFixed(2));
    const updated = partners.map((p, idx) => ({
      ...p,
      sharePercent: idx === partners.length - 1 ? parseFloat((100 - equalShare * (partners.length - 1)).toFixed(2)) : equalShare,
    }));
    setPartners(updated);
  };

  // Save SA800 Return Mutation
  const saveReturn = useMutation({
    mutationFn: async () => {
      const statementPayload = {
        partners,
        nominatedPartner,
        nominatedPartnerDeclaration,
        updatedAt: new Date().toISOString(),
      };

      const payload = {
        id: selectedReturnId,
        clientId,
        ...form,
        partnershipNetProfit: totalNetProfit.toFixed(2),
        nominatedPartner,
        partnershipStatement: statementPayload,
      };

      const res = await apiRequest("POST", "/api/self-assessment/sa800", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save SA800 return" }));
        throw new Error(err.error || "Failed to save SA800 return");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SA800 Saved Successfully",
        description: "Partnership return and profit allocation statement saved.",
        type: "success",
      });
      if (data.id) setSelectedReturnId(data.id);
      qc.invalidateQueries({ queryKey: [`/api/self-assessment/sa800/${clientId}`] });
    },
    onError: (e: any) => toast({ title: "Save Error", description: e.message, type: "error" }),
  });

  // Submit to HMRC Mutation
  const submitToHmrc = useMutation({
    mutationFn: async (id: number) => {
      if (!nominatedPartner) {
        throw new Error("Nominated partner is mandatory before submitting SA800 to HMRC (Declaration Box 1).");
      }
      if (!nominatedPartnerDeclaration) {
        throw new Error("Nominated partner declaration must be confirmed before submitting to HMRC.");
      }

      const res = await apiRequest("PATCH", `/api/self-assessment/sa800/${id}`, {
        status: "Submitted",
        nominatedPartner,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(err.error || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Submitted to HMRC Gateway",
        description: "SA800 Partnership return successfully accepted.",
        type: "success",
      });
      qc.invalidateQueries({ queryKey: [`/api/self-assessment/sa800/${clientId}`] });
    },
    onError: (e: any) => toast({ title: "HMRC Submission Error", description: e.message, type: "error" }),
  });

  const selectedClient = partnershipClients.find((c: any) => String(c.id) === String(clientId));

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6 text-xs space-y-6">
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              SA800 Partnership Tax Return & Statement
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              HMRC Statutory Partnership Return with Pages 6-7 Partner Profit Allocation Statement (Capium Art 21, 26, 46).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={!clientId || saveReturn.isPending}
              onClick={() => saveReturn.mutate()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saveReturn.isPending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={13} />
                  Save Draft Return
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Return Form (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Partnership Selector Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building2 size={15} className="text-purple-600" />
                Select Partnership & Tax Year
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Partnership Client
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setSelectedReturnId(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="">Select Partnership Client...</option>
                    {partnershipClients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} (UTR: {c.utrNumber || "Not Set"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax Year
                  </label>
                  <select
                    value={form.taxYear}
                    onChange={(e) => setForm({ ...form, taxYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                  </select>
                </div>
              </div>
            </div>

            {clientId ? (
              <>
                {/* 1. Partnership Income Breakdown (SA800) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <FileText size={15} className="text-purple-600" />
                        Partnership Income & Trading Profit (SA800)
                      </h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Statutory boxes for trading profits, property income, and untaxed interest</p>
                    </div>
                    <span className="font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                      Total: £{totalNetProfit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-800/20">
                      <div>
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Trading and Professional Profits</p>
                        <p className="text-[10px] text-slate-400">Box 3.83 to 3.116 (Net allowable business profits)</p>
                      </div>
                      <div className="w-full sm:w-48 relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={form.tradingProfit}
                          onChange={(e) => setForm({ ...form, tradingProfit: e.target.value })}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-right outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-800/20">
                      <div>
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">UK Property Income</p>
                        <p className="text-[10px] text-slate-400">Box 1.1 to 1.40 (Rental business profits)</p>
                      </div>
                      <div className="w-full sm:w-48 relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={form.propertyIncome}
                          onChange={(e) => setForm({ ...form, propertyIncome: e.target.value })}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-right outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-800/20">
                      <div>
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Untaxed Interest & Alternative Finance Receipts</p>
                        <p className="text-[10px] text-slate-400">Box 7.1 to 7.9 (Bank interest received)</p>
                      </div>
                      <div className="w-full sm:w-48 relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                        <input
                          type="number"
                          step="0.01"
                          value={form.untaxedInterest}
                          onChange={(e) => setForm({ ...form, untaxedInterest: e.target.value })}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-right outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-purple-200 dark:border-purple-800/80 rounded-lg bg-purple-50/60 dark:bg-purple-950/40">
                      <div>
                        <p className="font-bold text-xs text-purple-900 dark:text-purple-200">Total Partnership Net Profit</p>
                        <p className="text-[10px] text-purple-700 dark:text-purple-400">Statutory sum available for partner allocation</p>
                      </div>
                      <div className="w-full sm:w-48 text-right font-mono font-black text-sm text-purple-900 dark:text-purple-100 py-1.5 pr-3">
                        £{totalNetProfit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Partnership Statement: Pages 6-7 Allocation (Capium Art 21, 26, 46) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Users size={15} className="text-purple-600" />
                        Partnership Statement (Pages 6-7): Profit Allocation
                      </h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Assign each partner's share %; figures dynamically link to SA104 schedules for self assessment.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {partners.length > 1 && (
                        <button
                          type="button"
                          onClick={handleEqualizeShares}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Equalize %
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddPartner}
                        className="px-3 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Partner</span>
                      </button>
                    </div>
                  </div>

                  {partners.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400">
                      No partners added yet. Click "+ Add Partner" to allocate profits between partners.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {partners.map((partner, index) => {
                        const tradingShare = (parseFloat(form.tradingProfit || "0") * (partner.sharePercent / 100));
                        const totalShare = (totalNetProfit * (partner.sharePercent / 100));

                        return (
                          <div
                            key={partner.id || index}
                            className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <User size={13} className="text-purple-600" />
                                Partner #{index + 1}: {partner.name || "Unnamed"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePartner(index)}
                                className="text-red-500 hover:text-red-700 text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Partner Full Name</label>
                                <input
                                  type="text"
                                  value={partner.name}
                                  onChange={(e) => {
                                    const updated = [...partners];
                                    updated[index].name = e.target.value;
                                    setPartners(updated);
                                  }}
                                  placeholder="e.g. John Doe"
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Individual UTR (10 Digits)</label>
                                <input
                                  type="text"
                                  maxLength={10}
                                  value={partner.utr}
                                  onChange={(e) => {
                                    const updated = [...partners];
                                    updated[index].utr = e.target.value;
                                    setPartners(updated);
                                  }}
                                  placeholder="1234567890"
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono outline-none focus:ring-2 focus:ring-purple-500/20"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 uppercase">Profit Share %</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={partner.sharePercent}
                                  onChange={(e) => {
                                    const updated = [...partners];
                                    updated[index].sharePercent = parseFloat(e.target.value || "0");
                                    setPartners(updated);
                                  }}
                                  placeholder="50"
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-500/20"
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-[11px]">
                              <span className="text-slate-500">Allocated Trading Profit: <strong className="text-slate-800 dark:text-slate-200 font-mono">£{tradingShare.toFixed(2)}</strong></span>
                              <span className="text-slate-500">Allocated Total Profit: <strong className="text-purple-600 font-mono">£{totalShare.toFixed(2)}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Nominated Partner Declaration (Capium Art 46: 9000271637) */}
                  <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
                    <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                      <Shield size={15} className="text-purple-600" />
                      <span>Nominated Partner Declaration (Box 1)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Nominated Partner Signatory
                        </label>
                        <select
                          value={nominatedPartner}
                          onChange={(e) => setNominatedPartner(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value="">Select Nominated Partner...</option>
                          {partners.map((p, idx) => (
                            <option key={idx} value={p.name || `Partner ${idx + 1}`}>
                              {p.name || `Partner #${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={nominatedPartnerDeclaration}
                            onChange={(e) => setNominatedPartnerDeclaration(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>I declare that I am the nominated partner and figures are complete</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
                <Building2 size={36} className="text-purple-600 mx-auto mb-3 opacity-60" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Partnership Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Please select a registered partnership client above to create or manage SA800 tax returns and partner statements.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Saved Returns List */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={15} className="text-purple-600" />
                  Saved SA800 Returns
                </h3>
              </div>

              <div className="p-0">
                {!clientId ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Select a client to view their SA800 returns.
                  </div>
                ) : loadingReturns ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw size={13} className="animate-spin text-purple-600" />
                    <span>Loading returns...</span>
                  </div>
                ) : returns.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No returns found for this partnership. Click "Save Draft Return" to create one.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {returns.map((r: any) => {
                      const isSelected = r.id === selectedReturnId;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReturnId(r.id)}
                          className={`p-4 flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? "bg-purple-50/40 dark:bg-purple-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {r.taxYear} Return
                              </p>
                              {isSelected && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.2 rounded font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Status:{" "}
                              <span className={`font-semibold ${r.status === "Submitted" ? "text-emerald-600" : "text-amber-600"}`}>
                                {r.status}
                              </span>
                              {r.nominatedPartner && ` • Signatory: ${r.nominatedPartner}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {r.status === "Draft" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  submitToHmrc.mutate(r.id);
                                }}
                                disabled={submitToHmrc.isPending}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span>Submit</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                            {r.status === "Submitted" && (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Filing Reminder Card */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Shield size={14} className="text-purple-600" />
                <span>Statutory HMRC SA800 Filing Rules</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Under Taxes Management Act 1970 s12AA, all partners must file their individual SA104 supplementary returns corresponding with this SA800 statement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
