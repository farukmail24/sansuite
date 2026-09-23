import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Building2 } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function CisSettingsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/cis-settings");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    isContractor: false,
    isSubcontractor: false,
    employerReference: "",
    accountsOfficeReference: "",
    utrNumber: "",
    deductionRate: "20.00"
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: cisSettings, isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/cis-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/cis-settings/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  useEffect(() => {
    if (cisSettings) {
      setFormData({
        isContractor: Boolean(cisSettings.isContractor),
        isSubcontractor: Boolean(cisSettings.isSubcontractor),
        employerReference: cisSettings.employerReference || "",
        accountsOfficeReference: cisSettings.accountsOfficeReference || "",
        utrNumber: cisSettings.utrNumber || "",
        deductionRate: cisSettings.deductionRate || "20.00"
      });
    }
  }, [cisSettings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookkeeping/cis-settings", { ...formData, clientId });
      if (!res.ok) throw new Error("Failed to save CIS settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/cis-settings", clientId] });
      toast({ title: "Settings Saved", description: "CIS Settings updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  if (!clientId) {
    return <ClientGuard featureTitle="CIS Contractor Settings" />;
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
            <span className="text-gray-800">CIS Settings</span>
          </div>
          <button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saveSettings.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Construction Industry Scheme (CIS)</h2>
                <p className="text-sm text-gray-500">Configure CIS deductions for this client.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading settings...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isContractor} 
                      onChange={(e) => setFormData({...formData, isContractor: e.target.checked})}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                    />
                    Registered as Contractor
                  </label>
                  <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isSubcontractor} 
                      onChange={(e) => setFormData({...formData, isSubcontractor: e.target.checked})}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                    />
                    Registered as Subcontractor
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employer Reference</label>
                    <input type="text" value={formData.employerReference} onChange={(e) => setFormData({ ...formData, employerReference: e.target.value })} placeholder="e.g. 123/AB456" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accounts Office Reference</label>
                    <input type="text" value={formData.accountsOfficeReference} onChange={(e) => setFormData({ ...formData, accountsOfficeReference: e.target.value })} placeholder="e.g. 123PX45678912" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UTR Number</label>
                    <input type="text" value={formData.utrNumber} onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })} placeholder="10-digit UTR" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Deduction Rate (%)</label>
                    <select value={formData.deductionRate} onChange={(e) => setFormData({ ...formData, deductionRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                      <option value="0.00">0% (Gross)</option>
                      <option value="20.00">20% (Standard)</option>
                      <option value="30.00">30% (Higher)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
