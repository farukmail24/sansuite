import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Percent, AlertCircle, Globe, Repeat, Plus, Trash2, Tag, ShieldCheck, Landmark } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

const DEFAULT_VAT_CODES = [
  { code: "T0", description: "Zero Rated", rate: 0 },
  { code: "T1", description: "Standard Rate", rate: 20 },
  { code: "T2", description: "Exempt", rate: 0 },
  { code: "T5", description: "Reduced Rate", rate: 5 },
  { code: "T7", description: "Zero Rated Goods (EC Supplier)", rate: 0 },
  { code: "T8", description: "Standard Rated Goods (EC Supplier)", rate: 20 },
  { code: "T9", description: "Outside Scope of VAT", rate: 0 },
  { code: "RC", description: "Domestic Reverse Charge", rate: 20 },
  { code: "PVA", description: "Postponed VAT Accounting (Import)", rate: 20 },
];

export default function VatSettingsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/vat-settings");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"general" | "codes">("general");

  const [formData, setFormData] = useState({
    vatNumber: "",
    vatScheme: "Standard",
    vatSubmitType: "Quarterly",
    flatRatePercentage: "",
    // New fields
    postponedVat: false,
    domesticReverseCharge: false,
    domesticReverseChargeNonCIS: false,
    bankReconciliationMode: "Manual",
  });

  const [vatCodes, setVatCodes] = useState(DEFAULT_VAT_CODES);
  const [newCode, setNewCode] = useState({ code: "", description: "", rate: 0 });
  const [showAddCode, setShowAddCode] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  useEffect(() => {
    if (client) {
      setFormData(prev => ({
        ...prev,
        vatNumber: client.vatNumber || "",
        vatScheme: client.vatScheme || "Standard",
        vatSubmitType: client.vatSubmitType || "Quarterly",
        flatRatePercentage: client.flatRatePercentage || "",
        postponedVat: client.postponedVat || false,
        domesticReverseCharge: client.domesticReverseCharge || false,
        domesticReverseChargeNonCIS: client.domesticReverseChargeNonCIS || false,
        bankReconciliationMode: client.bankReconciliationMode || "Manual",
      }));
    }
  }, [client]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/practice/clients/${clientId}`, {
        vatNumber: formData.vatNumber,
        vatScheme: formData.vatScheme,
        vatSubmitType: formData.vatSubmitType,
        flatRatePercentage: formData.flatRatePercentage || null,
        postponedVat: formData.postponedVat,
        domesticReverseCharge: formData.domesticReverseCharge,
        domesticReverseChargeNonCIS: formData.domesticReverseChargeNonCIS,
        bankReconciliationMode: formData.bankReconciliationMode,
      });
      if (!res.ok) throw new Error("Failed to save VAT settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Settings Saved", description: "VAT Settings updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const addVatCode = () => {
    if (!newCode.code || !newCode.description) return;
    setVatCodes(prev => [...prev, { ...newCode }]);
    setNewCode({ code: "", description: "", rate: 0 });
    setShowAddCode(false);
    toast({ title: "VAT Code Added", description: `${newCode.code} — ${newCode.description}` });
  };

  const removeVatCode = (code: string) => {
    setVatCodes(prev => prev.filter(c => c.code !== code));
  };

  if (!clientId) {
    return <ClientGuard featureTitle="VAT Settings" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800">VAT Settings</span>
          </div>
          <button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saveSettings.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex gap-6 text-sm font-medium">
            {[
              { id: "general", label: "General VAT Settings", icon: <Percent size={14} /> },
              { id: "codes", label: "VAT Codes", icon: <Tag size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${activeTab === tab.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-6">

          {activeTab === "general" && (
            <>
              {/* VAT Configuration */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <Percent size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">VAT Configuration</h2>
                    <p className="text-sm text-gray-500">Manage VAT registration and scheme details.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Registration Number</label>
                      <input type="text" value={formData.vatNumber} onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })} placeholder="e.g. GB123456789" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Accounting Scheme</label>
                      <select value={formData.vatScheme} onChange={(e) => setFormData({ ...formData, vatScheme: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        <option value="Standard">Standard Accrual</option>
                        <option value="Cash">Cash Accounting</option>
                        <option value="FlatRate">Flat Rate Scheme</option>
                        <option value="AnnualAccounting">Annual Accounting</option>
                        <option value="MarginScheme">Margin Scheme</option>
                      </select>
                    </div>
                    {formData.vatScheme === "FlatRate" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Flat Rate Percentage (%)</label>
                        <input type="number" step="0.1" value={formData.flatRatePercentage} onChange={(e) => setFormData({ ...formData, flatRatePercentage: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filing Frequency</label>
                      <select value={formData.vatSubmitType} onChange={(e) => setFormData({ ...formData, vatSubmitType: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                        <option value="Quarterly">Quarterly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special VAT Schemes */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Special VAT Treatments</h2>
                    <p className="text-sm text-gray-500">Post-Brexit and construction industry VAT rules.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Postponed VAT */}
                  <div className="flex items-start justify-between p-4 border border-gray-200 rounded-xl">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800">Postponed VAT Accounting (PVA)</p>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Post-Brexit</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        For businesses importing goods into the UK. PVA allows import VAT to be accounted for on the VAT return rather than paying at the border. Applies from 1 January 2021.
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData(p => ({ ...p, postponedVat: !p.postponedVat }))}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${formData.postponedVat ? "bg-purple-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.postponedVat ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* DRC - CIS */}
                  <div className="flex items-start justify-between p-4 border border-gray-200 rounded-xl">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800">Domestic Reverse Charge — CIS</p>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">CIS Construction</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Applies to VAT-registered businesses in the Construction Industry Scheme (CIS) from 1 March 2021. The customer accounts for the VAT instead of the supplier.
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData(p => ({ ...p, domesticReverseCharge: !p.domesticReverseCharge }))}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${formData.domesticReverseCharge ? "bg-purple-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.domesticReverseCharge ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {/* DRC - Non-CIS */}
                  <div className="flex items-start justify-between p-4 border border-gray-200 rounded-xl">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800">Domestic Reverse Charge — Non-CIS</p>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">Other Sectors</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Applies to specified goods/services outside CIS (e.g. mobile phones, computer chips, gas/electricity certificates) where the buyer must self-account for VAT.
                      </p>
                    </div>
                    <button
                      onClick={() => setFormData(p => ({ ...p, domesticReverseChargeNonCIS: !p.domesticReverseChargeNonCIS }))}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${formData.domesticReverseChargeNonCIS ? "bg-purple-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.domesticReverseChargeNonCIS ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bank Reconciliation Mode */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Bank Reconciliation</h2>
                    <p className="text-sm text-gray-500">Set whether bank reconciliation runs automatically or manually.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  {["Manual", "Auto"].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setFormData(p => ({ ...p, bankReconciliationMode: mode }))}
                      className={`flex-1 p-4 border-2 rounded-xl text-sm font-semibold transition-all ${formData.bankReconciliationMode === mode ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {mode === "Auto" ? "Auto Reconciliation" : "Manual Reconciliation"}
                      <p className="text-xs font-normal mt-1 text-gray-500">
                        {mode === "Auto" ? "System auto-matches imported bank transactions to invoices/payments." : "You manually match each bank transaction to accounting entries."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* HMRC MTD */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">HMRC Gateway MTD Authentication</h3>
                    <p className="text-sm text-gray-500">Connect to HMRC to enable Making Tax Digital (MTD) VAT submissions.</p>
                  </div>
                </div>
                <button type="button" className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
                  <Repeat size={14} /> Connect to HMRC
                </button>
              </div>
            </>
          )}

          {activeTab === "codes" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800 text-sm">VAT Codes</h2>
                    <p className="text-xs text-gray-500">Manage VAT rate codes used on transactions.</p>
                  </div>
                </div>
                <button onClick={() => setShowAddCode(true)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">
                  <Plus size={13} /> Add Code
                </button>
              </div>

              {showAddCode && (
                <div className="px-5 py-4 border-b bg-purple-50">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Code</label>
                      <input type="text" value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="e.g. T14" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                      <input type="text" value={newCode.description} onChange={(e) => setNewCode({ ...newCode, description: e.target.value })} placeholder="e.g. Reduced Rate Energy" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Rate (%)</label>
                      <input type="number" step="0.1" value={newCode.rate} onChange={(e) => setNewCode({ ...newCode, rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={addVatCode} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">Add</button>
                    <button onClick={() => setShowAddCode(false)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="px-5 py-3 w-20">Code</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 w-24 text-right">Rate (%)</th>
                    <th className="px-5 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vatCodes.map((vc) => (
                    <tr key={vc.code} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono text-xs font-bold">{vc.code}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{vc.description}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{vc.rate}%</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => removeVatCode(vc.code)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-5 py-3 border-t bg-gray-50">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-500" />
                  Default VAT codes cannot be permanently deleted — they will be restored on next load. Custom codes are session-specific until backend persistence is configured.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
