import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Percent } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function VatSettingsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/vat-settings");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    vatNumber: "",
    vatScheme: "Standard",
    vatSubmitType: "Quarterly",
    flatRatePercentage: ""
  });

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
      }));
    }
  }, [client]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      // We update the client's vatNumber
      const res = await apiRequest("PATCH", `/api/practice/clients/${clientId}`, { 
        vatNumber: formData.vatNumber 
      });
      if (!res.ok) throw new Error("Failed to save VAT settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Settings Saved", description: "VAT Settings updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

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

        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <Percent size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">VAT Configuration</h2>
                <p className="text-sm text-gray-500">Manage VAT details and HMRC integration.</p>
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

              <div className="pt-6 border-t mt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-2">HMRC Gateway MTD Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">Connect to HMRC to enable Making Tax Digital (MTD) VAT submissions.</p>
                <button type="button" className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                  Connect to HMRC
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
