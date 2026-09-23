import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, Save, FileText, ChevronRight, User, Users, CheckCircle2, HelpCircle, Settings } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

export default function SA800Form() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({
    taxYear: "2024-25",
    tradingProfit: "",
    propertyIncome: "",
    untaxedInterest: "",
    partnershipNetProfit: "",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: returns = [], isLoading: loadingReturns } = useQuery({
    queryKey: [`/api/self-assessment/sa800/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/self-assessment/sa800/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const saveReturn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/self-assessment/sa800", { ...form, clientId });
      if (!res.ok) throw new Error("Failed to save SA800 return");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SA800 Saved", type: "success" });
      qc.invalidateQueries({ queryKey: [`/api/self-assessment/sa800/${clientId}`] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const submitToHmrc = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/self-assessment/sa800/${id}`, { status: "Submitted" });
      if (!res.ok) throw new Error("Submission failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submitted to HMRC successfully", type: "success" });
      qc.invalidateQueries({ queryKey: [`/api/self-assessment/sa800/${clientId}`] });
    }
  });

  const partnershipClients = clients.filter((c: any) => c.clientType === "Partnership");

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">SA800 Partnership Tax Return</h1>
            <p className="text-sm text-gray-500">File partnership tax returns for HMRC</p>
          </div>
          <button
            disabled={!clientId || saveReturn.isPending}
            onClick={() => saveReturn.mutate()}
            className="btn-SanSuite flex items-center gap-2"
          >
            <Save size={15} /> Save Draft
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="SanSuite-card p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={18} className="text-purple-600" />
                Select Partnership
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Partnership Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {partnershipClients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tax Year</label>
                  <select
                    value={form.taxYear}
                    onChange={(e) => setForm({ ...form, taxYear: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option>2024-25</option>
                    <option>2023-24</option>
                  </select>
                </div>
              </div>
            </div>

            {clientId && (
              <div className="SanSuite-card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-800">Partnership Income (SA800)</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">Trading and Professional Profits</p>
                      <p className="text-xs text-gray-500">Box 3.83 to 3.116</p>
                    </div>
                    <div className="w-48 relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">£</span>
                      <input
                        type="number"
                        value={form.tradingProfit}
                        onChange={(e) => setForm({ ...form, tradingProfit: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">UK Property Income</p>
                      <p className="text-xs text-gray-500">Box 1.1 to 1.40</p>
                    </div>
                    <div className="w-48 relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">£</span>
                      <input
                        type="number"
                        value={form.propertyIncome}
                        onChange={(e) => setForm({ ...form, propertyIncome: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">Untaxed Interest</p>
                      <p className="text-xs text-gray-500">Box 7.1 to 7.9</p>
                    </div>
                    <div className="w-48 relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">£</span>
                      <input
                        type="number"
                        value={form.untaxedInterest}
                        onChange={(e) => setForm({ ...form, untaxedInterest: e.target.value })}
                        className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-purple-900">Total Partnership Net Profit</p>
                      <p className="text-xs text-purple-700">Calculated value</p>
                    </div>
                    <div className="w-48 relative">
                      <span className="absolute left-3 top-2 text-purple-900 font-bold text-sm">£</span>
                      <input
                        type="number"
                        value={
                          parseFloat(form.tradingProfit || "0") +
                          parseFloat(form.propertyIncome || "0") +
                          parseFloat(form.untaxedInterest || "0")
                        }
                        readOnly
                        className="w-full text-sm border-none bg-transparent font-bold text-purple-900 rounded-lg pl-7 pr-3 py-2 text-right focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="SanSuite-card p-0">
              <div className="px-5 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-sm text-gray-800">Saved Returns</h3>
              </div>
              <div className="p-0">
                {!clientId ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    Select a client to view their SA800 returns.
                  </div>
                ) : loadingReturns ? (
                  <div className="p-8 text-center text-gray-400 text-xs">Loading...</div>
                ) : returns.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">No returns found.</div>
                ) : (
                  <div className="divide-y">
                    {returns.map((r: any) => (
                      <div key={r.id} className="p-4 flex items-center justify-between group">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{r.taxYear} Return</p>
                          <p className="text-xs text-gray-500 mt-1">Status: <span className={r.status === 'Draft' ? 'text-gray-500' : 'text-green-600 font-medium'}>{r.status}</span></p>
                        </div>
                        {r.status === 'Draft' && (
                          <button
                            onClick={() => submitToHmrc.mutate(r.id)}
                            className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Submit to HMRC <ChevronRight size={12} />
                          </button>
                        )}
                        {r.status === 'Submitted' && (
                          <CheckCircle2 size={16} className="text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
